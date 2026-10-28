// pnpm data:jurado — el jurado de IAs revisa, a ciegas, la herencia de data/partidos/partidos.yaml.
//
//   pnpm data:jurado                   revisa todo lo pendiente (primera y segunda ronda)
//   pnpm data:jurado --limite 1        solo el primer elemento pendiente (para probar)
//   pnpm data:jurado --solo XV:        solo los elementos cuyo id empieza así
//   pnpm data:jurado --presupuesto 5   para al gastar 5 $ en esta ejecución (por defecto, 10)
//   pnpm data:jurado --forzar          vuelve a preguntar aunque ya haya veredicto
//
// Necesita OPENROUTER_API_KEY en .env.local. Los veredictos se guardan en data/jurado/herencia.json.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import { expandirVotos, type DiaCompacto, type Legislatura } from './congreso.ts';
import { clienteOpenRouter, deliberar, evaluar, type Elemento, type Registro } from './jurado.ts';
import { crearAsignador, esquemaPartidos, type DiputadoOficial, type Partidos } from './partidos.ts';

const RAIZ = join(import.meta.dirname, '..', '..');
const DATA = join(RAIZ, 'data');
const SALIDA = join(DATA, 'jurado', 'herencia.json');

const LEGISLATURAS: Record<Legislatura, string> = {
  XIV: 'XIV legislatura (diciembre de 2019 a mayo de 2023)',
  XV: 'XV legislatura (agosto de 2023 a octubre de 2026)',
};

const NINGUNO = 'ninguno';

const SISTEMA = (datos: Partidos) => `Formas parte de un jurado independiente que revisa los datos de un proyecto de información
electoral neutral sobre el Congreso de los Diputados de España. Respondes a preguntas sobre a qué
partido pertenecía un diputado.

Reglas:
- Cuenta el partido al que pertenecía la persona mientras votaba en esa legislatura, no al que
  pertenece hoy ni al que perteneció antes o después.
- Un diputado elegido en una coalición electoral (varios partidos que se presentan juntos a unas
  elecciones) pertenece a su partido concreto dentro de ella, no a la coalición. Si la candidatura
  es en sí misma un partido o una federación de partidos con afiliación propia, cuenta ese
  partido, aunque sus miembros militen también en alguno de los partidos que lo integran.
- Las federaciones territoriales cuentan como su partido (PSC, PSdeG o PSE cuentan como PSOE).
- Si era independiente (no militante de ningún partido) o su partido no está entre las opciones
  (por ejemplo, porque no se presenta a las elecciones de 2026), responde "${NINGUNO}".
- Si no tienes información suficiente para responder con seguridad, responde "no_lo_se". Es
  preferible a adivinar.

Partidos posibles (identificador: nombre):
${datos.partidos.map((p) => `- ${p.id}: ${p.nombre} (${p.siglas})`).join('\n')}
- ${NINGUNO}: independiente o partido que no está en la lista

Responde solo con el JSON pedido: la respuesta y unas razones breves con los datos en que te basas.`;

const NOMBRES_GRUPO: Record<string, string> = {
  GS: 'Socialista', GP: 'Popular', GVOX: 'Vox', 'GCUP-EC-GC': 'Unidas Podemos-En Comú Podem-Galicia en Común',
  GR: 'Republicano', GCs: 'Ciudadanos', 'GV (EAJ-PNV)': 'Vasco (EAJ-PNV)', 'GEH Bildu': 'EH Bildu', GPlu: 'Plural',
  GMx: 'Mixto', GSUMAR: 'Plurinacional Sumar', GJxCAT: 'Junts per Catalunya', '': 'sin grupo',
};
const fecha = (f: string) => `${f.slice(6, 8)}/${f.slice(4, 6)}/${f.slice(0, 4)}`;

type Tramo = { grupo: string; desde: string; hasta: string };

