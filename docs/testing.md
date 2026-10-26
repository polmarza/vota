# Estrategia de testing

<!-- Documento vivo. Actualizar cuando cambie el stack o las convenciones de testing.
     Los cambios deben registrarse también en changelog/. -->

---

## Filosofía

El valor de Vota con Criterio está en que **el resultado sea correcto y verificable**: si un
porcentaje está mal o un voto se atribuye al partido equivocado, la herramienta pierde toda su
credibilidad. Por eso la prioridad no es la pirámide clásica, sino tres frentes:

1. **Datos** — que el voto de cada partido cuadre con los recuentos oficiales y que el catálogo
   cumpla sus reglas (esquemas, referencias, jurado). Es donde un error es más probable y más
   caro.
2. **Cálculo** — la lógica de afinidad es pura y determinista: se prueba a fondo con un catálogo
   inventado y casos límite.
3. **Flujo y privacidad** — pocos e2e que recorren el test completo en un navegador real y
   comprueban que ninguna respuesta sale del navegador.

Lo visual (tipografía, ecualizador, maquetación en móvil) se valida con revisión humana.

---

## Cuándo se escriben los tests

**Después de implementar, en una pasada propia.** No durante la planificación, y no a la vez que
el código.

El compromiso de que un requisito se va a validar se adquiere antes: es la tercera columna de la
tabla de cobertura de `docs/features/`. Pero el test en sí se escribe cuando el código ya existe,
leyéndolo. Es una diferencia de calendario pequeña con una consecuencia grande: un test escrito
antes que el código apunta a selectores, rutas y respuestas *imaginados*. Cuando luego no
coinciden con la realidad, casi nadie reescribe el test — se le van quitando aserciones hasta que
pasa, y acaba siendo un test que no comprueba nada pero que da luz verde. Escrito después, apunta
a lo que hay.

Las filas que se validan con `revisión humana:` se hacen en esa misma pasada, en local, siguiendo
lo que dice la tabla: qué se mira y qué tiene que verse. El resultado va al PR igual que la salida
de los tests.

Reglas que se derivan de eso:

- **Antes de escribir una aserción, verifica que el selector existe en el código.** No lo
  supongas por el nombre del componente.
- **Si un elemento no tiene selector estable, añádele uno.** Meter un `data-testid` en el código
  es un cambio mínimo aceptable y preferible a colgar el test de una clase de estilos o de un
  texto que cambiará con el próximo ajuste de copy.
- **Cada "entonces" del criterio de aceptación necesita al menos una aserción.** Si el criterio
  define caso negativo, va su propio test.
- **Un test que falla no se arregla quitándole aserciones.** Si falla, o el código está mal o el
  criterio estaba mal escrito. Ambas cosas se corrigen donde toca; degradar el test para forzar el
  verde convierte la suite en decoración.
- **Los tests no dependen de los datos reales del catálogo**, que cambian mientras se cura. Usan
  `tests/fixtures/` (partidos A–F, seis fichas inventadas). Los únicos tests que leen `data/` son
  los de validación de datos, precisamente para comprobar esos datos.

---

## Stack de testing

| Tipo | Herramienta |
|------|-------------|
| Unitario (cálculo, perfil, esquemas) | Vitest |
| Validación de datos | Vitest sobre `data/` + `pnpm data:validar` |
| E2E | Playwright contra `pnpm preview` en `localhost` (Chromium y WebKit móvil) |
| Accesibilidad | `@axe-core/playwright` dentro de los e2e |

---

## Qué testear

### Sí testear
- **Cálculo de afinidad** (`src/lib/afinidad/`): porcentajes, abstenciones, ausencias, efectos
  contradictorios, votaciones territoriales, mínimo de 5 votaciones, podios sin partidos
  repetidos, resultado provisional con respuestas parciales.
- **Perfil** (`src/lib/perfil/`): que cada respuesta active las condiciones correctas y que `ns`
  no active ninguna.
- **Voto por partido** (`scripts/data/`): mayoría de presentes, voto dividido, herencia con
  fechas e inclusiones/exclusiones, y que la suma de votos por diputado de cada votación coincida
  con los totales oficiales de esa votación.
- **Validación del catálogo**: fichas sin URL o sin justificación, preguntas sin uso, colores
  repetidos, candidaturas de partidos sin herencia, veredictos caducados o con mayoría en contra.
  Cada regla, con un caso que debe fallar.
- **Flujo completo (e2e)**: portada → bloque básico → resultado provisional → bloque ampliado →
  resultado final; provincia obligatoria; partidos filtrados por provincia; volver atrás sin
  perder respuestas.
- **Privacidad (e2e)**: durante todo el test, ninguna petición de red lleva respuestas; la URL
  nunca contiene respuestas; `localStorage`, `sessionStorage` y cookies quedan vacíos de datos del
  cuestionario.
- **Accesibilidad (e2e)**: sin violaciones de axe de nivel serio o crítico en portada, pregunta y
  resultado; el cuestionario se completa solo con teclado.

### No testear (o mockear)
- **El jurado de IAs**: no se llama a OpenRouter en los tests. Se prueba el script con respuestas
  simuladas (formato válido, inválido, modelo caído).
- **La descarga del Congreso**: se prueba el parser con archivos reales guardados en
  `tests/fixtures/congreso/`, no la red.
- **Estética**: tipografías, animación del ecualizador, imagen para compartir a nivel de píxel →
  revisión humana.

---

## Convenciones

- Unitarios en `tests/unit/`, espejo de `src/lib/` y `scripts/data/`: `afinidad.test.ts`.
- E2E en `tests/e2e/`, uno por flujo: `cuestionario.spec.ts`, `privacidad.spec.ts`.
- Nombre del test con el ID del requisito cuando lo valida: `M-03 · podio sin partidos repetidos`.
- `describe` e `it` en español y en presente: "excluye la votación si el partido estuvo ausente".
- Selectores e2e con `data-testid`; nunca por clase de estilos ni por texto de copy.

---

## Cobertura objetivo

- `src/lib/afinidad/` y `scripts/data/votos`: 100 % de ramas. Son pocas líneas y es donde un
  error cambia el resultado de alguien.
- Resto de `src/lib/` y `scripts/data/`: ≥ 80 %.
- Componentes y páginas: sin objetivo de porcentaje; los cubren los e2e y la revisión humana.

---

## Cómo correr los tests

```bash
# Unitarios y validación de datos
pnpm test

# Modo watch
pnpm test:watch

# Con cobertura
pnpm test:coverage

# E2E (construye y levanta la web en localhost antes de empezar)
pnpm test:e2e

# Solo las reglas del catálogo real
pnpm data:validar
```
