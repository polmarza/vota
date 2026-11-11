// Qué datos lleva la imagen para compartir el resultado (S-02). Código puro: sin DOM, sin Canvas y
// sin red; el dibujo está en dibujo.ts. Las decisiones están en docs/features/explorador-y-compartir.md.
//
// Privacidad (M-08): de las respuestas del cuestionario solo se leen las cuatro de CAMPOS_PERFIL, y
// solo si el visitante marca "Incluir mi perfil en la imagen". Ingresos, patrimonio, herencia,
// discapacidad y provincia no entran nunca: no hay ningún camino en este archivo que las lea.

import type { Resultado, ResultadoPartido, Respuestas } from '../afinidad/calculo.ts';
import { NO_RESPONDE } from '../afinidad/calculo.ts';

export const ANCHO_TARJETA = 1080;
export const ALTO_TARJETA = 1350;
export const MARCA = 'vota con criterio';
export const WEB = 'vota.concriterio.blog';
export const AVISO_TARJETA = 'No es una recomendación de voto.';
export const TITULO_A_FAVOR = 'Votó más veces a tu favor';
export const TITULO_FAVORABLE = 'Estuvieron de tu lado';
export const TITULO_DESFAVORABLE = 'Votaron en tu contra';
export const NOMBRE_ARCHIVO = 'vota-con-criterio.png';
/** El texto que acompaña a la imagen al compartir: solo invita a hacer el test, sin nombrar partidos. */
export const TEXTO_COMPARTIR = `Mira qué votaron los partidos en el Congreso sobre tu vida: ${WEB}`;
/** Cuántos temas salen como mucho en la tarjeta. */
export const MAXIMO_TEMAS = 3;

/** Las únicas respuestas que pueden salir en la imagen, en este orden (y solo si se pide). */
export const CAMPOS_PERFIL = ['vivienda', 'trabajo', 'edad', 'hijos'] as const;
export type CampoPerfil = (typeof CAMPOS_PERFIL)[number];

/** Texto de cada opción de las preguntas del perfil, tal como está en data/preguntas.yaml. */
export type TextosPerfil = Partial<Record<CampoPerfil, Record<string, string>>>;

/**
 * Versión corta, en minúscula, de las opciones del perfil: los textos de data/preguntas.yaml están
 * escritos en primera persona para el cuestionario ("Estoy en paro") y en la tarjeta van como
 * etiquetas ("en paro"). Una opción que no esté aquí sale con su texto en minúscula.
 */
export const ABREVIADOS: Record<CampoPerfil, Record<string, string>> = {
  vivienda: { alquiler: 'de alquiler', hipoteca: 'con hipoteca', propiedad: 'vivienda propia pagada', familia: 'vivienda familiar o cedida' },
  trabajo: {
    asalariado: 'por cuenta ajena',
    autonomo: 'autónomo',
    funcionario: 'personal público',
    desempleo: 'en paro',
    estudiante: 'estudiante',
    jubilado: 'jubilado o pensionista',
    hogar: 'hogar y cuidados',
  },
  edad: { 'menos-30': 'menos de 30 años', '30-44': 'de 30 a 44 años', '45-64': 'de 45 a 64 años', '65-mas': '65 años o más' },
  hijos: { no: 'sin hijos a cargo', pequenos: 'hijos menores de 3 años', menores: 'hijos de 3 a 17 años', mayores: 'hijos mayores de edad' },
};

/** Nombre legible de cada tema del catálogo (el campo `tema` de las fichas). */
export const NOMBRES_TEMAS: Record<string, string> = {
  campo: 'Campo',
  catastrofes: 'Catástrofes',
  cuidados: 'Cuidados',
  educacion: 'Educación',
  empleo: 'Empleo',
  energia: 'Energía',
  familia: 'Familia',
  fiscalidad: 'Impuestos',
  animales: 'Animales',
  pensiones: 'Pensiones',
  presupuestos: 'Presupuestos',
  sanidad: 'Sanidad',
  territorio: 'Territorio',
  transporte: 'Transporte',
  vivienda: 'Vivienda',
};

export const nombreTema = (slug: string) => NOMBRES_TEMAS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');

/** "95 %", con espacio fino irrompible, como en el resultado. */
export const porcentajeTarjeta = (x: number) => `${Math.round(x * 100)} %`;

export interface PartidoTarjeta {
  id: string;
  nombre: string;
  color?: string;
}

export interface FilaTarjeta {
  partido: string;
  nombre: string;
  /** Color del partido, de data/partidos/ (nunca del CSS). */
  color: string;
  /** Fracción de 0 a 1 que dibuja la barra. */
  fraccion: number;
  porcentaje: string;
}

