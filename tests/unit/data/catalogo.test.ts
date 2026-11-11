import { describe, expect, it } from 'vitest';
import { compactarDia, type Votacion } from '../../../scripts/data/congreso.ts';
import { candidatas, claveIniciativa, clasificar, proponenteDe, type Candidata } from '../../../scripts/data/candidatas.ts';
import {
  esquemaFicha,
  esquemaPreguntas,
  sentidoParaPerfil,
  validarCatalogo,
  type Ficha,
  type Pregunta,
  type Territorio,
} from '../../../scripts/data/catalogo.ts';
import type { VotacionPartidos } from '../../../scripts/data/votos.ts';

// ─── Validación del catálogo ────────────────────────────────────────────────────

const territorio: Territorio = {
  comunidades: [
    { id: 'madrid', nombre: 'Madrid' },
    { id: 'canarias', nombre: 'Canarias' },
  ],
  provincias: [
    { id: 'madrid', nombre: 'Madrid', ccaa: 'madrid', alias: [] },
    { id: 'las-palmas', nombre: 'Las Palmas', ccaa: 'canarias', alias: [] },
  ],
};

const preguntas: Pregunta[] = esquemaPreguntas.parse([
  { id: 'provincia', bloque: 'basico', orden: 1, etiqueta: 'Provincia', enunciado: '¿Dónde votas?', tipo: 'provincia', obligatoria: true },
  {
    id: 'vivienda', bloque: 'basico', orden: 2, etiqueta: 'Vivienda', enunciado: '¿Cómo vives?', tipo: 'opciones',
    opciones: [{ id: 'alquiler', texto: 'De alquiler' }, { id: 'propiedad', texto: 'En propiedad' }, { id: 'ns', texto: 'Prefiero no responder' }],
  },
]);

const URL = 'https://www.congreso.es/es/opendata/votaciones';
const ficha = (o: Partial<Ficha> = {}): Ficha =>
  esquemaFicha.parse({
    votacion: 'XIV-1-1', url: URL, texto: 'https://www.boe.es/eli/es/l/2023/05/24/12', iniciativa: 'Proyecto de ley del Gobierno',
    fecha: '2023-04-27', titulo_oficial: 'Proyecto de Ley de prueba.', titulo: 'Ley de prueba',
    resumen: 'Resumen de prueba suficientemente largo para cumplir el mínimo de caracteres del esquema.',
    que_significa_si: 'Votar sí era aprobar la ley.', tema: 'vivienda', ambito: 'estatal',
    efectos: [{ cuando: { vivienda: ['alquiler'] }, el_si: 'favorece', justificacion: 'Justificación de prueba con la longitud suficiente.', base: 'Artículo 1 de la ley.' }],
    justificacion: 'Justificación de la selección con la longitud mínima necesaria.',
    ...o,
  });

const votos = new Map<string, VotacionPartidos>([
  ['XIV-1-1', { id: 'XIV-1-1', fecha: '20230427', partidos: { a: { si: 1, no: 0, abstencion: 0, ausente: 0, sentido: 'si', dividido: false } } }],
  ['XIV-1-2', { id: 'XIV-1-2', fecha: '20230427', partidos: { a: { si: 1, no: 0, abstencion: 0, ausente: 0, sentido: 'si', dividido: false } } }],
  ['XIV-2-1', { id: 'XIV-2-1', fecha: '20230510', secreta: true, partidos: {} }],
]);
const cand = (votacion: string, todas = [votacion]): Candidata => ({
  votacion, fecha: '20230427', tipo: 'ley', iniciativa: 'x', proponente: 'Gobierno', votado: '', ganoSi: true, todas,
});
const candidatasBase = [cand('XIV-1-2', ['XIV-1-1', 'XIV-1-2']), cand('XIV-2-1')];

const validar = (fichas: Record<string, Ficha>, o: { candidatas?: Candidata[]; preguntas?: Pregunta[] } = {}) =>
  validarCatalogo({ fichas: new Map(Object.entries(fichas)), preguntas: o.preguntas ?? preguntas, territorio, votos, candidatas: o.candidatas ?? candidatasBase });

