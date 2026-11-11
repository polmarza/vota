import { describe, expect, it } from 'vitest';
import {
  JUECES,
  NO_LO_SE,
  consenso,
  deliberar,
  evaluar,
  hashElemento,
  preguntaSegundaRonda,
  preguntarJuez,
  type Cliente,
  type Elemento,
  type Registro,
  type Respuesta,
} from '../../../scripts/data/jurado.ts';
import { CONJUNTO, bloqueosDelJurado } from '../../../scripts/data/veredictos.ts';

const elemento = (esperado = 'a', id = 'x'): Elemento => ({
  id,
  sistema: 'sistema',
  pregunta: '¿de qué partido era?',
  opciones: ['a', 'b', 'ninguno'],
  esperado,
});

const ok = (respuesta: string, modelo = 'm'): Respuesta => ({ modelo, fecha: '2026-10-27', estado: 'ok', respuesta, razones: 'r' });
const fallo = (): Respuesta => ({ modelo: 'm', fecha: '2026-10-27', estado: 'sin-respuesta', error: 'caído' });

/** Cliente simulado: cada modelo responde según la tabla, ronda a ronda. */
function clienteSimulado(tabla: Record<string, string[]>, coste = 0.01): Cliente & { llamadas: number } {
  const turno = new Map<string, number>();
  const cliente = (async (modelo: string) => {
    cliente.llamadas++;
    const i = turno.get(modelo) ?? 0;
    turno.set(modelo, i + 1);
    const respuesta = tabla[modelo]?.[i] ?? tabla[modelo]?.at(-1);
    if (respuesta === 'ERROR') throw new Error('caído');
    return { respuesta: respuesta!, razones: 'porque sí', coste };
  }) as unknown as Cliente & { llamadas: number };
  cliente.llamadas = 0;
  return cliente;
}

const opciones = (o: Partial<Parameters<typeof deliberar>[3]> = {}) => ({
  presupuesto: 10,
  forzar: false,
  limite: Infinity,
  alGuardar: async () => {},
  ...o,
});

describe('M-10 · recuento del jurado', () => {
  it('aprueba con 3 jueces que dan la respuesta esperada', () => {
    expect(evaluar({ esperado: 'a', ronda1: [ok('a'), ok('a'), ok('a'), ok('b'), ok(NO_LO_SE)] })).toEqual({ resultado: 'aprobado', decision: 'a' });
  });

  it('no aprueba si los acuerdos son 2, aunque nadie discrepe ("no lo sé" no cuenta)', () => {
    expect(evaluar({ esperado: 'a', ronda1: [ok('a'), ok('a'), ok(NO_LO_SE), ok(NO_LO_SE), fallo()] }).resultado).toBe('pendiente');
  });

  it('en la segunda ronda decide lo que digan al menos 3, aunque no sea lo propuesto', () => {
    const ronda1 = [ok('b'), ok('b'), ok('a'), ok(NO_LO_SE), fallo()];
    expect(evaluar({ esperado: 'a', ronda1, ronda2: [ok('b'), ok('b'), ok('b'), ok('a'), ok('a')] })).toEqual({ resultado: 'decidido', decision: 'b' });
  });

  it('queda sin consenso si nadie llega a 3 en la segunda ronda', () => {
    const ronda1 = [ok('b'), ok('a'), ok(NO_LO_SE), fallo(), fallo()];
    expect(evaluar({ esperado: 'a', ronda1, ronda2: [ok('a'), ok('a'), ok('b'), ok('b'), ok(NO_LO_SE)] }).resultado).toBe('sin-consenso');
  });

  it('el consenso ignora "no lo sé" y los jueces sin respuesta', () => {
    expect(consenso([ok(NO_LO_SE), ok(NO_LO_SE), ok(NO_LO_SE), fallo(), ok('a')])).toBeNull();
  });
});

describe('M-10 · preguntas', () => {
  it('la segunda ronda incluye todas las respuestas anteriores sin nombrar a los modelos', () => {
    const texto = preguntaSegundaRonda(elemento(), [ok('a', 'openai/x'), ok('b', 'google/y'), fallo()]);
    expect(texto).toContain('SEGUNDA RONDA');
    expect(texto).toContain(': a.');
    expect(texto).toContain(': b.');
    expect(texto).toContain('sin respuesta');
    expect(texto).not.toContain('openai');
    expect(texto).not.toContain('google');
  });

  it('el hash cambia si cambia la respuesta esperada o la pregunta', () => {
    expect(hashElemento(elemento('a'))).not.toBe(hashElemento(elemento('b')));
    expect(hashElemento({ ...elemento(), pregunta: 'otra' })).not.toBe(hashElemento(elemento()));
    expect(hashElemento(elemento())).toBe(hashElemento(elemento()));
  });
});

