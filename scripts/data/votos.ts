// Voto de partido: cómo votó cada partido en cada votación, a partir del voto nominal de sus
// diputados y de la herencia de data/partidos/partidos.yaml. El formato está en docs/data-model.md.

import { expandirVotos, type DiaCompacto, type Legislatura } from './congreso.ts';
import type { Asignador } from './partidos.ts';

export type Sentido = 'si' | 'no' | 'abstencion' | 'ausente' | 'empate';

export interface Desglose {
  si: number;
  no: number;
  abstencion: number;
  /** Diputados del partido que figuran en la votación como "No vota". */
  ausente: number;
}

export interface VotoPartido extends Desglose {
  sentido: Sentido;
  /** Algún diputado presente votó distinto del sentido del partido. */
  dividido: boolean;
}

export interface VotacionPartidos {
  /** `<leg>-<sesion>-<numero>`, el mismo que usan las fichas del catálogo. */
  id: string;
  fecha: string;
  /** Aprobada por asentimiento: no hay voto nominal. */
  asentimiento?: true;
  /** Secreta: el Congreso publica los totales, pero no el voto nominal. */
  secreta?: true;
  /** Solo los partidos con algún diputado en la votación. */
  partidos: Record<string, VotoPartido>;
}

export const idVotacion = (leg: Legislatura, sesion: number, numero: number) => `${leg}-${sesion}-${numero}`;

/**
 * Sentido de un partido según la mayoría de sus diputados presentes (sí, no o abstención).
 * Si no votó ninguno, `ausente`; si las dos opciones más votadas empatan, `empate`.
 */
export function sentidoDe(d: Desglose): VotoPartido {
  const presentes: [Exclude<Sentido, 'ausente' | 'empate'>, number][] = [
    ['si', d.si],
    ['no', d.no],
    ['abstencion', d.abstencion],
  ];
  const total = d.si + d.no + d.abstencion;
  if (total === 0) return { ...d, sentido: 'ausente', dividido: false };
  const [primero, segundo] = [...presentes].sort((a, b) => b[1] - a[1]);
  if (primero![1] === segundo![1]) return { ...d, sentido: 'empate', dividido: true };
  return { ...d, sentido: primero![0], dividido: primero![1] < total };
}

/** Voto de cada partido en las votaciones de un día. */
export function votosDelDia(dia: DiaCompacto, asignar: Asignador): VotacionPartidos[] {
  return dia.votaciones.map((v) => {
    const base = { id: idVotacion(dia.legislatura, v.sesion, v.numero), fecha: dia.fecha };
    if (v.asentimiento) return { ...base, asentimiento: true, partidos: {} };
    if (v.secreta) return { ...base, secreta: true, partidos: {} };
    const desgloses = new Map<string, Desglose>();
    for (const x of expandirVotos(dia, v)) {
      const partido = asignar(dia.legislatura, x.diputado, x.grupo, dia.fecha);
      if (!partido) continue;
      const d = desgloses.get(partido) ?? { si: 0, no: 0, abstencion: 0, ausente: 0 };
      if (x.voto === 'S') d.si++;
      else if (x.voto === 'N') d.no++;
      else if (x.voto === 'A') d.abstencion++;
      else d.ausente++;
      desgloses.set(partido, d);
    }
    const partidos = Object.fromEntries([...desgloses].sort(([a], [b]) => a.localeCompare(b)).map(([p, d]) => [p, sentidoDe(d)]));
    return { ...base, partidos };
  });
}
