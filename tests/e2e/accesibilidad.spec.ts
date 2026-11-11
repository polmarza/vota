import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ESTUDIANTE_MADRID, elegirProvincia, responderHastaResultado } from './utiles.ts';

const revisar = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
};

test.describe('accesibilidad (WCAG 2.1 AA)', () => {
  test('portada', async ({ page }) => {
    await page.goto('/');
    // Mientras entra el héroe, sus textos están a media opacidad: se revisa cuando ha terminado.
    await expect(page.locator('.hero')).toHaveClass(/is-entered/);
    await revisar(page);
    // Y la sección del resultado de ejemplo, una vez que ha llegado su línea (momento line-carries-colour).
    await page.locator('#votaciones').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const c = document.querySelector('#resultado')!.classList;
      return !c.contains('is-live') || c.contains('is-open');
    });
    await revisar(page);
  });

  test('pregunta', async ({ page }) => {
    await page.goto('/test');
    await revisar(page);
    await elegirProvincia(page, 'madr', 'Madrid');
    await revisar(page);
  });

  test('resultado', async ({ page }) => {
    await page.goto('/test');
    await elegirProvincia(page, 'madr', 'Madrid');
    await responderHastaResultado(page, ESTUDIANTE_MADRID);
    await revisar(page);
  });

  test('cómo funciona', async ({ page }) => {
    await page.goto('/como-funciona');
    await revisar(page);
  });

  test('el test se completa solo con teclado hasta el resultado provisional', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit en móvil no reproduce la navegación con Tab de un teclado físico');
    await page.goto('/test');
    await page.getByTestId('provincia-campo').focus();
    await page.keyboard.type('sevi');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('provincia-campo')).toHaveValue('Sevilla');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('pregunta-vivienda')).toBeVisible();
    // En cada pregunta el foco va al enunciado: Tab hasta la primera opción que no sea "Atrás".
    for (let i = 0; i < 7; i++) {
      const visible = page.locator('[data-paso]:not([hidden])');
      const paso = await visible.getAttribute('data-paso');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(visible.first()).not.toHaveAttribute('data-paso', paso!);
    }
    await expect(page.getByTestId('resultado-provisional')).toBeVisible();
  });
});
