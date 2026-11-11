// Explorador del catálogo (S-01) en el navegador: filtra la lista que ya viene pintada del build
// (src/pages/votaciones.astro) y recorta los resúmenes largos con "Ver más". No pinta contenido ni
// guarda nada: sin JavaScript se ve la lista entera.

/** Minúsculas y sin acentos, para buscar "educacion" y encontrar "Educación". */
const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function iniciarExplorador() {
  const formulario = document.querySelector<HTMLFormElement>('[data-filtros]');
  const lista = document.querySelector<HTMLElement>('[data-lista]');
  const recuento = document.querySelector<HTMLElement>('[data-recuento]');
  const vacio = document.querySelector<HTMLElement>('[data-vacio]');
  if (!formulario || !lista || !recuento || !vacio) return;

  const texto = formulario.querySelector<HTMLInputElement>('#filtro-texto')!;
  const tema = formulario.querySelector<HTMLSelectElement>('#filtro-tema')!;
  const legislatura = formulario.querySelector<HTMLSelectElement>('#filtro-legislatura')!;
  const filas = [...lista.querySelectorAll<HTMLElement>(':scope > li')].map((li) => ({
    li,
    tema: li.dataset.tema ?? '',
    legislatura: li.dataset.legislatura ?? '',
    texto: normalizar([...li.querySelectorAll('[data-buscable]')].map((e) => e.textContent ?? '').join(' ')),
  }));

  const filtrar = () => {
    const palabras = normalizar(texto.value).split(/\s+/).filter(Boolean);
    let visibles = 0;
    for (const f of filas) {
      const ve = (!tema.value || f.tema === tema.value) && (!legislatura.value || f.legislatura === legislatura.value) && palabras.every((p) => f.texto.includes(p));
      f.li.hidden = !ve;
      if (ve) visibles++;
    }
    const filtrado = visibles !== filas.length;
    recuento.textContent = filtrado ? `${visibles} de ${filas.length} votaciones` : `${filas.length} votaciones`;
    vacio.hidden = visibles > 0;
  };

  formulario.addEventListener('input', filtrar);
  formulario.addEventListener('submit', (e) => e.preventDefault());
  vacio.querySelector('[data-limpiar]')?.addEventListener('click', () => {
    formulario.reset();
    filtrar();
    texto.focus();
  });
  formulario.hidden = false;
  // Al volver atrás, el navegador puede restaurar lo que había en los campos.
  filtrar();

  // "Ver más": el resumen se recorta a tres líneas y el botón solo aparece si de verdad se recorta.
  // Un resumen plegado no mide nada, así que se comprueba al abrir cada votación.
  lista.classList.add('js-resumen');
  const comprobar = (detalles: HTMLDetailsElement) => {
    const resumen = detalles.querySelector<HTMLElement>('[data-resumen]');
    const boton = detalles.querySelector<HTMLButtonElement>('[data-ver-mas]');
    if (!resumen || !boton || resumen.classList.contains('is-entero')) return;
    boton.hidden = resumen.scrollHeight <= resumen.clientHeight + 1;
  };
  for (const detalles of lista.querySelectorAll<HTMLDetailsElement>('details')) {
    detalles.addEventListener('toggle', () => detalles.open && comprobar(detalles));
    const boton = detalles.querySelector<HTMLButtonElement>('[data-ver-mas]');
    boton?.addEventListener('click', () => {
      const resumen = detalles.querySelector<HTMLElement>('[data-resumen]')!;
      const entero = resumen.classList.toggle('is-entero');
      boton.setAttribute('aria-expanded', String(entero));
      boton.textContent = entero ? 'Ver menos' : 'Ver más';
    });
  }
}
