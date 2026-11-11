import { expect, test } from '@playwright/test';
import { ESTUDIANTE_MADRID, elegirProvincia, responderHastaResultado } from './utiles.ts';

test.describe('M-01 · cuestionario', () => {
  test('desde la portada se llega a la primera pregunta', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('empezar').click();
    await expect(page.getByTestId('pregunta-provincia')).toBeVisible();
    await expect(page.getByText('Provincia · 1 de 8')).toBeVisible();
  });

  test('M-01 negativo: sin provincia no se avanza y se avisa de que es obligatoria', async ({ page }) => {
    await page.goto('/test');
    await page.getByTestId('provincia-campo').fill('Atlantis');
    // El botón está marcado aria-disabled, pero responde para explicar por qué no se avanza;
    // Playwright no hace clic en elementos aria-disabled si no se fuerza.
    await page.getByTestId('provincia-siguiente').click({ force: true });
    await expect(page.getByTestId('provincia-aviso')).toContainText('obligatoria');
    await expect(page.getByTestId('pregunta-provincia')).toBeVisible();
  });

  test('el autocompletado acepta nombres alternativos y sin acentos', async ({ page }) => {
    await page.goto('/test');
    const campo = page.getByTestId('provincia-campo');
    await campo.fill('vizc');
    await expect(page.getByRole('option', { name: 'Bizkaia' })).toBeVisible();
    await campo.fill('corun');
    await expect(page.getByRole('option', { name: 'A Coruña' })).toBeVisible();
    // Un nombre escrito entero, aunque sea el alternativo y sin acentos, queda elegido directamente.
    await campo.fill('vizcaya');
    await expect(campo).toHaveValue('Bizkaia');
    await expect(page.getByTestId('provincia-siguiente')).toHaveAttribute('aria-disabled', 'false');
  });

  test('al marcar una opción avanza sola, y "Atrás" conserva la respuesta', async ({ page }) => {
    await page.goto('/test');
    await elegirProvincia(page, 'madr', 'Madrid');
    await page.getByTestId('opcion-vivienda-alquiler').click();
    await expect(page.getByTestId('pregunta-trabajo')).toBeVisible();
    await page.getByTestId('pregunta-trabajo').getByRole('button', { name: '← Atrás' }).click();
    await expect(page.getByTestId('opcion-vivienda-alquiler')).toHaveAttribute('aria-pressed', 'true');
  });

  test('"Prefiero no responder" está en todas las preguntas salvo la provincia', async ({ page }) => {
    await page.goto('/test');
    for (const seccion of await page.locator('[data-paso^="pregunta:"]').all()) {
      const id = (await seccion.getAttribute('data-paso'))!.replace('pregunta:', '');
      if (id === 'provincia') continue;
      await expect(seccion.getByTestId(`opcion-${id}-ns`)).toHaveCount(1);
    }
  });
});

test.describe('M-12, M-03, M-04, M-09 · resultados', () => {
  test('tras el bloque básico se ve el resultado provisional con los dos podios, la cobertura y el aviso', async ({ page }) => {
    await page.goto('/test');
    await elegirProvincia(page, 'madr', 'Madrid');
    expect(await responderHastaResultado(page, ESTUDIANTE_MADRID)).toBe('provisional');
    const resultado = page.getByTestId('resultado-provisional');
    await expect(resultado.getByText('Provisional', { exact: true })).toBeVisible();
    await expect(resultado.getByTestId('cobertura')).toHaveText(/Basado en \d+ de las \d+ votaciones que podrían afectarte\./);
    await expect(resultado.getByTestId('podio-favorable').locator('li')).toHaveCount(3);
    await expect(resultado.getByTestId('podio-desfavorable').locator('li')).toHaveCount(3);
    await expect(resultado.getByTestId('aviso-alcance')).toContainText('no es una recomendación de voto');
  });

  test('ningún partido aparece en los dos podios y cada fila dice cuántas votaciones cuentan', async ({ page }) => {
    await page.goto('/test');
    await elegirProvincia(page, 'madr', 'Madrid');
    await responderHastaResultado(page, ESTUDIANTE_MADRID);
    const ids = async (podio: string) =>
      (await page.getByTestId('resultado-provisional').getByTestId(podio).locator('li').evaluateAll((lis) => lis.map((l) => l.getAttribute('data-testid')!.split('-').pop())));
    const favorables = await ids('podio-favorable');
    const desfavorables = await ids('podio-desfavorable');
    expect(favorables.filter((p) => desfavorables.includes(p))).toEqual([]);
    await expect(page.getByTestId('podio-favorable').first().locator('.detalle').first()).toHaveText(/\d+ de \d+ votaciones/);
  });

  test('se sigue con el bloque ampliado sin perder las respuestas y se llega al resultado final con sus votaciones', async ({ page }) => {
    await page.goto('/test');
    await elegirProvincia(page, 'madr', 'Madrid');
    await responderHastaResultado(page, ESTUDIANTE_MADRID);
    await page.getByTestId('seguir').click();
    expect(await responderHastaResultado(page, { ...ESTUDIANTE_MADRID, arrendador: 'no' })).toBe('final');
    const final = page.getByTestId('resultado-final');
    await expect(final.getByTestId('podio-favorable')).toBeVisible();
    const votaciones = final.getByTestId('lista-votaciones').locator('> li');
    expect(await votaciones.count()).toBeGreaterThanOrEqual(5);
    // M-04: cada votación explica por qué afecta, qué votó cada partido y enlaza al Congreso.
    const primera = votaciones.first();
    await expect(primera.locator('.motivo').first()).not.toBeEmpty();
    await expect(primera.locator('.votos li').first()).toBeVisible();
    await expect(primera.getByRole('link', { name: 'Ver la votación en el Congreso' })).toHaveAttribute('href', /^https:\/\/www\.congreso\.es\//);
  });

  test('M-02 negativo: en Madrid no aparecen partidos que solo se presentan en otras comunidades', async ({ page }) => {
    await page.goto('/test');
    await elegirProvincia(page, 'madr', 'Madrid');
    await responderHastaResultado(page, ESTUDIANTE_MADRID);
    const siglas = await page.getByTestId('resultado-provisional').locator('.votos .siglas').allTextContents();
    for (const s of ['PNV', 'BNG', 'CC', 'ERC', 'EH Bildu', 'UPN']) expect(siglas).not.toContain(s);
  });

  test('M-03 negativo: con menos de 5 votaciones que le afecten, se avisa en lugar de mostrar podio', async ({ page }) => {
    await page.goto('/test');
    await elegirProvincia(page, 'madr', 'Madrid');
    await responderHastaResultado(page, {});
    const resultado = page.getByTestId('resultado-provisional');
    await expect(resultado.getByTestId('sin-datos')).toBeVisible();
    await expect(resultado.getByTestId('podio-favorable')).toHaveCount(0);
  });

  test('M-04: una votación en la que un partido votó dividido lo indica con el desglose', async ({ page }) => {
    await page.goto('/test');
    await elegirProvincia(page, 'madr', 'Madrid');
    await responderHastaResultado(page, ESTUDIANTE_MADRID);
    await expect(page.getByTestId('resultado-provisional').getByText(/voto dividido \(\d+ sí, \d+ no, \d+ abst\.\)/).first()).toBeVisible();
  });
});
