import { describe, expect, it } from 'vitest';
import {
  calcular,
  conComunidad,
  podriaAfectar,
  postura,
  sentidoParaPerfil,
  type FichaCalculo,
  type VotoPartido,
  type VotosPorVotacion,
} from '../../src/lib/afinidad/calculo.ts';

const ccaa = new Map([['madrid', 'madrid'], ['las-palmas', 'canarias']]);
const voto = (sentido: VotoPartido['sentido'], dividido = false): VotoPartido => ({ sentido, dividido, si: 0, no: 0, abstencion: 0, ausente: 0 });
const ficha = (votacion: string, el_si: 'favorece' | 'perjudica', cuando: Record<string, string[]> = { vivienda: ['alquiler'] }, ambito: FichaCalculo['ambito'] = 'estatal'): FichaCalculo => ({
  votacion, ambito, efectos: [{ cuando, el_si, justificacion: 'j' }],
});
const inquilino = conComunidad({ provincia: 'madrid', vivienda: 'alquiler' }, ccaa);

describe('M-03 · postura de un partido respecto al visitante', () => {
  it('votar sí a lo que le favorece es a favor; no, en contra; y al revés si le perjudica', () => {
    expect(postura(voto('si'), 'favorece')).toBe('a-favor');
    expect(postura(voto('no'), 'favorece')).toBe('en-contra');
    expect(postura(voto('si'), 'perjudica')).toBe('en-contra');
    expect(postura(voto('no'), 'perjudica')).toBe('a-favor');
  });

  it('la abstención cuenta pero no es ni a favor ni en contra; ausencia, empate o no tener diputados no cuentan', () => {
    expect(postura(voto('abstencion'), 'favorece')).toBe('abstencion');
    expect(postura(voto('ausente'), 'favorece')).toBe('no-cuenta');
    expect(postura(voto('empate', true), 'favorece')).toBe('no-cuenta');
    expect(postura(undefined, 'favorece')).toBe('no-cuenta');
  });
});

describe('M-03 · porcentajes y podios', () => {
  // Seis votaciones que favorecen a quien vive de alquiler. A vota sí a todas, B no a todas,
  // C se abstiene en la mitad, D vota sí a cinco y se ausenta en una.
  const fichas = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].map((v) => ficha(v, 'favorece'));
  const votos: VotosPorVotacion = Object.fromEntries(
    fichas.map((f, i) => [f.votacion, { a: voto('si'), b: voto('no'), c: voto(i % 2 ? 'abstencion' : 'si'), d: voto(i === 5 ? 'ausente' : 'si'), e: voto('no'), f: voto('no') }]),
  );

  it('el favorable es a favor entre las votaciones contadas, y el desfavorable, en contra entre las contadas; no suman 100', () => {
    const r = calcular(fichas, votos, inquilino, ['a', 'b', 'c', 'd']);
    const c = r.partidos.find((p) => p.partido === 'c')!;
    expect(c).toMatchObject({ aFavor: 3, enContra: 0, abstenciones: 3, contadas: 6, favorable: 0.5, desfavorable: 0 });
    const d = r.partidos.find((p) => p.partido === 'd')!;
    expect(d).toMatchObject({ contadas: 5, favorable: 1 });
  });

  it('los podios tienen tres partidos y nadie está en los dos', () => {
    const r = calcular(fichas, votos, inquilino, ['a', 'b', 'c', 'd', 'e', 'f']);
    expect(r.favorables.map((p) => p.partido)).toEqual(['a', 'd', 'c']);
    expect(r.desfavorables.map((p) => p.partido)).toEqual(['b', 'e', 'f']);
  });

  it('M-03 negativo: con menos de 6 partidos, ninguno se repite aunque sobren huecos', () => {
    const r = calcular(fichas, votos, inquilino, ['a', 'b', 'c', 'd']);
    expect(r.favorables.map((p) => p.partido)).toEqual(['a', 'd', 'c']);
    expect(r.desfavorables.map((p) => p.partido)).toEqual(['b']);
  });

  it('M-02: solo aparecen los partidos que se presentan en la provincia', () => {
    const r = calcular(fichas, votos, inquilino, ['b', 'e']);
    expect(r.partidos.map((p) => p.partido).sort()).toEqual(['b', 'e']);
  });

  it('M-03 negativo: con menos de 5 votaciones que le afecten, no hay datos suficientes', () => {
    expect(calcular(fichas.slice(0, 4), votos, inquilino, ['a']).suficiente).toBe(false);
    expect(calcular(fichas.slice(0, 5), votos, inquilino, ['a']).suficiente).toBe(true);
  });

  it('un partido sin ninguna votación contada no aparece', () => {
    const r = calcular(fichas, votos, inquilino, ['a', 'z']);
    expect(r.partidos.map((p) => p.partido)).toEqual(['a']);
  });
});

describe('M-11 · votaciones que afectan al perfil', () => {
  it('"Prefiero no responder" no cumple ninguna condición', () => {
    expect(sentidoParaPerfil(ficha('v', 'favorece'), conComunidad({ provincia: 'madrid', vivienda: 'ns' }, ccaa))).toBeNull();
  });

  it('una territorial solo cuenta en sus comunidades', () => {
    const f = ficha('v', 'favorece', { ccaa: ['canarias'] }, ['canarias']);
    expect(sentidoParaPerfil(f, conComunidad({ provincia: 'las-palmas' }, ccaa))).toBe('favorece');
    expect(sentidoParaPerfil(f, inquilino)).toBeNull();
  });

  it('si el perfil cumple efectos contrarios, la votación se lista como contrapuesta y no cuenta', () => {
    const f: FichaCalculo = { votacion: 'v', ambito: 'estatal', efectos: [{ cuando: { vivienda: ['alquiler'] }, el_si: 'favorece', justificacion: 'j' }, { cuando: { arrendador: ['si'] }, el_si: 'perjudica', justificacion: 'j' }] };
    const r = calcular([f], { v: { a: voto('si') } }, { ...inquilino, arrendador: 'si' }, ['a']);
    expect(r.relevantes).toEqual([{ votacion: 'v', sentido: 'contrapuesta' }]);
    expect(r.partidos).toEqual([]);
  });

  it('M-12: cuenta como posible la votación que depende de una pregunta que aún no ha contestado', () => {
    const f = ficha('v', 'perjudica', { arrendador: ['si'] });
    expect(podriaAfectar(f, inquilino, new Set(['arrendador']))).toBe(true);
    expect(podriaAfectar(f, { ...inquilino, arrendador: 'no' }, new Set())).toBe(false);
  });
});
