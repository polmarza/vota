import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { aplica, progreso, puedeAvanzar, recorrido, respuestasEfectivas, type PreguntaTest } from '../../src/lib/perfil/cuestionario.ts';
import { buscarProvincias, normalizar, provinciaExacta, type ProvinciaBuscable } from '../../src/lib/perfil/provincias.ts';

// Las provincias reales: el buscador tiene que funcionar con los nombres oficiales y sus alias.
const provincias = (parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'territorio.yaml'), 'utf8')) as { provincias: ProvinciaBuscable[] }).provincias.map(
  (p) => ({ ...p, alias: p.alias ?? [] }),
);
const nombres = (q: string) => buscarProvincias(provincias, q).map((p) => p.nombre);

describe('M-01 · selector de provincia', () => {
  it('ignora acentos, mayúsculas y la ñ', () => {
    expect(normalizar('Álava')).toBe('alava');
    expect(normalizar('A Coruña')).toBe('a coruna');
    expect(nombres('CORUNA')).toEqual(['A Coruña']);
  });

  it('"a" da las provincias que empiezan por a, en orden alfabético', () => {
    expect(nombres('a')).toEqual(['A Coruña', 'Albacete', 'Alicante', 'Almería', 'Araba/Álava', 'Asturias', 'Ávila']);
  });

  it('coincide con el inicio de cualquier palabra del nombre', () => {
    expect(nombres('bar')).toEqual(['Barcelona']);
    expect(nombres('palmas')).toEqual(['Las Palmas']);
    expect(nombres('tenerife')).toEqual(['Santa Cruz de Tenerife']);
  });

  it('acepta los nombres alternativos habituales', () => {
    for (const [alias, nombre] of [['Vizcaya', 'Bizkaia'], ['Guipúzcoa', 'Gipuzkoa'], ['Gerona', 'Girona'], ['Lérida', 'Lleida'], ['Orense', 'Ourense'], ['La Coruña', 'A Coruña'], ['Baleares', 'Illes Balears'], ['Araba', 'Araba/Álava']]) {
      expect(nombres(alias!)).toContain(nombre);
    }
  });

  it('sin texto, o con texto que no es ninguna provincia, no da resultados', () => {
    expect(nombres('')).toEqual([]);
    expect(nombres('xyz')).toEqual([]);
  });

  it('reconoce una provincia escrita entera por su nombre o su alias', () => {
    expect(provinciaExacta(provincias, 'vizcaya')?.id).toBe('bizkaia');
    expect(provinciaExacta(provincias, 'Madri')).toBeUndefined();
  });
});

describe('M-01 · recorrido del cuestionario', () => {
  const p = (id: string, bloque: PreguntaTest['bloque'], orden: number, obligatoria = false): PreguntaTest => ({ id, bloque, orden, etiqueta: id[0]!.toUpperCase() + id.slice(1), tipo: id === 'provincia' ? 'provincia' : 'opciones', obligatoria });
  const preguntas = [p('vivienda', 'basico', 2), p('arrendador', 'ampliado', 1), p('provincia', 'basico', 1, true), p('trabajo', 'basico', 3)];

  it('va por el bloque básico en orden, el resultado provisional, el ampliado y el final (M-12)', () => {
    expect(recorrido(preguntas)).toEqual([
      { tipo: 'pregunta', pregunta: 'provincia' },
      { tipo: 'pregunta', pregunta: 'vivienda' },
      { tipo: 'pregunta', pregunta: 'trabajo' },
      { tipo: 'provisional' },
      { tipo: 'pregunta', pregunta: 'arrendador' },
      { tipo: 'final' },
    ]);
  });

  it('muestra el progreso dentro del bloque', () => {
    expect(progreso(preguntas, 'vivienda')).toEqual({ texto: 'Vivienda · 2 de 3', fraccion: 2 / 3 });
    expect(progreso(preguntas, 'arrendador').texto).toBe('Arrendador · 1 de 1');
  });

  it('la provincia es obligatoria; el resto se puede dejar sin responder', () => {
    expect(puedeAvanzar(preguntas[2]!, undefined)).toBe(false);
    expect(puedeAvanzar(preguntas[2]!, 'madrid')).toBe(true);
    expect(puedeAvanzar(preguntas[0]!, undefined)).toBe(true);
  });
});

describe('M-01 · preguntas condicionales', () => {
  const p = (id: string, bloque: PreguntaTest['bloque'], orden: number, soloSi?: Record<string, string[]>): PreguntaTest => ({
    id, bloque, orden, etiqueta: id[0]!.toUpperCase() + id.slice(1), tipo: 'opciones', obligatoria: false, ...(soloSi && { soloSi }),
  });
  const preguntas = [p('trabajo', 'basico', 1), p('arrendador', 'ampliado', 1), p('contrato', 'ampliado', 2, { trabajo: ['asalariado'] }), p('campo', 'ampliado', 3)];
  const contrato = preguntas[2]!;

  it('el contrato solo se pregunta a quien trabaja por cuenta ajena', () => {
    expect(aplica(contrato, { trabajo: 'asalariado' })).toBe(true);
    expect(aplica(contrato, { trabajo: 'autonomo' })).toBe(false);
    expect(aplica(contrato, {})).toBe(false);
    expect(aplica(preguntas[1]!, {})).toBe(true);
  });

  it('el contador cuenta solo las preguntas que se hacen a esa persona', () => {
    expect(progreso(preguntas, 'campo', { trabajo: 'autonomo' }).texto).toBe('Campo · 2 de 2');
    expect(progreso(preguntas, 'campo', { trabajo: 'asalariado' }).texto).toBe('Campo · 3 de 3');
    expect(progreso(preguntas, 'campo').texto).toBe('Campo · 3 de 3');
  });

  it('una respuesta a una pregunta que ya no aplica no cuenta (quien vuelve atrás y cambia de trabajo)', () => {
    expect(respuestasEfectivas(preguntas, { trabajo: 'autonomo', contrato: 'temporal', campo: 'si' })).toEqual({ trabajo: 'autonomo', campo: 'si' });
    expect(respuestasEfectivas(preguntas, { trabajo: 'asalariado', contrato: 'temporal' })).toEqual({ trabajo: 'asalariado', contrato: 'temporal' });
  });
});
