// pnpm data:catalogo — valida las fichas de data/catalogo/, data/preguntas.yaml y
// data/territorio.yaml entre sí y contra data/votos/. Falla si hay algún error.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { z } from 'zod';
import {
  esquemaFicha,
  esquemaPreguntas,
  esquemaTerritorio,
  validarCatalogo,
  type Ficha,
} from './catalogo.ts';
import type { Candidata } from './candidatas.ts';
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
