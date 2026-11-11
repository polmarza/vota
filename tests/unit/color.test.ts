// Contraste de los colores de partido sobre el fondo (docs/design-system.md, src/lib/color.ts).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { FONDO, contraste, esClaro } from '../../src/lib/color.ts';

describe('colores de partido sobre el fondo', () => {
  it('calcula el contraste WCAG', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contraste('#5e6b71', FONDO)).toBeGreaterThan(4.5);
  });

  it('marca con filete los colores que no llegan a 3:1 y solo esos', () => {
    const { partidos } = parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'partidos', 'partidos.yaml'), 'utf8')) as { partidos: { color?: string }[] };
    for (const { color } of partidos) {
      if (!color) continue;
      expect(esClaro(color), color).toBe(contraste(color, FONDO) < 3);
    }
    expect(esClaro('#ADCFEF')).toBe(true); // BNG
    expect(esClaro('#1E4B8F')).toBe(false); // PP
  });
});
