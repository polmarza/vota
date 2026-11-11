// Dibujo de la imagen para compartir (S-02) con Canvas, en el navegador: el resultado nunca sale del
// dispositivo salvo que el visitante comparta la imagen (M-08). Qué va en la tarjeta lo decide
// tarjeta.ts; aquí solo se pinta, con el estilo Ventana (docs/design-system.md → Imagen para compartir).

import {
  ALTO_TARJETA,
  ANCHO_TARJETA,
  TITULO_A_FAVOR,
  TITULO_DESFAVORABLE,
  TITULO_FAVORABLE,
  type DatosTarjeta,
  type FilaTarjeta,
} from './tarjeta.ts';

const COLOR = {
  fondo: '#f7f9fa',
  superficie: '#ecf0f2',
  tinta: '#0a0a0a',
  gris: '#5e6b71',
  arena: '#d9ccb7',
  filete: 'rgba(10, 10, 10, 0.11)',
};
const SANS = '"Geist Variable", system-ui, sans-serif';
const MONO = '"Geist Mono Variable", ui-monospace, Menlo, monospace';
/** El arco del hemiciclo de public/favicon.svg, en una caja de 24×24. */
const ARCO = 'M4.5 19.5V12a7.5 7.5 0 0 1 15 0v7.5h-4.7V12a2.8 2.8 0 0 0-5.6 0v7.5z';

const MARCO = 32;
const MARGEN = MARCO + 64;
const DERECHA = ANCHO_TARJETA - MARGEN;
const ANCHO_UTIL = DERECHA - MARGEN;

/** Espera a que Geist y Geist Mono estén cargadas: si no, Canvas dibuja con la fuente del sistema. */
async function cargarFuentes() {
  if (!('fonts' in document)) return;
  await Promise.all([
    document.fonts.load(`500 48px ${SANS}`),
    document.fonts.load(`400 26px ${SANS}`),
    document.fonts.load(`500 30px ${MONO}`),
  ]);
}

type Ctx = CanvasRenderingContext2D;

