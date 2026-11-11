// Lectura de los datos abiertos del Congreso: páginas HTML de votaciones y diputados, y JSON de
// cada votación. Funciones puras, sin red, para poder probarlas con archivos guardados.

import { z } from 'zod';

export const LEGISLATURAS = { XIV: 14, XV: 15 } as const;
export type Legislatura = keyof typeof LEGISLATURAS;

export const BASE = 'https://www.congreso.es';

export function urlDiaVotaciones(leg: Legislatura, fecha?: string): string {
  const url = `${BASE}/es/opendata/votaciones?p_p_id=votaciones&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&targetLegislatura=${leg}`;
  if (!fecha) return url;
  const [a, m, d] = [fecha.slice(0, 4), fecha.slice(4, 6), fecha.slice(6, 8)];
  return `${url}&targetDate=${d}/${m}/${a}`;
}

export const URL_DIPUTADOS = `${BASE}/es/opendata/diputados`;

/** Días con votaciones de la legislatura, tal como los publica el calendario de la página (AAAAMMDD). */
export function leerDiasVotaciones(html: string): string[] {
  const m = html.match(/var diasVotaciones\s*=\s*\[([\d,\s]*)\]/);
  if (!m?.[1]) throw new Error('La página no contiene la lista diasVotaciones');
  return [...new Set(m[1].split(',').map((s) => s.trim()).filter((s) => /^\d{8}$/.test(s)))].sort();
}

export interface EnlacesDia {
  /** Rutas de los JSON, una por votación. */
  json: string[];
  /** Carpetas `VotacionNNN` que tienen gráfico pero no JSON: votaciones sin voto nominal publicado. */
  sinJson: string[];
}

