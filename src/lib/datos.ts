// Lectura de data/ en tiempo de build. Solo se usa desde el frontmatter de Astro (Node), nunca en
// el navegador.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { esquemaPreguntas, esquemaTerritorio, type Pregunta, type Territorio } from '../../scripts/data/catalogo.ts';
import { esquemaPartidos, type Partido } from '../../scripts/data/partidos.ts';

const DATA = join(process.cwd(), 'data');

export function cargarPartidos(): Partido[] {
  return esquemaPartidos.parse(parse(readFileSync(join(DATA, 'partidos', 'partidos.yaml'), 'utf8'))).partidos;
}

/** Colores de los partidos con color definido, en el orden del archivo, sin repetir. */
export function coloresDePartidos(): string[] {
  return [...new Set(cargarPartidos().flatMap((p) => (p.color ? [p.color] : [])))];
}

export function cargarPreguntas(): Pregunta[] {
  return esquemaPreguntas.parse(parse(readFileSync(join(DATA, 'preguntas.yaml'), 'utf8')));
}

export function cargarTerritorio(): Territorio {
  return esquemaTerritorio.parse(parse(readFileSync(join(DATA, 'territorio.yaml'), 'utf8')));
}