describe('M-10 · llamadas a los jueces', () => {
  it('reintenta 2 veces y deja "sin-respuesta" si el juez sigue fallando', async () => {
    const cliente = clienteSimulado({ m: ['ERROR'] });
    const r = await preguntarJuez(cliente, 'm', 's', 'p', ['a']);
    expect(r.estado).toBe('sin-respuesta');
    expect(cliente.llamadas).toBe(3);
  });

  it('se recupera si el juez responde en un reintento', async () => {
    const cliente = clienteSimulado({ m: ['ERROR', 'a'] });
    const r = await preguntarJuez(cliente, 'm', 's', 'p', ['a']);
    expect(r).toMatchObject({ estado: 'ok', respuesta: 'a' });
  });
});

describe('M-10 · deliberación', () => {
  const todos = (respuestas: string[]) => Object.fromEntries(JUECES.map((j) => [j, respuestas]));

  it('no pasa a segunda ronda lo que se aprueba en la primera', async () => {
    const cliente = clienteSimulado(todos(['a']));
    const { registros } = await deliberar(cliente, [elemento('a')], [], opciones());
    expect(registros[0]).toMatchObject({ resultado: 'aprobado', decision: 'a' });
    expect(registros[0]!.ronda2).toBeUndefined();
    expect(cliente.llamadas).toBe(5);
  });

  it('hace segunda ronda cuando la primera no aprueba', async () => {
    const cliente = clienteSimulado(todos(['b']));
    const { registros } = await deliberar(cliente, [elemento('a')], [], opciones());
    expect(registros[0]).toMatchObject({ resultado: 'decidido', decision: 'b' });
    expect(cliente.llamadas).toBe(10);
  });

  it('no vuelve a preguntar lo que ya tiene veredicto con el mismo hash', async () => {
    const e = elemento('a');
    const previo: Registro = {
      id: e.id, hash: hashElemento(e), esperado: 'a', resultado: 'aprobado', decision: 'a',
      ronda1: [ok('a'), ok('a'), ok('a'), ok('a'), ok('a')], prompt: { sistema: e.sistema, pregunta: e.pregunta },
    };
    const cliente = clienteSimulado(todos(['b']));
    await deliberar(cliente, [e], [previo], opciones());
    expect(cliente.llamadas).toBe(0);
  });

  it('vuelve a preguntar si el elemento ha cambiado desde el veredicto', async () => {
    const e = elemento('a');
    const previo: Registro = {
      id: e.id, hash: 'viejo', esperado: 'a', resultado: 'aprobado', decision: 'a',
      ronda1: [ok('a'), ok('a'), ok('a'), ok('a'), ok('a')], prompt: { sistema: e.sistema, pregunta: e.pregunta },
    };
    const cliente = clienteSimulado(todos(['a']));
    await deliberar(cliente, [e], [previo], opciones());
    expect(cliente.llamadas).toBe(5);
  });

  it('guarda en el historial el veredicto que caduca cuando el elemento cambia', async () => {
    const e = elemento('a');
    const previo: Registro = {
      id: e.id, hash: 'viejo', esperado: 'b', resultado: 'decidido', decision: 'a',
      ronda1: [ok('a')], ronda2: [ok('a')], prompt: { sistema: 's', pregunta: 'p' },
      historial: [{ id: e.id, hash: 'antiguo', esperado: 'c', resultado: 'sin-consenso', prompt: { sistema: 's', pregunta: 'p' } }],
    };
    const { registros } = await deliberar(clienteSimulado(todos(['a'])), [e], [previo], opciones());
    expect(registros[0]!.resultado).toBe('aprobado');
    expect(registros[0]!.historial?.map((h) => h.hash)).toEqual(['antiguo', 'viejo']);
    expect(registros[0]!.historial?.[1]).not.toHaveProperty('historial');
  });

  it('no añade al historial un registro que nunca llegó a deliberarse', async () => {
    const e = elemento('a');
    const previo: Registro = { id: e.id, hash: 'viejo', esperado: 'b', resultado: 'pendiente', prompt: { sistema: 's', pregunta: 'p' } };
    const { registros } = await deliberar(clienteSimulado(todos(['a'])), [e], [previo], opciones({ limite: 0 }));
    expect(registros[0]!.historial).toBeUndefined();
  });

  it('si responden menos de 3 jueces no guarda la ronda, deja el elemento pendiente y se para', async () => {
    const cliente = clienteSimulado({ ...todos(['ERROR']), [JUECES[0]]: ['a'], [JUECES[1]]: ['a'] });
    const { registros } = await deliberar(cliente, [elemento('a', 'uno'), elemento('a', 'dos')], [], opciones());
    expect(registros.map((r) => r.resultado)).toEqual(['pendiente', 'pendiente']);
    expect(registros[0]!.ronda1).toBeUndefined();
    expect(registros[1]!.ronda1).toBeUndefined();
  });

  it('se para al alcanzar el presupuesto y deja el resto pendiente', async () => {
    const cliente = clienteSimulado(todos(['a']), 1);
    const { registros, gastado } = await deliberar(cliente, [elemento('a', 'uno'), elemento('a', 'dos')], [], opciones({ presupuesto: 5 }));
    expect(gastado).toBe(5);
    expect(registros.map((r) => r.resultado)).toEqual(['aprobado', 'pendiente']);
  });

  it('guarda el progreso tras cada elemento sin perder los registros previos de otros elementos', async () => {
    const guardados: Registro[][] = [];
    const ajeno: Registro = { id: 'ajeno', hash: 'h', esperado: 'a', resultado: 'aprobado', prompt: { sistema: '', pregunta: '' } };
    await deliberar(clienteSimulado(todos(['a'])), [elemento('a', 'uno'), elemento('a', 'dos')], [ajeno], opciones({ alGuardar: async (r) => void guardados.push(r) }));
    expect(guardados).toHaveLength(2);
    expect(guardados.every((g) => g.some((r) => r.id === 'ajeno'))).toBe(true);
    expect(guardados.at(-1)!.map((r) => r.id).sort()).toEqual(['ajeno', 'dos', 'uno']);
  });
});

