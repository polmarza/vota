// Pinta el resultado provisional y el final en el navegador (M-03, M-04, M-09, M-12). El cálculo es
// el de src/lib/afinidad/calculo.ts; aquí solo se construye el DOM. Nada sale del navegador (M-08).

import {
  calcular,
  podriaAfectar,
  postura,
  type FichaCalculo,
  type Respuestas,
  type ResultadoPartido,
  type VotosPorVotacion,
} from '../lib/afinidad/calculo.ts';

export interface FichaWeb extends FichaCalculo {
  titulo: string;
  fecha: string;
  url: string;
  que_significa_si: string;
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

/** Crea un elemento con clase, atributos y contenido. El texto va siempre como texto, nunca como HTML. */
function el(etiqueta: string, opciones: { clase?: string; texto?: string; atributos?: Record<string, string> } = {}, ...hijos: (Node | null)[]) {
  const e = document.createElement(etiqueta);
  if (opciones.clase) e.className = opciones.clase;
  if (opciones.texto !== undefined) e.textContent = opciones.texto;
  for (const [k, v] of Object.entries(opciones.atributos ?? {})) e.setAttribute(k, v);
  for (const h of hijos) if (h) e.append(h);
  return e;
}

/** Titular con una palabra en cursiva: "Te han *favorecido*". */
function titular(antes: string, cursiva: string) {
  const h = el('h3', { clase: 'titular-podio' });
  h.append(antes, el('i', { texto: cursiva }));
  return h;
}

/** Texto negro o blanco según la luminosidad del color del partido, para que las siglas se lean. */
function textoSobre(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const l = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return (1.05 / (l + 0.05)) >= 4.5 ? '#ffffff' : '#0b0b0b';
}

const porcentaje = (x: number) => `${Math.round(x * 100)}%`;
const FECHA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });

