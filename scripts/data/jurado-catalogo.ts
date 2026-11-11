// pnpm data:jurado-catalogo — el jurado de IAs revisa, a ciegas, las fichas de data/catalogo/.
//
//   pnpm data:jurado-catalogo                   revisa todo lo pendiente (primera y segunda ronda)
//   pnpm data:jurado-catalogo --limite 2        solo los dos primeros elementos pendientes
//   pnpm data:jurado-catalogo --solo XV-49-19   solo los elementos cuyo id empieza así
//   pnpm data:jurado-catalogo --presupuesto 5   para al gastar 5 $ en esta ejecución (por defecto, 10)
//   pnpm data:jurado-catalogo --forzar          vuelve a preguntar aunque ya haya veredicto
//
// Tres tipos de elemento (docs/catalogo.md, apartado 4):
//   <ficha>:efecto:<n>   para quien cumple la condición, ¿el Sí le favorece, le perjudica o no le afecta?
//   <ficha>:fidelidad    ¿el resumen y "qué significa el sí" describen bien la iniciativa?
//   catalogo:conjunto    ¿la selección está equilibrada?
// Los jueces no ven la etiqueta de Claude ni el voto de ningún partido. Los veredictos se guardan en
// data/jurado/catalogo.json. Necesita OPENROUTER_API_KEY en .env.local.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import type { DiaCompacto } from './congreso.ts';
import { CLAVE_CCAA, esquemaFicha, esquemaPreguntas, esquemaTerritorio, type Ficha } from './catalogo.ts';
import { clienteOpenRouter, deliberar, evaluar, type Elemento, type Registro } from './jurado.ts';

const RAIZ = join(import.meta.dirname, '..', '..');
const DATA = join(RAIZ, 'data');
const SALIDA = join(DATA, 'jurado', 'catalogo.json');

const SISTEMA = `Formas parte de un jurado independiente que revisa los datos de un proyecto de información
electoral neutral sobre el Congreso de los Diputados de España. El proyecto explica a cada persona
qué votaciones del Congreso de las legislaturas XIV (2019-2023) y XV (2023-2026) le afectaban por
su situación personal (vivienda, trabajo, edad, hijos…), sin valorar ideologías.

Criterios del proyecto:
- Solo cuenta el efecto directo que establece el texto de la iniciativa (un derecho, una ayuda, un
  impuesto, un límite, una obligación) para la persona que cumple la condición. No cuentan los
  efectos indirectos, macroeconómicos o discutidos (por ejemplo, "subirá los precios a largo plazo").
- "Que saliera el Sí" significa lo que se indica en cada caso: en un decreto ley, convalidarlo; en
  una toma en consideración, admitir a trámite la propuesta (se valora el contenido de la propuesta);
  en una enmienda a la totalidad, devolver el proyecto al Gobierno.
- No importa quién propuso la iniciativa ni qué votó cada partido; no se te dice a propósito.
- El resultado oficial de cada votación sale de los datos abiertos del Congreso y es correcto; si
  contradice lo que recuerdas, prevalece el dato oficial. Puede tratarse de hechos posteriores a tu
  fecha de corte: en ese caso valora con la información que se te da y tu conocimiento de la norma.
- Si no conoces la iniciativa lo bastante para responder con seguridad, responde "no_lo_se". Es
  preferible a adivinar.

Responde solo con el JSON pedido: la respuesta y unas razones breves con los datos en que te basas.`;

const LEGISLATURA = (id: string) => (id.startsWith('XIV') ? 'XIV legislatura' : 'XV legislatura');

function cargarYaml<T>(ruta: string, esquema: { parse: (x: unknown) => T }): T {
  return esquema.parse(parse(readFileSync(join(DATA, ruta), 'utf8')));
}

