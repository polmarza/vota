// pnpm data:ingesta — descarga de los datos abiertos del Congreso a data/raw/.
//
//   pnpm data:ingesta                          XIV y XV completas
//   pnpm data:ingesta --legislatura XV         solo una legislatura
//   pnpm data:ingesta --desde 20260901 --hasta 20260930
//   pnpm data:ingesta --limite 3               los 3 primeros días pendientes (para probar)
//   pnpm data:ingesta --forzar                 vuelve a descargar aunque ya esté en caché
//
// Lo ya descargado no se vuelve a pedir. Un día con votaciones sin JSON, o con alguna descarga
// fallida, se vuelve a intentar en la siguiente ejecución.

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  BASE,
  LEGISLATURAS,
  URL_DIPUTADOS,
  compactarDia,
  leerDiasVotaciones,
  leerEnlacesDia,
  leerEnlacesDiputados,
  leerVotacion,
  urlDiaVotaciones,
  type DiaCompacto,
  type Legislatura,
  type Votacion,
} from './congreso.ts';

const RAIZ = join(import.meta.dirname, '..', '..', 'data', 'raw');
const PAUSA_MS = 300;
// El Congreso rechaza (403) cualquier agente que no sea un navegador, incluido uno que se identifica
// ("Mozilla/5.0 (compatible; vota-con-criterio; …)"). Pol autorizó el 26-10-2026 usar el genérico,
// manteniendo la pausa entre peticiones. Si el Congreso ofrece otra vía de descarga masiva, se cambia.
const USER_AGENT = 'Mozilla/5.0';
const REINTENTOS = 3;

const { values: args } = parseArgs({
  options: {
    legislatura: { type: 'string', multiple: true },
    desde: { type: 'string' },
    hasta: { type: 'string' },
    limite: { type: 'string' },
    forzar: { type: 'boolean', default: false },
  },
});

const legislaturas = (args.legislatura ?? Object.keys(LEGISLATURAS)) as Legislatura[];
for (const leg of legislaturas) {
  if (!(leg in LEGISLATURAS)) throw new Error(`Legislatura desconocida: ${leg}. Usa XIV o XV`);
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET con pausa entre peticiones y reintentos con espera creciente. */
async function descargar(url: string, validar?: (texto: string) => void): Promise<string> {
  let ultimoError: unknown;
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    if (intento > 0) await esperar(1000 * 2 ** (intento - 1));
    await esperar(PAUSA_MS);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texto = await r.text();
      validar?.(texto);
      return texto;
    } catch (e) {
      ultimoError = e;
    }
  }
  throw new Error(`${url}: ${(ultimoError as Error).message}`);
}

async function guardar(ruta: string, datos: unknown) {
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, JSON.stringify(datos) + '\n');
}

async function ingestaDiputados() {
  const pendientes = legislaturas.filter((leg) => args.forzar || !existsSync(join(RAIZ, leg, 'diputados.json')));
  if (pendientes.length === 0) return;
  const enlaces = leerEnlacesDiputados(await descargar(URL_DIPUTADOS));
  for (const leg of pendientes) {
    const listas = await Promise.all(
      enlaces[leg].map(async (ruta) => JSON.parse(await descargar(BASE + ruta, (t) => JSON.parse(t))) as unknown[]),
    );
    const diputados = listas.flat();
    await guardar(join(RAIZ, leg, 'diputados.json'), diputados);
    console.log(`${leg}: ${diputados.length} registros de diputados`);
  }
}

interface Resumen {
  dias: number;
  enCache: number;
  votaciones: number;
  asentimiento: number;
  secretas: number;
  sinJson: string[];
  fallos: string[];
}

async function ingestaLegislatura(leg: Legislatura, resumen: Resumen) {
  let dias = leerDiasVotaciones(await descargar(urlDiaVotaciones(leg)));
  if (args.desde) dias = dias.filter((d) => d >= args.desde!);
  if (args.hasta) dias = dias.filter((d) => d <= args.hasta!);

  const pendientes: string[] = [];
  for (const dia of dias) {
    const ruta = join(RAIZ, leg, 'dias', `${dia}.json`);
    if (!args.forzar && existsSync(ruta)) {
      const guardado = JSON.parse(await readFile(ruta, 'utf8')) as DiaCompacto;
      if (guardado.sinJson.length === 0) {
        resumen.enCache++;
        continue;
      }
    }
    pendientes.push(dia);
  }
  const limite = args.limite ? Number(args.limite) : Infinity;
  const aProcesar = pendientes.slice(0, limite);
  console.log(`${leg}: ${dias.length} días con votaciones, ${aProcesar.length} por descargar`);

  for (const [i, dia] of aProcesar.entries()) {
    try {
      const enlaces = leerEnlacesDia(await descargar(urlDiaVotaciones(leg, dia)));
      const votaciones: Votacion[] = [];
      for (const ruta of enlaces.json) {
        let votacion: Votacion | undefined;
        await descargar(BASE + ruta, (texto) => {
          votacion = leerVotacion(texto);
        });
        votaciones.push(votacion!);
      }
      if (votaciones.length === 0 && enlaces.sinJson.length === 0) continue;
      await guardar(join(RAIZ, leg, 'dias', `${dia}.json`), compactarDia(leg, dia, votaciones, enlaces.sinJson));
      resumen.dias++;
      resumen.votaciones += votaciones.length;
      resumen.asentimiento += votaciones.filter((v) => v.asentimiento).length;
      resumen.secretas += votaciones.filter((v) => v.secreta).length;
      for (const c of enlaces.sinJson) resumen.sinJson.push(`${leg} ${dia} ${c.split('/').pop()}`);
      console.log(`  [${i + 1}/${aProcesar.length}] ${dia}: ${votaciones.length} votaciones` +
        (enlaces.sinJson.length ? `, ${enlaces.sinJson.length} sin JSON` : ''));
    } catch (e) {
      resumen.fallos.push(`${leg} ${dia}: ${(e as Error).message}`);
      console.log(`  [${i + 1}/${aProcesar.length}] ${dia}: FALLO`);
    }
  }
}

const resumen: Resumen = { dias: 0, enCache: 0, votaciones: 0, asentimiento: 0, secretas: 0, sinJson: [], fallos: [] };
await ingestaDiputados();
for (const leg of legislaturas) await ingestaLegislatura(leg, resumen);

console.log(`\nDías descargados: ${resumen.dias} (${resumen.enCache} ya estaban en caché)`);
console.log(`Votaciones: ${resumen.votaciones} (${resumen.asentimiento} por asentimiento, ${resumen.secretas} secretas)`);
if (resumen.sinJson.length) {
  console.log(`Votaciones sin JSON publicado (${resumen.sinJson.length}):`);
  for (const s of resumen.sinJson) console.log(`  ${s}`);
}
if (resumen.fallos.length) {
  console.log(`Fallos (${resumen.fallos.length}); se reintentarán en la siguiente ejecución:`);
  for (const f of resumen.fallos) console.log(`  ${f}`);
  process.exitCode = 1;
}
