# Textos de la portada, los podios y "Cómo funciona"

**Fecha:** 2026-11-11 10:00
**Tipo:** Copy
**Requisitos:** Ninguno (cambio de textos; M-01 y M-12 siguen igual)

## Qué se hizo
- Portada: el titular pasa a «Las promesas vuelan. Los votos se quedan.», con la entradilla
  «Cruzamos tus preocupaciones con lo que cada partido votó en el Congreso desde 2019. Así sabes
  quién estuvo de tu lado cuando tocaba votar.».
- Podios: «Te han favorecido» y «Te han perjudicado» pasan a «Estuvieron de tu lado» y «Votaron en
  tu contra». Las explicaciones de debajo, ahora simétricas: «Apoyaron lo que te beneficiaba, o se
  opusieron a lo que te perjudicaba» y al revés. "Cómo funciona" nombra los podios con los títulos
  nuevos.
- Entradilla de "Cómo funciona": dice explícitamente que no se miran las promesas.
- Descripción para buscadores y redes, con el lema de la portada.

Se dejan igual, a propósito: los enunciados y opciones de las preguntas (el jurado los lee al
revisar cada efecto; cambiarlos caducaría todos los veredictos) y los avisos de alcance.

## Qué se modificó
- `src/pages/index.astro`, `src/pages/como-funciona.astro`, `src/layouts/Base.astro`
- `src/scripts/resultado.ts`

## Por qué
Pol quería una portada que se entendiera en dos frases: lo que se promete no compromete, lo que se
vota queda. Se evita decir a quién votar o que los partidos incumplen sus programas, para no
contradecir el aviso de que no es una recomendación de voto ni afirmar algo discutible.