function construirElementos(): Elemento[] {
  const preguntas = cargarYaml('preguntas.yaml', esquemaPreguntas);
  const territorio = cargarYaml('territorio.yaml', esquemaTerritorio);
  const fichas = readdirSync(join(DATA, 'catalogo'))
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => cargarYaml(`catalogo/${f}`, esquemaFicha));

  // Resultado oficial de cada votación (totales, no el voto de los partidos): los jueces no conocen
  // lo que pasó después de su fecha de corte y así pueden comprobar el resumen.
  const totales = new Map<string, DiaCompacto['votaciones'][number]['totales']>();
  for (const leg of ['XIV', 'XV']) {
    const dir = join(DATA, 'raw', leg, 'dias');
    for (const f of readdirSync(dir)) {
      const dia = JSON.parse(readFileSync(join(dir, f), 'utf8')) as DiaCompacto;
      for (const v of dia.votaciones) totales.set(`${leg}-${v.sesion}-${v.numero}`, v.totales);
    }
  }
  const resultado = (id: string) => {
    const t = totales.get(id)!;
    return `${t.si} votos a favor, ${t.no} en contra y ${t.abstencion} abstenciones: ${t.si > t.no ? 'salió el Sí' : 'no salió el Sí'}`;
  };
  const porPregunta = new Map(preguntas.map((p) => [p.id, p]));
  const ccaa = new Map(territorio.comunidades.map((c) => [c.id, c.nombre]));
  /** La condición de un efecto en lenguaje claro, con el texto de las preguntas y opciones. */
  const condicion = (cuando: Record<string, string[]>) =>
    Object.entries(cuando)
      .map(([clave, valores]) => {
        if (clave === CLAVE_CCAA) return `vive en ${valores.map((v) => ccaa.get(v) ?? v).join(', ')}`;
        const p = porPregunta.get(clave)!;
        const textos = valores.map((v) => p.opciones.find((o) => o.id === v)?.texto ?? v);
        return `a la pregunta "${p.enunciado}" responde: ${textos.join(' o ')}`;
      })
      .join('; y ');

  const cabecera = (f: Ficha) => `${LEGISLATURA(f.votacion)}, votación del ${f.fecha.split('-').reverse().join('/')} en el Pleno.
Iniciativa: ${f.titulo_oficial}
Tipo: ${f.iniciativa}
Qué significaba votar Sí: ${f.que_significa_si}
Resultado oficial (datos abiertos del Congreso): ${resultado(f.votacion)}.
Texto oficial: ${f.texto}`;

  const elementos: Elemento[] = [];
  for (const f of fichas) {
    f.efectos.forEach((e, i) => {
      elementos.push({
        id: `${f.votacion}:efecto:${i + 1}`,
        sistema: SISTEMA,
        opciones: ['favorece', 'perjudica', 'no_le_afecta'],
        esperado: e.el_si,
        pregunta: `${cabecera(f)}
Resumen: ${f.resumen}
Medida en que se apoya: ${e.base}

Persona: quien ${condicion(e.cuando)}.

Pregunta: para esa persona, ¿que saliera el Sí en esta votación le favorecía, le perjudicaba o no le
afectaba directamente?`,
      });
    });
    elementos.push({
      id: `${f.votacion}:fidelidad`,
      sistema: SISTEMA,
      opciones: ['fiel', 'no_fiel'],
      esperado: 'fiel',
      pregunta: `${cabecera(f)}

Resumen que se mostrará al público: ${f.resumen}

Pregunta: ¿el resumen y la explicación de qué significaba votar Sí describen de forma fiel y neutral
esta iniciativa? Responde "no_fiel" si hay un error de hecho, una omisión importante o un sesgo, y
explica cuál en las razones.`,
    });
  }

  const lista = fichas
    .map((f) => `- [${f.tema}] ${f.titulo} (${LEGISLATURA(f.votacion)}; ${f.iniciativa}): afecta a quien ${f.efectos.map((e) => condicion(e.cuando)).join(' / a quien ')}`)
    .join('\n');
  elementos.push({
    id: 'catalogo:conjunto',
    sistema: SISTEMA,
    opciones: ['equilibrado', 'desequilibrado'],
    esperado: 'equilibrado',
    pregunta: `Este es el catálogo completo de ${fichas.length} votaciones seleccionadas. Se eligieron entre todas las
iniciativas con efecto jurídico votadas en el Pleno (leyes, decretos ley, proposiciones de cualquier
grupo o comunidad, presupuestos), aprobadas o no, buscando para cada situación personal votaciones de
las dos legislaturas y de proponentes distintos.

${lista}

Pregunta: ¿la selección es equilibrada para comparar a los partidos, sin temas, perfiles o
proponentes sobrerrepresentados que inclinen el resultado, y sin iniciativas importantes que falten?
Responde "desequilibrado" si ves un problema y explica cuál y qué iniciativas concretas faltan o sobran.`,
  });
  return elementos;
}

const { values: args } = parseArgs({
  options: {
    limite: { type: 'string' },
    solo: { type: 'string' },
    presupuesto: { type: 'string', default: '10' },
    forzar: { type: 'boolean', default: false },
  },
});

try {
  process.loadEnvFile(join(RAIZ, '.env.local'));
} catch {
  // Sin .env.local: la clave puede venir del entorno del shell.
}
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.log('Falta OPENROUTER_API_KEY en .env.local o en el entorno.');
  process.exit(1);
}

let elementos = construirElementos();
if (args.solo) elementos = elementos.filter((e) => e.id.startsWith(args.solo!));
const previos: Registro[] = existsSync(SALIDA) ? JSON.parse(await readFile(SALIDA, 'utf8')) : [];

console.log(`Catálogo: ${elementos.length} elementos para el jurado.`);
await mkdir(join(DATA, 'jurado'), { recursive: true });
const { registros, gastado } = await deliberar(clienteOpenRouter(apiKey), elementos, previos, {
  presupuesto: Number(args.presupuesto),
  forzar: args.forzar,
  limite: args.limite ? Number(args.limite) : Infinity,
  alGuardar: (todos) => writeFile(SALIDA, JSON.stringify(todos, null, 1) + '\n'),
  registrar: (l) => console.log(l),
});

const cuenta = new Map<string, number>();
for (const r of registros) {
  const res = evaluar(r).resultado;
  cuenta.set(res, (cuenta.get(res) ?? 0) + 1);
}
console.log(`\nResultado: ${[...cuenta].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`Coste de esta ejecución: ${gastado.toFixed(4)} $`);
for (const [titulo, filtro] of [
  ['El jurado decide algo distinto de lo propuesto (hay que corregir la ficha):', 'decidido'],
  ['Sin consenso tras dos rondas (el efecto se quita; la ficha no se publica si es de fidelidad):', 'sin-consenso'],
] as const) {
  const lista = registros.filter((r) => r.resultado === filtro);
  if (!lista.length) continue;
  console.log(`\n${titulo}`);
  for (const r of lista) console.log(`  ${r.id}: ${r.esperado}${r.decision ? ` → ${r.decision}` : ''}`);
}