/** Grupo desde el que votó cada diputado, por tramos de fechas, a partir de las votaciones. */
function historialGrupos(leg: Legislatura, alias: Record<string, string>): Map<string, Tramo[]> {
  const tramos = new Map<string, Tramo[]>();
  const dir = join(DATA, 'raw', leg, 'dias');
  for (const f of readdirSync(dir).sort()) {
    const dia = JSON.parse(readFileSync(join(dir, f), 'utf8')) as DiaCompacto;
    for (const v of dia.votaciones) {
      for (const x of expandirVotos(dia, v)) {
        const nombre = alias[x.diputado] ?? x.diputado;
        const lista = tramos.get(nombre) ?? [];
        const ultimo = lista.at(-1);
        if (ultimo && ultimo.grupo === x.grupo) ultimo.hasta = dia.fecha;
        else lista.push({ grupo: x.grupo, desde: dia.fecha, hasta: dia.fecha });
        tramos.set(nombre, lista);
      }
    }
  }
  return tramos;
}

const describirTramos = (l: Tramo[] | undefined) =>
  l?.map((t) => `${NOMBRES_GRUPO[t.grupo] ?? t.grupo} (votaciones del ${fecha(t.desde)} al ${fecha(t.hasta)})`).join('; ');

function fichaDiputado(registros: DiputadoOficial[], grupos: string | undefined): string {
  const d = registros[0]!;
  const bio = ((d as DiputadoOficial & { BIOGRAFIA?: string }).BIOGRAFIA ?? '').replace(/\s+/g, ' ').trim().slice(0, 1500);
  return `Diputado: ${d.NOMBRE}
Lista electoral por la que fue elegido: ${d.FORMACIONELECTORAL}
Circunscripción: ${d.CIRCUNSCRIPCION ?? ''}
Diputado desde ${d.FECHAALTA ?? '?'} hasta ${d.FECHABAJA || 'el fin de la legislatura'}
Grupo desde el que votó: ${grupos ?? 'no consta en las votaciones'}
Biografía oficial publicada por el Congreso: ${bio || '(vacía)'}`;
}

