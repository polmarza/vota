// pnpm data:catalogo — valida las fichas de data/catalogo/, data/preguntas.yaml y
// data/territorio.yaml entre sí y contra data/votos/. Falla si hay algún error.
//
// pnpm data:validar (--publicar) — además, las candidaturas del 29-N y que cada ficha tenga un
// veredicto vigente y aprobado del jurado (M-10). Se ejecuta antes de cada build: lo que no pasa,
// no se publica.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { z } from 'zod';
import type { Candidata } from './candidatas.ts';
import {
  esquemaCandidaturas,
  esquemaFicha,
  esquemaPreguntas,
  esquemaTerritorio,
  validarCandidaturas,
  validarCatalogo,
  type Ficha,
} from './catalogo.ts';
import { construirElementos } from './elementos-catalogo.ts';
import type { Registro } from './jurado.ts';
import { esquemaPartidos } from './partidos.ts';
import { bloqueosDelJurado } from './veredictos.ts';
import type { VotacionPartidos } from './votos.ts';

const DATA = join(import.meta.dirname, '..', '..', 'data');
const errores: string[] = [];

/** Lee y valida un YAML; si falta o no cumple el esquema, anota el error y devuelve null. */
function cargar<T>(ruta: string, esquema: z.ZodType<T>): T | null {
  const completa = join(DATA, ruta);
  if (!existsSync(completa)) {
    errores.push(`${ruta}: no existe`);
    return null;
  }
  let contenido: unknown;
  try {
    contenido = parse(readFileSync(completa, 'utf8'));
  } catch (e) {
    errores.push(`${ruta}: el YAML no se puede leer (${(e as Error).message.split('\n')[0]})`);
    return null;
  }
  const r = esquema.safeParse(contenido);
  if (r.success) return r.data;
  for (const i of r.error.issues) errores.push(`${ruta}: ${i.path.join('.') || '(raíz)'}: ${i.message}`);
  return null;
}

const preguntas = cargar('preguntas.yaml', esquemaPreguntas);
const territorio = cargar('territorio.yaml', esquemaTerritorio);
const fichas = new Map<string, Ficha>();
const dirCatalogo = join(DATA, 'catalogo');
for (const f of existsSync(dirCatalogo) ? readdirSync(dirCatalogo).filter((f) => f.endsWith('.yaml')).sort() : []) {
  const ficha = cargar(`catalogo/${f}`, esquemaFicha);
  if (ficha) fichas.set(f.replace(/\.yaml$/, ''), ficha);
}
const candidatas = ['XIV', 'XV'].flatMap((leg) => JSON.parse(readFileSync(join(DATA, 'candidatas', `${leg}.json`), 'utf8')) as Candidata[]);
const votos = new Map<string, VotacionPartidos>();
for (const leg of ['XIV', 'XV']) {
  const v = JSON.parse(readFileSync(join(DATA, 'votos', `${leg}.json`), 'utf8')) as { votaciones: VotacionPartidos[] };
  for (const x of v.votaciones) votos.set(x.id, x);
}

if (preguntas && territorio) errores.push(...validarCatalogo({ fichas, preguntas, territorio, votos, candidatas }));

const publicar = process.argv.includes('--publicar');
if (publicar && territorio) {
  const candidaturas = cargar('candidaturas/2026.yaml', esquemaCandidaturas);
  const partidos = cargar('partidos/partidos.yaml', esquemaPartidos);
  if (candidaturas && partidos) {
    const conHistorial = new Set(partidos.partidos.filter((p) => p.herencia.XIV?.length || p.herencia.XV?.length).map((p) => p.id));
    errores.push(...validarCandidaturas(candidaturas, territorio, conHistorial));
  }
  const rutaJurado = join(DATA, 'jurado', 'catalogo.json');
  const registros: Registro[] = existsSync(rutaJurado) ? JSON.parse(readFileSync(rutaJurado, 'utf8')) : [];
  if (!errores.length) errores.push(...bloqueosDelJurado(construirElementos(), registros));
}

const territoriales = [...fichas.values()].filter((f) => f.ambito !== 'estatal').length;
console.log(
  `Catálogo: ${fichas.size} fichas (${territoriales} territoriales) · ${preguntas?.length ?? 0} preguntas · ` +
    `${territorio?.provincias.length ?? 0} provincias`,
);
if (errores.length) {
  console.log(`\n${errores.length} error(es):`);
  for (const e of errores) console.log(`  ${e}`);
  process.exit(1);
}
console.log('Sin errores.');
