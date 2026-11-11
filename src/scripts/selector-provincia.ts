// El comportamiento del selector de provincia (docs/design-system.md → Selector de provincia): patrón
// ARIA combobox + listbox sobre el marcado de src/components/SelectorProvincia.astro. Se monta sobre
// cualquier raíz [data-selector-provincia], así que la misma lógica sirve en la primera pregunta de
// /test y en la ventana del héroe de la portada; los id de cada copia llevan su prefijo
// (data-prefijo) para que no se repitan en una página que tenga las dos.
//
// No guarda nada: la provincia elegida solo vive en memoria, en quien lo monta (M-08).
import { buscarProvincias, provinciaExacta, type ProvinciaBuscable } from '../lib/perfil/provincias.ts';

export interface OpcionesSelector<P extends ProvinciaBuscable> {
  /** Cada vez que cambia la provincia elegida (undefined: lo escrito no es ninguna). */
  alCambiar?: (p: P | undefined) => void;
  /** "Siguiente" (o Intro) con una provincia elegida. Sin ella, el selector avisa y no llama. */
  alAvanzar: (p: P) => void;
}

export interface SelectorProvincia<P extends ProvinciaBuscable> {
  /** La provincia elegida ahora mismo, si la hay. */
  elegida(): P | undefined;
  /** Pone una provincia (o vacía el campo) sin avisar a alCambiar: para sincronizar dos copias. */
  fijar(p: P | undefined): void;
  /** El botón "Siguiente", para devolverle el foco. */
  boton: HTMLButtonElement;
}

export const AVISO_OBLIGATORIA = 'Elige tu provincia de la lista para seguir: es la única pregunta obligatoria.';

export function montarSelectorProvincia<P extends ProvinciaBuscable>(raiz: HTMLElement, provincias: P[], opciones: OpcionesSelector<P>): SelectorProvincia<P> {
  const prefijo = raiz.dataset.prefijo ?? 'provincia';
  const campo = raiz.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const lista = raiz.querySelector<HTMLUListElement>('[role="listbox"]')!;
  const aviso = raiz.querySelector<HTMLElement>('[data-aviso]')!;
  const boton = raiz.querySelector<HTMLButtonElement>('[data-siguiente]')!;
  let elegida: P | undefined;
  let sugerencias: P[] = [];
  let activa = -1;

  function poner(p: P | undefined) {
    elegida = p;
    if (p) {
      campo.value = p.nombre;
      aviso.textContent = '';
    }
    boton.setAttribute('aria-disabled', String(!p));
  }

  function elegir(p: P | undefined) {
    poner(p);
    opciones.alCambiar?.(p);
    cerrarLista();
  }

  function cerrarLista() {
    lista.hidden = true;
    lista.replaceChildren();
    campo.setAttribute('aria-expanded', 'false');
    campo.removeAttribute('aria-activedescendant');
    activa = -1;
  }

  function marcarActiva(i: number) {
    activa = i;
    lista.querySelectorAll('li').forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    const li = lista.children[i] as HTMLElement | undefined;
    if (li) {
      campo.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    }
  }

  function intentarAvanzar() {
    if (!elegida) {
      aviso.textContent = AVISO_OBLIGATORIA;
      campo.focus();
      return;
    }
    opciones.alAvanzar(elegida);
  }

  campo.addEventListener('input', () => {
    elegir(provinciaExacta(provincias, campo.value));
    if (elegida) return;
    sugerencias = buscarProvincias(provincias, campo.value);
    if (!sugerencias.length) return cerrarLista();
    lista.replaceChildren(
      ...sugerencias.map((p, i) => {
        const li = document.createElement('li');
        li.id = `${prefijo}-${p.id}`;
        li.role = 'option';
        li.textContent = p.nombre;
        li.setAttribute('aria-selected', 'false');
        li.addEventListener('mousedown', (e) => e.preventDefault());
        li.addEventListener('click', () => elegir(sugerencias[i]));
        return li;
      }),
    );
    lista.hidden = false;
    campo.setAttribute('aria-expanded', 'true');
    activa = -1;
  });

  campo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && sugerencias.length && !lista.hidden) {
      e.preventDefault();
      marcarActiva(Math.min(activa + 1, sugerencias.length - 1));
    } else if (e.key === 'ArrowUp' && !lista.hidden) {
      e.preventDefault();
      marcarActiva(Math.max(activa - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!lista.hidden && activa >= 0) elegir(sugerencias[activa]);
      else if (!lista.hidden && sugerencias.length === 1) elegir(sugerencias[0]);
      else intentarAvanzar();
    } else if (e.key === 'Escape') {
      cerrarLista();
    }
  });

  campo.addEventListener('blur', () => setTimeout(cerrarLista, 0));
  boton.addEventListener('click', intentarAvanzar);

  return {
    elegida: () => elegida,
    fijar(p) {
      poner(p);
      if (!p) campo.value = '';
      cerrarLista();
    },
    boton,
  };
}
