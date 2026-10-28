// Votaciones candidatas al catálogo: de cada iniciativa con efecto jurídico, la última votación del
// Pleno sobre la iniciativa entera. Es un criterio mecánico sobre los datos brutos; los criterios
// de selección y etiquetado están en docs/catalogo.md.
//
// La lista no lleva el voto de los partidos a propósito: las votaciones se eligen por lo que dicen
// y a quién afectan, antes de mirar quién votó qué.

import type { DiaCompacto, Legislatura } from './congreso.ts';
import { idVotacion } from './votos.ts';

export type Tipo = 'ley' | 'decreto-ley' | 'toma-en-consideracion' | 'totalidad' | 'estatuto' | 'presupuestos';

export interface Candidata {
  /** Id de la votación decisiva (`<leg>-<sesion>-<numero>`). */
  votacion: string;
  fecha: string;
  tipo: Tipo;
  /** Nombre de la iniciativa tal como lo da el Congreso. */
  iniciativa: string;
  /** "Gobierno" o el grupo o comunidad que la propuso, si consta en el texto. */
  proponente: string;
  /** Qué se votaba en esa votación (título y subgrupo oficiales). */
  votado: string;
  /** Si salió "Sí" (más votos a favor que en contra). */
  ganoSi: boolean;
  /** Todas las votaciones de la iniciativa entera, de la más antigua a la más reciente. */
  todas: string[];
}

/** Tipo de la votación si es sobre una iniciativa entera con efecto jurídico; si no, null. */
export function clasificar(titulo: string, subgrupo: string, textoSubgrupo: string, expediente: string): Tipo | null {
  const sub = `${subgrupo} ${textoSubgrupo}`.toLowerCase();
  // Las enmiendas, votos particulares y votaciones por puntos no deciden sobre la iniciativa entera.
  const parcial = /enmienda|voto particular|votaci[oó]n separada|por puntos|avocaci[oó]n|propuestas del grupo/.test(sub) && !/votaci[oó]n de conjunto/.test(sub);
  if (parcial) return null;
  // Decidir si un decreto ley se tramita además como proyecto de ley es una votación de procedimiento.
  if (/^\s*Tramitaci[oó]n como Proyecto de Ley/i.test(expediente)) return null;
  // Los Presupuestos se votan título a título; la votación sobre el conjunto es la de totalidad.
  if (/^Presupuestos Generales/.test(titulo)) return null;
  if (/Presupuestos Generales del Estado/i.test(expediente)) return /^Debates? de totalidad/.test(titulo) ? 'presupuestos' : null;
  if (/^Convalidaci[oó]n o derogaci[oó]n de Reales Decretos-leyes/.test(titulo)) return 'decreto-ley';
  if (/^Toma en consideraci[oó]n de Proposiciones de Ley/.test(titulo)) return 'toma-en-consideracion';
  if (/Estatutos? de Autonom[ií]a/i.test(titulo) || /Estatuto de Autonom[ií]a/i.test(expediente)) return 'estatuto';
  if (/^Debates? de totalidad de iniciativas legislativas/.test(titulo)) return 'totalidad';
  if (/^Tramitaci[oó]n directa y en lectura [uú]nica de iniciativas legislativas/.test(titulo)) return /totalidad/i.test(expediente) ? 'totalidad' : 'ley';
  if (/^(Dict[aá]menes de Comisiones sobre iniciativas legislativas|Enmiendas del Senado)/.test(titulo)) return 'ley';
  return null;
}

/** Nombre de la iniciativa sin el prefijo de la votación ("Votación del dictamen del…"). */
export function nombreIniciativa(expediente: string): string {
  const m = expediente.trim().match(/(Real Decreto-ley.*|Proyecto de Ley.*|Proposici[oó]n de Ley.*|Propuesta (de|del).*|Ley .*)/);
  return (m?.[1] ?? expediente.trim()).replace(/,? presentadas? por .*$/i, '');
}

/** Nombre normalizado de la iniciativa, para agrupar sus votaciones a lo largo de la tramitación. */
export function claveIniciativa(expediente: string): string {
  // Desde "Ley…" o "Real Decreto-ley…", sin "Proyecto de" / "Proposición de" ni el grupo que la
  // propone, que no siempre aparecen; y solo el principio, porque el final cambia entre votaciones.
  const sinGrupo = expediente.replace(/(?:del?|el) (los )?Grupos? Parlamentarios? .*?, /i, '');
  const m = sinGrupo.match(/(Real Decreto-ley \d+\/\d{4}|Propuesta de reforma[^,]*Estatuto[^,]*|Ley\b[^]*)/);
  const texto = (m?.[1] ?? sinGrupo)
    .replace(/,? (presentadas?|remitida|por tener la misma)\b.*$/i, '')
    .replace(/ \((antes denominad|procedente|corresponde)[^)]*\)/gi, '');
  return texto.toLowerCase().replace(/[^a-záéíóúüñ0-9/ ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
}

export function proponenteDe(expediente: string): string {
  if (/^(Real Decreto-ley|Proyecto de Ley)/i.test(expediente.trim()) || /Proyecto de Ley/i.test(expediente)) return 'Gobierno';
  const grupo = expediente.match(/(?:del?|el) (los )?(Grupos? Parlamentarios? [^,.]+)/i)?.[2];
  if (grupo) return grupo;
  const ccaa = expediente.match(/(Parlamento|Asamblea|Cortes|Junta General) [^,.]+/)?.[0];
  return ccaa ?? 'no consta';
}

/** Candidatas de una legislatura: una por iniciativa, con su votación decisiva. */
export function candidatas(leg: Legislatura, dias: DiaCompacto[]): Candidata[] {
  const porIniciativa = new Map<string, { tipo: Tipo; id: string; fecha: string; expediente: string; votado: string; ganoSi: boolean }[]>();
  for (const dia of [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    for (const v of dia.votaciones) {
      if (v.secreta || v.asentimiento) continue;
      const tipo = clasificar(v.titulo, v.subgrupo, v.textoSubgrupo, v.expediente);
      if (!tipo) continue;
      const clave = claveIniciativa(v.expediente);
      const lista = porIniciativa.get(clave) ?? [];
      lista.push({
        tipo,
        id: idVotacion(leg, v.sesion, v.numero),
        fecha: dia.fecha,
        expediente: v.expediente.trim(),
        votado: [v.titulo, v.subgrupo, v.textoSubgrupo].filter(Boolean).join(' · '),
        ganoSi: v.totales.si > v.totales.no,
      });
      porIniciativa.set(clave, lista);
    }
  }
  return [...porIniciativa.values()]
    .map((lista) => {
      const ultima = lista.at(-1)!;
      // El tipo de la iniciativa: el de su votación más definitoria (ley o decreto antes que la toma).
      const tipo = lista.find((x) => x.tipo === 'decreto-ley' || x.tipo === 'estatuto' || x.tipo === 'presupuestos')?.tipo ?? ultima.tipo;
      const expediente = lista.find((x) => /del? (los )?Grupos? Parlamentarios?/i.test(x.expediente))?.expediente ?? lista[0]!.expediente;
      return {
        votacion: ultima.id,
        fecha: ultima.fecha,
        tipo,
        iniciativa: nombreIniciativa(expediente),
        proponente: proponenteDe(expediente),
        votado: ultima.votado,
        ganoSi: ultima.ganoSi,
        todas: lista.map((x) => x.id),
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.votacion.localeCompare(b.votacion));
}
