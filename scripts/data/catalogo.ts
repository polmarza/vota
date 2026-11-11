// Catálogo de votaciones: esquemas de las fichas (data/catalogo/), las preguntas
// (data/preguntas.yaml) y el territorio (data/territorio.yaml), y su validación cruzada con el voto
// de partido (data/votos/). El formato está en docs/data-model.md.

import { z } from 'zod';
import type { Candidata } from './candidatas.ts';
import type { VotacionPartidos } from './votos.ts';

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Identificador en minúsculas y guiones');
const texto = (min: number, que: string) => z.string().trim().min(min, `${que}: al menos ${min} caracteres`);
const urlDe = (dominios: string[], que: string) =>
  z
    .string()
    .url()
    .refine((u) => dominios.some((d) => new URL(u).hostname === d || new URL(u).hostname.endsWith(`.${d}`)), `${que} tiene que estar en ${dominios.join(' o ')}`);

/** Clave especial de las condiciones: la comunidad autónoma, que sale de la provincia. */
export const CLAVE_CCAA = 'ccaa';
export const NO_RESPONDE = 'ns';

// ─── Territorio ─────────────────────────────────────────────────────────────────

export const esquemaTerritorio = z.object({
  comunidades: z.array(z.object({ id: slug, nombre: z.string() })).length(19),
  provincias: z
    .array(
      z.object({
        id: slug,
        nombre: z.string(),
        ccaa: slug,
        /** Otros nombres que acepta el autocompletado (Vizcaya, Gerona…). */
        alias: z.array(z.string()).default([]),
      }),
    )
    .length(52),
});
export type Territorio = z.infer<typeof esquemaTerritorio>;

// ─── Preguntas ──────────────────────────────────────────────────────────────────

export const esquemaPregunta = z
  .object({
    id: slug,
    bloque: z.enum(['basico', 'ampliado']),
    orden: z.number().int().positive(),
    enunciado: texto(5, 'enunciado'),
    subtitulo: z.string().optional(),
    tipo: z.enum(['opciones', 'provincia']),
    opciones: z.array(z.object({ id: slug, texto: z.string().min(1) })).default([]),
    obligatoria: z.boolean().default(false),
  })
  .superRefine((p, ctx) => {
    if (p.tipo === 'provincia') return;
    if (p.opciones.length < 3) ctx.addIssue({ code: 'custom', message: `${p.id}: necesita al menos dos opciones más "Prefiero no responder"` });
    if (!p.opciones.some((o) => o.id === NO_RESPONDE)) ctx.addIssue({ code: 'custom', message: `${p.id}: falta la opción "${NO_RESPONDE}" (Prefiero no responder)` });
    if (p.obligatoria) ctx.addIssue({ code: 'custom', message: `${p.id}: solo la provincia es obligatoria` });
  });
export const esquemaPreguntas = z.array(esquemaPregunta);
export type Pregunta = z.infer<typeof esquemaPregunta>;

// ─── Fichas ─────────────────────────────────────────────────────────────────────

export const esquemaEfecto = z.object({
  /** Condición sobre las respuestas; varias claves deben cumplirse todas. */
  cuando: z.record(z.string(), z.array(z.string()).min(1)).refine((c) => Object.keys(c).length > 0, 'La condición no puede estar vacía'),
  el_si: z.enum(['favorece', 'perjudica']),
  justificacion: texto(30, 'justificación del efecto'),
  /** Artículo o medida concreta del texto en que se basa el efecto. */
  base: texto(10, 'base del efecto'),
});
export type Efecto = z.infer<typeof esquemaEfecto>;

