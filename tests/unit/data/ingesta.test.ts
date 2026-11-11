import { describe, expect, it } from 'vitest';
import {
  compactarDia,
  expandirVotos,
  leerDiasVotaciones,
  leerEnlacesDia,
  leerEnlacesDiputados,
  leerVotacion,
  urlDiaVotaciones,
} from '../../../scripts/data/congreso.ts';

/** JSON de una votación con el formato del Congreso. */
const jsonVotacion = (o: { asentimiento?: string; totales?: object; votaciones?: object[] } = {}) =>
  JSON.stringify({
    informacion: { sesion: 149, numeroVotacion: 20, fecha: '03/02/2022', titulo: 'Convalidación', textoExpediente: 'RDL 32/2021' },
    totales: { asentimiento: o.asentimiento ?? 'No', presentes: 4, afavor: 2, enContra: 1, abstenciones: 0, noVotan: 1, ...o.totales },
    ...(o.votaciones === undefined
      ? {
          votaciones: [
            { asiento: '1', diputado: 'Pérez, Ana ', grupo: 'GS', voto: 'Sí' },
            { asiento: '2', diputado: 'López, Luis', grupo: 'GS', voto: 'Sí' },
            { asiento: '3', diputado: 'García, Eva', grupo: 'GP', voto: 'No' },
            { asiento: '4', diputado: 'Ruiz, Pau', grupo: 'GP', voto: 'No vota' },
          ],
        }
      : { votaciones: o.votaciones }),
  });

describe('M-06 · calendario y enlaces del Congreso', () => {
  it('lee los días con votaciones de la variable diasVotaciones, sin repetir y ordenados', () => {
    const html = '<script>var diasVotaciones = [20220203, 20220201,20220203 ];</script>';
    expect(leerDiasVotaciones(html)).toEqual(['20220201', '20220203']);
  });

  it('falla si la página no trae el calendario', () => {
    expect(() => leerDiasVotaciones('<html></html>')).toThrow(/diasVotaciones/);
  });

  it('separa las votaciones con JSON de las que solo tienen gráfico', () => {
    const base = '/webpublica/opendata/votaciones/Leg15/Sesion030/20240314';
    const html = `
      <a href="${base}/Votacion001/VOT_20240314_001.json">json</a>
      <a href="${base}/Votacion001/VOT_20240314_001.png">png</a>
      <a href="${base}/Votacion002/VOT_20240314_002.png">png</a>`;
    expect(leerEnlacesDia(html)).toEqual({
      json: [`${base}/Votacion001/VOT_20240314_001.json`],
      sinJson: [`${base}/Votacion002`],
    });
  });

  it('encuentra los archivos de diputados de cada legislatura', () => {
    const html = `
      <a href="/webpublica/opendata/diputados/odsDiputados14__20230101.json">XIV</a>
      <a href="/webpublica/opendata/diputados/DiputadosActivos__20261001.json">activos</a>
      <a href="/webpublica/opendata/diputados/DiputadosDeBaja__20261001.json">baja</a>`;
    expect(leerEnlacesDiputados(html)).toEqual({
      XIV: ['/webpublica/opendata/diputados/odsDiputados14__20230101.json'],
      XV: ['/webpublica/opendata/diputados/DiputadosActivos__20261001.json', '/webpublica/opendata/diputados/DiputadosDeBaja__20261001.json'],
    });
  });

  it('construye la URL del día con la fecha en formato DD/MM/AAAA', () => {
    expect(urlDiaVotaciones('XV', '20240314')).toContain('targetLegislatura=XV&targetDate=14/03/2024');
  });
});

describe('M-06 · JSON de una votación', () => {
  it('normaliza el voto de cada diputado (S/N/A/X) y quita espacios del nombre', () => {
    const v = leerVotacion(jsonVotacion());
    expect(v).toMatchObject({ sesion: 149, numero: 20, asentimiento: false, secreta: false, totales: { si: 2, no: 1, abstencion: 0, noVota: 1 } });
    expect(v.votos.map((x) => `${x.diputado}:${x.voto}`)).toEqual(['Pérez, Ana:S', 'López, Luis:S', 'García, Eva:N', 'Ruiz, Pau:X']);
  });

  it('rechaza una votación cuyo voto nominal no cuadra con los totales', () => {
    expect(() => leerVotacion(jsonVotacion({ totales: { afavor: 3 } }))).toThrow(/votos "S" nominales frente a 3/);
  });

  it('acepta que el Congreso liste menos "no vota" que los totales, pero no más', () => {
    expect(() => leerVotacion(jsonVotacion({ totales: { noVotan: 3 } }))).not.toThrow();
    expect(() => leerVotacion(jsonVotacion({ totales: { noVotan: 0 } }))).toThrow(/"X"/);
  });

  it('marca como secreta una votación sin lista nominal ni asentimiento', () => {
    expect(leerVotacion(jsonVotacion({ votaciones: [] }))).toMatchObject({ secreta: true, votos: [] });
  });

  it('marca el asentimiento y no exige que cuadren los totales', () => {
    expect(leerVotacion(jsonVotacion({ asentimiento: 'Sí', votaciones: [] }))).toMatchObject({ asentimiento: true, secreta: false });
  });
});

describe('M-06 · formato compacto por día', () => {
  it('compactar y expandir devuelve el mismo voto nominal, también con diputados que faltan en una votación', () => {
    const a = leerVotacion(jsonVotacion());
    const b = { ...leerVotacion(jsonVotacion({ totales: { afavor: 1, noVotan: 0 } , votaciones: [
      { diputado: 'Pérez, Ana', grupo: 'GMx', voto: 'Sí' },
      { diputado: 'García, Eva', grupo: 'GP', voto: 'No' },
    ] })), numero: 21 };
    const dia = compactarDia('XIV', '20220203', [b, a], []);
    expect(dia.votaciones.map((v) => v.numero)).toEqual([20, 21]);
    expect(expandirVotos(dia, dia.votaciones[0]!)).toEqual(expect.arrayContaining(a.votos));
    expect(expandirVotos(dia, dia.votaciones[0]!)).toHaveLength(4);
    expect(expandirVotos(dia, dia.votaciones[1]!)).toEqual(expect.arrayContaining(b.votos));
    expect(expandirVotos(dia, dia.votaciones[1]!)).toHaveLength(2);
  });
});