function fuente(ctx: Ctx, peso: number, tamano: number, familia: string, interletra = 0) {
  ctx.font = `${peso} ${tamano}px ${familia}`;
  // letterSpacing no está en todos los navegadores: sin él, el texto sale sin interletrado negativo.
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${interletra * tamano}px`;
}

/** Escribe un texto en una línea; si no cabe en `ancho`, baja el cuerpo hasta que quepa. */
function texto(ctx: Ctx, t: string, x: number, y: number, o: { peso?: number; tamano: number; familia?: string; color?: string; ancho?: number; alinear?: CanvasTextAlign; interletra?: number }) {
  let tamano = o.tamano;
  const familia = o.familia ?? SANS;
  fuente(ctx, o.peso ?? 400, tamano, familia, o.interletra);
  while (o.ancho && ctx.measureText(t).width > o.ancho && tamano > 12) {
    tamano -= 1;
    fuente(ctx, o.peso ?? 400, tamano, familia, o.interletra);
  }
  ctx.fillStyle = o.color ?? COLOR.tinta;
  ctx.textAlign = o.alinear ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(t, x, y);
  return ctx.measureText(t).width;
}

function rectRedondo(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

function punto(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function marca(ctx: Ctx, d: DatosTarjeta, y: number) {
  const lado = 72;
  rectRedondo(ctx, MARGEN, y, lado, lado, (lado * 5) / 24, COLOR.tinta);
  ctx.save();
  ctx.translate(MARGEN, y);
  ctx.scale(lado / 24, lado / 24);
  ctx.fillStyle = '#ffffff';
  ctx.fill(new Path2D(ARCO));
  ctx.restore();
  texto(ctx, d.marca, MARGEN + lado + 22, y + 50, { peso: 500, tamano: 44, interletra: -0.03 });
  texto(ctx, 'Elecciones generales · 29-N', DERECHA, y + 46, { peso: 500, tamano: 22, familia: MONO, color: COLOR.gris, alinear: 'right' });
}

/** Medidas de un podio: relleno, línea base del título, primera fila y paso entre filas. */
const PODIO = { pad: 32, titulo: 30, primera: 58, barra: 24 };
const altoPodio = (filas: number, paso: number) => PODIO.pad + PODIO.titulo + PODIO.primera + (Math.max(filas, 1) - 1) * paso + PODIO.barra + PODIO.pad;

/** Un podio: tarjeta del fondo sobre la superficie, título y tres filas con punto, nombre, % y barra. */
function podio(ctx: Ctx, titulo: string, filas: FilaTarjeta[], y: number, paso: number) {
  const x = MARGEN;
  const { pad } = PODIO;
  rectRedondo(ctx, x, y, ANCHO_UTIL, altoPodio(filas.length, paso), 24, COLOR.superficie);
  texto(ctx, titulo, x + pad, y + pad + PODIO.titulo, { peso: 500, tamano: 38, interletra: -0.02 });
  const anchoFila = ANCHO_UTIL - pad * 2;
  let fy = y + pad + PODIO.titulo + PODIO.primera;
  for (const f of filas) {
    punto(ctx, x + pad + 10, fy - 11, 10, f.color);
    const anchoPct = texto(ctx, f.porcentaje, x + pad + anchoFila, fy, { peso: 500, tamano: 32, familia: MONO, alinear: 'right' });
    texto(ctx, f.nombre, x + pad + 34, fy, { peso: 500, tamano: 32, ancho: anchoFila - 34 - anchoPct - 24, interletra: -0.01 });
    rectRedondo(ctx, x + pad, fy + 16, anchoFila, 8, 4, COLOR.fondo);
    if (f.fraccion > 0) rectRedondo(ctx, x + pad, fy + 16, Math.max(8, anchoFila * f.fraccion), 8, 4, f.color);
    fy += paso;
  }
}

/** Dibuja la tarjeta en un canvas nuevo de 1080×1350. */
export async function dibujarTarjeta(d: DatosTarjeta): Promise<HTMLCanvasElement> {
  await cargarFuentes();
  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_TARJETA;
  canvas.height = ALTO_TARJETA;
  const ctx = canvas.getContext('2d')!;

  // Marco arena y, dentro, la tarjeta del fondo (como la ventana del héroe de la portada).
  ctx.fillStyle = COLOR.arena;
  ctx.fillRect(0, 0, ANCHO_TARJETA, ALTO_TARJETA);
  rectRedondo(ctx, MARCO, MARCO, ANCHO_TARJETA - MARCO * 2, ALTO_TARJETA - MARCO * 2, 28, COLOR.fondo);

  let y = MARGEN - 8;
  marca(ctx, d, y);
  y += 72 + 56;

  if (d.temas.length) {
    texto(ctx, 'Lo que más te afecta', MARGEN, y, { peso: 500, tamano: 24, familia: MONO, color: COLOR.gris });
    y += 60;
    texto(ctx, d.temas.join(' · '), MARGEN, y, { peso: 500, tamano: 50, ancho: ANCHO_UTIL, interletra: -0.03 });
  }
  if (d.perfil) {
    y += 50;
    texto(ctx, d.perfil, MARGEN, y, { tamano: 26, color: COLOR.gris, ancho: ANCHO_UTIL });
  }
  y += 36;

  // El partido que más veces votó a su favor.
  if (d.masAFavor) {
    ctx.fillStyle = COLOR.filete;
    ctx.fillRect(MARGEN, y, ANCHO_UTIL, 2);
    y += 48;
    texto(ctx, TITULO_A_FAVOR, MARGEN, y, { peso: 500, tamano: 24, familia: MONO, color: COLOR.gris });
    y += 70;
    const anchoPct = texto(ctx, d.masAFavor.porcentaje, DERECHA, y, { peso: 500, tamano: 60, familia: MONO, alinear: 'right' });
    punto(ctx, MARGEN + 16, y - 20, 16, d.masAFavor.color);
    texto(ctx, d.masAFavor.nombre, MARGEN + 50, y, { peso: 500, tamano: 60, ancho: ANCHO_UTIL - 50 - anchoPct - 32, interletra: -0.03 });
    y += 36;
  }

  // Pie: aviso y dirección de la web, siempre en el mismo sitio.
  const basePie = ALTO_TARJETA - MARCO - 60;
  texto(ctx, d.aviso, MARGEN, basePie, { peso: 500, tamano: 28, interletra: -0.01, ancho: ANCHO_UTIL / 2 + 60 });
  texto(ctx, d.web, DERECHA, basePie, { peso: 500, tamano: 28, familia: MONO, alinear: 'right' });

  // Los dos podios, uno encima del otro, en el espacio que queda hasta el pie: si no caben con el paso
  // normal entre filas (con la línea de perfil), las filas se juntan un poco.
  const limite = basePie - 28 - 40;
  const hueco = 20;
  const filas = [d.favorables.length, d.desfavorables.length].filter((n) => n > 0);
  const fijo = filas.reduce((t, n) => t + altoPodio(n, 0), 0) + hueco * (filas.length - 1);
  const pasos = filas.reduce((t, n) => t + Math.max(n, 1) - 1, 0);
  const paso = Math.min(66, pasos ? (limite - y - fijo) / pasos : 66);
  const total = fijo + pasos * paso;
  y += Math.max(0, (limite - y - total) / 2);
  podio(ctx, TITULO_FAVORABLE, d.favorables, y, paso);
  if (d.desfavorables.length) podio(ctx, TITULO_DESFAVORABLE, d.desfavorables, y + altoPodio(d.favorables.length, paso) + hueco, paso);
  return canvas;
}

/** El PNG del canvas. */
export function aPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo generar la imagen'))), 'image/png'));
}
