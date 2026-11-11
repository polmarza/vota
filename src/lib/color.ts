// Contraste de los colores de partido sobre el fondo de la web (docs/design-system.md). Código puro:
// se usa en el build (portada) y en el navegador (resultado del test).

/** Fondo de la página: el color más claro sobre el que se pinta un punto o una barra de partido. */
export const FONDO = '#f7f9fa';

const luminancia = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

/** Contraste WCAG entre dos colores en hexadecimal (#rrggbb). */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

/**
 * Si el color no llega a 3:1 sobre el fondo (WCAG 1.4.11, elementos gráficos): entonces el punto y
 * la barra del partido llevan un filete de tinta (data-claro). El color no se toca.
 */
export const esClaro = (hex: string) => contraste(hex, FONDO) < 3;
