import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator } from '@playwright/test';
import { parse } from 'yaml';
import { esquemaPartidos, ordenIdeologico } from '../../scripts/data/partidos.ts';

// S-01: el explorador del catálogo (/votaciones), contra los datos reales de data/.
const DATA = join(process.cwd(), 'data');
const fichas = readdirSync(join(DATA, 'catalogo'))
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => parse(readFileSync(join(DATA, 'catalogo', f), 'utf8')) as { votacion: string; tema: string; titulo: string; url: string; texto: string });
const partidos = ordenIdeologico(esquemaPartidos.parse(parse(readFileSync(join(DATA, 'partidos', 'partidos.yaml'), 'utf8'))).partidos);
const ordenGuardado = partidos.map((p) => p.id);

const visibles = (lista: Locator) => lista.locator(':scope > li:visible');

test.describe('S-01 · explorador del catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/votaciones');
    await expect(page.getByTestId('filtro-texto')).toBeVisible();
  });

  test('salen todas las fichas del catálogo, plegadas, y el recuento lo dice', async ({ page }) => {
    const lista = page.locator('[data-lista]');
    await expect(visibles(lista)).toHaveCount(fichas.length);
    for (const f of fichas) await expect(page.getByTestId(`votacion-${f.votacion}`)).toBeVisible();
    await expect(page.getByTestId('recuento')).toHaveText(`${fichas.length} votaciones`);
    await expect(page.getByTestId('recuento')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('details[open]')).toHaveCount(0);
  });

  test('filtrar por tema y por legislatura reduce la lista y el recuento coincide', async ({ page }) => {
    const lista = page.locator('[data-lista]');
    const tema = 'vivienda';
    const deTema = fichas.filter((f) => f.tema === tema);
    await page.getByTestId('filtro-tema').selectOption(tema);
    await expect(visibles(lista)).toHaveCount(deTema.length);
    await expect(page.getByTestId('recuento')).toHaveText(`${deTema.length} de ${fichas.length} votaciones`);
    for (const li of await visibles(lista).all()) await expect(li).toHaveAttribute('data-tema', tema);

    // Combinado con la legislatura.
    const ambos = deTema.filter((f) => f.votacion.startsWith('XV-'));
    await page.getByTestId('filtro-legislatura').selectOption('XV');
    await expect(visibles(lista)).toHaveCount(ambos.length);
    await expect(page.getByTestId('recuento')).toHaveText(`${ambos.length} de ${fichas.length} votaciones`);

    // Solo la legislatura.
    await page.getByTestId('filtro-tema').selectOption('');
    const xiv = fichas.filter((f) => f.votacion.startsWith('XIV-')).length;
    await page.getByTestId('filtro-legislatura').selectOption('XIV');
    await expect(visibles(lista)).toHaveCount(xiv);
    await expect(page.getByTestId('recuento')).toHaveText(`${xiv} de ${fichas.length} votaciones`);
  });

  test('el buscador encuentra por texto, sin importar acentos ni mayúsculas', async ({ page }) => {
    const buscada = fichas[0]!;
    const lista = page.locator('[data-lista]');
    await page.getByTestId('filtro-texto').fill(buscada.titulo.toUpperCase().normalize('NFD').replace(/\p{M}/gu, ''));
    await expect(page.getByTestId(`votacion-${buscada.votacion}`)).toBeVisible();
    const n = await visibles(lista).count();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThan(fichas.length);
    await expect(page.getByTestId('recuento')).toHaveText(`${n} de ${fichas.length} votaciones`);

    await page.getByTestId('filtro-texto').fill('zzzz texto que no existe');
    await expect(visibles(lista)).toHaveCount(0);
    await expect(page.getByTestId('sin-resultados')).toBeVisible();
    await page.getByRole('button', { name: 'Quitar los filtros' }).click();
    await expect(visibles(lista)).toHaveCount(fichas.length);
  });

  test('abrir una votación muestra el voto de cada partido en texto, el jurado y los enlaces', async ({ page }) => {
    const f = fichas[0]!;
    const fila = page.getByTestId(`votacion-${f.votacion}`);
    await fila.getByTestId('votacion-cabecera').click();
    await expect(fila.locator('details')).toHaveAttribute('open', '');
    const votos = fila.getByTestId('votos-partidos').locator('li');
    expect(await votos.count()).toBeGreaterThan(3);
    for (const v of await votos.all()) {
      await expect(v.locator('.v')).toHaveText(/^(Sí|No|Abstención|No votó|Empate)$/);
      await expect(v.locator('.p')).not.toBeEmpty();
    }
    await expect(fila.getByTestId('veredicto-jurado')).toBeVisible();
    await expect(fila.getByTestId('enlace-congreso')).toHaveAttribute('href', f.url);
    await expect(fila.getByTestId('enlace-texto')).toHaveAttribute('href', f.texto);
  });

  test('"Ver más" despliega un resumen largo', async ({ page }) => {
    // La primera votación cuyo resumen se recorta en este ancho.
    for (const li of await page.locator('[data-lista] > li').all()) {
      await li.getByTestId('votacion-cabecera').click();
      const boton = li.getByTestId('ver-mas');
      if (await boton.isVisible()) {
        const resumen = li.getByTestId('votacion-resumen');
        const alto = (await resumen.boundingBox())!.height;
        await boton.click();
        await expect(boton).toHaveAttribute('aria-expanded', 'true');
        await expect(boton).toHaveText('Ver menos');
        expect((await resumen.boundingBox())!.height).toBeGreaterThan(alto);
        return;
      }
      await li.getByTestId('votacion-cabecera').click();
    }
    throw new Error('Ningún resumen se recorta: no se puede probar "Ver más"');
  });

  test('los partidos aparecen en el orden ideológico guardado en data/partidos', async ({ page }) => {
    for (const f of fichas.slice(0, 5)) {
      const ids = await page.getByTestId(`votacion-${f.votacion}`).locator('[data-partido]').evaluateAll((els) => els.map((e) => e.getAttribute('data-partido')!));
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toEqual(ordenGuardado.filter((id) => ids.includes(id)));
    }
    await expect(page.getByTestId('criterio-orden')).toContainText('Chapel Hill Expert Survey 2024');
  });

  test('el menú lleva a /votaciones', async ({ page, isMobile }) => {
    await page.goto('/como-funciona');
    if (isMobile) await page.getByRole('button', { name: 'Menú' }).click();
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Votaciones' }).click();
    await expect(page).toHaveURL(/\/votaciones$/);
  });
});
