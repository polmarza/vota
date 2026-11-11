import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { calcular, conComunidad, type FichaCalculo, type VotoPartido, type VotosPorVotacion } from '../../src/lib/afinidad/calculo.ts';
import {
  ABREVIADOS,
  AVISO_TARJETA,
  CAMPOS_PERFIL,
  MARCA,
  NOMBRES_TEMAS,
  TEXTO_COMPARTIR,
  WEB,
  datosTarjeta,
  lineaPerfil,
  temasPrincipales,
  textoAlternativo,
  textoOpcionPerfil,
  type TextosPerfil,
} from '../../src/lib/compartir/tarjeta.ts';

const voto = (sentido: VotoPartido['sentido']): VotoPartido => ({ sentido, dividido: false, si: 0, no: 0, abstencion: 0, ausente: 0 });

// Seis votaciones de vivienda, dos de empleo, una de transporte y una contrapuesta de sanidad.
const temas: Record<string, string> = { v1: 'vivienda', v2: 'vivienda', v3: 'vivienda', v4: 'empleo', v5: 'empleo', v6: 'transporte', v7: 'sanidad', v8: 'fiscalidad' };
const fichas: (FichaCalculo & { tema: string })[] = [
  ...['v1', 'v2', 'v3'].map((v) => ({ votacion: v, tema: temas[v]!, ambito: 'estatal' as const, efectos: [{ cuando: { vivienda: ['alquiler'] }, el_si: 'favorece' as const, justificacion: 'j' }] })),
  ...['v4', 'v5'].map((v) => ({ votacion: v, tema: temas[v]!, ambito: 'estatal' as const, efectos: [{ cuando: { trabajo: ['estudiante'] }, el_si: 'perjudica' as const, justificacion: 'j' }] })),
  { votacion: 'v6', tema: 'transporte', ambito: 'estatal', efectos: [{ cuando: { transporte: ['publico'] }, el_si: 'favorece', justificacion: 'j' }] },
  {
    votacion: 'v7',
    tema: 'sanidad',
    ambito: 'estatal',
    efectos: [
      { cuando: { vivienda: ['alquiler'] }, el_si: 'favorece', justificacion: 'j' },
      { cuando: { edad: ['menos-30'] }, el_si: 'perjudica', justificacion: 'j' },
    ],
  },
  // No afecta a este perfil: su tema no puede salir.
  { votacion: 'v8', tema: 'fiscalidad', ambito: 'estatal', efectos: [{ cuando: { ingresos: ['mas-60k'] }, el_si: 'favorece', justificacion: 'j' }] },
];
const votos: VotosPorVotacion = Object.fromEntries(
  fichas.map((f) => [f.votacion, { a: voto(f.efectos[0]!.el_si === 'favorece' ? 'si' : 'no'), b: voto('abstencion'), c: voto(f.efectos[0]!.el_si === 'favorece' ? 'no' : 'si') }]),
);
const partidos = [
  { id: 'a', nombre: 'Partido A', color: '#ff0000' },
  { id: 'b', nombre: 'Partido B', color: '#00ff00' },
  { id: 'c', nombre: 'Partido C' },
];
const respuestas = conComunidad(
  {
    provincia: 'madrid',
    vivienda: 'alquiler',
    trabajo: 'estudiante',
    edad: 'menos-30',
    ingresos: 'hasta-16k',
    hijos: 'no',
    patrimonio: 'mas-300k',
    herencia: 'si',
    discapacidad: 'si',
    transporte: 'publico',
  },
  new Map([['madrid', 'madrid']]),
);
const resultado = calcular(fichas, votos, respuestas, ['a', 'b', 'c']);
const base = { resultado, fichas, partidos, respuestas, sinColor: '#5e6b71' };

describe('S-02 · temas de la tarjeta', () => {
  it('salen los temas de las votaciones que le cuentan, del más frecuente al menos, hasta tres', () => {
    expect(temasPrincipales(resultado, fichas)).toEqual(['Vivienda', 'Empleo', 'Transporte']);
  });

  it('las contrapuestas y las que no le afectan no aportan tema', () => {
    const t = temasPrincipales(resultado, fichas);
    expect(t).not.toContain('Sanidad');
    expect(t).not.toContain('Impuestos');
  });

  it('todos los temas del catálogo tienen nombre legible', () => {
    const dir = join(process.cwd(), 'data', 'catalogo');
    const usados = new Set(
      readdirSync(dir)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => (parse(readFileSync(join(dir, f), 'utf8')) as { tema: string }).tema),
    );
    expect(usados.size).toBeGreaterThan(0);
    for (const t of usados) expect(NOMBRES_TEMAS, t).toHaveProperty(t);
  });
});

