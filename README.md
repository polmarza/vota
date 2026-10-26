# vota con *criterio*

**¿A quién te convendría votar según lo que cada partido ha votado de verdad en el Congreso?**

Vota con Criterio es una web anónima para las elecciones generales del 29 de noviembre de 2026.
Respondes preguntas sobre tu situación (provincia, vivienda, trabajo, ingresos, familia…) y la web
las cruza con una selección de votaciones del Congreso de las legislaturas XIV y XV que afectan a
personas como tú. El resultado: los tres partidos que más te han favorecido y los tres que más te
han perjudicado, con cada votación enlazada a su fuente oficial.

Se publicará en `vota.concriterio.blog`. Es un proyecto de [Con Criterio](https://concriterio.blog),
firmado por Pol Marzà.

---

## Qué problema resuelve

Los programas electorales son promesas que a menudo no se cumplen, y consultar las votaciones del
Congreso a mano es inviable: hay miles por legislatura, con títulos técnicos y sin explicar a quién
afectan. Los tests de afinidad habituales comparan tus opiniones con lo que dicen los partidos.
Este compara tu situación con lo que han hecho.

## Cómo garantiza la neutralidad

- **Hechos, no promesas:** solo cuenta lo que cada partido votó, calculado a partir del voto
  nominal de sus diputados en los datos abiertos del Congreso.
- **Todo es trazable:** cada votación del catálogo tiene su enlace oficial, qué significaba votar
  "Sí", a quién afecta y por qué.
- **Jurado de IAs:** Claude selecciona y etiqueta las votaciones; cinco modelos de cinco empresas
  distintas (OpenAI, Google, Mistral, DeepSeek y xAI) revisan cada etiqueta. Si la mayoría
  discrepa, la votación no se publica.
- **Código y datos abiertos:** este repositorio contiene el catálogo, los veredictos del jurado y
  el cálculo.
- **Anónimo:** las respuestas no salen de tu navegador. No hay registro, ni cookies de
  seguimiento, ni servidor que las reciba.

---

## Estado

**En desarrollo.** La documentación del producto está cerrada (ver `docs/`); el código todavía no
existe. Objetivo: en producción antes del inicio de la campaña, el 13 de noviembre de 2026.

---

## Requisitos previos

- Node.js 24 (LTS)
- pnpm v11 (no npm ni yarn)
- Una clave de [OpenRouter](https://openrouter.ai), solo si vas a ejecutar el jurado de IAs

## Variables de entorno

Copia `.env.example` a `.env.local`. La web no necesita ninguna variable; solo el pipeline del
jurado usa `OPENROUTER_API_KEY`. Nunca comitees `.env.local`.

## Instalación y desarrollo

```bash
pnpm install
pnpm dev          # web en http://localhost:4321
pnpm test         # unitarios y validación de datos
pnpm test:e2e     # e2e con Playwright contra localhost
pnpm build        # genera la web estática y valida el catálogo
```

Pipeline de datos (en local):

```bash
pnpm data:ingesta   # descarga las votaciones del Congreso a data/raw/
pnpm data:votos     # calcula el voto de cada partido
pnpm data:jurado    # pasa el catálogo por el jurado de IAs (requiere OPENROUTER_API_KEY)
pnpm data:validar   # comprueba todas las reglas del catálogo
```

---

## Estructura de carpetas

```
data/        → Votaciones del Congreso, partidos, candidaturas, preguntas, catálogo y jurado
docs/        → Producto, diseño, arquitectura, modelo de datos y testing
scripts/     → Pipeline de datos y verificación de cobertura de las fichas
src/         → Web en Astro: páginas, componentes y lógica de cálculo
tests/       → Vitest (unitarios y datos) y Playwright (e2e)
changelog/   → Registro de cada cambio importante
mejoras/     → Ideas para más adelante
```

El detalle está en [`docs/architecture.md`](./docs/architecture.md) y el formato de cada archivo
de datos en [`docs/data-model.md`](./docs/data-model.md).

---

## Cómo contribuir

El proyecto se trabaja con agentes de código siguiendo el protocolo de [`AGENTS.md`](./AGENTS.md):
cada feature empieza por una ficha en `docs/features/`, cada cambio importante deja entrada en
`changelog/` y cada PR lleva la salida real de los tests.

¿Crees que una votación está mal etiquetada o falta alguna importante? Abre un issue con el enlace
a la votación en congreso.es y tu argumento.

---

## Licencia

MIT © 2026 Pol Marzà. Ver [`LICENSE`](./LICENSE).