describe('M-10 · bloqueo de la publicación', () => {
  const efecto = elemento('favorece', 'XV-1-1:efecto:1');
  const fidelidad = elemento('fiel', 'XV-1-1:fidelidad');
  const conjunto = elemento('equilibrado', CONJUNTO);
  const reg = (e: Elemento, o: Partial<Registro>): Registro => ({ id: e.id, hash: hashElemento(e), esperado: e.esperado, resultado: 'aprobado', decision: e.esperado, prompt: { sistema: '', pregunta: '' }, ...o });

  it('con todo aprobado y vigente no hay bloqueos, aunque el conjunto salga desequilibrado', () => {
    expect(bloqueosDelJurado([efecto, fidelidad, conjunto], [reg(efecto, {}), reg(fidelidad, {}), reg(conjunto, { resultado: 'decidido', decision: 'desequilibrado' })])).toEqual([]);
  });

  it('bloquea lo que no tiene veredicto, lo pendiente y lo caducado', () => {
    const errores = bloqueosDelJurado([efecto, fidelidad, conjunto], [reg(efecto, { hash: 'viejo' }), reg(fidelidad, { resultado: 'pendiente' })]);
    expect(errores).toEqual([
      expect.stringContaining('XV-1-1:efecto:1: el veredicto caducó'),
      expect.stringContaining('XV-1-1:fidelidad: sin veredicto'),
      expect.stringContaining('catalogo:conjunto: sin veredicto'),
    ]);
  });

  it('M-10 negativo: si la mayoría discrepa o no hay consenso, la ficha no se publica hasta corregirla', () => {
    const errores = bloqueosDelJurado([efecto, fidelidad], [reg(efecto, { resultado: 'decidido', decision: 'perjudica' }), reg(fidelidad, { resultado: 'sin-consenso', decision: undefined })]);
    expect(errores).toEqual([
      expect.stringContaining('el jurado responde "perjudica" frente a "favorece"'),
      expect.stringContaining('sin consenso del jurado sobre el resumen'),
    ]);
  });
});
