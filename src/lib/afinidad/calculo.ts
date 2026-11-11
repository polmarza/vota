// Cálculo de afinidad (docs/data-model.md → Cálculo de afinidad; M-02, M-03, M-11, M-12). Código
// puro: sin DOM ni red. Se ejecuta en el navegador con las respuestas del visitante, que no salen de él.

export const CLAVE_CCAA = 'ccaa';
export const NO_RESPONDE = 'ns';
/** Por debajo de este número de votaciones no se muestra podio (M-03). */
export const MINIMO_VOTACIONES = 5;
export const TAMANO_PODIO = 3;

/** Respuestas del cuestionario por id de pregunta; "ns" o ausente no cumple ninguna condición. */
export type Respuestas = Record<string, string | undefined>;

export interface EfectoFicha {
  cuando: Record<string, string[]>;
  el_si: 'favorece' | 'perjudica';
  justificacion: string;
}

export interface FichaCalculo {
  votacion: string;
  ambito: 'estatal' | string[];
  efectos: EfectoFicha[];
}

export type Sentido = 'si' | 'no' | 'abstencion' | 'ausente' | 'empate';
export interface VotoPartido {
  sentido: Sentido;
  dividido: boolean;
  si: number;
  no: number;
  abstencion: number;
  ausente: number;
}
/** Voto de cada partido por id de votación (solo los partidos con diputados en ella). */
export type VotosPorVotacion = Record<string, Record<string, VotoPartido>>;

export type SentidoPerfil = 'favorece' | 'perjudica' | 'contrapuesta';

const cumple = (e: EfectoFicha, r: Respuestas) =>
  Object.entries(e.cuando).every(([k, v]) => r[k] !== undefined && r[k] !== NO_RESPONDE && v.includes(r[k]!));

/** Respuestas con la comunidad autónoma añadida a partir de la provincia. */
export function conComunidad(respuestas: Respuestas, ccaaDeProvincia: Map<string, string>): Respuestas {
  return { ...respuestas, [CLAVE_CCAA]: ccaaDeProvincia.get(respuestas.provincia ?? '') };
}

/**
 * Cómo afecta una ficha a un perfil: el sentido si los efectos que cumple coinciden, `contrapuesta`
 * si se contradicen (la votación no cuenta) y null si no le afecta o es de otra comunidad (M-11).
 * `respuestas` ya lleva la comunidad (ver conComunidad).
 */
export function sentidoParaPerfil(f: FichaCalculo, respuestas: Respuestas): SentidoPerfil | null {
  if (f.ambito !== 'estatal' && !f.ambito.includes(respuestas[CLAVE_CCAA] ?? '')) return null;
  const sentidos = new Set(f.efectos.filter((e) => cumple(e, respuestas)).map((e) => e.el_si));
  if (sentidos.size === 0) return null;
  return sentidos.size === 2 ? 'contrapuesta' : [...sentidos][0]!;
}

/**
 * Si la ficha podría afectar al perfil cuando conteste las preguntas que le faltan: algún efecto
 * cuyas condiciones se cumplen o dependen solo de preguntas sin contestar todavía (M-12).
 */
export function podriaAfectar(f: FichaCalculo, respuestas: Respuestas, pendientes: Set<string>): boolean {
  if (f.ambito !== 'estatal' && !f.ambito.includes(respuestas[CLAVE_CCAA] ?? '')) return false;
  return f.efectos.some((e) =>
    Object.entries(e.cuando).every(([k, v]) => pendientes.has(k) || (respuestas[k] !== undefined && respuestas[k] !== NO_RESPONDE && v.includes(respuestas[k]!))),
  );
}

export type Postura = 'a-favor' | 'en-contra' | 'abstencion' | 'no-cuenta';

/** Qué hizo el partido respecto al visitante en una votación (punto 3 del cálculo). */
export function postura(voto: VotoPartido | undefined, sentido: 'favorece' | 'perjudica'): Postura {
  if (!voto || voto.sentido === 'ausente' || voto.sentido === 'empate') return 'no-cuenta';
  if (voto.sentido === 'abstencion') return 'abstencion';
  return (voto.sentido === 'si') === (sentido === 'favorece') ? 'a-favor' : 'en-contra';
}

export interface ResultadoPartido {
  partido: string;
  aFavor: number;
  enContra: number;
  abstenciones: number;
  /** Votaciones que cuentan para este partido (a favor + en contra + abstenciones). */
  contadas: number;
  favorable: number;
  desfavorable: number;
}

export interface Resultado {
  /** Votaciones que afectan al perfil, con su sentido (las contrapuestas no cuentan, pero se listan). */
  relevantes: { votacion: string; sentido: SentidoPerfil }[];
  /** Si hay votaciones suficientes para mostrar podio (M-03). */
  suficiente: boolean;
  partidos: ResultadoPartido[];
  favorables: ResultadoPartido[];
  desfavorables: ResultadoPartido[];
}

/**
 * Resultado para un perfil y los partidos que se presentan en su provincia (M-02, M-03). Los
 * podios no repiten partido: quien está en el favorable no entra en el desfavorable.
 */
export function calcular(fichas: FichaCalculo[], votos: VotosPorVotacion, respuestas: Respuestas, partidosEnProvincia: string[]): Resultado {
  const relevantes = fichas.flatMap((f) => {
    const s = sentidoParaPerfil(f, respuestas);
    return s ? [{ votacion: f.votacion, sentido: s }] : [];
  });
  const cuentan = relevantes.filter((r): r is { votacion: string; sentido: 'favorece' | 'perjudica' } => r.sentido !== 'contrapuesta');

  const partidos = partidosEnProvincia
    .map((partido): ResultadoPartido => {
      let aFavor = 0;
      let enContra = 0;
      let abstenciones = 0;
      for (const r of cuentan) {
        const p = postura(votos[r.votacion]?.[partido], r.sentido);
        if (p === 'a-favor') aFavor++;
        else if (p === 'en-contra') enContra++;
        else if (p === 'abstencion') abstenciones++;
      }
      const contadas = aFavor + enContra + abstenciones;
      return { partido, aFavor, enContra, abstenciones, contadas, favorable: contadas ? aFavor / contadas : 0, desfavorable: contadas ? enContra / contadas : 0 };
    })
    .filter((p) => p.contadas > 0);

  const orden = (clave: 'favorable' | 'desfavorable') => (a: ResultadoPartido, b: ResultadoPartido) =>
    b[clave] - a[clave] || b.contadas - a.contadas || a.partido.localeCompare(b.partido);
  const favorables = [...partidos].sort(orden('favorable')).slice(0, TAMANO_PODIO);
  const enFavorable = new Set(favorables.map((p) => p.partido));
  const desfavorables = partidos.filter((p) => !enFavorable.has(p.partido)).sort(orden('desfavorable')).slice(0, TAMANO_PODIO);

  return { relevantes, suficiente: cuentan.length >= MINIMO_VOTACIONES, partidos, favorables, desfavorables };
}