export interface DatosTarjeta {
  marca: string;
  temas: string[];
  masAFavor: FilaTarjeta | null;
  favorables: FilaTarjeta[];
  desfavorables: FilaTarjeta[];
  /** Línea de perfil, solo si el visitante la pidió y respondió alguna de las cuatro preguntas. */
  perfil: string | null;
  aviso: string;
  web: string;
}

export interface EntradaTarjeta {
  resultado: Resultado;
  /** El tema de cada votación del catálogo. */
  fichas: { votacion: string; tema: string }[];
  partidos: PartidoTarjeta[];
  respuestas: Respuestas;
  incluirPerfil: boolean;
  textosPerfil?: TextosPerfil;
  /** Color de un partido sin color propio. */
  sinColor?: string;
}

/** Texto corto de una respuesta del perfil, o null si no respondió o prefirió no hacerlo. */
export function textoOpcionPerfil(campo: CampoPerfil, valor: string | undefined, textos: TextosPerfil = {}): string | null {
  if (valor === undefined || valor === NO_RESPONDE) return null;
  const texto = ABREVIADOS[campo][valor] ?? textos[campo]?.[valor]?.toLocaleLowerCase('es');
  return texto ?? null;
}

/** La línea de perfil: "de alquiler · estudiante · menos de 30 años · sin hijos a cargo". */
export function lineaPerfil(respuestas: Respuestas, textos: TextosPerfil = {}): string | null {
  const partes = CAMPOS_PERFIL.map((c) => textoOpcionPerfil(c, respuestas[c], textos)).filter((t): t is string => t !== null);
  return partes.length ? partes.join(' · ') : null;
}

/**
 * Los temas que más afectan a esta persona: los de las votaciones que le cuentan en el resultado
 * (las contrapuestas no cuentan), del más frecuente al menos, hasta MAXIMO_TEMAS. A igualdad de
 * votaciones, por orden alfabético del nombre.
 */
export function temasPrincipales(resultado: Resultado, fichas: { votacion: string; tema: string }[]): string[] {
  const temaDe = new Map(fichas.map((f) => [f.votacion, f.tema]));
  const cuenta = new Map<string, number>();
  for (const r of resultado.relevantes) {
    if (r.sentido === 'contrapuesta') continue;
    const tema = temaDe.get(r.votacion);
    if (tema) cuenta.set(tema, (cuenta.get(tema) ?? 0) + 1);
  }
  return [...cuenta]
    .map(([tema, n]) => ({ nombre: nombreTema(tema), n }))
    .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, MAXIMO_TEMAS)
    .map((t) => t.nombre);
}

/** Lo que va en la tarjeta. Solo lee las respuestas de CAMPOS_PERFIL, y solo si incluirPerfil. */
export function datosTarjeta(e: EntradaTarjeta): DatosTarjeta {
  const partidos = new Map(e.partidos.map((p) => [p.id, p]));
  const fila = (p: ResultadoPartido, clave: 'favorable' | 'desfavorable'): FilaTarjeta => {
    const info = partidos.get(p.partido);
    return {
      partido: p.partido,
      nombre: info?.nombre ?? p.partido,
      color: info?.color ?? e.sinColor ?? '#5e6b71',
      fraccion: p[clave],
      porcentaje: porcentajeTarjeta(p[clave]),
    };
  };
  const favorables = e.resultado.favorables.map((p) => fila(p, 'favorable'));
  return {
    marca: MARCA,
    temas: temasPrincipales(e.resultado, e.fichas),
    masAFavor: favorables[0] ?? null,
    favorables,
    desfavorables: e.resultado.desfavorables.map((p) => fila(p, 'desfavorable')),
    perfil: e.incluirPerfil ? lineaPerfil(e.respuestas, e.textosPerfil) : null,
    aviso: AVISO_TARJETA,
    web: WEB,
  };
}

/** Descripción en texto de la tarjeta: el texto alternativo de la vista previa. */
export function textoAlternativo(d: DatosTarjeta): string {
  const lista = (filas: FilaTarjeta[]) => filas.map((f) => `${f.nombre}, ${f.porcentaje}`).join('; ');
  return [
    `Imagen para compartir de ${d.marca}.`,
    d.temas.length ? `Lo que más te afecta: ${d.temas.join(', ')}.` : null,
    d.perfil ? `Perfil: ${d.perfil}.` : null,
    d.masAFavor ? `${TITULO_A_FAVOR}: ${d.masAFavor.nombre}, ${d.masAFavor.porcentaje}.` : null,
    `${TITULO_FAVORABLE}: ${lista(d.favorables)}.`,
    d.desfavorables.length ? `${TITULO_DESFAVORABLE}: ${lista(d.desfavorables)}.` : null,
    d.aviso,
    d.web,
  ]
    .filter(Boolean)
    .join(' ');
}
