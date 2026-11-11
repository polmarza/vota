// Jurado de IAs (M-10): cinco modelos de cinco empresas revisan, a ciegas, lo que propone Claude.
//
// Cada elemento es una pregunta cerrada con una respuesta esperada (la de Claude) que los jueces no
// ven. Un elemento se aprueba si al menos 3 jueces dan esa misma respuesta. Lo que no se aprueba
// pasa a una segunda ronda en la que los jueces ven las respuestas anónimas de la primera; si al
// menos 3 coinciden en algo, esa es la decisión del jurado, y si no, queda sin consenso.

import { createHash } from 'node:crypto';

export const JUECES = [
  'openai/gpt-6.1-sol',
  'google/gemini-4-argon',
  'mistralai/mistral-large-4-0',
  'deepseek/deepseek-v4-pro-0813',
  'x-ai/grok-4.7',
] as const;

/** Modelos que no aceptan `temperature` en OpenRouter (comprobado el 27-10-2026). */
const SIN_TEMPERATURA = new Set<string>(['openai/gpt-6.1-sol']);

export const MAYORIA = 3;
export const NO_LO_SE = 'no_lo_se';

export interface Elemento {
  id: string;
  sistema: string;
  pregunta: string;
  /** Respuestas posibles; siempre se añade "no_lo_se". */
  opciones: string[];
  /** Respuesta de Claude, que los jueces no ven. */
  esperado: string;
}

export interface Respuesta {
  modelo: string;
  fecha: string;
  estado: 'ok' | 'sin-respuesta';
  respuesta?: string;
  razones?: string;
  coste?: number;
  error?: string;
}

export type Resultado = 'aprobado' | 'decidido' | 'sin-consenso' | 'pendiente';

export interface Registro {
  id: string;
  hash: string;
  esperado: string;
  ronda1?: Respuesta[];
  ronda2?: Respuesta[];
  resultado: Resultado;
  /** Respuesta que queda: la de Claude si se aprueba, la del jurado si decide otra cosa. */
  decision?: string;
  prompt: { sistema: string; pregunta: string };
  /** Deliberaciones anteriores del mismo elemento, de la más antigua a la más reciente. */
  historial?: Omit<Registro, 'historial'>[];
}

export function hashElemento(e: Elemento): string {
  return createHash('sha256').update(JSON.stringify([e.sistema, e.pregunta, e.opciones, e.esperado])).digest('hex').slice(0, 16);
}

/** Respuesta que dan al menos MAYORIA jueces (sin contar "no lo sé"), o null. */
export function consenso(respuestas: Respuesta[]): string | null {
  const cuenta = new Map<string, number>();
  for (const r of respuestas) {
    if (r.estado !== 'ok' || !r.respuesta || r.respuesta === NO_LO_SE) continue;
    cuenta.set(r.respuesta, (cuenta.get(r.respuesta) ?? 0) + 1);
  }
  for (const [respuesta, n] of cuenta) if (n >= MAYORIA) return respuesta;
  return null;
}

/** Resultado de un registro según las rondas que tenga. */
export function evaluar(reg: Pick<Registro, 'esperado' | 'ronda1' | 'ronda2'>): { resultado: Resultado; decision?: string } {
  if (!reg.ronda1) return { resultado: 'pendiente' };
  const acuerdos = reg.ronda1.filter((r) => r.estado === 'ok' && r.respuesta === reg.esperado).length;
  if (acuerdos >= MAYORIA) return { resultado: 'aprobado', decision: reg.esperado };
  if (!reg.ronda2) return { resultado: 'pendiente' };
  const c = consenso(reg.ronda2);
  if (c === null) return { resultado: 'sin-consenso' };
  return c === reg.esperado ? { resultado: 'aprobado', decision: c } : { resultado: 'decidido', decision: c };
}

/** Texto de la segunda ronda: la pregunta original más las respuestas anónimas de la primera. */
export function preguntaSegundaRonda(e: Elemento, ronda1: Respuesta[]): string {
  // Se barajan para que el orden no delate qué modelo dijo qué.
  const barajadas = [...ronda1].sort(() => Math.random() - 0.5);
  const lineas = barajadas.map((r, i) =>
    r.estado === 'ok' ? `- Respuesta ${i + 1}: ${r.respuesta}. Razones: ${r.razones}` : `- Respuesta ${i + 1}: sin respuesta.`,
  );
  return `${e.pregunta}

SEGUNDA RONDA. En la primera ronda el jurado no alcanzó un acuerdo suficiente. Estas fueron las
respuestas, anónimas y en orden aleatorio:
${lineas.join('\n')}

Vuelve a responder con tu mejor criterio. Puedes mantener tu respuesta o cambiarla; no te dejes
llevar por la mayoría si crees que se equivoca.`;
}

export function esquemaRespuesta(opciones: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['respuesta', 'razones'],
    properties: {
      respuesta: { type: 'string', enum: [...opciones, NO_LO_SE] },
      razones: { type: 'string', description: 'Explicación breve, con los datos en los que te basas.' },
    },
  };
}

export interface Cliente {
  (modelo: string, sistema: string, pregunta: string, opciones: string[]): Promise<{ respuesta: string; razones: string; coste?: number }>;
}

