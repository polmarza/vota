// Pinta el resultado provisional y el final en el navegador (M-03, M-04, M-09, M-12). El cálculo es
// el de src/lib/afinidad/calculo.ts; aquí solo se construye el DOM, con las clases del sistema Ventana
// (src/styles/global.css). Nada sale del navegador (M-08).
//
// Las funciones de texto (etiquetaVoto, porcentaje, fechaCorta) no tocan el DOM: las usa también la
// portada en el build para pintar el resultado de ejemplo con el mismo formato.

import {
  calcular,
  podriaAfectar,
  postura,
  type FichaCalculo,
  type Respuestas,
  type ResultadoPartido,
  type VotoPartido,
  type VotosPorVotacion,
} from '../lib/afinidad/calculo.ts';
import { aPng, dibujarTarjeta } from '../lib/compartir/dibujo.ts';
import { NOMBRE_ARCHIVO, TEXTO_COMPARTIR, datosTarjeta, textoAlternativo, type TextosPerfil } from '../lib/compartir/tarjeta.ts';

export interface FichaWeb extends FichaCalculo {
  titulo: string;
  fecha: string;
  url: string;
  que_significa_si: string;
  /** Tipo de iniciativa y quién la propuso: "Proyecto de ley del Gobierno". */
  iniciativa: string;
  /** Tema de la ficha (slug): sale en la imagen para compartir. */
  tema: string;
}

export interface PartidoWeb {
  id: string;
  nombre: string;
  siglas: string;
  color?: string;
}

export interface DatosResultado {
  fichas: FichaWeb[];
  votos: VotosPorVotacion;
  partidos: PartidoWeb[];
  /** Partidos que se presentan en cada provincia (M-02). */
  porProvincia: Record<string, string[]>;
  candidaturasProvisionales: boolean;
}

/** Color de un partido sin color propio (no debería pasar: lo comprueba catalogo-real.test.ts). */
export const SIN_COLOR = '#5e6b71';

export const TEXTO_FAVORABLE = 'Apoyaron lo que te beneficiaba, o se opusieron a lo que te perjudicaba.';
export const TEXTO_DESFAVORABLE = 'Se opusieron a lo que te beneficiaba, o apoyaron lo que te perjudicaba.';
export const AVISO_ALCANCE =
  'Herramienta orientativa basada solo en votaciones del Congreso de las dos últimas legislaturas. No tiene en cuenta ideologías ni programas electorales, y no es una recomendación de voto. ' +
  'El porcentaje es la parte de las votaciones que te afectan en la que cada partido votó a tu favor (o en tu contra); por eso los dos podios no suman 100.';
export const AVISO_PROVISIONAL = ' La lista de partidos de cada provincia es provisional hasta contrastarla con las candidaturas proclamadas.';

/** "95 %", con espacio fino irrompible como pide la RAE. */
export const porcentaje = (x: number) => `${Math.round(x * 100)} %`;

const FECHA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** "27 ene 2026". La fecha de la ficha es un día, sin hora: se formatea en UTC. */
export const fechaCorta = (iso: string) => FECHA.format(new Date(iso)).replace('.', '');

export const textoSentido = (s: string) =>
  s === 'favorece' ? 'El sí te favorecía' : s === 'perjudica' ? 'El sí te perjudicaba' : 'Te afectaba en sentidos contrarios: no cuenta';

/** Lo que se enseña del voto de un partido: la píldora y, si votó dividido, el desglose. */
export function etiquetaVoto(v: VotoPartido | undefined): { pildora: string; si: boolean; desglose?: string } {
  if (!v) return { pildora: 'Sin diputados', si: false };
  const cuenta = `(${v.si} sí, ${v.no} no, ${v.abstencion} abst.)`;
  if (v.sentido === 'empate') return { pildora: 'Empate', si: false, desglose: `votó dividido ${cuenta}` };
  const pildora = { si: 'Sí', no: 'No', abstencion: 'Abstención', ausente: 'No votó' }[v.sentido];
  return { pildora, si: v.sentido === 'si', desglose: v.dividido ? `voto dividido ${cuenta}` : undefined };
}