describe('S-02 · datos de la tarjeta', () => {
  it('lleva la marca, los dos podios con color y porcentaje, el partido más a favor, el aviso y la web', () => {
    const d = datosTarjeta({ ...base, incluirPerfil: false });
    expect(d.marca).toBe(MARCA);
    expect(d.aviso).toBe(AVISO_TARJETA);
    expect(d.web).toBe(WEB);
    expect(d.favorables.map((f) => f.partido)).toEqual(resultado.favorables.map((p) => p.partido));
    expect(d.desfavorables.map((f) => f.partido)).toEqual(resultado.desfavorables.map((p) => p.partido));
    expect(d.masAFavor).toEqual(d.favorables[0]);
    expect(d.masAFavor).toMatchObject({ partido: 'a', nombre: 'Partido A', color: '#ff0000', porcentaje: '100 %' });
  });

  it('el color sale de los datos del partido, y si no tiene, el gris de reserva', () => {
    const d = datosTarjeta({ ...base, incluirPerfil: false });
    const todas = [...d.favorables, ...d.desfavorables];
    expect(todas.find((f) => f.partido === 'b')?.color).toBe('#00ff00');
    expect(todas.find((f) => f.partido === 'c')?.color).toBe('#5e6b71');
  });

  it('por defecto no incluye ninguna respuesta', () => {
    const d = datosTarjeta({ ...base, incluirPerfil: false });
    expect(d.perfil).toBeNull();
    const texto = JSON.stringify(d) + textoAlternativo(d);
    for (const r of ['alquiler', 'estudiante', 'menos de 30', 'sin hijos', 'madrid', 'Madrid', '16.000', 'hasta-16k']) expect(texto).not.toContain(r);
  });

  it('con el perfil pedido añade vivienda, situación laboral, edad e hijos, abreviados y en minúscula', () => {
    const d = datosTarjeta({ ...base, incluirPerfil: true });
    expect(d.perfil).toBe('de alquiler · estudiante · menos de 30 años · sin hijos a cargo');
    expect(textoAlternativo(d)).toContain(`Perfil: ${d.perfil}.`);
  });

  it('nunca incluye ingresos, patrimonio, herencia, discapacidad ni provincia, aunque se pida el perfil', () => {
    const d = datosTarjeta({ ...base, incluirPerfil: true });
    const texto = JSON.stringify(d) + textoAlternativo(d);
    for (const r of ['hasta-16k', '16.000', 'ingres', 'mas-300k', 'patrimonio', 'herencia', 'discapacidad', 'madrid', 'Madrid']) expect(texto).not.toContain(r);
    expect(CAMPOS_PERFIL).toEqual(['vivienda', 'trabajo', 'edad', 'hijos']);
  });

  it('las respuestas "ns" o sin responder no salen; sin ninguna, no hay línea de perfil', () => {
    expect(lineaPerfil({ vivienda: 'ns', trabajo: 'autonomo', hijos: undefined })).toBe('autónomo');
    expect(lineaPerfil({ vivienda: 'ns', trabajo: 'ns', edad: 'ns', hijos: 'ns' })).toBeNull();
    expect(datosTarjeta({ ...base, respuestas: { ...respuestas, vivienda: 'ns', trabajo: 'ns', edad: undefined, hijos: 'ns' }, incluirPerfil: true }).perfil).toBeNull();
  });

  it('una opción sin abreviatura sale con su texto de preguntas.yaml en minúscula', () => {
    const textos: TextosPerfil = { vivienda: { okupa: 'En Una Vivienda Nueva' } };
    expect(textoOpcionPerfil('vivienda', 'okupa', textos)).toBe('en una vivienda nueva');
    expect(textoOpcionPerfil('vivienda', 'desconocida', textos)).toBeNull();
  });

  it('cada opción real de las cuatro preguntas tiene un texto corto', () => {
    const preguntas = parse(readFileSync(join(process.cwd(), 'data', 'preguntas.yaml'), 'utf8')) as { id: string; opciones?: { id: string; texto: string }[] }[];
    for (const campo of CAMPOS_PERFIL) {
      const p = preguntas.find((x) => x.id === campo)!;
      for (const o of p.opciones!.filter((o) => o.id !== 'ns')) {
        expect(ABREVIADOS[campo], `${campo}:${o.id}`).toHaveProperty(o.id);
        const t = textoOpcionPerfil(campo, o.id)!;
        expect(t.length, t).toBeLessThanOrEqual(26);
        expect(t).toBe(t.toLocaleLowerCase('es'));
      }
    }
  });

  it('el texto que acompaña al compartir solo invita al test, sin nombrar partidos', () => {
    expect(TEXTO_COMPARTIR).toContain(WEB);
    const nombres = (parse(readFileSync(join(process.cwd(), 'data', 'partidos', 'partidos.yaml'), 'utf8')) as { partidos: { nombre: string; siglas: string }[] }).partidos;
    for (const p of nombres) {
      expect(TEXTO_COMPARTIR).not.toMatch(new RegExp(`\\b${p.siglas.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
      expect(TEXTO_COMPARTIR).not.toContain(p.nombre);
    }
  });
});
