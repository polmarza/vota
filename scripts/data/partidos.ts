// Herencia de los partidos: qué votos de la XIV y la XV cuentan como de cada partido.
//
// Un voto se atribuye a un partido según la formación por la que se eligió al diputado (o su
// nombre, si vino en una coalición), el grupo desde el que votó y la fecha. El formato de
// data/partidos/partidos.yaml está en docs/data-model.md.

import { z } from 'zod';
import type { Legislatura } from './congreso.ts';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha en formato AAAA-MM-DD');

const esquemaRegla = z
  .object({
    /** Formaciones electorales cuyos diputados cuentan (FORMACIONELECTORAL del Congreso). */
    formaciones: z.array(z.string()).optional(),
    /** Diputados concretos ("Apellidos, Nombre"), para los elegidos en coalición. */
    diputados: z.array(z.string()).optional(),
    /** Solo cuando votan desde estos grupos (códigos de las votaciones: GS, GSUMAR, GMx…). */
    grupos: z.array(z.string()).optional(),
    desde: fecha.optional(),
    hasta: fecha.optional(),
    justificacion: z.string().min(20, 'La justificación tiene que explicar la regla'),
    fuente: z.string().url().optional(),
    /** Lo que no está claro de esta asignación; el jurado lo revisa con especial atención. */
    dudas: z.string().optional(),
  })
  .refine((r) => r.formaciones?.length || r.diputados?.length, 'Cada regla necesita formaciones o diputados');

export type Regla = z.infer<typeof esquemaRegla>;

const esquemaPartido = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string(),
  siglas: z.string(),
  /** Color oficial; se fija y se comprueba en la feature de la web. */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  /**
   * Posición de izquierda (0) a derecha (10): `lrgen` de la Chapel Hill Expert Survey 2024 (o 2019 si
   * no está en la de 2024). Un partido que no está en ninguna lleva `junto_a` (el partido de la CHES con el que se coloca) y su mismo valor.
   * Ordena los partidos en /votaciones.
   */
  posicion_ideologica: z
    .object({
      valor: z.number().min(0).max(10),
      junto_a: z.string().regex(/^[a-z0-9-]+$/).optional(),
      fuente: z.string().min(10, 'La posición tiene que citar su fuente'),
    })
    .optional(),
  herencia: z.object({ XIV: z.array(esquemaRegla).optional(), XV: z.array(esquemaRegla).optional() }),
});

export type Partido = z.infer<typeof esquemaPartido>;

const porLegislatura = z.object({ XIV: z.array(z.string()).default([]), XV: z.array(z.string()).default([]) });

export const esquemaPartidos = z.object({
  /**
   * Nombres con los que un diputado aparece en las votaciones cuando no coinciden con su ficha
   * (p. ej. "Cuesta Rodríguez, María del Socorro" en las votaciones y "Cuesta Rodríguez, María" en
   * la lista de diputados). Clave: nombre en las votaciones; valor: nombre en la ficha.
   */
  alias: z.object({ XIV: z.record(z.string(), z.string()).default({}), XV: z.record(z.string(), z.string()).default({}) }).default({ XIV: {}, XV: {} }),
  /** Formaciones electorales que eran coaliciones: sus diputados se asignan uno a uno por nombre. */
  coaliciones: porLegislatura,
  /** Formaciones cuyos votos no se atribuyen a nadie (partidos disueltos o que no concurren), con motivo. */
  sinPartido: z.array(z.object({ legislatura: z.enum(['XIV', 'XV']), formacion: z.string(), motivo: z.string().min(20) })).default([]),
  /** Diputados de coalición cuyos votos no se atribuyen a nadie (su partido no concurre), con motivo. */
  diputadosSinPartido: z
    .array(z.object({ legislatura: z.enum(['XIV', 'XV']), diputado: z.string(), motivo: z.string().min(20), fuente: z.string().url().optional() }))
    .default([]),
  partidos: z.array(esquemaPartido),
});

export type Partidos = z.infer<typeof esquemaPartidos>;

/** Registro de diputado tal como lo publica el Congreso (data/raw/<leg>/diputados.json). */
export interface DiputadoOficial {
  NOMBRE: string;
  FORMACIONELECTORAL: string;
  CIRCUNSCRIPCION?: string;
  FECHAALTA?: string;
  FECHABAJA?: string;
  GRUPOPARLAMENTARIO?: string;
}

