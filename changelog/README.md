# Changelog

Registro estructurado de cada cambio importante del proyecto: qué se hizo, qué se modificó y por qué.

Una entrada por cambio importante, con el formato de abajo.

---

## Cómo añadir una entrada

Usa `/changelog`. El agente crea el archivo con la fecha y hora reales y rellena las secciones.

**Nombre del archivo:** `YYYY-MM-DD_HH-MM_descripcion-breve.md`

**Contenido mínimo:**

```markdown
# [Descripción breve del cambio]

**Fecha:** YYYY-MM-DD HH:MM
**Tipo:** Feature / Fix / Refactor / Migración / Documentación / Configuración
**Requisitos:** [IDs del PRD que cierra: M-01, S-02. "Ninguno" si es un cambio interno]

## Qué se hizo
[Descripción de lo que se implementó o modificó]

## Qué se modificó
[Lista de archivos afectados]

## Por qué
[Contexto o motivación del cambio]
```

---

Este archivo no es una entrada: es la explicación del formato.
