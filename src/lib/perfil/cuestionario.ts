// Recorrido del cuestionario (M-01): bloque básico, resultado provisional, bloque ampliado y
// resultado final. Código puro; las respuestas viven solo en memoria del navegador (M-08).

export interface PreguntaTest {
  id: string;
  bloque: 'basico' | 'ampliado';
  orden: number;
  etiqueta: string;
  tipo: 'opciones' | 'provincia';
  obligatoria: boolean;
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

/** Etiqueta de progreso dentro del bloque: "Vivienda · 2 de 8". */
export function progreso(preguntas: PreguntaTest[], id: string): { texto: string; fraccion: number } {
  const p = preguntas.find((x) => x.id === id)!;
  const delBloque = preguntas.filter((x) => x.bloque === p.bloque).sort((x, y) => x.orden - y.orden);
  const n = delBloque.findIndex((x) => x.id === id) + 1;
  return { texto: `${p.etiqueta} · ${n} de ${delBloque.length}`, fraccion: n / delBloque.length };
}

/** Si se puede pasar de esta pregunta: las obligatorias necesitan respuesta; las demás, no. */
export function puedeAvanzar(p: PreguntaTest, respuesta: string | undefined): boolean {
  return !p.obligatoria || Boolean(respuesta);
}