describe('M-05 · validación de las fichas', () => {
  it('una ficha correcta no da errores', () => {
    expect(validar({ 'XIV-1-1': ficha() })).toEqual([]);
  });

  it('exige URL oficial, texto en el BOE o el Congreso y justificaciones', () => {
    expect(() => ficha({ url: 'https://example.com/votacion' })).toThrow();
    expect(() => ficha({ texto: 'https://example.com/ley.pdf' })).toThrow();
    expect(() => ficha({ justificacion: 'corta' })).toThrow();
    expect(() => ficha({ efectos: [{ cuando: { vivienda: ['alquiler'] }, el_si: 'favorece', justificacion: 'corta', base: 'Art. 1 de la ley.' }] })).toThrow();
  });

  it('la votación tiene que existir, tener voto nominal y coincidir en fecha y nombre de archivo', () => {
    expect(validar({ 'XIV-9-9': ficha({ votacion: 'XIV-9-9' }) })).toContainEqual(expect.stringContaining('no está en data/votos'));
    expect(validar({ 'XIV-2-1': ficha({ votacion: 'XIV-2-1', fecha: '2023-05-10' }) })).toContainEqual(expect.stringContaining('no tiene voto nominal'));
    expect(validar({ 'XIV-1-1': ficha({ fecha: '2023-04-28' }) })).toContainEqual(expect.stringContaining('no coincide'));
    expect(validar({ otro: ficha() })).toContainEqual(expect.stringContaining('debe llamarse como la votación'));
  });

  it('solo admite votaciones de la lista de candidatas y una ficha por iniciativa', () => {
    expect(validar({ 'XIV-1-1': ficha() }, { candidatas: [] })).toContainEqual(expect.stringContaining('no está entre las candidatas'));
    const dos = validar({ 'XIV-1-1': ficha(), 'XIV-1-2': ficha({ votacion: 'XIV-1-2' }) });
    expect(dos).toContainEqual(expect.stringContaining('una votación por iniciativa'));
  });

  it('las condiciones usan preguntas y opciones que existen, y "Prefiero no responder" no cumple ninguna', () => {
    const conCondicion = (cuando: Record<string, string[]>) =>
      validar({ 'XIV-1-1': ficha({ efectos: [{ cuando, el_si: 'favorece', justificacion: 'Justificación de prueba con la longitud suficiente.', base: 'Artículo 1 de la ley.' }] }) });
    expect(conCondicion({ trabajo: ['autonomo'] })).toContainEqual(expect.stringContaining('no hay ninguna pregunta de opciones "trabajo"'));
    expect(conCondicion({ vivienda: ['hipoteca'] })).toContainEqual(expect.stringContaining('no tiene la opción "hipoteca"'));
    expect(conCondicion({ vivienda: ['ns'] })).toContainEqual(expect.stringContaining('"ns" no puede cumplir'));
  });

  it('M-11: en una territorial, cada comunidad del ámbito tiene su efecto y ninguno se sale del ámbito', () => {
    const territorial = (efectos: Ficha['efectos']) =>
      validar({ 'XIV-1-1': ficha({ ambito: ['madrid', 'canarias'], efectos }) }, { preguntas: preguntas.filter((p) => p.tipo === 'provincia') });
    const ef = (ccaa: string[]) => ({ cuando: { ccaa }, el_si: 'favorece' as const, justificacion: 'Justificación de prueba con la longitud suficiente.', base: 'Artículo 1 de la ley.' });
    expect(territorial([ef(['madrid']), ef(['canarias'])])).toEqual([]);
    expect(territorial([ef(['madrid'])])).toContainEqual(expect.stringContaining('"canarias" está en el ámbito pero ningún efecto'));
    expect(territorial([ef(['madrid', 'canarias', 'galicia'])])).toContainEqual(expect.stringContaining('"galicia", que no está en el ámbito'));
  });

  it('M-01: toda pregunta de opciones la usa alguna ficha', () => {
    const conPreguntaSobrante = esquemaPreguntas.parse([
      ...preguntas,
      { id: 'edad', bloque: 'basico', orden: 3, etiqueta: 'Edad', enunciado: '¿Cuántos años tienes?', tipo: 'opciones', opciones: [{ id: 'joven', texto: 'Joven' }, { id: 'mayor', texto: 'Mayor' }, { id: 'ns', texto: 'Prefiero no responder' }] },
    ]);
    expect(validar({ 'XIV-1-1': ficha() }, { preguntas: conPreguntaSobrante })).toContainEqual(expect.stringContaining('"edad" no la usa ninguna ficha'));
  });

  it('las preguntas de opciones incluyen "Prefiero no responder" y solo la provincia es obligatoria', () => {
    expect(() => esquemaPreguntas.parse([{ id: 'x', bloque: 'basico', orden: 1, etiqueta: 'Equis', enunciado: '¿Pregunta?', tipo: 'opciones', opciones: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }, { id: 'c', texto: 'C' }] }])).toThrow();
    expect(() => esquemaPreguntas.parse([{ id: 'x', bloque: 'basico', orden: 1, etiqueta: 'Equis', enunciado: '¿Pregunta?', tipo: 'opciones', obligatoria: true, opciones: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }, { id: 'ns', texto: 'NS' }] }])).toThrow();
  });
});

