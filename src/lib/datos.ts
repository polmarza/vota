// Lectura de data/ en tiempo de build. Solo se usa desde el frontmatter de Astro (Node), nunca en
// el navegador.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import {
  esquemaCandidaturas,
  esquemaFicha,
  esquemaPreguntas,
  esquemaTerritorio,
  type Candidaturas,
  type Ficha,
  type Pregunta,
  type Territorio,
} from '../../scripts/data/catalogo.ts';
import type { VotacionPartidos } from '../../scripts/data/votos.ts';
import { partidosPorProvincia } from '../../scripts/data/catalogo.ts';
import type { DatosResultado } from '../scripts/resultado.ts';
import type { Respuestas } from './afinidad/calculo.ts';
import { esquemaPartidos, type Partido } from '../../scripts/data/partidos.ts';

const DATA = join(process.cwd(), 'data');

export function cargarPartidos(): Partido[] {
  return esquemaPartidos.parse(parse(readFileSync(join(DATA, 'partidos', 'partidos.yaml'), 'utf8'))).partidos;
}

export function cargarPreguntas(): Pregunta[] {
  return esquemaPreguntas.parse(parse(readFileSync(join(DATA, 'preguntas.yaml'), 'utf8')));
}

export function cargarTerritorio(): Territorio {
  return esquemaTerritorio.parse(parse(readFileSync(join(DATA, 'territorio.yaml'), 'utf8')));
}

export function cargarCatalogo(): Ficha[] {
  const dir = join(DATA, 'catalogo');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => esquemaFicha.parse(parse(readFileSync(join(dir, f), 'utf8'))));
}

export function cargarCandidaturas(): Candidaturas {
  return esquemaCandidaturas.parse(parse(readFileSync(join(DATA, 'candidaturas', '2026.yaml'), 'utf8')));
}

/** Voto de partido de las votaciones pedidas, desde data/votos/. */
export function cargarVotos(ids: string[]): Record<string, VotacionPartidos['partidos']> {
  const buscadas = new Set(ids);
  const salida: Record<string, VotacionPartidos['partidos']> = {};
  for (const leg of ['XIV', 'XV']) {
    const { votaciones } = JSON.parse(readFileSync(join(DATA, 'votos', `${leg}.json`), 'utf8')) as { votaciones: VotacionPartidos[] };
    for (const v of votaciones) if (buscadas.has(v.id)) salida[v.id] = v.partidos;
  }
  return salida;
}

/**
 * Lo que necesita el resultado (src/scripts/resultado.ts): las fichas con los campos que se enseñan,
 * el voto de cada partido, los partidos y quién se presenta en cada provincia. Lo usan /test (en el
 * navegador) y la portada (el resultado de ejemplo, en el build).
 */
export function datosResultado(): DatosResultado {
  const catalogo = cargarCatalogo();
  const candidaturas = cargarCandidaturas();
  return {
    fichas: catalogo.map(({ votacion, ambito, efectos, titulo, fecha, url, que_significa_si, iniciativa, tema }) => ({
      votacion, ambito, titulo, fecha, url, que_significa_si, iniciativa, tema,
      efectos: efectos.map(({ cuando, el_si, justificacion }) => ({ cuando, el_si, justificacion })),
    })),
    votos: cargarVotos(catalogo.map((f) => f.votacion)),
    partidos: cargarPartidos().map(({ id, nombre, siglas, color }) => ({ id, nombre, siglas, color })),
    porProvincia: Object.fromEntries(partidosPorProvincia(candidaturas, cargarTerritorio())),
    candidaturasProvisionales: candidaturas.provisional,
  };
}

export interface PerfilEjemplo {
  nombre: string;
  respuestas: Respuestas;
}

/** Perfiles de referencia (data/perfiles-ejemplo.yaml): la portada enseña el resultado de uno. */
export function cargarPerfilesEjemplo(): PerfilEjemplo[] {
  return parse(readFileSync(join(DATA, 'perfiles-ejemplo.yaml'), 'utf8')) as PerfilEjemplo[];
}
