// Explorador del catálogo (S-01): prepara en el build, desde data/, lo que enseña /votaciones. Solo se
// usa desde el frontmatter de Astro (Node), nunca en el navegador.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAVE_CCAA } from './afinidad/calculo.ts';
import { cargarCatalogo, cargarPartidos, cargarPreguntas, cargarTerritorio, cargarVotos } from './datos.ts';
import { ordenIdeologico } from '../../scripts/data/partidos.ts';
import type { Registro } from '../../scripts/data/jurado.ts';
import { estiloPartido, etiquetaVoto, fechaCorta } from '../scripts/resultado.ts';

/** Nombre de cada tema del catálogo (el campo `tema` de las fichas). */
const TEMAS: Record<string, string> = {
  campo: 'Campo',
  cuidados: 'Cuidados',
  educacion: 'Educación',
  empleo: 'Empleo',
  energia: 'Energía',
  familia: 'Familia',
  fiscalidad: 'Impuestos',
  animales: 'Animales',
  pensiones: 'Pensiones',
  presupuestos: 'Presupuestos',
  sanidad: 'Sanidad',
  territorio: 'Territorio',
  transporte: 'Transporte',
  vivienda: 'Vivienda',
};
export const nombreTema = (t: string) => TEMAS[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ');

export interface VotoExplorador {
  partido: string;
  siglas: string;
  nombre: string;
  estilo: string;
  pildora: string;
  si: boolean;
  desglose?: string;
}

export interface EfectoExplorador {
  /** A quién afecta, con el texto de las preguntas y opciones del test. */
  condicion: string;
  sentido: string;
  justificacion: string;
}

export interface JuradoExplorador {
  estado: 'aprobada' | 'corregida' | 'sin-consenso' | 'pendiente';
  texto: string;
  /** Una línea por elemento revisado: "Resumen: 5 de 5 jueces de acuerdo". */
  detalle: string[];
}

export interface VotacionExplorador {
  id: string;
  legislatura: 'XIV' | 'XV';
  fecha: string;
  fechaTexto: string;
  tema: string;
  temaNombre: string;
  titulo: string;
  iniciativa: string;
  resumen: string;
  queSignificaSi: string;
  /** "En toda España" o las comunidades a las que se limita. */
  ambito: string;
  efectos: EfectoExplorador[];
  votos: VotoExplorador[];
  jurado: JuradoExplorador;
  url: string;
  texto: string;
}

const RUTA_JURADO = join(process.cwd(), 'data', 'jurado', 'catalogo.json');

/**
 * Veredicto del jurado de una ficha: su resumen (fidelidad) y cada efecto. Se lee tal cual de
 * data/jurado/catalogo.json; que siga vigente para la ficha actual lo comprueba pnpm data:validar
 * antes de cada build de producción (una ficha con un veredicto caducado no se publica).
 */
function veredicto(id: string, efectos: number, registros: Map<string, Registro>): JuradoExplorador {
  const elementos = [
    { id: `${id}:fidelidad`, nombre: 'Resumen' },
    ...Array.from({ length: efectos }, (_, i) => ({ id: `${id}:efecto:${i + 1}`, nombre: efectos > 1 ? `Efecto ${i + 1}` : 'Efecto' })),
  ];
  const detalle: string[] = [];
  const estados = elementos.map(({ id: e, nombre }) => {
    const r = registros.get(e);
    if (!r || r.resultado === 'pendiente') {
      detalle.push(`${nombre}: pendiente de revisión`);
      return 'pendiente';
    }
    // La ronda que decidió: la segunda si la hubo.
    const ronda = r.ronda2 ?? r.ronda1 ?? [];
    const acuerdo = ronda.filter((x) => x.estado === 'ok' && x.respuesta === r.decision).length;
    if (r.resultado === 'sin-consenso') detalle.push(`${nombre}: sin consenso del jurado`);
    else detalle.push(`${nombre}: ${acuerdo} de ${ronda.length} jueces de acuerdo${r.ronda2 ? ' en la segunda ronda' : ''}`);
    return r.resultado;
  });
  if (estados.includes('pendiente')) return { estado: 'pendiente', texto: 'Pendiente de revisión del jurado', detalle };
  if (estados.includes('sin-consenso')) return { estado: 'sin-consenso', texto: 'Sin consenso del jurado en algún punto', detalle };
  if (estados.includes('decidido')) return { estado: 'corregida', texto: 'Corregida según el jurado', detalle };
  return { estado: 'aprobada', texto: 'Aprobada por el jurado', detalle };
}

/** Todas las votaciones del catálogo, de la más reciente a la más antigua, listas para pintar. */
export function votacionesExplorador(): VotacionExplorador[] {
  const catalogo = cargarCatalogo();
  const votos = cargarVotos(catalogo.map((f) => f.votacion));
  const partidos = ordenIdeologico(cargarPartidos());
  const preguntas = new Map(cargarPreguntas().map((p) => [p.id, p]));
  const ccaa = new Map(cargarTerritorio().comunidades.map((c) => [c.id, c.nombre]));
  const registros = new Map(
    (existsSync(RUTA_JURADO) ? (JSON.parse(readFileSync(RUTA_JURADO, 'utf8')) as Registro[]) : []).map((r) => [r.id, r]),
  );

  const lista = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} o ${xs.at(-1)}`);
  const condicion = (cuando: Record<string, string[]>) => {
    const partes = Object.entries(cuando).map(([clave, valores]) => {
      if (clave === CLAVE_CCAA) return `vive en ${lista(valores.map((v) => ccaa.get(v) ?? v))}`;
      const p = preguntas.get(clave);
      if (!p) throw new Error(`La ficha cita la pregunta "${clave}", que no existe en data/preguntas.yaml`);
      const textos = valores.map((v) => p.opciones?.find((o) => o.id === v)?.texto ?? v);
      return `responde ${lista(textos.map((t) => `«${t}»`))} a «${p.enunciado}»`;
    });
    return `Quien ${partes.join(' y ')}`;
  };

  return catalogo
    .map((f) => {
      const delVoto = votos[f.votacion] ?? {};
      return {
        id: f.votacion,
        legislatura: f.votacion.startsWith('XIV-') ? 'XIV' : 'XV',
        fecha: f.fecha,
        fechaTexto: fechaCorta(f.fecha),
        tema: f.tema,
        temaNombre: nombreTema(f.tema),
        titulo: f.titulo,
        iniciativa: f.iniciativa,
        resumen: f.resumen,
        queSignificaSi: f.que_significa_si,
        ambito: f.ambito === 'estatal' ? 'En toda España' : `Solo en ${lista(f.ambito.map((c) => ccaa.get(c) ?? c))}`,
        efectos: f.efectos.map((e) => ({ condicion: condicion(e.cuando), sentido: e.el_si === 'favorece' ? 'El sí le favorecía' : 'El sí le perjudicaba', justificacion: e.justificacion })),
        // Todos los partidos con voto en esa votación, se presenten o no el 29-N.
        votos: partidos
          .filter((p) => delVoto[p.id])
          .map((p) => ({ partido: p.id, siglas: p.siglas, nombre: p.nombre, estilo: estiloPartido(p.color), ...etiquetaVoto(delVoto[p.id]) })),
        jurado: veredicto(f.votacion, f.efectos.length, registros),
        url: f.url,
        texto: f.texto,
      } satisfies VotacionExplorador;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id));
}
