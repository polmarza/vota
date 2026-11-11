// pnpm data:votos — calcula el voto de cada partido en cada votación de la XIV y la XV y lo guarda
// en data/votos/<leg>.json, una votación por línea. Es un archivo derivado: no se edita a mano.

import { readdirSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { DiaCompacto, Legislatura } from './congreso.ts';
import { crearAsignador, esquemaPartidos, validarPartidos, type DiputadoOficial } from './partidos.ts';
import { votosDelDia, type VotacionPartidos } from './votos.ts';

const DATA = join(import.meta.dirname, '..', '..', 'data');
const leer = (ruta: string) => JSON.parse(readFileSync(join(DATA, ruta), 'utf8'));

const datos = esquemaPartidos.parse(parse(readFileSync(join(DATA, 'partidos', 'partidos.yaml'), 'utf8')));
const diputados: Record<Legislatura, DiputadoOficial[]> = { XIV: leer('raw/XIV/diputados.json'), XV: leer('raw/XV/diputados.json') };
const errores = validarPartidos(datos, diputados);
if (errores.length) {
  console.log(`partidos.yaml tiene errores; ejecuta pnpm data:partidos.`);
  process.exit(1);
}
const asignar = crearAsignador(datos, diputados);
await mkdir(join(DATA, 'votos'), { recursive: true });

for (const leg of ['XIV', 'XV'] as const) {
  const votaciones: VotacionPartidos[] = [];
  const sinDatos: string[] = [];
  for (const f of readdirSync(join(DATA, 'raw', leg, 'dias')).sort()) {
    const dia = leer(`raw/${leg}/dias/${f}`) as DiaCompacto;
    votaciones.push(...votosDelDia(dia, asignar));
    sinDatos.push(...dia.sinJson);
  }

  const lineas = votaciones.map((v) => '  ' + JSON.stringify(v)).join(',\n');
  await writeFile(
    join(DATA, 'votos', `${leg}.json`),
    `{\n "legislatura": "${leg}",\n "sinDatos": ${JSON.stringify(sinDatos)},\n "votaciones": [\n${lineas}\n ]\n}\n`,
  );

  const nominales = votaciones.filter((v) => !v.asentimiento && !v.secreta);
  const filas = nominales.flatMap((v) => Object.values(v.partidos));
  const cuenta = (s: string) => filas.filter((p) => p.sentido === s).length;
  console.log(
    `${leg}: ${votaciones.length} votaciones (${nominales.length} nominales, ` +
      `${votaciones.filter((v) => v.asentimiento).length} por asentimiento, ${votaciones.filter((v) => v.secreta).length} secretas, ` +
      `${sinDatos.length} sin datos) · ${filas.length} votos de partido: ` +
      `${filas.filter((p) => p.dividido).length} divididos, ${cuenta('empate')} empates, ${cuenta('ausente')} ausentes`,
  );
  const ids = new Set(votaciones.map((v) => v.id));
  if (ids.size !== votaciones.length) console.log(`  Aviso: hay ids de votación repetidos (${votaciones.length - ids.size}).`);
}
