# Explorador del catálogo y compartir el resultado

**Fecha:** 2026-11-11 17:45
**Tipo:** Feature
**Requisitos:** S-01, S-02 (ficha `docs/features/explorador-y-compartir.md`)

## Qué se hizo
- **`/votaciones`:** las 63 votaciones en acordeón, con resumen, qué significaba votar «sí», a quién
  afecta, el voto de cada partido que votó (punto de color, siglas y voto escrito), el veredicto del
  jurado y los enlaces al Congreso y al texto. Filtros por texto, tema y legislatura. El enlace
  "Votaciones" del menú lleva aquí.
- **Orden de izquierda a derecha** según la Chapel Hill Expert Survey 2024 (`lrgen`), con la de 2019
  para Ciudadanos; los partidos que no están en ninguna, junto al de su grupo o al partido con el
  que más coincidió su voto. Guardado en `data/partidos/partidos.yaml` con su fuente.
- **Compartir:** en el resultado final, una tarjeta 1080×1350 generada en el navegador con los temas
  que más te afectan, el partido que más veces votó a tu favor, los dos podios, "No es una
  recomendación de voto" y la dirección. El perfil (vivienda, trabajo, edad, hijos) es opcional y
  desmarcado; nunca entran ingresos, patrimonio, herencias, discapacidad ni provincia. Comparte con
  el menú del sistema o descarga el PNG.

## Qué se modificó
- Nuevos: `src/pages/votaciones.astro`, `src/lib/explorador.ts`, `src/scripts/explorador.ts`,
  `src/lib/compartir/`, `tests/e2e/explorador.spec.ts`, `tests/e2e/compartir.spec.ts`,
  `tests/unit/compartir.test.ts`
- `data/partidos/partidos.yaml`, `scripts/data/partidos.ts`, `src/scripts/resultado.ts`,
  `src/pages/test.astro`, `src/lib/datos.ts`, `src/components/Cabecera.astro`, `Pie.astro`,
  `src/pages/como-funciona.astro`, `docs/` (PRD S-02, design system, data model, arquitectura)

## Por qué
El explorador deja revisar el catálogo entero sin hacer el test; compartir es por donde llega el
tráfico en campaña, sin que ninguna respuesta salga del navegador salvo que el visitante lo elija.
