// Validación de los datos reales (data/raw, data/partidos, data/votos). Es el único tipo de test
// que lee data/, precisamente para comprobar esos datos (docs/testing.md).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';
import { expandirVotos, type DiaCompacto, type Legislatura } from '../../../scripts/data/congreso.ts';
import { crearAsignador, esquemaPartidos, validarPartidos, type DiputadoOficial } from '../../../scripts/data/partidos.ts';
import { votosDelDia, type VotacionPartidos } from '../../../scripts/data/votos.ts';

const DATA = join(import.meta.dirname, '..', '..', '..', 'data');
const leer = (ruta: string) => JSON.parse(readFileSync(join(DATA, ruta), 'utf8'));
const LEGS = ['XIV', 'XV'] as const;

const datos = esquemaPartidos.parse(parse(readFileSync(join(DATA, 'partidos', 'partidos.yaml'), 'utf8')));
const diputados: Record<Legislatura, DiputadoOficial[]> = { XIV: leer('raw/XIV/diputados.json'), XV: leer('raw/XV/diputados.json') };
const dias = Object.fromEntries(
  LEGS.map((leg) => [leg, readdirSync(join(DATA, 'raw', leg, 'dias')).sort().map((f) => leer(`raw/${leg}/dias/${f}`) as DiaCompacto)]),
) as Record<Legislatura, DiaCompacto[]>;
const votos = Object.fromEntries(LEGS.map((leg) => [leg, leer(`votos/${leg}.json`)])) as Record<
  Legislatura,
  { legislatura: string; sinDatos: string[]; votaciones: VotacionPartidos[] }
>;
const votacion = (leg: Legislatura, id: string) => votos[leg].votaciones.find((v) => v.id === id)!;

describe('M-06 · datos brutos del Congreso', () => {
  it.each(LEGS)('%s: el voto nominal de cada votación cuadra con sus totales oficiales', (leg) => {
    const descuadres: string[] = [];
    for (const dia of dias[leg]) {
      for (const v of dia.votaciones) {
        if (v.asentimiento || v.secreta) continue;
        const cuenta = (c: string) => [...v.votos].filter((x) => x === c).length;
        if (cuenta('S') !== v.totales.si || cuenta('N') !== v.totales.no || cuenta('A') !== v.totales.abstencion || cuenta('X') > v.totales.noVota) {
          descuadres.push(`${leg}-${v.sesion}-${v.numero}`);
        }
      }
    }
    expect(descuadres).toEqual([]);
  });

  it.each(LEGS)('%s: todos los diputados que votan están en la lista oficial de diputados', (leg) => {
    const nombres = new Set(diputados[leg].map((d) => d.NOMBRE));
    const desconocidos = new Set<string>();
    for (const dia of dias[leg]) for (const d of dia.diputados) if (!nombres.has(datos.alias[leg][d] ?? d)) desconocidos.add(d);
    expect([...desconocidos]).toEqual([]);
  });
});

describe('M-06 · herencia sobre los datos reales', () => {
  it('partidos.yaml no tiene errores contra los diputados descargados', () => {
    expect(validarPartidos(datos, diputados)).toEqual([]);
  });

  it.each(LEGS)('%s: ningún voto encaja en dos partidos y los votos sin partido no pasan del 5 %%', (leg) => {
    const asignar = crearAsignador(datos, diputados);
    let total = 0;
    let sinPartido = 0;
    for (const dia of dias[leg]) {
      for (const v of dia.votaciones) {
        for (const x of expandirVotos(dia, v)) {
          total++;
          // Lanza un error si la herencia es ambigua.
          if (!asignar(leg, x.diputado, x.grupo, dia.fecha)) sinPartido++;
        }
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(sinPartido / total).toBeLessThan(0.05);
  });
});

describe('M-06 · voto de partido (data/votos)', () => {
  let recalculado: Record<Legislatura, VotacionPartidos[]>;
  beforeAll(() => {
    const asignar = crearAsignador(datos, diputados);
    recalculado = Object.fromEntries(LEGS.map((leg) => [leg, dias[leg].flatMap((d) => votosDelDia(d, asignar))])) as typeof recalculado;
  });

  it.each(LEGS)('%s: coincide con el que sale de los datos brutos y la herencia (no se ha editado a mano ni está desfasado)', (leg) => {
    // Si falla tras cambiar partidos.yaml o los datos brutos: pnpm data:votos.
    expect(votos[leg].votaciones).toEqual(recalculado[leg]);
  });

  it.each(LEGS)('%s: hay una entrada por cada votación descargada, sin ids repetidos', (leg) => {
    const ids = votos[leg].votaciones.map((v) => v.id);
    expect(ids.length).toBe(dias[leg].reduce((n, d) => n + d.votaciones.length, 0));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LEGS)('%s: solo aparecen partidos con herencia en esa legislatura', (leg) => {
    const conHerencia = new Set(datos.partidos.filter((p) => p.herencia[leg]?.length).map((p) => p.id));
    const extra = new Set(votos[leg].votaciones.flatMap((v) => Object.keys(v.partidos)).filter((p) => !conHerencia.has(p)));
    expect([...extra]).toEqual([]);
  });

  it('reforma laboral (XIV, 3-02-2022): el PP vota no pero dividido (el sí por error de Casero) y UPN ya no cuenta', () => {
    const v = votacion('XIV', 'XIV-149-20');
    expect(v.partidos.psoe).toMatchObject({ sentido: 'si', dividido: false });
    expect(v.partidos.pp).toMatchObject({ sentido: 'no', dividido: true, si: 1 });
    expect(v.partidos.vox).toMatchObject({ sentido: 'no' });
    expect(v.partidos.erc).toMatchObject({ sentido: 'no' });
    expect(v.partidos.cs).toMatchObject({ sentido: 'si' });
    // Sayas y García Adanero votaron contra el criterio de UPN: desde ese día no cuentan para UPN.
    expect(v.partidos.upn).toBeUndefined();
  });

  it('ley de eutanasia (XIV, 18-03-2021): PSOE sí, PP y Vox no', () => {
    const v = votacion('XIV', 'XIV-85-12');
    expect(v.partidos.psoe!.sentido).toBe('si');
    expect(v.partidos.pp!.sentido).toBe('no');
    expect(v.partidos.vox!.sentido).toBe('no');
  });

  it('XV: los cinco de Podemos siguen contando para Podemos tras pasar al Grupo Mixto', () => {
    const despues = votos.XV.votaciones.filter((v) => v.fecha > '20231205' && v.partidos.podemos);
    expect(despues.length).toBeGreaterThan(1000);
    for (const v of despues) {
      const p = v.partidos.podemos!;
      expect(p.si + p.no + p.abstencion + p.ausente).toBeLessThanOrEqual(5);
    }
  });

  it('XV: las votaciones publicadas sin JSON quedan listadas en sinDatos', () => {
    expect(votos.XV.sinDatos).toHaveLength(14);
  });
});
