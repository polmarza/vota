// Validación del catálogo real (data/catalogo, data/preguntas.yaml, data/territorio.yaml). Es un test
// de datos: lee data/ a propósito (docs/testing.md).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { Candidata } from '../../../scripts/data/candidatas.ts';
import {
  esquemaFicha,
  esquemaPreguntas,
  esquemaTerritorio,
  sentidoParaPerfil,
  validarCatalogo,
  type Respuestas,
} from '../../../scripts/data/catalogo.ts';
import type { VotacionPartidos } from '../../../scripts/data/votos.ts';

const RAIZ = join(import.meta.dirname, '..', '..', '..');
const DATA = join(RAIZ, 'data');
const yaml = (ruta: string) => parse(readFileSync(join(RAIZ, ruta), 'utf8'));

const preguntas = esquemaPreguntas.parse(yaml('data/preguntas.yaml'));
const territorio = esquemaTerritorio.parse(yaml('data/territorio.yaml'));
const archivos = readdirSync(join(DATA, 'catalogo')).filter((f) => f.endsWith('.yaml')).sort();
const fichas = new Map(archivos.map((f) => [f.replace(/\.yaml$/, ''), esquemaFicha.parse(yaml(`data/catalogo/${f}`))]));
const candidatas = ['XIV', 'XV'].flatMap((leg) => JSON.parse(readFileSync(join(DATA, 'candidatas', `${leg}.json`), 'utf8')) as Candidata[]);
const votos = new Map<string, VotacionPartidos>();
for (const leg of ['XIV', 'XV']) {
  for (const v of (JSON.parse(readFileSync(join(DATA, 'votos', `${leg}.json`), 'utf8')) as { votaciones: VotacionPartidos[] }).votaciones) votos.set(v.id, v);
}
const perfiles = yaml('tests/fixtures/perfiles.yaml') as { nombre: string; respuestas: Respuestas }[];
const ccaaDe = new Map(territorio.provincias.map((p) => [p.id, p.ccaa]));

describe('M-05 · catálogo real', () => {
  it('las fichas, las preguntas y el territorio no tienen errores', () => {
    expect(validarCatalogo({ fichas, preguntas, territorio, votos, candidatas })).toEqual([]);
  });

  it('tiene entre 40 y 60 fichas, de las dos legislaturas', () => {
    expect(fichas.size).toBeGreaterThanOrEqual(40);
    expect(fichas.size).toBeLessThanOrEqual(60);
    expect([...fichas.keys()].some((id) => id.startsWith('XIV-'))).toBe(true);
    expect([...fichas.keys()].some((id) => id.startsWith('XV-'))).toBe(true);
  });

  it('M-11: incluye votaciones territoriales', () => {
    expect([...fichas.values()].some((f) => f.ambito !== 'estatal')).toBe(true);
  });

  it('el territorio tiene las 52 provincias y cada perfil de referencia vota en una de ellas', () => {
    expect(territorio.provincias).toHaveLength(52);
    for (const p of perfiles) expect(ccaaDe.has(p.respuestas.provincia!), p.nombre).toBe(true);
  });

  it.each(perfiles.map((p) => [p.nombre, p.respuestas] as const))('M-03: "%s" se ve afectado por al menos 5 votaciones', (_nombre, respuestas) => {
    const cuentan = [...fichas.values()].filter((f) => {
      const s = sentidoParaPerfil(f, respuestas, ccaaDe);
      return s === 'favorece' || s === 'perjudica';
    });
    expect(cuentan.length).toBeGreaterThanOrEqual(5);
  });
});