/** Enlaces a los archivos de cada votación de la página de un día. */
export function leerEnlacesDia(html: string): EnlacesDia {
  const rutas = [...html.matchAll(/\/webpublica\/opendata\/votaciones\/[^"'\s<>]+/g)].map((m) => m[0]);
  const porCarpeta = new Map<string, Set<string>>();
  for (const ruta of rutas) {
    const carpeta = ruta.match(/^(.*\/Votacion\d+)\//)?.[1];
    if (!carpeta) continue;
    const ext = ruta.split('.').pop() ?? '';
    if (!porCarpeta.has(carpeta)) porCarpeta.set(carpeta, new Set());
    porCarpeta.get(carpeta)!.add(ext === 'json' ? ruta : ext);
  }
  const json: string[] = [];
  const sinJson: string[] = [];
  for (const [carpeta, archivos] of [...porCarpeta].sort(([a], [b]) => a.localeCompare(b))) {
    const j = [...archivos].find((a) => a.endsWith('.json'));
    if (j) json.push(j);
    else sinJson.push(carpeta);
  }
  return { json, sinJson };
}

/** Enlaces JSON de la página de diputados que necesitamos para cada legislatura. */
export function leerEnlacesDiputados(html: string): Record<Legislatura, string[]> {
  const buscar = (prefijo: string) => {
    const m = html.match(new RegExp(`/webpublica/opendata/diputados/${prefijo}__\\d+\\.json`));
    if (!m) throw new Error(`No se encuentra el archivo de diputados ${prefijo}`);
    return m[0];
  };
  return {
    XIV: [buscar('odsDiputados14')],
    XV: [buscar('DiputadosActivos'), buscar('DiputadosDeBaja')],
  };
}

// ─── JSON de una votación ───────────────────────────────────────────────────────

const VOTOS = { 'Sí': 'S', 'No': 'N', 'Abstención': 'A', 'No vota': 'X' } as const;
type VotoOficial = keyof typeof VOTOS;
export type CodigoVoto = (typeof VOTOS)[VotoOficial];

const esquemaVotacionOficial = z.object({
  informacion: z.object({
    sesion: z.number().int(),
    numeroVotacion: z.number().int(),
    fecha: z.string(),
    titulo: z.string().nullable().optional(),
    textoExpediente: z.string().nullable().optional(),
    tituloSubGrupo: z.string().nullable().optional(),
    textoSubGrupo: z.string().nullable().optional(),
    votacionesConjuntas: z.array(z.unknown()).optional(),
  }),
  totales: z.object({
    asentimiento: z.string(),
    presentes: z.number().int().optional(),
    afavor: z.number().int().optional(),
    enContra: z.number().int().optional(),
    abstenciones: z.number().int().optional(),
    noVotan: z.number().int().optional(),
  }),
  votaciones: z
    .array(
      z.object({
        asiento: z.string().optional(),
        diputado: z.string(),
        grupo: z.string(),
        voto: z.enum(Object.keys(VOTOS) as [VotoOficial, ...VotoOficial[]]),
      }),
    )
    .optional()
    .default([]),
});

export interface Votacion {
  sesion: number;
  numero: number;
  fecha: string;
  titulo: string;
  expediente: string;
  subgrupo: string;
  textoSubgrupo: string;
  conjuntas: unknown[];
  asentimiento: boolean;
  /** Votación secreta (p. ej. suplicatorios): el Congreso publica los totales, pero no el voto nominal. */
  secreta: boolean;
  totales: { si: number; no: number; abstencion: number; noVota: number };
  /** Voto de cada diputado, por nombre ("Apellidos, Nombre"). */
  votos: { diputado: string; grupo: string; voto: CodigoVoto }[];
}

/** Valida y normaliza el JSON de una votación. Lanza un error si no cuadra con sus propios totales. */
export function leerVotacion(texto: string): Votacion {
  const d = esquemaVotacionOficial.parse(JSON.parse(texto));
  const t = d.totales;
  const votacion: Votacion = {
    sesion: d.informacion.sesion,
    numero: d.informacion.numeroVotacion,
    fecha: d.informacion.fecha,
    titulo: d.informacion.titulo ?? '',
    expediente: d.informacion.textoExpediente ?? '',
    subgrupo: d.informacion.tituloSubGrupo ?? '',
    textoSubgrupo: d.informacion.textoSubGrupo ?? '',
    conjuntas: d.informacion.votacionesConjuntas ?? [],
    asentimiento: t.asentimiento.toLowerCase().startsWith('s'),
    secreta: false,
    totales: { si: t.afavor ?? 0, no: t.enContra ?? 0, abstencion: t.abstenciones ?? 0, noVota: t.noVotan ?? 0 },
    votos: d.votaciones.map((v) => ({ diputado: v.diputado.trim(), grupo: v.grupo, voto: VOTOS[v.voto] })),
  };
  votacion.secreta = !votacion.asentimiento && votacion.votos.length === 0;
  if (!votacion.asentimiento && !votacion.secreta) comprobarTotales(votacion);
  return votacion;
}

/**
 * La suma de los votos nominales tiene que dar los totales oficiales de la votación. Los "no vota"
 * pueden ser menos que en los totales: el Congreso no siempre lista a los diputados que no votaron
 * (p. ej. XIV, sesión 6, votación 1: 34 en la lista frente a 37 en los totales).
 */
export function comprobarTotales(v: Votacion): void {
  const cuenta = { S: 0, N: 0, A: 0, X: 0 };
  for (const { voto } of v.votos) cuenta[voto]++;
  const esperado = { S: v.totales.si, N: v.totales.no, A: v.totales.abstencion };
  if (cuenta.X > v.totales.noVota) {
    throw new Error(
      `Sesión ${v.sesion}, votación ${v.numero}: ${cuenta.X} votos "X" nominales frente a ${v.totales.noVota} en los totales`,
    );
  }
  for (const k of Object.keys(esperado) as (keyof typeof esperado)[]) {
    if (cuenta[k] !== esperado[k]) {
      throw new Error(
        `Sesión ${v.sesion}, votación ${v.numero}: ${cuenta[k]} votos "${k}" nominales frente a ${esperado[k]} en los totales`,
      );
    }
  }
}

// ─── Archivo compacto por día ───────────────────────────────────────────────────

/**
 * Un día de votaciones en formato compacto. Los diputados se listan una vez; el voto de cada
 * votación es una cadena alineada con esa lista: S sí, N no, A abstención, X no vota y un espacio
 * si el diputado no aparece en esa votación.
 */
export interface DiaCompacto {
  legislatura: Legislatura;
  fecha: string;
  diputados: string[];
  /** Grupos parlamentarios del día; en `grupos`, la letra "a" es el primero, "b" el segundo… */
  codigosGrupo: string[];
  votaciones: (Omit<Votacion, 'votos'> & { votos: string; grupos: string })[];
  /** Votaciones que el Congreso publica sin JSON (solo gráfico). */
  sinJson: string[];
}

/** Compacta las votaciones de un día. Los grupos van como cadena de índices de una letra. */
export function compactarDia(
  legislatura: Legislatura,
  fecha: string,
  votaciones: Votacion[],
  sinJson: string[],
): DiaCompacto {
  const diputados = [...new Set(votaciones.flatMap((v) => v.votos.map((x) => x.diputado)))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
  const indice = new Map(diputados.map((d, i) => [d, i]));
  const codigosGrupo = [...new Set(votaciones.flatMap((v) => v.votos.map((x) => x.grupo)))].sort();
  const letra = (g: string) => String.fromCharCode(97 + codigosGrupo.indexOf(g));
  return {
    legislatura,
    fecha,
    diputados,
    codigosGrupo,
    sinJson,
    votaciones: [...votaciones]
      .sort((a, b) => a.sesion - b.sesion || a.numero - b.numero)
      .map(({ votos, ...resto }) => {
        const v = Array<string>(diputados.length).fill(' ');
        const g = Array<string>(diputados.length).fill(' ');
        for (const x of votos) {
          const i = indice.get(x.diputado)!;
          v[i] = x.voto;
          g[i] = letra(x.grupo);
        }
        return { ...resto, votos: v.join(''), grupos: g.join('') };
      }),
  };
}

/** Recupera el voto nominal de una votación compactada. */
export function expandirVotos(
  dia: Pick<DiaCompacto, 'diputados' | 'codigosGrupo'>,
  v: { votos: string; grupos: string },
): Votacion['votos'] {
  const salida: Votacion['votos'] = [];
  for (let i = 0; i < dia.diputados.length; i++) {
    const voto = v.votos[i];
    if (!voto || voto === ' ') continue;
    salida.push({
      diputado: dia.diputados[i]!,
      grupo: dia.codigosGrupo[v.grupos.charCodeAt(i) - 97]!,
      voto: voto as CodigoVoto,
    });
  }
  return salida;
}