export const esquemaFicha = z.object({
  votacion: z.string().regex(/^(XIV|XV)-\d+-\d+$/, 'Id de votación <leg>-<sesion>-<numero>'),
  url: urlDe(['congreso.es'], 'La URL de la votación'),
  texto: urlDe(['boe.es', 'congreso.es'], 'El texto (BOE o Boletín de las Cortes)'),
  /** Tipo de iniciativa y quién la propuso: "Proyecto de ley del Gobierno". */
  iniciativa: texto(10, 'iniciativa'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  titulo_oficial: texto(10, 'título oficial'),
  titulo: texto(5, 'título'),
  resumen: texto(60, 'resumen'),
  que_significa_si: texto(20, 'qué significa el sí'),
  tema: slug,
  ambito: z.union([z.literal('estatal'), z.array(slug).min(1)]),
  efectos: z.array(esquemaEfecto).min(1),
  justificacion: texto(40, 'justificación de la selección'),
  fuentes: z.array(z.string().url()).default([]),
});
export type Ficha = z.infer<typeof esquemaFicha>;

// ─── Validación cruzada ─────────────────────────────────────────────────────────

export interface Catalogo {
  /** Fichas por nombre de archivo, sin extensión. */
  fichas: Map<string, Ficha>;
  preguntas: Pregunta[];
  territorio: Territorio;
  /** Voto de partido de las dos legislaturas, por id de votación. */
  votos: Map<string, VotacionPartidos>;
  /** Universo de candidatas (data/candidatas/): una por iniciativa. */
  candidatas: Candidata[];
}

const aFecha = (f: string) => `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`;

/** Comprobaciones entre fichas, preguntas, territorio y votos. Devuelve los errores. */
export function validarCatalogo({ fichas, preguntas, territorio, votos, candidatas }: Catalogo): string[] {
  const errores: string[] = [];
  const ccaa = new Set(territorio.comunidades.map((c) => c.id));
  const porPregunta = new Map(preguntas.map((p) => [p.id, p]));

  // Territorio y preguntas.
  for (const p of territorio.provincias) if (!ccaa.has(p.ccaa)) errores.push(`territorio: ${p.id} apunta a la comunidad "${p.ccaa}", que no existe`);
  const repetidas = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of repetidas(territorio.provincias.map((p) => p.id))) errores.push(`territorio: provincia repetida ${id}`);
  for (const id of repetidas(preguntas.map((p) => p.id))) errores.push(`preguntas: id repetido ${id}`);
  const provincia = preguntas.filter((p) => p.tipo === 'provincia');
  if (provincia.length !== 1 || !provincia[0]!.obligatoria || provincia[0]!.bloque !== 'basico') {
    errores.push('preguntas: tiene que haber una sola pregunta de provincia, obligatoria y en el bloque básico');
  }
  for (const bloque of ['basico', 'ampliado'] as const) {
    for (const o of repetidas(preguntas.filter((p) => p.bloque === bloque).map((p) => String(p.orden)))) errores.push(`preguntas: orden ${o} repetido en el bloque ${bloque}`);
  }

  // Fichas.
  const usadas = new Set<string>();
  // Cada votación de una iniciativa apunta a su candidata; una ficha por candidata.
  const candidataDe = new Map(candidatas.flatMap((c) => c.todas.map((id) => [id, c] as const)));
  const fichaDe = new Map<Candidata, string>();
  for (const [archivo, f] of fichas) {
    const e = (m: string) => errores.push(`${archivo}: ${m}`);
    if (archivo !== f.votacion) e(`el archivo debe llamarse como la votación (${f.votacion})`);
    const v = votos.get(f.votacion);
    if (!v) e(`la votación ${f.votacion} no está en data/votos`);
    else {
      if (v.secreta || v.asentimiento || Object.keys(v.partidos).length === 0) e('la votación no tiene voto nominal (secreta o por asentimiento)');
      if (aFecha(v.fecha) !== f.fecha) e(`la fecha ${f.fecha} no coincide con la de la votación (${aFecha(v.fecha)})`);
    }
    const c = candidataDe.get(f.votacion);
    if (!c) e('la votación no está entre las candidatas (data/candidatas): no es una votación sobre una iniciativa entera con efecto jurídico');
    else {
      if (fichaDe.has(c)) e(`la iniciativa ya está en ${fichaDe.get(c)} (una votación por iniciativa)`);
      fichaDe.set(c, archivo);
    }

    if (f.ambito !== 'estatal') {
      for (const c of f.ambito) if (!ccaa.has(c)) e(`ámbito: la comunidad "${c}" no existe`);
      const cubiertas = new Set<string>();
      for (const ef of f.efectos) {
        const cs = ef.cuando[CLAVE_CCAA];
        if (!cs) e('en una votación territorial, cada efecto tiene que indicar sus comunidades');
        for (const c of cs ?? []) {
          if (!f.ambito.includes(c)) e(`un efecto aplica a "${c}", que no está en el ámbito`);
          cubiertas.add(c);
        }
      }
      for (const c of f.ambito) if (!cubiertas.has(c)) e(`la comunidad "${c}" está en el ámbito pero ningún efecto dice si le favorece o le perjudica`);
    }

    for (const ef of f.efectos) {
      for (const [clave, valores] of Object.entries(ef.cuando)) {
        if (clave === CLAVE_CCAA) {
          for (const c of valores) if (!ccaa.has(c)) e(`condición: la comunidad "${c}" no existe`);
          continue;
        }
        const p = porPregunta.get(clave);
        if (!p || p.tipo !== 'opciones') {
          e(`condición: no hay ninguna pregunta de opciones "${clave}"`);
          continue;
        }
        usadas.add(clave);
        const ids = new Set(p.opciones.map((o) => o.id));
        for (const val of valores) {
          if (val === NO_RESPONDE) e(`condición: "${NO_RESPONDE}" no puede cumplir ninguna condición (${clave})`);
          else if (!ids.has(val)) e(`condición: la pregunta "${clave}" no tiene la opción "${val}"`);
        }
      }
    }
  }

  // Cada pregunta existe porque alguna votación depende de ella (M-01).
  for (const p of preguntas) if (p.tipo === 'opciones' && !usadas.has(p.id)) errores.push(`preguntas: "${p.id}" no la usa ninguna ficha del catálogo`);
  return errores;
}

// ─── Qué votaciones afectan a un perfil ─────────────────────────────────────────

/** Respuestas del cuestionario por id de pregunta; "ns" o ausente no cumple ninguna condición. */
export type Respuestas = Record<string, string | undefined>;

/**
 * Sentido de una ficha para un perfil: `favorece` o `perjudica` si los efectos que cumple coinciden,
 * `contrapuesta` si se contradicen (la votación no cuenta) y null si no le afecta (docs/data-model.md).
 */
export function sentidoParaPerfil(f: Ficha, respuestas: Respuestas, ccaaDeProvincia: Map<string, string>): 'favorece' | 'perjudica' | 'contrapuesta' | null {
  const r: Respuestas = { ...respuestas, [CLAVE_CCAA]: ccaaDeProvincia.get(respuestas.provincia ?? '') };
  if (f.ambito !== 'estatal' && !f.ambito.includes(r[CLAVE_CCAA] ?? '')) return null;
  const cumple = (e: Efecto) => Object.entries(e.cuando).every(([k, v]) => r[k] !== undefined && r[k] !== NO_RESPONDE && v.includes(r[k]!));
  const sentidos = new Set(f.efectos.filter(cumple).map((e) => e.el_si));
  if (sentidos.size === 0) return null;
  return sentidos.size === 2 ? 'contrapuesta' : [...sentidos][0]!;
}