describe('M-11 · a qué votaciones afecta un perfil', () => {
  const ccaaDe = new Map(territorio.provincias.map((p) => [p.id, p.ccaa]));
  const ef = (cuando: Record<string, string[]>, el_si: 'favorece' | 'perjudica') => ({ cuando, el_si, justificacion: 'Justificación de prueba con la longitud suficiente.', base: 'Artículo 1 de la ley.' });

  it('cuenta la ficha si el perfil cumple algún efecto, y "Prefiero no responder" no cumple ninguno', () => {
    expect(sentidoParaPerfil(ficha(), { provincia: 'madrid', vivienda: 'alquiler' }, ccaaDe)).toBe('favorece');
    expect(sentidoParaPerfil(ficha(), { provincia: 'madrid', vivienda: 'ns' }, ccaaDe)).toBeNull();
    expect(sentidoParaPerfil(ficha(), { provincia: 'madrid' }, ccaaDe)).toBeNull();
  });

  it('si el perfil cumple efectos contrarios, la votación no cuenta para él', () => {
    const g = ficha({ efectos: [ef({ vivienda: ['alquiler'] }, 'favorece'), ef({ ccaa: ['madrid'] }, 'perjudica')] });
    expect(sentidoParaPerfil(g, { provincia: 'madrid', vivienda: 'alquiler' }, ccaaDe)).toBe('contrapuesta');
  });

  it('una territorial solo afecta a quien vota en una provincia de esas comunidades', () => {
    const f = ficha({ ambito: ['canarias'], efectos: [ef({ ccaa: ['canarias'] }, 'favorece')] });
    expect(sentidoParaPerfil(f, { provincia: 'las-palmas' }, ccaaDe)).toBe('favorece');
    expect(sentidoParaPerfil(f, { provincia: 'madrid' }, ccaaDe)).toBeNull();
  });
});

// ─── Candidatas ─────────────────────────────────────────────────────────────────

