// El comportamiento del cuestionario (M-01) sobre el marcado de src/components/Cuestionario.astro:
// enseña las preguntas de una en una, recoge las respuestas y pinta los resultados. Se monta en /test
// y en la portada, donde el cuestionario está oculto hasta que se elige la provincia en la ventana del
// héroe (src/pages/index.astro).
//
// Las respuestas viven solo en una variable de este módulo: no van a la URL, ni a localStorage, ni a
// ningún servidor (M-08). Se pierden al cerrar o recargar la página.
import { aplica, progreso, puedeAvanzar, respuestasEfectivas, type Paso, type PreguntaTest } from '../lib/perfil/cuestionario.ts';
import type { ProvinciaBuscable } from '../lib/perfil/provincias.ts';
import { conComunidad } from '../lib/afinidad/calculo.ts';
import { pintarResultado, type DatosResultado } from './resultado.ts';
import { montarSelectorProvincia } from './selector-provincia.ts';
import type { TextosPerfil } from '../lib/compartir/tarjeta.ts';

export type ProvinciaTest = ProvinciaBuscable & { ccaa: string };

export interface OpcionesCuestionario {
  /**
   * "Atrás" en la primera pregunta. Sin esta opción es un enlace a la portada; con ella, el enlace no
   * navega y se llama a esta función (la portada vuelve a enseñarse en el mismo documento).
   */
  alVolver?: () => void;
}

export interface Cuestionario {
  /** Las provincias del selector, para montar otra copia del selector con los mismos datos. */
  provincias: ProvinciaTest[];
  /** La provincia respondida, si la hay. */
  provincia(): ProvinciaTest | undefined;
  /**
   * Responde la provincia (y rellena su campo, por si se vuelve atrás) y enseña la pregunta que va
   * después. La raíz tiene que estar ya visible: el foco va al enunciado.
   */
  empezarCon(p: ProvinciaTest): void;
  /** Vuelve a enseñar el paso en el que se quedó, con el foco en su enunciado. */
  retomar(): void;
}

export function montarCuestionario(raiz: HTMLElement, opciones: OpcionesCuestionario = {}): Cuestionario {
  const { pasos, preguntas, provincias, resultado, textosPerfil } = JSON.parse(raiz.querySelector('[data-datos-test]')!.textContent!) as {
    pasos: Paso[];
    preguntas: PreguntaTest[];
    provincias: ProvinciaTest[];
    resultado: DatosResultado;
    textosPerfil: TextosPerfil;
  };
  const ccaaDe = new Map(provincias.map((p) => [p.id, p.ccaa]));
  const clave = (p: Paso) => (p.tipo === 'pregunta' ? `pregunta:${p.pregunta}` : p.tipo);
  const secciones = pasos.map((p) => raiz.querySelector<HTMLElement>(`[data-paso="${clave(p)}"]`)!);

  /** Las respuestas del visitante. Solo en memoria: se pierden al cerrar o recargar la página. */
  const respuestas: Record<string, string> = {};
  let actual = 0;
  const AVANCE_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400;

  /** Si un paso se enseña con las respuestas actuales (las preguntas condicionales pueden saltarse). */
  const visible = (p: Paso) => p.tipo !== 'pregunta' || aplica(preguntas.find((x) => x.id === p.pregunta)!, respuestas);

  /** Va al paso i o, si es una pregunta que no aplica, al siguiente visible en la misma dirección. */
  function mostrar(i: number, direccion: 1 | -1 = 1) {
    while (i > 0 && i < pasos.length - 1 && !visible(pasos[i]!)) i += direccion;
    secciones[actual]!.hidden = true;
    actual = i;
    const paso = pasos[actual]!;
    if (paso.tipo === 'pregunta') {
      // El contador cuenta solo las preguntas que se le hacen a esta persona.
      const { texto, fraccion } = progreso(preguntas, paso.pregunta, respuestas);
      const s = secciones[actual]!;
      s.querySelector('[data-progreso-texto]')!.textContent = texto;
      s.querySelector('[data-progreso-pct]')!.textContent = `${Math.round(fraccion * 100)} %`;
      s.querySelector<HTMLElement>('[data-progreso-barra]')!.style.setProperty('--avance', `${Math.round(fraccion * 100)}%`);
    } else {
      const efectivas = respuestasEfectivas(preguntas, respuestas);
      const pendientes = new Set(preguntas.filter((p) => p.bloque === 'ampliado' && aplica(p, efectivas) && efectivas[p.id] === undefined).map((p) => p.id));
      pintarResultado(secciones[actual]!.querySelector('[data-resultado]')!, resultado, conComunidad(efectivas, ccaaDe), {
        provisional: paso.tipo === 'provisional',
        pendientes,
        accion: secciones[actual]!.querySelector<HTMLElement>('[data-seguir]'),
        textosPerfil,
      });
    }
    secciones[actual]!.hidden = false;
    secciones[actual]!.querySelector<HTMLElement>('h2')!.focus();
    window.scrollTo(0, 0);
  }

  function siguiente() {
    const paso = pasos[actual]!;
    if (paso.tipo === 'pregunta') {
      const p = preguntas.find((x) => x.id === paso.pregunta)!;
      if (!puedeAvanzar(p, respuestas[p.id])) return;
    }
    if (actual < pasos.length - 1) mostrar(actual + 1);
  }

  for (const s of secciones) {
    s.querySelector('[data-atras]')?.addEventListener('click', () => actual > 0 && mostrar(actual - 1, -1));
    s.querySelector('[data-seguir]')?.addEventListener('click', siguiente);
  }

  // "Atrás" de la primera pregunta: un enlace a la portada, salvo que quien monta diga otra cosa.
  const alVolver = opciones.alVolver;
  if (alVolver) {
    secciones[0]!.querySelector('a.atras')?.addEventListener('click', (e) => {
      e.preventDefault();
      alVolver();
    });
  }

  // Opciones: al marcar una, se rellena su marca y la pregunta avanza sola.
  for (const boton of raiz.querySelectorAll<HTMLButtonElement>('.opcion')) {
    boton.addEventListener('click', () => {
      const seccion = boton.closest<HTMLElement>('[data-paso]')!;
      const id = seccion.dataset.paso!.replace('pregunta:', '');
      respuestas[id] = boton.dataset.valor!;
      for (const b of seccion.querySelectorAll('.opcion')) b.setAttribute('aria-pressed', String(b === boton));
      setTimeout(siguiente, AVANCE_MS);
    });
  }

  // Provincia: el selector con autocompletado de la pregunta que la pide.
  const selector = montarSelectorProvincia(raiz.querySelector<HTMLElement>('[data-selector-provincia]')!, provincias, {
    alCambiar(p) {
      if (p) respuestas.provincia = p.id;
      else delete respuestas.provincia;
    },
    alAvanzar: siguiente,
  });

  const indiceProvincia = pasos.findIndex((p) => p.tipo === 'pregunta' && p.pregunta === 'provincia');
  secciones[0]!.hidden = false;

  return {
    provincias,
    provincia: () => provincias.find((p) => p.id === respuestas.provincia),
    empezarCon(p) {
      respuestas.provincia = p.id;
      selector.fijar(p);
      mostrar(indiceProvincia + 1);
    },
    retomar() {
      secciones[actual]!.querySelector<HTMLElement>('h2')!.focus();
      window.scrollTo(0, 0);
    },
  };
}