/** Cliente real de OpenRouter. La clave llega por parámetro, nunca se imprime. */
export function clienteOpenRouter(apiKey: string): Cliente {
  return async (modelo, sistema, pregunta, opciones) => {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(180_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/polmarza/vota',
        'X-Title': 'Vota con Criterio',
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: 'system', content: sistema },
          { role: 'user', content: pregunta },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'veredicto', strict: true, schema: esquemaRespuesta(opciones) } },
        usage: { include: true },
        ...(SIN_TEMPERATURA.has(modelo) ? {} : { temperature: 0 }),
      }),
    });
    const cuerpo = (await r.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { cost?: number };
      error?: { message?: string };
    };
    if (!r.ok || cuerpo.error) throw new Error(`HTTP ${r.status}: ${cuerpo.error?.message ?? 'sin detalle'}`);
    const contenido = cuerpo.choices?.[0]?.message?.content;
    if (!contenido) throw new Error('Respuesta vacía');
    const datos = JSON.parse(contenido) as { respuesta?: unknown; razones?: unknown };
    if (typeof datos.respuesta !== 'string' || ![...opciones, NO_LO_SE].includes(datos.respuesta)) {
      throw new Error(`Respuesta fuera de las opciones: ${String(datos.respuesta)}`);
    }
    return { respuesta: datos.respuesta, razones: String(datos.razones ?? ''), coste: cuerpo.usage?.cost };
  };
}

/** Pregunta a un juez, con reintentos. Nunca lanza: un fallo queda como "sin-respuesta". */
export async function preguntarJuez(cliente: Cliente, modelo: string, sistema: string, pregunta: string, opciones: string[], reintentos = 2): Promise<Respuesta> {
  let ultimo: unknown;
  for (let intento = 0; intento <= reintentos; intento++) {
    try {
      const r = await cliente(modelo, sistema, pregunta, opciones);
      return { modelo, fecha: new Date().toISOString(), estado: 'ok', ...r };
    } catch (e) {
      ultimo = e;
    }
  }
  return { modelo, fecha: new Date().toISOString(), estado: 'sin-respuesta', error: (ultimo as Error).message };
}

/** Los cinco jueces a la vez para una ronda. */
export function ronda(cliente: Cliente, sistema: string, pregunta: string, opciones: string[]): Promise<Respuesta[]> {
  return Promise.all(JUECES.map((modelo) => preguntarJuez(cliente, modelo, sistema, pregunta, opciones)));
}

export interface Opciones {
  presupuesto: number;
  forzar: boolean;
  limite: number;
  /** Se llama tras cada elemento, para guardar el progreso. */
  alGuardar: (registros: Registro[]) => Promise<void>;
  registrar?: (linea: string) => void;
}

const costeDe = (rs: Respuesta[] | undefined) => (rs ?? []).reduce((a, r) => a + (r.coste ?? 0), 0);

/**
 * Delibera sobre una lista de elementos, aprovechando los registros previos (caché por hash). Para
 * al superar el presupuesto de la ejecución.
 */
export async function deliberar(cliente: Cliente, elementos: Elemento[], previos: Registro[], op: Opciones) {
  const porId = new Map(previos.map((r) => [r.id, r]));
  const todos = new Map(porId);
  const registros: Registro[] = [];
  let gastado = 0;
  let procesados = 0;
  let parado = false;

  for (const e of elementos) {
    const hash = hashElemento(e);
    const previo = porId.get(e.id);
    let reg: Registro;
    if (previo && previo.hash === hash && !op.forzar) {
      reg = previo;
    } else {
      // El veredicto anterior caduca, pero no se borra: pasa al historial.
      const { historial = [], ...anterior } = previo ?? {};
      reg = {
        id: e.id, hash, esperado: e.esperado, resultado: 'pendiente', prompt: { sistema: e.sistema, pregunta: e.pregunta },
        ...(previo?.ronda1 ? { historial: [...historial, anterior as Omit<Registro, 'historial'>] } : historial.length ? { historial } : {}),
      };
    }

    const necesitaRonda1 = !reg.ronda1;
    const necesitaRonda2 = !necesitaRonda1 && evaluar(reg).resultado === 'pendiente';
    if (!parado && (necesitaRonda1 || necesitaRonda2) && procesados < op.limite) {
      if (gastado >= op.presupuesto) {
        parado = true;
        op.registrar?.(`Presupuesto de ${op.presupuesto} $ alcanzado: se para aquí.`);
      } else {
        procesados++;
        // Una ronda en la que responden menos de MAYORIA jueces no vale como veredicto: suele ser un
        // fallo general (clave caducada, proveedor caído). No se guarda y se para la ejecución.
        const fallida = (rs: Respuesta[]) => {
          if (rs.filter((r) => r.estado === 'ok').length >= MAYORIA) return false;
          parado = true;
          op.registrar?.(`  ${e.id}: responden menos de ${MAYORIA} jueces (${rs.find((r) => r.error)?.error ?? 'sin detalle'}); se para aquí.`);
          return true;
        };
        if (necesitaRonda1) {
          const r1 = await ronda(cliente, e.sistema, e.pregunta, e.opciones);
          gastado += costeDe(r1);
          if (!fallida(r1)) reg = { ...reg, ronda1: r1 };
        }
        if (!parado && evaluar(reg).resultado === 'pendiente' && !reg.ronda2 && gastado < op.presupuesto) {
          const r2 = await ronda(cliente, e.sistema, preguntaSegundaRonda(e, reg.ronda1!), e.opciones);
          gastado += costeDe(r2);
          if (!fallida(r2)) reg = { ...reg, ronda2: r2 };
        }
        const ev = evaluar(reg);
        reg = { ...reg, resultado: ev.resultado, decision: ev.decision };
        if (!parado) op.registrar?.(`  ${e.id}: ${reg.resultado}${reg.decision && reg.decision !== e.esperado ? ` → ${reg.decision} (Claude: ${e.esperado})` : ''}`);
      }
    }
    registros.push(reg);
    todos.set(e.id, reg);
    await op.alGuardar([...todos.values()]);
  }
  return { registros, gastado };
}
