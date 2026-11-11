// Validación del catálogo real (data/catalogo, data/preguntas.yaml, data/territorio.yaml). Es un test
// de datos: lee data/ a propósito (docs/testing.md).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { Candidata } from '../../../scripts/data/candidatas.ts';
import { esquemaPartidos } from '../../../scripts/data/partidos.ts';
import {
  esquemaCandidaturas,
  esquemaFicha,
  partidosPorProvincia,
  validarCandidaturas,
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

describe('M-02 · candidaturas del 29-N', () => {
  const candidaturas = esquemaCandidaturas.parse(yaml('data/candidaturas/2026.yaml'));
  const conHistorial = new Set(esquemaPartidos.parse(yaml('data/partidos/partidos.yaml')).partidos.filter((p) => p.herencia.XIV?.length || p.herencia.XV?.length).map((p) => p.id));

  it('solo incluyen partidos con historial y provincias que existen', () => {
    expect(validarCandidaturas(candidaturas, territorio, conHistorial)).toEqual([]);
  });

  it('son las definitivas del BOE y en cada provincia hay partidos suficientes para un podio', () => {
    expect(candidaturas.provisional).toBe(false);
    // Ceuta, Melilla y Teruel tienen menos de seis: los podios no repiten partido (M-03).
    for (const [provincia, partidos] of partidosPorProvincia(candidaturas, territorio)) expect(partidos.length, provincia).toBeGreaterThanOrEqual(3);
  });

  it('cada partido que se presenta tiene su color, y ningún color se repite (docs/design-system.md)', () => {
    const partidos = esquemaPartidos.parse(yaml('data/partidos/partidos.yaml')).partidos;
    const color = new Map(partidos.map((p) => [p.id, p.color?.toUpperCase()]));
    for (const c of candidaturas.candidaturas) expect(color.get(c.partido), c.partido).toMatch(/^#[0-9A-F]{6}$/);
    const colores = partidos.flatMap((p) => (p.color ? [p.color.toUpperCase()] : []));
    expect(new Set(colores).size).toBe(colores.length);
  });

  it('CUP y PRC no se presentan al Congreso, y Ciudadanos solo en Madrid y Barcelona (dentro de D21)', () => {
    const porProvincia = partidosPorProvincia(candidaturas, territorio);
    const donde = (p: string) => [...porProvincia].filter(([, ps]) => ps.includes(p)).map(([prov]) => prov).sort();
    expect(donde('cup')).toEqual([]);
    expect(donde('prc')).toEqual([]);
    expect(donde('cs')).toEqual(['barcelona', 'madrid']);
  });

  it('M-02 negativo: en Madrid no aparecen partidos que solo concurren en otras comunidades', () => {
    const madrid = partidosPorProvincia(candidaturas, territorio).get('madrid')!;
    for (const p of ['pnv', 'bng', 'cc', 'erc', 'eh-bildu']) expect(madrid).not.toContain(p);
  });
});

describe('M-05 · catálogo real', () => {
  it('ninguna pregunta tiene dos opciones con el mismo texto', () => {
    for (const p of preguntas) expect(new Set(p.opciones.map((o) => o.texto)).size, p.id).toBe(p.opciones.length);
  });

  it('las fichas, las preguntas y el territorio no tienen errores', () => {
    expect(validarCatalogo({ fichas, preguntas, territorio, votos, candidatas })).toEqual([]);
  });

  it('tiene entre 40 y 110 fichas (objetivo: unas 100), de las dos legislaturas', () => {
    expect(fichas.size).toBeGreaterThanOrEqual(40);
    expect(fichas.size).toBeLessThanOrEqual(110);
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