/**
 * Variables de estilo de un partido: su color (de data/partidos/) y, en una barra, su ancho. El color
 * va tal cual, sin filete aunque contraste poco con el fondo: el nombre y el porcentaje van al lado en
 * texto (docs/design-system.md → Contraste).
 */
export const estiloPartido = (color: string | undefined, ancho?: number) =>
  `--c:${color ?? SIN_COLOR}${ancho === undefined ? '' : `;--w:${Math.round(ancho * 100)}%`}`;

/** Crea un elemento con clase, atributos y contenido. El texto va siempre como texto, nunca como HTML. */
function el(etiqueta: string, opciones: { clase?: string; texto?: string; atributos?: Record<string, string> } = {}, ...hijos: (Node | string | null)[]) {
  const e = document.createElement(etiqueta);
  if (opciones.clase) e.className = opciones.clase;
  if (opciones.texto !== undefined) e.textContent = opciones.texto;
  for (const [k, v] of Object.entries(opciones.atributos ?? {})) e.setAttribute(k, v);
  for (const h of hijos) if (h !== null) e.append(h);
  return e;
}

export function pintarResultado(
  contenedor: HTMLElement,
  datos: DatosResultado,
  respuestas: Respuestas,
  opciones: { provisional: boolean; pendientes: Set<string>; accion?: HTMLElement | null; textosPerfil?: TextosPerfil },
) {
  const partidos = new Map(datos.partidos.map((p) => [p.id, p]));
  const enProvincia = datos.porProvincia[respuestas.provincia ?? ''] ?? [];
  const r = calcular(datos.fichas, datos.votos, respuestas, enProvincia);
  const fichas = new Map(datos.fichas.map((f) => [f.votacion, f]));
  const cuentan = r.relevantes.filter((x) => x.sentido !== 'contrapuesta');

  const fila = (p: ResultadoPartido, clave: 'favorable' | 'desfavorable') => {
    const info = partidos.get(p.partido)!;
    const cifra = clave === 'favorable' ? p.aFavor : p.enContra;
    return el(
      'li',
      { clase: 'fila-partido', atributos: { 'data-testid': `podio-${clave}-${p.partido}`, style: estiloPartido(info.color, p[clave]) } },
      el('span', { clase: 'who' }, info.nombre, ' ', el('small', { clase: 'detalle', texto: `${cifra} de ${p.contadas} votaciones` })),
      el('span', { clase: 'pct', texto: porcentaje(p[clave]) }),
      el('span', { clase: 'meter', atributos: { 'aria-hidden': 'true' } }, el('i')),
    );
  };
  const podio = (clave: 'favorable' | 'desfavorable', titulo: string, texto: string, lista: ResultadoPartido[]) =>
    el('section', { clase: 'podium', atributos: { 'data-testid': `podio-${clave}` } }, el('h3', { texto: titulo }), el('p', { texto }), el('ol', {}, ...lista.map((p) => fila(p, clave))));

  const hijos: Node[] = [];
  if (opciones.provisional) {
    const posibles = datos.fichas.filter((f) => podriaAfectar(f, respuestas, opciones.pendientes)).length;
    hijos.push(el('p', { clase: 'cobertura t-lead', texto: `Basado en ${cuentan.length} de las ${posibles} votaciones que podrían afectarte.`, atributos: { 'data-testid': 'cobertura' } }));
  }

  const fondo = el('div', { clase: 'resultado-fondo' });
  if (!r.suficiente) {
    fondo.append(
      el('p', {
        clase: 'sin-datos',
        texto: `Solo ${cuentan.length === 1 ? 'una votación del catálogo te afecta' : `${cuentan.length} votaciones del catálogo te afectan`} con tus respuestas: no son suficientes para comparar a los partidos con rigor. ${opciones.provisional ? 'Sigue con más preguntas para ampliar el resultado.' : ''}`,
        atributos: { 'data-testid': 'sin-datos' },
      }),
    );
  } else {
    fondo.append(
      el(
        'div',
        { clase: 'podiums' },
        podio('favorable', 'Estuvieron de tu lado', TEXTO_FAVORABLE, r.favorables),
        podio('desfavorable', 'Votaron en tu contra', TEXTO_DESFAVORABLE, r.desfavorables),
      ),
    );
  }
  fondo.append(
    el(
      'div',
      { clase: 'result-foot' },
      el('p', { clase: 'aviso', texto: AVISO_ALCANCE + (datos.candidaturasProvisionales ? AVISO_PROVISIONAL : ''), atributos: { 'data-testid': 'aviso-alcance' } }),
      opciones.accion ? el('div', { clase: 'btn-row' }, opciones.accion) : null,
    ),
  );
  // Compartir (S-02): solo en el resultado final y si hay podios que enseñar.
  if (!opciones.provisional && r.suficiente) {
    fondo.append(
      bloqueCompartir((incluirPerfil) =>
        datosTarjeta({ resultado: r, fichas: datos.fichas, partidos: datos.partidos, respuestas, incluirPerfil, textosPerfil: opciones.textosPerfil, sinColor: SIN_COLOR }),
      ),
    );
  }
  hijos.push(fondo);

  // Votaciones que explican el resultado (M-04), de la más antigua a la más reciente.
  if (r.relevantes.length) {
    const lista = el('ol', { clase: 'votaciones', atributos: { 'data-testid': 'lista-votaciones' } });
    const porFecha = [...r.relevantes].sort((a, b) => fichas.get(a.votacion)!.fecha.localeCompare(fichas.get(b.votacion)!.fecha));
    for (const { votacion, sentido } of porFecha) {
      const f = fichas.get(votacion)!;
      const motivos = f.efectos
        .filter((e) => Object.entries(e.cuando).every(([k, v]) => respuestas[k] !== undefined && v.includes(respuestas[k]!)))
        .map((e) => e.justificacion);
      const votosPartidos = el('ul', { clase: 'tally votos' });
      for (const id of enProvincia) {
        const v = datos.votos[votacion]?.[id];
        const info = partidos.get(id)!;
        const etiqueta = etiquetaVoto(v);
        const p = sentido === 'contrapuesta' ? 'no-cuenta' : postura(v, sentido);
        votosPartidos.append(
          el(
            'li',
            { clase: `voto voto-${p}`, atributos: { style: estiloPartido(info.color) } },
            el('span', { clase: 'p siglas', texto: info.siglas }),
            el('span', { clase: etiqueta.si ? 'v v--si' : 'v', texto: etiqueta.pildora }),
            etiqueta.desglose ? el('span', { clase: 'desglose', texto: etiqueta.desglose }) : null,
          ),
        );
      }
      lista.append(
        el(
          'li',
          { clase: 'votacion vote', atributos: { 'data-testid': `votacion-${votacion}` } },
          el(
            'div',
            { clase: 'vote__head' },
            el('time', { texto: `${fechaCorta(f.fecha)} · ${f.iniciativa}`, atributos: { datetime: f.fecha } }),
            el('h4', { clase: 'vote__t', texto: f.titulo }),
            el('p', { clase: 'vote__efecto', texto: textoSentido(sentido) }),
          ),
          el(
            'div',
            { clase: 'vote__cuerpo' },
            ...motivos.map((m) => el('p', { clase: 'vote__why motivo' }, el('b', { texto: 'Por qué te afecta:' }), ` ${m}`)),
            el('p', { clase: 'que-si', texto: f.que_significa_si }),
          ),
          votosPartidos,
          el('div', { clase: 'vote__more' }, el('a', { clase: 'link fuente', texto: 'Ver la votación en el Congreso', atributos: { href: f.url, target: '_blank', rel: 'noopener' } })),
        ),
      );
    }
    hijos.push(el('h3', { clase: 'titular-lista', texto: 'Las votaciones que te afectan' }), el('div', { clase: 'screen screen--lista' }, lista));
  }

  contenedor.replaceChildren(...hijos);
}

