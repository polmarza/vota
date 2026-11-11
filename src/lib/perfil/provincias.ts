// Búsqueda del selector de provincia (docs/design-system.md → Selector de provincia). Código puro:
// se ejecuta en el navegador y se prueba aislado.

export interface ProvinciaBuscable {
  id: string;
  nombre: string;
  alias: string[];
}

/** Sin acentos, sin mayúsculas y con la "ñ" como "n". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const palabras = (texto: string) => normalizar(texto).split(/[\s/-]+/).filter(Boolean);

/**
 * Provincias que coinciden con lo escrito, en orden alfabético: el inicio del nombre o de cualquiera
 * de sus palabras, en el nombre oficial o en un nombre alternativo ("coru" → A Coruña, "vizcaya" →
 * Bizkaia). Sin texto, ninguna.
 */
export function buscarProvincias<P extends ProvinciaBuscable>(provincias: P[], consulta: string): P[] {
  const q = normalizar(consulta);
  if (!q) return [];
  const coincide = (nombre: string) => normalizar(nombre).startsWith(q) || palabras(nombre).some((p) => p.startsWith(q));
  return provincias
    .filter((p) => [p.nombre, ...p.alias].some(coincide))
    .sort((a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre), 'es'));
}

/** La provincia cuyo nombre oficial o alternativo es exactamente lo escrito, si la hay. */
export function provinciaExacta<P extends ProvinciaBuscable>(provincias: P[], texto: string): P | undefined {
  const q = normalizar(texto);
  return provincias.find((p) => [p.nombre, ...p.alias].some((n) => normalizar(n) === q));
}
