# Inicialización del proyecto Vota con Criterio

**Fecha:** 2026-10-26 23:00
**Tipo:** Configuración
**Requisitos:** Ninguno (define los requisitos; no implementa ninguno)

## Qué se hizo
Se convirtió la plantilla de partida en el repositorio de Vota con Criterio, la web que cruza la
situación personal del visitante con las votaciones del Congreso (XIV y XV) para las elecciones
generales del 29 de noviembre de 2026.

- Documentación del producto redactada con Pol: PRD (M-01 a M-12, S-01 a S-03, C-01 y C-02),
  design system en blanco y negro con dirección editorial, arquitectura (Astro estático en Vercel,
  pipeline local, jurado de cinco modelos vía OpenRouter), modelo de datos en archivos y estrategia
  de testing.
- Borrados los documentos que no aplican a un sitio pequeño: `roadmap.md`, `user-flows.md` y
  `business.md`.
- README y AGENTS.md reescritos para el proyecto; `.env.example` reducido a
  `OPENROUTER_API_KEY`; backlog de mejoras limpio.
- Borrados `.template/` y la skill `init-proyecto`, y quitadas sus referencias.

## Qué se modificó
- `docs/prd.md`, `docs/design-system.md`, `docs/architecture.md`, `docs/data-model.md`,
  `docs/testing.md`
- `docs/roadmap.md`, `docs/user-flows.md`, `docs/business.md` (borrados)
- `README.md`, `AGENTS.md`, `.env.example`, `mejoras/backlog.md`, `changelog/README.md`
- `.claude/skills/changelog/SKILL.md`, `.claude/skills/diagnostico/SKILL.md`,
  `docs/features/README.md` (referencias a la plantilla)
- `.template/` y `.claude/skills/init-proyecto/` (borrados)

## Por qué
Para que cualquier agente o persona que entre al repositorio tenga el contexto completo del
producto antes de escribir código, y para que el repositorio pueda hacerse público sin restos de la
plantilla. Queda abierto un riesgo: confirmar el formato de las votaciones nominales del Congreso
antes de construir la ingesta.