/**
 * El bloque "Compartir" del resultado final (S-02): la vista previa de la imagen, la casilla del
 * perfil (desmarcada por defecto) y el botón. La imagen se genera en el navegador con Canvas y nada
 * se envía a ningún servidor (M-08): se comparte con el menú del sistema o se descarga.
 */
function bloqueCompartir(tarjeta: (incluirPerfil: boolean) => ReturnType<typeof datosTarjeta>) {
  const casilla = el('input', { clase: 'm-check', atributos: { type: 'checkbox', id: 'compartir-perfil', 'data-testid': 'compartir-perfil', 'aria-describedby': 'compartir-perfil-ayuda' } }) as HTMLInputElement;
  const vista = el('img', { clase: 'compartir__vista', atributos: { 'data-testid': 'compartir-vista-previa', width: '216', height: '270', alt: '' } }) as HTMLImageElement;
  const boton = el('button', { clase: 'btn btn--primary', texto: 'Compartir', atributos: { type: 'button', 'data-testid': 'compartir-boton', 'aria-disabled': 'true' } }) as HTMLButtonElement;
  const estado = el('p', { clase: 'compartir__estado', atributos: { 'aria-live': 'polite', 'data-testid': 'compartir-estado' } });

  // El archivo se prepara antes de pulsar: Safari solo abre el menú de compartir si navigator.share
  // se llama justo en el clic, sin esperas por medio.
  let archivo: File | null = null;
  let url = '';
  let version = 0;
  async function preparar() {
    const v = ++version;
    archivo = null;
    boton.setAttribute('aria-disabled', 'true');
    const d = tarjeta(casilla.checked);
    const png = await aPng(await dibujarTarjeta(d));
    if (v !== version) return;
    archivo = new File([png], NOMBRE_ARCHIVO, { type: 'image/png' });
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(png);
    vista.src = url;
    vista.alt = textoAlternativo(d);
    vista.dataset.perfil = String(d.perfil !== null);
    boton.setAttribute('aria-disabled', 'false');
  }

  function descargar(f: File) {
    const a = el('a', { atributos: { href: url, download: f.name } });
    document.body.append(a);
    a.click();
    a.remove();
    estado.textContent = 'Imagen descargada.';
  }

  boton.addEventListener('click', async () => {
    const f = archivo;
    if (!f) return;
    estado.textContent = '';
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] })) {
      try {
        await navigator.share({ files: [f], text: TEXTO_COMPARTIR });
      } catch (e) {
        // Cerrar el menú sin compartir no es un error; si el sistema no deja compartir, se descarga.
        if (!(e instanceof DOMException && e.name === 'AbortError')) descargar(f);
      }
    } else {
      descargar(f);
    }
  });
  const intentar = () => preparar().catch(() => (estado.textContent = 'No se ha podido generar la imagen en este navegador.'));
  casilla.addEventListener('change', () => void intentar());
  void intentar();

  return el(
    'section',
    { clase: 'compartir', atributos: { 'data-testid': 'compartir', 'aria-labelledby': 'compartir-titulo' } },
    vista,
    el(
      'div',
      { clase: 'compartir__texto' },
      el('h3', { texto: 'Compartir el resultado', atributos: { id: 'compartir-titulo' } }),
      el('p', { texto: 'La imagen se crea en tu dispositivo con tus podios. Por defecto no lleva ninguna de tus respuestas.' }),
      el(
        'div',
        { clase: 'compartir__perfil' },
        casilla,
        el('label', { texto: 'Incluir mi perfil en la imagen', atributos: { for: 'compartir-perfil' } }),
      ),
      el('p', { clase: 'compartir__ayuda', texto: 'Añade una línea con tu vivienda, situación laboral, edad e hijos. Nunca tus ingresos, tu patrimonio, herencias, discapacidad ni tu provincia.', atributos: { id: 'compartir-perfil-ayuda' } }),
      el('div', { clase: 'btn-row' }, boton),
      estado,
    ),
  );
}