/** Comprobaciones cruzadas del archivo de partidos contra la lista de diputados. Devuelve los errores. */
export function validarPartidos(datos: Partidos, diputados: Record<Legislatura, DiputadoOficial[]>): string[] {
  const errores: string[] = [];
  const ids = new Set<string>();
  for (const p of datos.partidos) {
    if (ids.has(p.id)) errores.push(`Partido repetido: ${p.id}`);
    ids.add(p.id);
  }
  const porId = new Map(datos.partidos.map((p) => [p.id, p]));
  for (const p of datos.partidos) {
    const junto = p.posicion_ideologica?.junto_a;
    if (!junto) continue;
    const socio = porId.get(junto)?.posicion_ideologica;
    if (!socio) errores.push(`${p.id}: posicion_ideologica.junto_a apunta a "${junto}", que no tiene posición`);
    else if (socio.junto_a) errores.push(`${p.id}: posicion_ideologica.junto_a apunta a "${junto}", que tampoco está en la CHES`);
    else if (socio.valor !== p.posicion_ideologica!.valor) errores.push(`${p.id}: su posición tiene que ser la de "${junto}" (${socio.valor})`);
  }
  for (const leg of ['XIV', 'XV'] as const) {
    const nombres = new Set(diputados[leg].map((d) => d.NOMBRE));
    const formaciones = new Set(diputados[leg].map((d) => d.FORMACIONELECTORAL));
    const coaliciones = new Set(datos.coaliciones[leg]);
    const porNombre = new Map<string, string[]>();
    const tramosPorNombre = new Map<string, { id: string; desde: string; hasta: string }[]>();
    for (const p of datos.partidos) {
      for (const r of p.herencia[leg] ?? []) {
        for (const f of r.formaciones ?? []) {
          if (!formaciones.has(f)) errores.push(`${p.id} (${leg}): la formación "${f}" no existe en la ${leg}`);
          if (coaliciones.has(f)) errores.push(`${p.id} (${leg}): "${f}" es una coalición; sus diputados se asignan por nombre`);
        }
        for (const n of r.diputados ?? []) {
          if (!nombres.has(n)) errores.push(`${p.id} (${leg}): no hay ningún diputado "${n}" en la ${leg}`);
          porNombre.set(n, [...(porNombre.get(n) ?? []), p.id]);
          tramosPorNombre.set(n, [...(tramosPorNombre.get(n) ?? []), { id: p.id, desde: r.desde ?? '0000-00-00', hasta: r.hasta ?? '9999-99-99' }]);
        }
        if (r.desde && r.hasta && r.desde > r.hasta) errores.push(`${p.id} (${leg}): "desde" es posterior a "hasta"`);
      }
    }
    for (const d of datos.diputadosSinPartido.filter((x) => x.legislatura === leg)) {
      if (!nombres.has(d.diputado)) errores.push(`sin partido (${leg}): no hay ningún diputado "${d.diputado}" en la ${leg}`);
      if (porNombre.has(d.diputado)) errores.push(`${leg}: "${d.diputado}" está a la vez sin partido y asignado a ${porNombre.get(d.diputado)!.join(', ')}`);
    }
    for (const [enVotaciones, enFicha] of Object.entries(datos.alias[leg])) {
      if (!nombres.has(enFicha)) errores.push(`alias (${leg}): "${enVotaciones}" apunta a "${enFicha}", que no está en la lista de diputados`);
    }
    for (const [n, ps] of porNombre) {
      if (new Set(ps).size < 2) continue;
      // Un cambio de partido a mitad de legislatura se escribe con fechas que no se solapan.
      const t = tramosPorNombre.get(n)!;
      const solapan = t.some((a, i) => t.some((b, j) => i < j && a.id !== b.id && a.desde <= b.hasta && b.desde <= a.hasta));
      if (solapan) errores.push(`${leg}: "${n}" está asignado a varios partidos en las mismas fechas (${[...new Set(ps)].join(', ')})`);
    }
    for (const f of coaliciones) {
      if (!formaciones.has(f)) errores.push(`${leg}: la coalición "${f}" no existe en la ${leg}`);
    }
  }
  return errores;
}

export type Asignador = (leg: Legislatura, diputado: string, grupo: string, fechaAAAAMMDD: string) => string | null;

/**
 * Devuelve la función que atribuye un voto a un partido (o a ninguno). Un nombre listado
 * explícitamente en una regla tiene prioridad sobre las reglas por formación. Si un voto encaja en
 * reglas de dos partidos distintos, lanza un error: la herencia sería ambigua.
 */