function construirElementos(datos: Partidos, diputados: Record<Legislatura, DiputadoOficial[]>): Elemento[] {
  const sistema = SISTEMA(datos);
  const opciones = [...datos.partidos.map((p) => p.id), NINGUNO];
  const elementos: Elemento[] = [];
  const asignar = crearAsignador(datos, diputados);

  for (const leg of ['XIV', 'XV'] as const) {
    const tramos = historialGrupos(leg, datos.alias[leg]);
    const porNombre = new Map<string, DiputadoOficial[]>();
    for (const d of diputados[leg]) porNombre.set(d.NOMBRE, [...(porNombre.get(d.NOMBRE) ?? []), d]);

    // Formaciones de un solo partido: una pregunta por lista electoral.
    const coaliciones = new Set(datos.coaliciones[leg]);
    const sinPartido = new Set(datos.sinPartido.filter((s) => s.legislatura === leg).map((s) => s.formacion));
    const formaciones = [...new Set(diputados[leg].map((d) => d.FORMACIONELECTORAL))].filter((f) => !coaliciones.has(f)).sort();
    for (const f of formaciones) {
      const partido = datos.partidos.find((p) => (p.herencia[leg] ?? []).some((r) => r.formaciones?.includes(f)));
      const esperado = partido?.id ?? (sinPartido.has(f) ? NINGUNO : undefined);
      if (!esperado) continue;
      const nombres = [...new Set(diputados[leg].filter((d) => d.FORMACIONELECTORAL === f).map((d) => d.NOMBRE))];
      elementos.push({
        id: `${leg}:lista:${f}`,
        sistema,
        opciones,
        esperado,
        pregunta: `${LEGISLATURAS[leg]}.
Lista electoral: "${f}". Diputados elegidos en ella (${nombres.length}): ${nombres.slice(0, 12).join('; ')}${nombres.length > 12 ? '…' : ''}.

Pregunta: ¿a qué partido pertenecían, en esta legislatura, los diputados elegidos en la lista "${f}"?`,
      });
    }

    // Diputados de coalición: una pregunta por persona.
    const sinPartidoNombre = new Set(datos.diputadosSinPartido.filter((d) => d.legislatura === leg).map((d) => d.diputado));
    for (const [nombre, registros] of porNombre) {
      if (!coaliciones.has(registros[0]!.FORMACIONELECTORAL)) continue;
      const conRegla = datos.partidos.some((p) => (p.herencia[leg] ?? []).some((r) => r.diputados?.includes(nombre)));
      const primero = tramos.get(nombre)?.[0];
      if (!conRegla && !sinPartidoNombre.has(nombre)) continue;
      // El partido de su primera votación (si cambió después, cuenta la regla con fechas).
      const esperado = (primero && asignar(leg, nombre, primero.grupo, primero.desde)) || NINGUNO;
      elementos.push({
        id: `${leg}:diputado:${nombre}`,
        sistema,
        opciones,
        esperado,
        pregunta: `${LEGISLATURAS[leg]}.
${fichaDiputado(registros, describirTramos(tramos.get(nombre)))}

Pregunta: ¿a qué partido pertenecía ${nombre} al empezar a votar en esta legislatura? Si cambió de
partido durante la legislatura, responde con el inicial y explícalo en las razones.`,
      });
    }

    // Partido en la última votación: diputados de coalición, los que cambiaron de grupo y los que
    // tienen una regla con fechas. Detecta los cambios de partido a mitad de legislatura.
    const conFechas = new Set(
      datos.partidos.flatMap((p) => (p.herencia[leg] ?? []).filter((r) => r.desde || r.hasta).flatMap((r) => r.diputados ?? [])),
    );
    for (const [nombre, registros] of porNombre) {
      const t = tramos.get(nombre);
      if (!t) continue;
      const deCoalicion = coaliciones.has(registros[0]!.FORMACIONELECTORAL);
      if (!deCoalicion && t.length < 2 && !conFechas.has(nombre)) continue;
      const ultimo = t.at(-1)!;
      elementos.push({
        id: `${leg}:final:${nombre}`,
        sistema,
        opciones,
        esperado: asignar(leg, nombre, ultimo.grupo, ultimo.hasta) ?? NINGUNO,
        pregunta: `${LEGISLATURAS[leg]}.
${fichaDiputado(registros, describirTramos(t))}

Pregunta: ¿a qué partido pertenecía ${nombre} en su última votación de esta legislatura
(${fecha(ultimo.hasta)})? Si cambió de partido durante la legislatura, explica en las razones
cuándo y por qué.`,
      });
    }
  }
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

const datos = esquemaPartidos.parse(parse(await readFile(join(DATA, 'partidos', 'partidos.yaml'), 'utf8')));
const diputados = {
  XIV: JSON.parse(await readFile(join(DATA, 'raw', 'XIV', 'diputados.json'), 'utf8')) as DiputadoOficial[],
  XV: JSON.parse(await readFile(join(DATA, 'raw', 'XV', 'diputados.json'), 'utf8')) as DiputadoOficial[],
};
let elementos = construirElementos(datos, diputados);
if (args.solo) elementos = elementos.filter((e) => e.id.startsWith(args.solo!));
const previos: Registro[] = existsSync(SALIDA) ? JSON.parse(await readFile(SALIDA, 'utf8')) : [];

console.log(`Herencia: ${elementos.length} elementos para el jurado.`);
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
const cambios = registros.filter((r) => r.resultado === 'decidido');
if (cambios.length) {
  console.log('\nEl jurado decide algo distinto de lo propuesto (hay que corregir partidos.yaml):');
  for (const r of cambios) console.log(`  ${r.id}: ${r.esperado} → ${r.decision}`);
}
const sinConsenso = registros.filter((r) => r.resultado === 'sin-consenso');
if (sinConsenso.length) {
  console.log('\nSin consenso tras dos rondas (sus votos no se atribuirán a nadie):');
  for (const r of sinConsenso) console.log(`  ${r.id} (propuesta: ${r.esperado})`);
}
