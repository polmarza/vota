import { describe, expect, it } from 'vitest';
import { compactarDia, type Votacion } from '../../../scripts/data/congreso.ts';
import type { Asignador } from '../../../scripts/data/partidos.ts';
import { sentidoDe, votosDelDia } from '../../../scripts/data/votos.ts';

const d = (si: number, no: number, abstencion: number, ausente = 0) => ({ si, no, abstencion, ausente });

describe('M-06 · sentido del voto de un partido', () => {
  it('es el de la mayoría de sus diputados presentes', () => {
    expect(sentidoDe(d(120, 0, 0, 3))).toMatchObject({ sentido: 'si', dividido: false });
    expect(sentidoDe(d(0, 30, 2))).toMatchObject({ sentido: 'no', dividido: true });
    expect(sentidoDe(d(1, 0, 4))).toMatchObject({ sentido: 'abstencion', dividido: true });
  });

  it('los que no votan no cuentan para la mayoría ni para "dividido"', () => {
    expect(sentidoDe(d(2, 0, 0, 50))).toMatchObject({ sentido: 'si', dividido: false });
  });

  it('es "ausente" si no votó ninguno de sus diputados', () => {
    expect(sentidoDe(d(0, 0, 0, 3))).toMatchObject({ sentido: 'ausente', dividido: false });
  });

  it('es "empate" si las dos opciones más votadas empatan', () => {
    expect(sentidoDe(d(1, 1, 0))).toMatchObject({ sentido: 'empate', dividido: true });
    expect(sentidoDe(d(2, 1, 2))).toMatchObject({ sentido: 'empate' });
    expect(sentidoDe(d(3, 1, 1))).toMatchObject({ sentido: 'si' });
  });

  it('conserva el desglose', () => {
    expect(sentidoDe(d(5, 2, 1, 4))).toMatchObject({ si: 5, no: 2, abstencion: 1, ausente: 4 });
  });
});

const votacion = (numero: number, votos: Votacion['votos'], extra: Partial<Votacion> = {}): Votacion => ({
  sesion: 10, numero, fecha: '01/02/2024', titulo: '', expediente: '', subgrupo: '', textoSubgrupo: '', conjuntas: [],
  asentimiento: false, secreta: false, totales: { si: 0, no: 0, abstencion: 0, noVota: 0 }, votos, ...extra,
});

/** Asignador de prueba: el partido sale del nombre ("psoe:Pérez"), salvo los del Mixto. */
const asignar: Asignador = (_leg, diputado, grupo) => (grupo === 'GMx' ? null : diputado.split(':')[0]!);

describe('M-06 · voto de partido en las votaciones de un día', () => {
  const dia = compactarDia('XV', '20240201', [
    votacion(1, [
      { diputado: 'psoe:A', grupo: 'GS', voto: 'S' },
      { diputado: 'psoe:B', grupo: 'GS', voto: 'S' },
      { diputado: 'psoe:C', grupo: 'GS', voto: 'X' },
      { diputado: 'pp:D', grupo: 'GP', voto: 'N' },
      { diputado: 'pp:E', grupo: 'GMx', voto: 'S' },
    ]),
    votacion(2, [], { asentimiento: true }),
    votacion(3, [], { secreta: true }),
  ], []);
  const [nominal, asentimiento, secreta] = votosDelDia(dia, asignar);

  it('agrupa los votos de cada diputado en su partido y usa el id <leg>-<sesion>-<numero>', () => {
    expect(nominal!.id).toBe('XV-10-1');
    expect(nominal!.partidos.psoe).toEqual({ si: 2, no: 0, abstencion: 0, ausente: 1, sentido: 'si', dividido: false });
  });

  it('no cuenta los votos que la herencia no atribuye a nadie', () => {
    expect(nominal!.partidos.pp).toEqual({ si: 0, no: 1, abstencion: 0, ausente: 0, sentido: 'no', dividido: false });
  });

  it('marca las votaciones por asentimiento y las secretas, sin voto de partido', () => {
    expect(asentimiento).toMatchObject({ id: 'XV-10-2', asentimiento: true, partidos: {} });
    expect(secreta).toMatchObject({ id: 'XV-10-3', secreta: true, partidos: {} });
  });

  it('solo incluye los partidos con algún diputado en la votación', () => {
    expect(Object.keys(nominal!.partidos)).toEqual(['pp', 'psoe']);
  });
});
