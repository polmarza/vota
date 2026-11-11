// Recorrido del cuestionario (M-01): bloque básico, resultado provisional, bloque ampliado y
// resultado final. Código puro; las respuestas viven solo en memoria del navegador (M-08).

export interface PreguntaTest {
  id: string;
  bloque: 'basico' | 'ampliado';
  orden: number;
  etiqueta: string;
  tipo: 'opciones' | 'provincia';
  obligatoria: boolean;
  /** Solo se pregunta si las respuestas anteriores cumplen esta condición. */
  soloSi?: Record<string, string[]>;
}

/** Cada paso del recorrido: una pregunta o una de las dos pantallas de resultado. */
export type Paso = { tipo: 'pregunta'; pregunta: string } | { tipo: 'provisional' } | { tipo: 'final' };

/** Los pasos en orden: preguntas básicas, provisional, preguntas ampliadas, final. */
export function recorrido(preguntas: PreguntaTest[]): Paso[] {
  const bloque = (b: PreguntaTest['bloque']) =>
    preguntas
      .filter((p) => p.bloque === b)
      .sort((x, y) => x.orden - y.orden)
      .map((p): Paso => ({ tipo: 'pregunta', pregunta: p.id }));
  return [...bloque('basico'), { tipo: 'provisional' }, ...bloque('ampliado'), { tipo: 'final' }];
}

/** Si la pregunta se hace con estas respuestas (las condicionales solo cuando se cumple su condición). */
export function aplica(p: PreguntaTest, respuestas: Record<string, string>): boolean {
  return Object.entries(p.soloSi ?? {}).every(([clave, valores]) => respuestas[clave] !== undefined && valores.includes(respuestas[clave]!));
}

/**
 * Las respuestas que cuentan: se descartan las de preguntas que ya no aplican (quien contestó el
 * contrato y luego volvió atrás y cambió de situación laboral).
 */
export function respuestasEfectivas(preguntas: PreguntaTest[], respuestas: Record<string, string>): Record<string, string> {
  const efectivas = { ...respuestas };
  for (const p of preguntas) if (!aplica(p, efectivas)) delete efectivas[p.id];
  return efectivas;
}

/**
 * Etiqueta de progreso dentro del bloque: "Vivienda · 2 de 8". Con respuestas, solo cuenta las
 * preguntas que aplican; sin ellas (en el build), todas.
 */
export function progreso(preguntas: PreguntaTest[], id: string, respuestas?: Record<string, string>): { texto: string; fraccion: number } {
  const p = preguntas.find((x) => x.id === id)!;
  const delBloque = preguntas
    .filter((x) => x.bloque === p.bloque && (x.id === id || !respuestas || aplica(x, respuestas)))
    .sort((x, y) => x.orden - y.orden);
  const n = delBloque.findIndex((x) => x.id === id) + 1;
  return { texto: `${p.etiqueta} · ${n} de ${delBloque.length}`, fraccion: n / delBloque.length };
}

/** Si se puede pasar de esta pregunta: las obligatorias necesitan respuesta; las demás, no. */
export function puedeAvanzar(p: PreguntaTest, respuesta: string | undefined): boolean {
  return !p.obligatoria || Boolean(respuesta);
}
