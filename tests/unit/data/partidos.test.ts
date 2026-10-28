import { describe, expect, it } from 'vitest';
import {
  crearAsignador,
  esquemaPartidos,
  pendientesDeAsignar,
  validarPartidos,
  type DiputadoOficial,
  type Partidos,
} from '../../../scripts/data/partidos.ts';

const J = 'Justificación de prueba suficientemente larga.';

const diputados: Record<'XIV' | 'XV', DiputadoOficial[]> = {
  XIV: [
    { NOMBRE: 'Rojo, Ana', FORMACIONELECTORAL: 'PA' },
    { NOMBRE: 'Azul, Luis', FORMACIONELECTORAL: 'PA' },
    { NOMBRE: 'Verde, Eva', FORMACIONELECTORAL: 'COALICION' },
    { NOMBRE: 'Gris, Pau', FORMACIONELECTORAL: 'COALICION' },
    { NOMBRE: 'Negro, Iu', FORMACIONELECTORAL: 'COALICION' },
  ],
  XV: [{ NOMBRE: 'Rojo, Ana', FORMACIONELECTORAL: 'PA' }],
};

const base = (o: Partial<Record<keyof Partidos, unknown>> = {}): Partidos =>
  esquemaPartidos.parse({
    alias: { XIV: { 'Rojo Pérez, Ana': 'Rojo, Ana' } },
    coaliciones: { XIV: ['COALICION'] },
    diputadosSinPartido: [{ legislatura: 'XIV', diputado: 'Negro, Iu', motivo: 'Su partido no concurre a estas elecciones.' }],
    partidos: [
      {
        id: 'a', nombre: 'Partido A', siglas: 'A',
        herencia: {
          XIV: [
            { formaciones: ['PA'], grupos: ['GA', ''], justificacion: J },
            { diputados: ['Verde, Eva'], hasta: '2021-06-30', justificacion: J },
          ],
          XV: [{ formaciones: ['PA'], justificacion: J }],
        },
      },
      {
        id: 'b', nombre: 'Partido B', siglas: 'B',
        herencia: {
          XIV: [
            { diputados: ['Gris, Pau'], justificacion: J },
            { diputados: ['Verde, Eva'], desde: '2021-08-01', justificacion: J },
            { diputados: ['Azul, Luis'], grupos: ['GB'], justificacion: J },
          ],
        },
      },
    ],
    ...o,
  });

describe('M-06 · herencia: a qué partido cuenta cada voto', () => {
  const asignar = crearAsignador(base(), diputados);

  it('por formación electoral, mientras vota desde los grupos de la regla', () => {
    expect(asignar('XIV', 'Rojo, Ana', 'GA', '20200301')).toBe('a');
    expect(asignar('XIV', 'Rojo, Ana', '', '20200301')).toBe('a');
    expect(asignar('XIV', 'Rojo, Ana', 'GMx', '20220301')).toBeNull();
  });

  it('una regla por nombre tiene prioridad sobre la de su formación', () => {
    // Azul fue elegido en la lista de A, pero su regla por nombre lo lleva a B mientras vota en GB.
    expect(asignar('XIV', 'Azul, Luis', 'GB', '20220301')).toBe('b');
    expect(asignar('XIV', 'Azul, Luis', 'GA', '20220301')).toBeNull();
  });

  it('respeta las fechas de un cambio de partido, y el hueco entre ellas no cuenta para nadie', () => {
    expect(asignar('XIV', 'Verde, Eva', 'GC', '20210630')).toBe('a');
    expect(asignar('XIV', 'Verde, Eva', 'GC', '20210715')).toBeNull();
    expect(asignar('XIV', 'Verde, Eva', 'GC', '20210801')).toBe('b');
  });

  it('cada legislatura tiene su propia herencia', () => {
    expect(asignar('XV', 'Rojo, Ana', 'GMx', '20240101')).toBe('a');
  });

  it('resuelve los nombres de las votaciones que no casan con la ficha mediante alias', () => {
    expect(asignar('XIV', 'Rojo Pérez, Ana', 'GA', '20200301')).toBe('a');
  });

  it('un diputado sin partido no cuenta para nadie', () => {
    expect(asignar('XIV', 'Negro, Iu', 'GC', '20200301')).toBeNull();
  });

  it('lanza un error si un voto encaja en dos partidos', () => {
    const ambiguo = base();
    ambiguo.partidos[1]!.herencia.XIV!.push({ formaciones: ['PA'], justificacion: J });
    expect(() => crearAsignador(ambiguo, diputados)('XIV', 'Rojo, Ana', 'GA', '20200301')).toThrow(/varios partidos/);
  });
});

describe('M-06 · validación de partidos.yaml', () => {
  it('el archivo de prueba es válido', () => {
    expect(validarPartidos(base(), diputados)).toEqual([]);
  });

  it('detecta formaciones y diputados que no existen, y coaliciones asignadas por formación', () => {
    const d = base();
    d.partidos[0]!.herencia.XIV!.push({ formaciones: ['INVENTADA', 'COALICION'], diputados: ['Nadie, Nadie'], justificacion: J });
    const errores = validarPartidos(d, diputados);
    expect(errores).toContainEqual(expect.stringContaining('"INVENTADA" no existe'));
    expect(errores).toContainEqual(expect.stringContaining('"COALICION" es una coalición'));
    expect(errores).toContainEqual(expect.stringContaining('"Nadie, Nadie"'));
  });

  it('detecta a un diputado en dos partidos en las mismas fechas, pero acepta un cambio sin solape', () => {
    const d = base();
    d.partidos[1]!.herencia.XIV![1] = { diputados: ['Verde, Eva'], desde: '2021-06-01', justificacion: J };
    expect(validarPartidos(d, diputados)).toContainEqual(expect.stringContaining('en las mismas fechas'));
  });

  it('detecta a un diputado a la vez sin partido y asignado', () => {
    const d = base({
      diputadosSinPartido: [{ legislatura: 'XIV', diputado: 'Gris, Pau', motivo: 'Su partido no concurre a estas elecciones.' }],
    });
    expect(validarPartidos(d, diputados)).toContainEqual(expect.stringContaining('a la vez sin partido'));
  });

  it('lista los diputados de coalición que todavía no tienen partido', () => {
    const d = base({ diputadosSinPartido: [] });
    expect(pendientesDeAsignar(d, diputados).map((p) => p.nombre)).toEqual(['Negro, Iu']);
  });

  it('exige justificación en cada regla', () => {
    expect(() => base({ partidos: [{ id: 'x', nombre: 'X', siglas: 'X', herencia: { XIV: [{ formaciones: ['PA'], justificacion: 'corta' }] } }] })).toThrow();
  });
});