export function crearAsignador(datos: Partidos, diputados: Record<Legislatura, DiputadoOficial[]>): Asignador {
  const formacionDe = {
    XIV: new Map(diputados.XIV.map((d) => [d.NOMBRE, d.FORMACIONELECTORAL])),
    XV: new Map(diputados.XV.map((d) => [d.NOMBRE, d.FORMACIONELECTORAL])),
  };
  const conNombre = {
    XIV: new Set(datos.partidos.flatMap((p) => (p.herencia.XIV ?? []).flatMap((r) => r.diputados ?? []))),
    XV: new Set(datos.partidos.flatMap((p) => (p.herencia.XV ?? []).flatMap((r) => r.diputados ?? []))),
  };

  return (leg, nombreEnVotacion, grupo, fechaAAAAMMDD) => {
    const diputado = datos.alias[leg][nombreEnVotacion] ?? nombreEnVotacion;
    const dia = `${fechaAAAAMMDD.slice(0, 4)}-${fechaAAAAMMDD.slice(4, 6)}-${fechaAAAAMMDD.slice(6, 8)}`;
    const formacion = formacionDe[leg].get(diputado);
    const encajan = new Set<string>();
    for (const p of datos.partidos) {
      for (const r of p.herencia[leg] ?? []) {
        const porNombre = r.diputados?.includes(diputado) ?? false;
        const porFormacion =
          !conNombre[leg].has(diputado) && formacion !== undefined && (r.formaciones?.includes(formacion) ?? false);
        if (!porNombre && !porFormacion) continue;
        if (r.grupos && !r.grupos.includes(grupo)) continue;
        if (r.desde && dia < r.desde) continue;
        if (r.hasta && dia > r.hasta) continue;
        encajan.add(p.id);
      }
    }
    if (encajan.size > 1) {
      throw new Error(`${leg} ${dia}: el voto de "${diputado}" (${grupo}) encaja en varios partidos: ${[...encajan].join(', ')}`);
    }
    return [...encajan][0] ?? null;
  };
}

/** Diputados elegidos en coalición que todavía no tienen partido asignado por nombre. */
export function pendientesDeAsignar(datos: Partidos, diputados: Record<Legislatura, DiputadoOficial[]>) {
  const pendientes: { legislatura: Legislatura; nombre: string; formacion: string; circunscripcion: string }[] = [];
  for (const leg of ['XIV', 'XV'] as const) {
    const coaliciones = new Set(datos.coaliciones[leg]);
    const asignados = new Set([
      ...datos.partidos.flatMap((p) => (p.herencia[leg] ?? []).flatMap((r) => r.diputados ?? [])),
      ...datos.diputadosSinPartido.filter((d) => d.legislatura === leg).map((d) => d.diputado),
    ]);
    const vistos = new Set<string>();
    for (const d of diputados[leg]) {
      // Un diputado que cambió de grupo aparece en varios registros.
      if (vistos.has(d.NOMBRE)) continue;
      vistos.add(d.NOMBRE);
      if (coaliciones.has(d.FORMACIONELECTORAL) && !asignados.has(d.NOMBRE)) {
        pendientes.push({ legislatura: leg, nombre: d.NOMBRE, formacion: d.FORMACIONELECTORAL, circunscripcion: d.CIRCUNSCRIPCION ?? '' });
      }
    }
  }
  return pendientes;
}

/** Formaciones con diputados que no cubre ninguna regla, ni la lista de coaliciones, ni `sinPartido`. */
export function formacionesSinCubrir(datos: Partidos, diputados: Record<Legislatura, DiputadoOficial[]>) {
  const salida: { legislatura: Legislatura; formacion: string; diputados: number }[] = [];
  for (const leg of ['XIV', 'XV'] as const) {
    const cubiertas = new Set([
      ...datos.coaliciones[leg],
      ...datos.sinPartido.filter((s) => s.legislatura === leg).map((s) => s.formacion),
      ...datos.partidos.flatMap((p) => (p.herencia[leg] ?? []).flatMap((r) => r.formaciones ?? [])),
    ]);
    const cuenta = new Map<string, number>();
    for (const d of diputados[leg]) if (!cubiertas.has(d.FORMACIONELECTORAL)) cuenta.set(d.FORMACIONELECTORAL, (cuenta.get(d.FORMACIONELECTORAL) ?? 0) + 1);
    for (const [formacion, n] of cuenta) salida.push({ legislatura: leg, formacion, diputados: n });
  }
  return salida;
}

/**
 * Partidos de izquierda a derecha (posicion_ideologica). Los que van "junto a" otro se colocan justo
 * después de él, en el orden del archivo; los que no tienen posición, al final.
 */
export function ordenIdeologico<T extends Pick<Partido, 'id' | 'posicion_ideologica'>>(partidos: T[]): T[] {
  const indice = new Map(partidos.map((p, i) => [p.id, i]));
  const clave = (p: T) => [p.posicion_ideologica?.valor ?? Infinity, p.posicion_ideologica?.junto_a ? 1 : 0, indice.get(p.id)!] as const;
  return [...partidos].sort((a, b) => {
    const [x, y] = [clave(a), clave(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
}
