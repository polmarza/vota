import { expect, test } from '@playwright/test';
import { ESTUDIANTE_MADRID, elegirProvincia, responderHastaResultado } from './utiles.ts';

test('M-08: las respuestas no salen del navegador ni se guardan', async ({ page, context }) => {
  await page.goto('/test');
  await page.waitForLoadState('networkidle');

  // A partir de aquí, cualquier petición sería una fuga: la página ya tiene todo lo que necesita.
  const peticiones: string[] = [];
  page.on('request', (r) => peticiones.push(`${r.method()} ${r.url()}`));

  await elegirProvincia(page, 'madr', 'Madrid');
  await responderHastaResultado(page, ESTUDIANTE_MADRID);
  await page.getByTestId('seguir').click();
  await responderHastaResultado(page, { ...ESTUDIANTE_MADRID, arrendador: 'no' });
  await expect(page.getByTestId('resultado-final')).toBeVisible();

  const respuestas = Object.values(ESTUDIANTE_MADRID);
  const fugas = peticiones.filter((p) => p.startsWith('POST') || respuestas.some((r) => p.includes(r)));
  expect(fugas).toEqual([]);
  expect(peticiones.filter((p) => !p.includes('localhost'))).toEqual([]);

  // Ni en la URL, ni en el almacenamiento del navegador, ni en cookies.
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(await context.cookies()).toEqual([]);
});

test('M-08: tampoco cuando el test empieza en la ventana de la portada y sigue en el mismo documento', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const peticiones: string[] = [];
  page.on('request', (r) => peticiones.push(`${r.method()} ${r.url()}`));

  await page.getByTestId('portada-provincia-campo').fill('madr');
  await page.getByTestId('portada-provincia-lista').getByRole('option', { name: 'Madrid' }).click();
  await page.getByTestId('portada-provincia-siguiente').click();
  await expect(page.getByTestId('pregunta-vivienda')).toBeVisible();
  await responderHastaResultado(page, ESTUDIANTE_MADRID);
  await page.getByTestId('seguir').click();
  await responderHastaResultado(page, { ...ESTUDIANTE_MADRID, arrendador: 'no' });
  await expect(page.getByTestId('resultado-final')).toBeVisible();

  // Ni una petición a la red: la página ya lo tenía todo, y la dirección pasa a /test sin cargar nada.
  // Solo se lee la vista previa de la imagen para compartir, un blob: que genera el propio navegador.
  expect(peticiones.filter((p) => !p.startsWith('GET blob:'))).toEqual([]);

  const url = new URL(page.url());
  expect([url.pathname, url.search, url.hash]).toEqual(['/test', '', '']);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(await page.evaluate(() => history.state)).toBeNull();
  expect(await context.cookies()).toEqual([]);
});