describe('M-05 · universo de candidatas', () => {
  it('clasifica las votaciones sobre iniciativas enteras con efecto jurídico y descarta las parciales', () => {
    expect(clasificar('Convalidación o derogación de Reales Decretos-leyes.', '', '', 'Real Decreto-ley 32/2021, de 28 de diciembre')).toBe('decreto-ley');
    expect(clasificar('Toma en consideración de Proposiciones de Ley.', '', '', 'Proposición de Ley del Grupo X')).toBe('toma-en-consideracion');
    expect(clasificar('Dictámenes de Comisiones sobre iniciativas legislativas.', 'Votación de conjunto.', '', 'Proyecto de Ley Orgánica X')).toBe('ley');
    expect(clasificar('Dictámenes de Comisiones sobre iniciativas legislativas.', 'Enmiendas presentadas por el Grupo X', 'Enmienda 23.', 'Proyecto de Ley X')).toBeNull();
    expect(clasificar('Proposiciones no de Ley.', '', '', 'Proposición no de Ley del Grupo X')).toBeNull();
    expect(clasificar('Convalidación o derogación de Reales Decretos-leyes.', '', '', 'Tramitación como Proyecto de Ley por el procedimiento de urgencia del Real Decreto-ley 32/2021')).toBeNull();
    expect(clasificar('Debates de totalidad de iniciativas legislativas.', '', '', 'Devolución al Proyecto de Ley de Presupuestos Generales del Estado para el año 2023')).toBe('presupuestos');
    expect(clasificar('Presupuestos Generales del Estado', '', '', 'Título I')).toBeNull();
  });

  it('agrupa las votaciones de una misma iniciativa aunque cambie el prefijo o el sufijo', () => {
    const a = claveIniciativa('Votación de la enmienda a la totalidad al Proyecto de Ley por la que se modifica la Ley 12/2002, de 23 de mayo, presentadas por los Grupos X');
    const b = claveIniciativa('Texto del Proyecto de Ley por la que se modifica la Ley 12/2002, de 23 de mayo (procedente del Real Decreto-ley 1/2022)');
    expect(a).toBe(b);
    expect(claveIniciativa('Proyecto de Ley por la que se modifica la Ley 28/1990')).not.toBe(a);
  });

  it('identifica al proponente', () => {
    expect(proponenteDe('Real Decreto-ley 4/2020, de 18 de febrero')).toBe('Gobierno');
    expect(proponenteDe('Proposición de Ley del Grupo Parlamentario Popular en el Congreso, de medidas')).toBe('Grupo Parlamentario Popular en el Congreso');
  });

  it('da una candidata por iniciativa con su última votación sobre el conjunto, sin el voto de los partidos', () => {
    const v = (numero: number, titulo: string, expediente: string, subgrupo = '', si = 2, no = 1): Votacion => ({
      sesion: 5, numero, fecha: '', titulo, expediente, subgrupo, textoSubgrupo: '', conjuntas: [], asentimiento: false, secreta: false,
      totales: { si, no, abstencion: 0, noVota: 0 }, votos: [{ diputado: 'A', grupo: 'G', voto: 'S' }],
    });
    const dias = [
      compactarDia('XV', '20240101', [v(1, 'Debates de totalidad de iniciativas legislativas.', 'Proyecto de Ley de vivienda, presentadas por el Grupo X', '', 1, 2)], []),
      compactarDia('XV', '20240301', [
        v(1, 'Dictámenes de Comisiones sobre iniciativas legislativas.', 'Proyecto de Ley de vivienda', 'Enmiendas presentadas por el Grupo X'),
        v(2, 'Dictámenes de Comisiones sobre iniciativas legislativas.', 'Votación del dictamen del Proyecto de Ley de vivienda', 'Votación del dictamen.'),
      ], []),
    ];
    const lista = candidatas('XV', dias);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ votacion: 'XV-5-2', todas: ['XV-5-1', 'XV-5-2'], proponente: 'Gobierno', ganoSi: true });
    expect(JSON.stringify(lista[0])).not.toContain('partidos');
  });

  it('una votación empatada no es la decisiva: el Reglamento obliga a repetirla', () => {
    const v = (numero: number, si: number, no: number): Votacion => ({
      sesion: 15, numero, fecha: '', titulo: 'Convalidación o derogación de Reales Decretos-leyes.', expediente: 'Real Decreto-ley 8/2023, de 27 de diciembre',
      subgrupo: '', textoSubgrupo: '', conjuntas: [], asentimiento: false, secreta: false, totales: { si, no, abstencion: 0, noVota: 0 }, votos: [{ diputado: 'A', grupo: 'G', voto: 'S' }],
    });
    expect(candidatas('XV', [compactarDia('XV', '20240110', [v(4, 171, 171)], [])])).toEqual([]);
    expect(candidatas('XV', [compactarDia('XV', '20240110', [v(4, 171, 171), v(8, 172, 171)], [])])[0]).toMatchObject({ votacion: 'XV-15-8', todas: ['XV-15-8'] });
  });
});
