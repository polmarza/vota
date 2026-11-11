// Qué impide publicar el catálogo según el jurado (M-10). Una ficha se publica solo si su fidelidad
// y cada uno de sus efectos tienen un veredicto vigente (mismo hash que la pregunta actual) y
// aprobado. Lo usa pnpm data:validar, que se ejecuta antes de cada build.

import { hashElemento, type Elemento, type Registro } from './jurado.ts';

export const CONJUNTO = 'catalogo:conjunto';

/** Errores que bloquean la publicación, uno por elemento sin veredicto vigente y aprobado. */
export function bloqueosDelJurado(elementos: Elemento[], registros: Registro[]): string[] {
  const porId = new Map(registros.map((r) => [r.id, r]));
  const errores: string[] = [];
  for (const e of elementos) {
    const r = porId.get(e.id);
    if (!r || r.resultado === 'pendiente') {
      errores.push(`${e.id}: sin veredicto del jurado (pnpm data:jurado-catalogo)`);
      continue;
    }
    if (r.hash !== hashElemento(e)) {
      errores.push(`${e.id}: el veredicto caducó porque la ficha cambió (pnpm data:jurado-catalogo)`);
      continue;
    }
    // La revisión del conjunto se publica en "Cómo funciona", pero no es la etiqueta de una ficha.
    if (e.id === CONJUNTO || r.resultado === 'aprobado') continue;
    if (r.resultado === 'sin-consenso') {
      errores.push(e.id.endsWith(':fidelidad') ? `${e.id}: sin consenso del jurado sobre el resumen; la ficha no se publica` : `${e.id}: sin consenso del jurado; hay que quitar el efecto`);
    } else {
      errores.push(`${e.id}: el jurado responde "${r.decision}" frente a "${r.esperado}"; hay que corregir la ficha o descartarla`);
    }
  }
  return errores;
}
