import { expect, type Page } from '@playwright/test';

/** Respuestas por id de pregunta (ids de data/preguntas.yaml); la provincia se escribe en el campo. */
export type Perfil = Record<string, string>;

export const ESTUDIANTE_MADRID: Perfil = {
  provincia: 'madrid',
  vivienda: 'alquiler',
  trabajo: 'estudiante',
  edad: 'menos-30',
  ingresos: 'hasta-16k',
  hijos: 'no',
  cuidados: 'no',
  transporte: 'publico',
};

/** Elige la provincia escribiendo su nombre y seleccionándola de la lista. */
export async function elegirProvincia(page: Page, texto: string, nombre: string) {
  const campo = page.getByTestId('provincia-campo');
  await campo.fill(texto);
  await page.getByRole('option', { name: nombre }).click();
  await expect(campo).toHaveValue(nombre);
  await page.getByTestId('provincia-siguiente').click();
}

/** Responde las preguntas de opciones que vayan apareciendo hasta llegar a un resultado. */
export async function responderHastaResultado(page: Page, perfil: Perfil) {
  for (;;) {
    const visible = page.locator('[data-paso]:not([hidden])');
    const paso = await visible.getAttribute('data-paso');
    if (!paso?.startsWith('pregunta:')) return paso;
    const id = paso.replace('pregunta:', '');
    await page.getByTestId(`opcion-${id}-${perfil[id] ?? 'ns'}`).click();
    await expect(visible.first()).not.toHaveAttribute('data-paso', paso);
  }
}
