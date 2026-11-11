import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ESTUDIANTE_MADRID, elegirProvincia, responderHastaResultado } from './utiles.ts';

// S-02: compartir el resultado (docs/features/explorador-y-compartir.md).

const FINAL = { ...ESTUDIANTE_MADRID, arrendador: 'no' };

async function hastaFinal(page: Page) {
  await elegirProvincia(page, 'madr', 'Madrid');
  await responderHastaResultado(page, ESTUDIANTE_MADRID);
  await expect(page.getByTestId('resultado-provisional')).toBeVisible();
  await page.getByTestId('seguir').click();
  await responderHastaResultado(page, FINAL);
  await expect(page.getByTestId('resultado-final')).toBeVisible();
  // La imagen está lista cuando la vista previa tiene su PNG y el botón se activa.
  await expect(page.getByTestId('compartir-vista-previa')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByTestId('compartir-boton')).toHaveAttribute('aria-disabled', 'false');
}

/** Ancho y alto de un PNG, de su cabecera IHDR. */
function medidasPng(png: Buffer) {
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) };
}

/** Sin Web Share con archivos (como en escritorio): el botón descarga el PNG. */
const sinWebShare = (page: Page) => page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true }));

test('el botón Compartir aparece en el resultado final y no en el provisional', async ({ page }) => {
  await page.goto('/test');
  await elegirProvincia(page, 'madr', 'Madrid');
  await responderHastaResultado(page, ESTUDIANTE_MADRID);
  await expect(page.getByTestId('resultado-provisional')).toBeVisible();
  await expect(page.getByTestId('podio-favorable').first()).toBeVisible();
  await expect(page.getByTestId('compartir')).toHaveCount(0);
  await expect(page.getByTestId('compartir-boton')).toHaveCount(0);

  await page.getByTestId('seguir').click();
  await responderHastaResultado(page, FINAL);
  const final = page.getByTestId('resultado-final');
  await expect(final.getByTestId('compartir-boton')).toBeVisible();
  await expect(final.getByTestId('compartir-boton')).toHaveText('Compartir');
  await expect(final.getByTestId('compartir-vista-previa')).toBeVisible();
});

test('sin Web Share descarga una imagen PNG de 1080×1350', async ({ page }, info) => {
  await sinWebShare(page);
  await page.goto('/test');
  await hastaFinal(page);
  const descarga = page.waitForEvent('download');
  await page.getByTestId('compartir-boton').click();
  const d = await descarga;
  expect(d.suggestedFilename()).toBe('vota-con-criterio.png');
  const ruta = info.outputPath('compartir.png');
  await d.saveAs(ruta);
  expect(medidasPng(readFileSync(ruta))).toEqual({ ancho: 1080, alto: 1350 });
  await expect(page.getByTestId('compartir-estado')).toHaveText('Imagen descargada.');
});

test('con Web Share se comparte el archivo y un texto que solo invita al test', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { compartido: { nombre: string; tipo: string; texto?: string; tamano: number }[] };
    w.compartido = [];
    Object.defineProperty(Navigator.prototype, 'canShare', { value: (d: ShareData) => Boolean(d.files?.length), configurable: true });
    Object.defineProperty(Navigator.prototype, 'share', {
      value: async (d: ShareData) => {
        for (const f of d.files ?? []) w.compartido.push({ nombre: f.name, tipo: f.type, texto: d.text, tamano: f.size });
      },
      configurable: true,
    });
  });
  await page.goto('/test');
  await hastaFinal(page);
  await page.getByTestId('compartir-boton').click();
  const compartido = await page.evaluate(() => (window as unknown as { compartido: { nombre: string; tipo: string; texto?: string; tamano: number }[] }).compartido);
  expect(compartido).toHaveLength(1);
  expect(compartido[0]).toMatchObject({ nombre: 'vota-con-criterio.png', tipo: 'image/png', texto: 'Mira qué votaron los partidos en el Congreso sobre tu vida: vota.concriterio.blog' });
  expect(compartido[0]!.tamano).toBeGreaterThan(10_000);
});

test('por defecto la tarjeta no lleva respuestas; con la casilla, solo la línea de perfil sin datos sensibles', async ({ page }) => {
  await page.goto('/test');
  await hastaFinal(page);
  const vista = page.getByTestId('compartir-vista-previa');
  const casilla = page.getByTestId('compartir-perfil');
  await expect(casilla).not.toBeChecked();

  const alt = (await vista.getAttribute('alt'))!;
  expect(alt).toContain('Votó más veces a tu favor:');
  expect(alt).toContain('Estuvieron de tu lado:');
  expect(alt).toContain('No es una recomendación de voto.');
  expect(alt).toContain('vota.concriterio.blog');
  expect(alt).not.toContain('Perfil:');
  for (const r of ['alquiler', 'estudiante', 'menos de 30', 'sin hijos', '16.000']) expect(alt).not.toContain(r);
  await expect(vista).toHaveAttribute('data-perfil', 'false');

  await casilla.check();
  await expect(vista).toHaveAttribute('data-perfil', 'true');
  const conPerfil = (await vista.getAttribute('alt'))!;
  const linea = conPerfil.match(/Perfil: ([^.]+)\./)?.[1];
  expect(linea).toBe('de alquiler · estudiante · menos de 30 años · sin hijos a cargo');
  for (const r of ['16.000', 'ingres', 'patrimonio', 'herencia', 'discapacidad', 'Madrid', 'madrid']) expect(linea).not.toContain(r);

  await casilla.uncheck();
  await expect(vista).toHaveAttribute('data-perfil', 'false');
});

test('generar y descargar la imagen no hace ninguna petición de red (M-08)', async ({ page }) => {
  await sinWebShare(page);
  await page.goto('/test');
  await page.waitForLoadState('networkidle');
  await elegirProvincia(page, 'madr', 'Madrid');
  await responderHastaResultado(page, ESTUDIANTE_MADRID);
  await page.getByTestId('seguir').click();

  // Desde aquí se genera la imagen: cualquier petición (salvo leer el PNG local de la vista previa)
  // sería una fuga.
  const peticiones: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('blob:') && !r.url().startsWith('data:')) peticiones.push(`${r.method()} ${r.url()}`);
  });
  await responderHastaResultado(page, FINAL);
  await expect(page.getByTestId('compartir-boton')).toHaveAttribute('aria-disabled', 'false');
  await page.getByTestId('compartir-perfil').check();
  await expect(page.getByTestId('compartir-vista-previa')).toHaveAttribute('data-perfil', 'true');
  const descarga = page.waitForEvent('download');
  await page.getByTestId('compartir-boton').click();
  await descarga;
  expect(peticiones).toEqual([]);
});

test('el bloque de compartir pasa axe (WCAG 2.1 AA)', async ({ page }) => {
  await page.goto('/test');
  await hastaFinal(page);
  await page.getByTestId('compartir-perfil').check();
  await expect(page.getByTestId('compartir-vista-previa')).toHaveAttribute('data-perfil', 'true');
  const { violations } = await new AxeBuilder({ page }).include('[data-testid="compartir"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  // La casilla tiene nombre accesible y se maneja con teclado.
  await expect(page.getByRole('checkbox', { name: 'Incluir mi perfil en la imagen' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Compartir' })).toBeVisible();
});