export function pintarResultado(contenedor: HTMLElement, datos: DatosResultado, respuestas: Respuestas, opciones: { provisional: boolean; pendientes: Set<string> }) {
  const partidos = new Map(datos.partidos.map((p) => [p.id, p]));
  const enProvincia = datos.porProvincia[respuestas.provincia ?? ''] ?? [];
  const r = calcular(datos.fichas, datos.votos, respuestas, enProvincia);
  const fichas = new Map(datos.fichas.map((f) => [f.votacion, f]));
  const cuentan = r.relevantes.filter((x) => x.sentido !== 'contrapuesta');

  const fila = (p: ResultadoPartido, clave: 'favorable' | 'desfavorable') => {
    const info = partidos.get(p.partido)!;
    const color = info.color ?? '#555555';
    const cifra = clave === 'favorable' ? p.aFavor : p.enContra;
    return el(
      'li',
      { clase: 'fila-partido', atributos: { 'data-testid': `podio-${clave}-${p.partido}` } },
      el('span', { clase: 'logo-partido', texto: info.siglas.slice(0, 3), atributos: { style: `background:${color};color:${textoSobre(color)}`, 'aria-hidden': 'true' } }),
      el('span', { clase: 'nombre-partido', texto: info.nombre }),
      el('span', { clase: 'cifra', texto: porcentaje(p[clave]) }),
      el('span', { clase: 'detalle', texto: `${cifra} de ${p.contadas} votaciones` }),
      el('span', { clase: 'barra-partido', atributos: { 'aria-hidden': 'true' } }, el('span', { atributos: { style: `width:${porcentaje(p[clave])};background:${color}` } })),
    );
  };

  const hijos: Node[] = [];
  if (opciones.provisional) {
    const posibles = datos.fichas.filter((f) => podriaAfectar(f, respuestas, opciones.pendientes)).length;
    hijos.push(el('p', { clase: 'cobertura', texto: `Basado en ${cuentan.length} de las ${posibles} votaciones que podrían afectarte.`, atributos: { 'data-testid': 'cobertura' } }));
  }

  if (!r.suficiente) {
    hijos.push(
      el('div', {
        clase: 'caja-aviso',
        texto: `Solo ${cuentan.length === 1 ? 'una votación del catálogo te afecta' : `${cuentan.length} votaciones del catálogo te afectan`} con tus respuestas: no son suficientes para comparar a los partidos con rigor. ${opciones.provisional ? 'Sigue con más preguntas para ampliar el resultado.' : ''}`,
        atributos: { 'data-testid': 'sin-datos' },
      }),
    );
  } else {
    hijos.push(
      el('section', { clase: 'podio', atributos: { 'data-testid': 'podio-favorable' } }, titular('Estuvieron ', 'de tu lado'), el('p', { clase: 'explica', texto: 'Apoyaron lo que te beneficiaba, o se opusieron a lo que te perjudicaba.' }), el('ol', { clase: 'filas' }, ...r.favorables.map((p) => fila(p, 'favorable')))),
      el('section', { clase: 'podio', atributos: { 'data-testid': 'podio-desfavorable' } }, titular('Votaron ', 'en tu contra'), el('p', { clase: 'explica', texto: 'Se opusieron a lo que te beneficiaba, o apoyaron lo que te perjudicaba.' }), el('ol', { clase: 'filas' }, ...r.desfavorables.map((p) => fila(p, 'desfavorable')))),
    );
  }

  hijos.push(
    el('div', {
      clase: 'caja-aviso',
      texto:
        'Herramienta orientativa basada solo en votaciones del Congreso de las dos últimas legislaturas. No tiene en cuenta ideologías ni programas electorales, y no es una recomendación de voto. ' +
        'El porcentaje es la parte de las votaciones que te afectan en la que cada partido votó a tu favor (o en tu contra); por eso los dos podios no suman 100.' +
        (datos.candidaturasProvisionales ? ' La lista de partidos de cada provincia es provisional hasta contrastarla con las candidaturas proclamadas.' : ''),
      atributos: { 'data-testid': 'aviso-alcance' },
    }),
  );

  // Votaciones que explican el resultado (M-04).
  if (r.relevantes.length) {
    const lista = el('ol', { clase: 'votaciones', atributos: { 'data-testid': 'lista-votaciones' } });
    const porFecha = [...r.relevantes].sort((a, b) => fichas.get(a.votacion)!.fecha.localeCompare(fichas.get(b.votacion)!.fecha));
    for (const { votacion, sentido } of porFecha) {
      const f = fichas.get(votacion)!;
      const motivos = f.efectos
        .filter((e) => Object.entries(e.cuando).every(([k, v]) => respuestas[k] !== undefined && v.includes(respuestas[k]!)))
        .map((e) => e.justificacion);
      const votosPartidos = el('ul', { clase: 'votos' });
      for (const id of enProvincia) {
        const v = datos.votos[votacion]?.[id];
        const info = partidos.get(id)!;
        let texto: string;
        if (!v) texto = 'sin diputados';
        else if (v.sentido === 'empate') texto = `votó dividido (${v.si} sí, ${v.no} no, ${v.abstencion} abst.)`;
        else {
          const base = { si: 'sí', no: 'no', abstencion: 'abstención', ausente: 'no votó' }[v.sentido];
          texto = v.dividido ? `${base}, voto dividido (${v.si} sí, ${v.no} no, ${v.abstencion} abst.)` : base;
        }
        const p = sentido === 'contrapuesta' ? 'no-cuenta' : postura(v, sentido);
        votosPartidos.append(el('li', { clase: `voto voto-${p}` }, el('span', { clase: 'siglas', texto: info.siglas }), el('span', { texto: `: ${texto}` })));
      }
      lista.append(
        el(
          'li',
          { clase: 'votacion', atributos: { 'data-testid': `votacion-${votacion}` } },
          el('p', { clase: 'meta', texto: `${FECHA.format(new Date(f.fecha))} · ${sentido === 'favorece' ? 'te favorecía' : sentido === 'perjudica' ? 'te perjudicaba' : 'te afectaba en sentidos contrarios: no cuenta'}` }),
          el('h4', { texto: f.titulo }),
          ...motivos.map((m) => el('p', { clase: 'motivo', texto: m })),
          el('p', { clase: 'que-si', texto: f.que_significa_si }),
          votosPartidos,
          el('a', { clase: 'fuente', texto: 'Ver la votación en el Congreso', atributos: { href: f.url, target: '_blank', rel: 'noopener' } }),
        ),
      );
    }
    hijos.push(el('h3', { clase: 'titular-lista', texto: 'Las votaciones que te afectan' }), lista);
  }

  contenedor.replaceChildren(...hijos);
}
