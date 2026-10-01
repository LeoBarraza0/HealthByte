# HealthByte: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** construir el tablero de seguridad quirúrgica que se llena por voz, es multi-clínica y se despliega en GCP, tal como lo define el [spec](../specs/2026-10-01-tablero-seguridad-quirurgica-design.md).

**Arquitectura:** un API en Node 24 + TypeScript (Fastify, WebSocket, Postgres con Row-Level Security) guarda cada registro como un evento inmutable y deriva el estado de la cirugía con funciones puras. La voz entra por WebSocket, la transcribe Chirp 3 y la interpreta Jev por REST. El front es React + Vite servido por nginx, que además hace de proxy del API. Todo se crea y se destruye con Terraform.

**Stack:** Node 24 (TypeScript sin compilar, con *type stripping*), Fastify 5, `@fastify/websocket`, `@fastify/cookie`, `pg`, `@google-cloud/speech` (v2), `node:test`; React 19 + Vite; Postgres 16; Terraform con los providers `google ~> 7.0`, `random` y `time`.

## Restricciones globales

- Node **24 o superior**. El API corre los `.ts` directo (`node src/server.ts`), sin paso de compilación. Solo sintaxis borrable: nada de `enum`, `namespace` ni propiedades en parámetros de constructor. Los imports relativos llevan la extensión `.ts`, y los de tipos usan `import type`.
- `api/src/tipos.ts` es el contrato entre el API y el front. El front **solo** importa tipos del API (`import type … from '../../api/src/tipos.ts'`), nunca código.
- Nombres, textos de interfaz y mensajes en español.
- **Cero datos reales de pacientes.** Todo dato es ficticio y viene de la siembra.
- Los eventos son **inmutables**: el rol `healthbyte_app` solo tiene `SELECT` e `INSERT` sobre `evento`. Deshacer es un evento `anulacion`.
- Toda consulta con datos de una clínica pasa por `conClinica(clinicaId, fn)`, que fija el rol y la clínica de la transacción.
- La hora de cada evento la pone el servidor (`clock_timestamp()`); nunca se dicta.
- Las preguntas y los umbrales de Jev viven **solo** en `api/src/preguntas.ts`.
- Jev: `POST https://api.typesafe.ai/v1/systemone`, modelo `jev-latest`, timeout de 2 s y un reintento.
- Chirp 3: modelo `chirp_3`, `es-US`, ubicación `us` (endpoint `us-speech.googleapis.com`), PCM LINEAR16 a 16 kHz mono.
- GCP: **solo la cuenta personal**, con la configuración de gcloud `healthbyte`. Región `us-east1`. Etiqueta `proyecto=healthbyte` en todo.
- Git: todo en `main`. Antes de cada push, `git pull --rebase`. Los mensajes de commit siguen Conventional Commits, en español y **sin atribución a IA** (un hook lo bloquea).

## Ajustes respecto al spec

Son detalles de implementación que el spec dejaba abiertos. El spec se actualiza en la Tarea 17.

1. **Row-Level Security sin `FORCE`.** El API ejecuta `SET LOCAL ROLE healthbyte_app` en cada transacción. Ese rol no es dueño de las tablas, así que la política se aplica siempre. La siembra corre como dueño.
2. **Cada fase tiene `abre_con`** (la hora que la abre), además de `cierra_antes_de`. La fase «Antes de salir» abre con el fin de la cirugía; si no, su alerta de pendientes sonaría durante toda la cirugía.
3. **El conteo solo tiene `entra` y `sale`.** Se quita «total». En la demo, la frase de corrección es «apareció una, sale una compresa».
4. **El panel reutiliza `derivar()`** en TypeScript en lugar de duplicar la lógica en SQL.
5. **`cirugia.archivada` y `POST /api/demo/reiniciar`**, para repetir la demo sin borrar eventos. **`clinica.slug`**, para el login.
6. El stream de Chirp 3 se cierra tras **8 s** de silencio (el spec decía 10 s).

## Base ya creada por el orquestador

Estos archivos ya existen en `main`. Los pasos del plan que los crean o que instalan dependencias **se saltan**:

- `AGENTS.md` (reglas para todos los agentes), `CLAUDE.md`, `README.md` y `.gitignore`.
- `api/package.json` y `web/package.json` con **todas** las dependencias y scripts, más sus `package-lock.json`. Nadie corre `npm install <paquete>`: solo `npm ci`.
- `api/tsconfig.json`, `api/.env.example`, `web/tsconfig.json` y `web/vite.config.ts`.
- `api/src/tipos.ts`, el contrato completo. Respecto al código de la Tarea 1 tiene un cambio: incluye `CanalVoz` y `EventosVoz`, para que `voz.ts` y `sesion.ts` no dependan entre sí.
- `db/schema.sql` y `db/docker-compose.yml`. El esquema vive en `db/` y no en `api/src/`.

## Reparto sugerido

| Quién | Tareas |
| --- | --- |
| Backend | 1 → 8, luego 10 y 11 |
| Infra (desde la primera hora) | 9, luego 16 |
| Front (cuando existan las tareas 1 y 7) | 12 → 15 |
| Instrumentadora | Valida los protocolos (Tarea 2) y dicta el set de oro (Tareas 8 y 17) |

## Mapa de archivos

```
.gitignore  AGENTS.md  CLAUDE.md
README.md                         cómo correr y desplegar
cloudbuild.yaml                   construye las imágenes de api y web desde la raíz
.gcloudignore                     lo que no se sube a Cloud Build
db/
  schema.sql                      tablas, rol y políticas RLS
  docker-compose.yml              Postgres local
api/
  package.json  tsconfig.json  .env.example  Dockerfile
  src/
    tipos.ts          contrato de tipos (API ↔ front)
    numeros.ts        palabras en español → números
    protocolos.ts     protocolos sembrados + vocabulario para Chirp 3
    prueba.ts         ayudas para las pruebas
    estado.ts         eventos → estado de la cirugía
    alertas.ts        reglas de alerta (funciones puras)
    db.ts             pool, migrar() (lee db/schema.sql), conClinica()
    clave.ts          hash de contraseñas (scrypt)
    siembra.ts        datos ficticios, historial y demo del día
    repo.ts           consultas
    auth.ts           login y cookie de sesión
    app.ts            rutas HTTP y WebSocket
    server.ts         arranque
    sesion.ts         salas en vivo, micrófono, confirmaciones
    jev.ts            cliente REST de Jev
    preguntas.ts      preguntas y umbrales de Jev
    interprete.ts     frase → decisión
    voz.ts            stream de Chirp 3
    panel.ts          indicadores
  scripts/
    frases-oro.json  set-de-oro.ts  probar-voz.ts
web/
  package.json  tsconfig.json  vite.config.ts  index.html  Dockerfile  nginx.conf.template
  public/  favicon.svg  pcm-worklet.js
  src/
    main.tsx  App.tsx  api.ts  estilos.css  etiquetas.ts  Logo.tsx  Login.tsx  Inicio.tsx
    useSesion.ts  Sesion.tsx  Bloques.tsx  pcm.ts  microfono.ts  Panel.tsx
infra/
  main.tf  variables.tf  outputs.tf  servicios.tf  terraform.tfvars.example
```

---

### Tarea 1: Base del API, contrato de tipos y números en español

**Archivos:**
- Crear: `.gitignore`, `api/package.json`, `api/tsconfig.json`, `api/src/tipos.ts`, `api/src/numeros.ts`
- Prueba: `api/src/numeros.test.ts`

**Interfaces:**
- Produce: todos los tipos de `tipos.ts` (los usan todas las tareas); `numerosConContexto(frase: string): NumeroEnFrase[]` y `primerNumero(frase: string): number | null`.

- [ ] **Paso 1: Crear la base del paquete**

`.gitignore` (en la raíz):

```
node_modules/
.env
dist/
infra/.terraform/
infra/*.tfstate*
infra/terraform.tfvars
*.wav
```

`api/package.json`:

```json
{
  "name": "healthbyte-api",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "node --watch --env-file=.env src/server.ts",
    "start": "node src/server.ts",
    "test": "node --test \"src/**/*.test.ts\"",
    "test:db": "node --env-file=.env --test \"src/**/*.dbtest.ts\"",
    "tipos": "tsc"
  }
}
```

`api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "scripts"]
}
```

Run: `cd api && npm install -D typescript @types/node`

- [ ] **Paso 2: Escribir el contrato de tipos**

`api/src/tipos.ts`:

```ts
// Contrato entre el API y el front. El front solo importa tipos de aquí.

export type Rol =
  | 'cirujano' | 'anestesiologo' | 'instrumentador' | 'auxiliar_enfermeria'
  | 'perfusionista' | 'coordinador' | 'admin';

export type HoraId = 'ingreso' | 'anestesia' | 'inicio_cirugia' | 'fin_cirugia' | 'salida_recuperacion';
export const HORAS: readonly HoraId[] = ['ingreso', 'anestesia', 'inicio_cirugia', 'fin_cirugia', 'salida_recuperacion'];

export interface CampoPreop { id: string; etiqueta: string; tipo: 'numero' | 'texto'; unidad?: string; obligatorio: boolean }
export interface ItemChecklist { id: string; texto: string; rol: Rol; critico?: boolean }
export interface Fase { id: string; nombre: string; abre_con: HoraId; cierra_antes_de: HoraId; items: ItemChecklist[] }
export interface Medicion { id: string; etiqueta: string; unidad: string }
export interface Duracion { nombre: string; desde: string; hasta: string }
export interface Protocolo {
  especialidad: string;
  campos_preop: CampoPreop[];
  fases: Fase[];
  materiales: string[];
  hitos: string[];
  mediciones: Medicion[];
  duraciones: Duracion[];
}

export interface Persona { id: string; nombre: string }
export interface Cirugia {
  id: string;
  quirofano: string;
  fecha_programada: string;
  paciente: { nombre: string; tipo_doc: string; num_doc: string; edad: number; eps: string; hc: string };
  procedimiento: string;
  diagnostico: string;
  lateralidad: string;
  equipo_programado: Partial<Record<Rol, Persona>>;
  datos_preop: Record<string, string | number | null>;
}

export type DatosEvento =
  | { tipo: 'hora'; hora: HoraId }
  | { tipo: 'presente'; usuario_id: string; rol: Rol }
  | { tipo: 'check'; fase: string; item: string; valor: 'si' | 'no' | 'na' }
  | { tipo: 'conteo'; material: string; cantidad: number } // positiva entra, negativa sale
  | { tipo: 'hito'; hito: string }
  | { tipo: 'medicion'; medicion: string; valor: number }
  | { tipo: 'dato'; campo: string; valor: string | number }
  | { tipo: 'novedad'; texto: string }
  | { tipo: 'novedad_atendida'; novedad_id: string; responsable: string }
  | { tipo: 'novedad_solucionada'; novedad_id: string; acciones: string }
  | { tipo: 'alerta_cierre'; alerta: string; motivo: string }
  | { tipo: 'anulacion'; evento_id: string };

export interface Evento {
  id: string;
  ts: string;
  datos: DatosEvento;
  registrado_por: string | null;
  rol_confirma: Rol | null;
  origen: 'voz' | 'manual';
  texto: string | null;
  confianza: number | null;
}
export type NuevoEvento = Omit<Evento, 'id' | 'ts'>;

export interface Alerta {
  id: string;
  severidad: 'critica' | 'advertencia';
  mensaje: string;
  estado: 'abierta' | 'resuelta' | 'cerrada';
  desde: string;
  hasta: string | null;
  motivo: string | null;
}
export interface Check { valor: 'si' | 'no' | 'na'; ts: string; rol: Rol | null }
export interface Novedad {
  id: string;
  texto: string;
  ts: string;
  estado: 'detectada' | 'atendida' | 'solucionada';
  responsable: string | null;
  acciones: string | null;
  solucionada_ts: string | null;
}

export interface EstadoCirugia {
  cirugia: Cirugia;
  protocolo: Protocolo;
  horas: Partial<Record<HoraId, string>>;
  presentes: string[];
  checks: Record<string, Check>; // clave `${fase}.${item}`
  fase_actual: string | null;
  conteo: Record<string, { entra: number; sale: number }>;
  datos: Record<string, string | number | null>;
  novedades: Novedad[];
  duraciones: { nombre: string; minutos: number | null }[];
  alertas: Alerta[];
  eventos: Evento[]; // solo los vigentes, en orden
}

export type Decision =
  | { accion: 'ignorar' }
  | { accion: 'registrar' | 'confirmar'; eventos: DatosEvento[]; confianza: number; resumen: string }
  | { accion: 'responder'; si: boolean }
  | { accion: 'deshacer' };

export type MsgCliente =
  | { tipo: 'unirse'; cirugia_id: string; dispositivo: string }
  | { tipo: 'registrar'; datos: DatosEvento }
  | { tipo: 'confirmar'; si: boolean }
  | { tipo: 'deshacer' }
  | { tipo: 'tomar_microfono' }
  | { tipo: 'soltar_microfono' };

export interface Pendiente { resumen: string; expira: number }
export type MsgServidor =
  | { tipo: 'estado'; estado: EstadoCirugia; microfono: string | null; pendiente: Pendiente | null }
  | { tipo: 'parcial'; texto: string }
  | { tipo: 'aviso'; texto: string };

export interface Sesion { usuario_id: string; clinica_id: string; rol: Rol; nombre: string }

export interface CirugiaActiva {
  id: string;
  quirofano: string;
  fecha_programada: string;
  paciente: string;
  procedimiento: string;
  especialidad: string;
  en_curso: boolean;
}

export interface Panel {
  cirugias: { programadas: number; en_curso: number; realizadas: number };
  checklists: { completas: number; incompletas: number };
  cumplimiento: number | null;
  alertas: { abiertas: number; resueltas: number; cerradas: number; frecuentes: { mensaje: string; veces: number }[] };
  tiempos: { etapa: string; minutos: number | null }[];
  novedades: { abiertas: number; solucionadas: number; minutos_solucion: number | null };
  duraciones: { nombre: string; minutos: number | null }[];
  lista: {
    id: string; fecha: string; quirofano: string; paciente: string; procedimiento: string;
    estado: 'programada' | 'en_curso' | 'realizada'; alertas_abiertas: number; alertas_cerradas: number;
  }[];
}
```

- [ ] **Paso 3: Escribir la prueba de números**

`api/src/numeros.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numerosConContexto, primerNumero } from './numeros.ts';

test('convierte palabras y dígitos a números', () => {
  assert.equal(primerNumero('entran diez compresas'), 10);
  assert.equal(primerNumero('glucometría ciento dos'), 102);
  assert.equal(primerNumero('ciento veinte'), 120);
  assert.equal(primerNumero('sale una compresa'), 1);
  assert.equal(primerNumero('diuresis 29 cc'), 29);
  assert.ok(Math.abs(primerNumero('peso setenta y uno punto tres kilos')! - 71.3) < 1e-9);
  assert.ok(Math.abs(primerNumero('peso 71,3')! - 71.3) < 1e-9);
  assert.equal(primerNumero('sin cifras aquí'), null);
});

test('corta cada número con las palabras que lo siguen, sin pisar el siguiente', () => {
  assert.deepEqual(numerosConContexto('entran diez compresas y veinte gasas'), [
    { valor: 10, span: 'diez compresas y' },
    { valor: 20, span: 'veinte gasas' },
  ]);
});
```

- [ ] **Paso 4: Correr la prueba y verificar que falla**

Run: `cd api && npm test`
Expected: FAIL con `Cannot find module` sobre `numeros.ts`.

- [ ] **Paso 5: Implementar `numeros.ts`**

`api/src/numeros.ts`:

```ts
const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const DECENAS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const CENTENAS: Record<string, number> = { cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500 };

export interface NumeroEnFrase { valor: number; span: string }

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function palabras(frase: string): string[] {
  return normalizar(frase).match(/\d+(?:[.,]\d+)?|[a-z]+/g) ?? [];
}

function leerEntero(t: string[], i: number): [number, number] | null {
  let j = i;
  let total = 0;
  let leyo = false;
  if (CENTENAS[t[j]] !== undefined) { total += CENTENAS[t[j]]; j++; leyo = true; }
  if (DECENAS[t[j]] !== undefined) {
    total += DECENAS[t[j]]; j++; leyo = true;
    if (t[j] === 'y' && UNIDADES[t[j + 1]] !== undefined && UNIDADES[t[j + 1]] < 10) { total += UNIDADES[t[j + 1]]; j += 2; }
  } else if (UNIDADES[t[j]] !== undefined) {
    total += UNIDADES[t[j]]; j++; leyo = true;
  }
  return leyo ? [total, j] : null;
}

function leerNumero(t: string[], i: number): [number, number] | null {
  if (/^\d/.test(t[i])) return [parseFloat(t[i].replace(',', '.')), i + 1];
  const entero = leerEntero(t, i);
  if (!entero) return null;
  let [valor, j] = entero;
  if (t[j] === 'punto' || t[j] === 'coma') {
    const decimal = leerEntero(t, j + 1);
    if (decimal) { valor += decimal[0] / 10 ** String(decimal[0]).length; j = decimal[1]; }
  }
  return [valor, j];
}

/** Cada número de la frase con hasta 3 palabras siguientes, cortando antes del próximo número. */
export function numerosConContexto(frase: string): NumeroEnFrase[] {
  const t = palabras(frase);
  const hallados: { valor: number; i: number; j: number }[] = [];
  for (let i = 0; i < t.length; ) {
    const n = leerNumero(t, i);
    if (n) { hallados.push({ valor: n[0], i, j: n[1] }); i = n[1]; } else i++;
  }
  return hallados.map((h, k) => ({
    valor: h.valor,
    span: t.slice(h.i, Math.min(h.j + 3, hallados[k + 1]?.i ?? t.length)).join(' '),
  }));
}

export function primerNumero(frase: string): number | null {
  return numerosConContexto(frase)[0]?.valor ?? null;
}
```

- [ ] **Paso 6: Correr las pruebas y el chequeo de tipos**

Run: `cd api && npm test && npm run tipos`
Expected: 2 pruebas en PASS y `tsc` sin errores.

- [ ] **Paso 7: Commit**

```bash
git add .gitignore api/package.json api/package-lock.json api/tsconfig.json api/src/tipos.ts api/src/numeros.ts api/src/numeros.test.ts
git commit -m "feat(api): agregar contrato de tipos y conversión de números en español"
git pull --rebase && git push
```

---

### Tarea 2: Protocolos y estado derivado de los eventos

**Archivos:**
- Crear: `api/src/protocolos.ts`, `api/src/prueba.ts`, `api/src/estado.ts`
- Prueba: `api/src/estado.test.ts`

**Interfaces:**
- Consume: los tipos de la Tarea 1.
- Produce: `PROTOCOLO_CARDIO`, `PROTOCOLO_GENERAL`, `conMarcacion(p: Protocolo): Protocolo`, `vocabulario(p: Protocolo): string[]`; `derivar(cirugia: Cirugia, protocolo: Protocolo, eventos: Evento[]): EstadoCirugia`, `vigentes(eventos: Evento[]): Evento[]`; ayudas de prueba `CIRUGIA_ID`, `DATOS_PRUEBA`, `SESION_PRUEBA`, `cirugiaPrueba()`, `ev()`, `checksDeFase()`, `flujoCompleto()`, `flujoHasta()`.

- [ ] **Paso 1: Escribir los protocolos**

Los nombres salen del tablero físico ([campos-tablero-fisico](../../../Notas/campos-tablero-fisico.md)). La instrumentadora debe validar ítems, hitos y roles **antes de la demo**.

`api/src/protocolos.ts`:

```ts
import type { CampoPreop, Fase, Protocolo } from './tipos.ts';

const CAMPOS_BASE: CampoPreop[] = [
  { id: 'peso', etiqueta: 'Peso', tipo: 'numero', unidad: 'kg', obligatorio: true },
  { id: 'talla', etiqueta: 'Talla', tipo: 'numero', unidad: 'cm', obligatorio: true },
  { id: 'alergias', etiqueta: 'Alergias', tipo: 'texto', obligatorio: true },
  { id: 'grupo_sanguineo', etiqueta: 'Sangre Grupo', tipo: 'texto', obligatorio: true },
  { id: 'rh', etiqueta: 'RH', tipo: 'texto', obligatorio: true },
  { id: 'tipo_anestesia', etiqueta: 'Tipo de Anestesia', tipo: 'texto', obligatorio: true },
  { id: 'comorbilidades', etiqueta: 'Comorbilidades Asociadas', tipo: 'texto', obligatorio: false },
  { id: 'condiciones_especiales', etiqueta: 'Condiciones Especiales', tipo: 'texto', obligatorio: false },
  { id: 'aislamiento', etiqueta: 'Aislamiento', tipo: 'texto', obligatorio: false },
];

const FASES: Fase[] = [
  {
    id: 'antes_anestesia', nombre: 'Antes de la anestesia', abre_con: 'ingreso', cierra_antes_de: 'anestesia',
    items: [
      { id: 'identidad', texto: 'Identidad del paciente', rol: 'anestesiologo', critico: true },
      { id: 'procedimiento', texto: 'Procedimiento', rol: 'cirujano', critico: true },
      { id: 'sitio', texto: 'Sitio quirúrgico', rol: 'cirujano', critico: true },
      { id: 'alergias', texto: 'Alergias', rol: 'anestesiologo' },
      { id: 'riesgos', texto: 'Riesgos relevantes', rol: 'anestesiologo' },
      { id: 'equipamiento', texto: 'Equipamiento disponible', rol: 'instrumentador' },
    ],
  },
  {
    id: 'antes_incision', nombre: 'Antes de la incisión', abre_con: 'anestesia', cierra_antes_de: 'inicio_cirugia',
    items: [
      { id: 'confirma_paciente', texto: 'Confirmación del paciente', rol: 'cirujano' },
      { id: 'confirma_procedimiento', texto: 'Confirmación del procedimiento', rol: 'cirujano' },
      { id: 'confirma_sitio', texto: 'Confirmación del sitio quirúrgico', rol: 'cirujano' },
      { id: 'equipo', texto: 'Identificación del equipo quirúrgico', rol: 'auxiliar_enfermeria' },
      { id: 'antibiotico', texto: 'Antibiótico profiláctico', rol: 'anestesiologo', critico: true },
      { id: 'riesgos_previstos', texto: 'Riesgos previstos', rol: 'cirujano' },
    ],
  },
  {
    id: 'antes_salida', nombre: 'Antes de salir del quirófano', abre_con: 'fin_cirugia', cierra_antes_de: 'salida_recuperacion',
    items: [
      { id: 'recuento_instrumental', texto: 'Recuento de instrumental', rol: 'instrumentador', critico: true },
      { id: 'recuento_material', texto: 'Recuento de gasas y material', rol: 'instrumentador', critico: true },
      { id: 'muestras', texto: 'Identificación de muestras', rol: 'auxiliar_enfermeria' },
      { id: 'novedades', texto: 'Registro de novedades', rol: 'auxiliar_enfermeria' },
      { id: 'procedimiento_realizado', texto: 'Procedimiento realizado', rol: 'cirujano' },
    ],
  },
];

const MATERIALES = [
  'Compresas', 'Gasas', 'Cotonoides', 'Rollos Abdominales', 'Mechas',
  'Hiladillos', 'Agujas Hipodérmicas', 'Agujas Sutura', 'Hojas de Bisturí', 'Drenes',
];

const GLUCOMETRIA = { id: 'glucometria', etiqueta: 'Glucometría', unidad: 'mg/dl' };

export const PROTOCOLO_CARDIO: Protocolo = {
  especialidad: 'Cardiovascular',
  campos_preop: [
    ...CAMPOS_BASE,
    { id: 'reserva_sangre', etiqueta: 'Reserva de Sangre y Cantidad', tipo: 'texto', obligatorio: true },
    { id: 'glucometria', etiqueta: 'Glucometría', tipo: 'numero', unidad: 'mg/dl', obligatorio: true },
  ],
  fases: FASES,
  materiales: MATERIALES,
  hitos: ['Heparina', 'Entrada a bomba', 'Salida de bomba', 'Clamp aórtico', 'Retiro de clamp', 'Cardioplejía'],
  mediciones: [GLUCOMETRIA, { id: 'diuresis', etiqueta: 'Diuresis', unidad: 'cc' }],
  duraciones: [
    { nombre: 'Tiempo de bomba', desde: 'Entrada a bomba', hasta: 'Salida de bomba' },
    { nombre: 'Tiempo de clamp', desde: 'Clamp aórtico', hasta: 'Retiro de clamp' },
  ],
};

export const PROTOCOLO_GENERAL: Protocolo = {
  especialidad: 'Cirugía general',
  campos_preop: CAMPOS_BASE,
  fases: FASES,
  materiales: MATERIALES,
  hitos: ['Neumoperitoneo', 'Extracción de pieza', 'Cierre de aponeurosis'],
  mediciones: [GLUCOMETRIA],
  duraciones: [],
};

/** Variante con un ítem extra: muestra que cada clínica configura su protocolo sin código. */
export function conMarcacion(p: Protocolo): Protocolo {
  return {
    ...p,
    fases: p.fases.map(f => f.id !== 'antes_anestesia' ? f : {
      ...f,
      items: [...f.items, { id: 'marcacion', texto: 'Marcación del sitio quirúrgico', rol: 'cirujano', critico: true }],
    }),
  };
}

/** Frases para la adaptación de Chirp 3 (máximo 1.000). */
export function vocabulario(p: Protocolo): string[] {
  return [...new Set([
    ...p.materiales, ...p.hitos, ...p.mediciones.map(m => m.etiqueta), ...p.campos_preop.map(c => c.etiqueta),
    ...p.fases.flatMap(f => [f.nombre, ...f.items.map(i => i.texto)]),
    'paciente en sala', 'inicio de anestesia', 'inicio de cirugía', 'fin de cirugía', 'salida a recuperación',
    'entran', 'salen', 'confirmo', 'deshacer', 'novedad', 'cefazolina',
  ])].slice(0, 1000);
}
```

- [ ] **Paso 2: Escribir las ayudas de prueba**

`api/src/prueba.ts`:

```ts
import type { Cirugia, DatosEvento, Evento, HoraId, Rol, Sesion } from './tipos.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';

export const CIRUGIA_ID = '00000000-0000-4000-8000-000000000001';

export const DATOS_PRUEBA: Cirugia['datos_preop'] = {
  peso: 72, talla: 168, alergias: 'Niega', grupo_sanguineo: 'O', rh: '+', reserva_sangre: '2 unidades',
  tipo_anestesia: 'General', comorbilidades: 'HTA', condiciones_especiales: '', aislamiento: 'No', glucometria: 110,
};

export const SESION_PRUEBA: Sesion = { usuario_id: 'u-circulante', clinica_id: 'cl-1', rol: 'auxiliar_enfermeria', nombre: 'Circulante' };

export function cirugiaPrueba(datos_preop: Cirugia['datos_preop'] = DATOS_PRUEBA): Cirugia {
  return {
    id: CIRUGIA_ID,
    quirofano: 'QX 01',
    fecha_programada: '2026-10-01T12:00:00.000Z',
    paciente: { nombre: 'Paciente Prueba', tipo_doc: 'CC', num_doc: '1000', edad: 55, eps: 'EPS Demo A', hc: 'HC-1' },
    procedimiento: 'Revascularización miocárdica',
    diagnostico: 'Enfermedad coronaria multivaso',
    lateralidad: 'No aplica',
    equipo_programado: {
      cirujano: { id: 'u-cir', nombre: 'Cirujana Prueba' },
      anestesiologo: { id: 'u-anes', nombre: 'Anestesiólogo Prueba' },
      instrumentador: { id: 'u-inst', nombre: 'Instrumentadora Prueba' },
      auxiliar_enfermeria: { id: 'u-circulante', nombre: 'Circulante' },
    },
    datos_preop,
  };
}

let secuencia = 0;
/** Evento de prueba en el minuto indicado a partir de las 12:00 UTC del 1 de octubre de 2026. */
export function ev(datos: DatosEvento, minuto: number, extra: Partial<Evento> = {}): Evento {
  secuencia++;
  return {
    id: `e${secuencia}`,
    ts: new Date(Date.UTC(2026, 9, 1, 12, minuto)).toISOString(),
    datos, registrado_por: 'u-circulante', rol_confirma: null, origen: 'manual', texto: null, confianza: null,
    ...extra,
  };
}

export function checksDeFase(faseId: string, minuto: number, omitir: string[] = []): Evento[] {
  const fase = PROTOCOLO_CARDIO.fases.find(f => f.id === faseId)!;
  return fase.items
    .filter(i => !omitir.includes(i.id))
    .map(i => ev({ tipo: 'check', fase: faseId, item: i.id, valor: 'si' }, minuto, { rol_confirma: i.rol }));
}

/** Una cirugía que cumple todo el protocolo: 90 minutos de cirugía. */
export function flujoCompleto(): Evento[] {
  const presentes = Object.entries(cirugiaPrueba().equipo_programado)
    .map(([rol, p]) => ev({ tipo: 'presente', usuario_id: p!.id, rol: rol as Rol }, 0));
  return [
    ev({ tipo: 'hora', hora: 'ingreso' }, 0), ...presentes, ...checksDeFase('antes_anestesia', 5),
    ev({ tipo: 'hora', hora: 'anestesia' }, 10), ...checksDeFase('antes_incision', 15),
    ev({ tipo: 'hora', hora: 'inicio_cirugia' }, 20), ev({ tipo: 'conteo', material: 'Compresas', cantidad: 10 }, 21),
    ev({ tipo: 'hora', hora: 'fin_cirugia' }, 110), ev({ tipo: 'conteo', material: 'Compresas', cantidad: -10 }, 111),
    ...checksDeFase('antes_salida', 115), ev({ tipo: 'hora', hora: 'salida_recuperacion' }, 120),
  ];
}

/** El flujo completo hasta la hora indicada, incluida. */
export function flujoHasta(hora: HoraId): Evento[] {
  const f = flujoCompleto();
  return f.slice(0, f.findIndex(e => e.datos.tipo === 'hora' && e.datos.hora === hora) + 1);
}
```

- [ ] **Paso 3: Escribir la prueba del estado**

`api/src/estado.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { DATOS_PRUEBA, cirugiaPrueba, ev } from './prueba.ts';

const P = PROTOCOLO_CARDIO;

test('registra horas, checks, conteo y la fase actual', () => {
  const s = derivar(cirugiaPrueba(), P, [
    ev({ tipo: 'hora', hora: 'ingreso' }, 0),
    ev({ tipo: 'check', fase: 'antes_anestesia', item: 'identidad', valor: 'si' }, 1, { rol_confirma: 'anestesiologo' }),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: 10 }, 2),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 3),
  ]);
  assert.equal(s.horas.ingreso, '2026-10-01T12:00:00.000Z');
  assert.equal(s.checks['antes_anestesia.identidad'].rol, 'anestesiologo');
  assert.deepEqual(s.conteo.Compresas, { entra: 10, sale: 9 });
  assert.equal(s.fase_actual, 'antes_anestesia');
});

test('una hora repetida no reemplaza la primera', () => {
  const s = derivar(cirugiaPrueba(), P, [ev({ tipo: 'hora', hora: 'ingreso' }, 0), ev({ tipo: 'hora', hora: 'ingreso' }, 5)]);
  assert.equal(s.horas.ingreso, '2026-10-01T12:00:00.000Z');
});

test('la anulación quita el evento anulado', () => {
  const e = ev({ tipo: 'conteo', material: 'Gasas', cantidad: 10 }, 0);
  const s = derivar(cirugiaPrueba(), P, [e, ev({ tipo: 'anulacion', evento_id: e.id }, 1)]);
  assert.deepEqual(s.conteo.Gasas, { entra: 0, sale: 0 });
  assert.equal(s.eventos.length, 0);
});

test('ciclo de vida de una novedad y duraciones de hitos', () => {
  const nov = ev({ tipo: 'novedad', texto: 'Falla del aspirador' }, 0);
  const s = derivar(cirugiaPrueba(), P, [
    nov,
    ev({ tipo: 'novedad_atendida', novedad_id: nov.id, responsable: 'Auxiliar' }, 2),
    ev({ tipo: 'novedad_solucionada', novedad_id: nov.id, acciones: 'Se cambió el aspirador' }, 7),
    ev({ tipo: 'hito', hito: 'Entrada a bomba' }, 10),
    ev({ tipo: 'hito', hito: 'Salida de bomba' }, 95),
  ]);
  assert.equal(s.novedades[0].estado, 'solucionada');
  assert.equal(s.novedades[0].responsable, 'Auxiliar');
  assert.equal(s.duraciones.find(d => d.nombre === 'Tiempo de bomba')?.minutos, 85);
  assert.equal(s.duraciones.find(d => d.nombre === 'Tiempo de clamp')?.minutos, null);
});

test('una medición llena el campo preoperatorio vacío del mismo nombre', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: null }), P, [
    ev({ tipo: 'medicion', medicion: 'glucometria', valor: 102 }, 0),
  ]);
  assert.equal(s.datos.glucometria, 102);
});
```

- [ ] **Paso 4: Correr la prueba y verificar que falla**

Run: `cd api && npm test`
Expected: FAIL con `Cannot find module` sobre `estado.ts`.

- [ ] **Paso 5: Implementar `estado.ts`**

`api/src/estado.ts`:

```ts
import type { Cirugia, EstadoCirugia, Evento, Protocolo } from './tipos.ts';

export function vigentes(eventos: Evento[]): Evento[] {
  const anulados = new Set(eventos.flatMap(e => (e.datos.tipo === 'anulacion' ? [e.datos.evento_id] : [])));
  return eventos.filter(e => e.datos.tipo !== 'anulacion' && !anulados.has(e.id));
}

function vacio(cirugia: Cirugia, protocolo: Protocolo): EstadoCirugia {
  return {
    cirugia, protocolo, horas: {}, presentes: [], checks: {}, fase_actual: null,
    conteo: Object.fromEntries(protocolo.materiales.map(m => [m, { entra: 0, sale: 0 }])),
    datos: { ...cirugia.datos_preop }, novedades: [], duraciones: [], alertas: [], eventos: [],
  };
}

function faseActual(s: EstadoCirugia): string | null {
  return s.protocolo.fases.filter(f => s.horas[f.abre_con] && !s.horas[f.cierra_antes_de]).at(-1)?.id ?? null;
}

function aplicar(s: EstadoCirugia, e: Evento): void {
  s.eventos.push(e);
  const d = e.datos;
  switch (d.tipo) {
    case 'hora': s.horas[d.hora] ??= e.ts; break;
    case 'presente': if (!s.presentes.includes(d.usuario_id)) s.presentes.push(d.usuario_id); break;
    case 'check': s.checks[`${d.fase}.${d.item}`] = { valor: d.valor, ts: e.ts, rol: e.rol_confirma }; break;
    case 'conteo': {
      const c = (s.conteo[d.material] ??= { entra: 0, sale: 0 });
      if (d.cantidad > 0) c.entra += d.cantidad; else c.sale -= d.cantidad;
      break;
    }
    case 'dato': s.datos[d.campo] = d.valor; break;
    case 'medicion':
      if (s.protocolo.campos_preop.some(c => c.id === d.medicion) && (s.datos[d.medicion] ?? '') === '') s.datos[d.medicion] = d.valor;
      break;
    case 'novedad':
      s.novedades.push({ id: e.id, texto: d.texto, ts: e.ts, estado: 'detectada', responsable: null, acciones: null, solucionada_ts: null });
      break;
    case 'novedad_atendida': {
      const n = s.novedades.find(x => x.id === d.novedad_id);
      if (n?.estado === 'detectada') { n.estado = 'atendida'; n.responsable = d.responsable; }
      break;
    }
    case 'novedad_solucionada': {
      const n = s.novedades.find(x => x.id === d.novedad_id);
      if (n) { n.estado = 'solucionada'; n.acciones = d.acciones; n.solucionada_ts = e.ts; }
      break;
    }
  }
  s.fase_actual = faseActual(s);
}

function duraciones(s: EstadoCirugia): EstadoCirugia['duraciones'] {
  const cuando = (hito: string) => s.eventos.find(e => e.datos.tipo === 'hito' && e.datos.hito === hito)?.ts;
  return s.protocolo.duraciones.map(d => {
    const a = cuando(d.desde);
    const b = cuando(d.hasta);
    return { nombre: d.nombre, minutos: a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 60_000) : null };
  });
}

export function derivar(cirugia: Cirugia, protocolo: Protocolo, eventos: Evento[]): EstadoCirugia {
  const s = vacio(cirugia, protocolo);
  for (const e of vigentes(eventos)) aplicar(s, e);
  s.duraciones = duraciones(s);
  return s;
}
```

- [ ] **Paso 6: Correr las pruebas**

Run: `cd api && npm test && npm run tipos`
Expected: todas en PASS y `tsc` sin errores.

- [ ] **Paso 7: Commit**

```bash
git add api/src/protocolos.ts api/src/prueba.ts api/src/estado.ts api/src/estado.test.ts
git commit -m "feat(api): derivar el estado de la cirugía a partir de eventos"
git pull --rebase && git push
```

---

### Tarea 3: Alertas con historial

**Archivos:**
- Crear: `api/src/alertas.ts`
- Modificar: `api/src/estado.ts` (función `derivar`)
- Prueba: `api/src/alertas.test.ts`

**Interfaces:**
- Consume: `EstadoCirugia` y `derivar` de la Tarea 2.
- Produce: `alertasActivas(s: EstadoCirugia): AlertaActiva[]`. Después de esta tarea, `derivar()` llena `estado.alertas` con el historial (`abierta`, `resuelta` o `cerrada`).

Los `id` de alerta son estables y los usa `alerta_cierre`: `dato:<campo>`, `critico:<fase>.<item>`, `fase:<fase>`, `negado:<fase>.<item>`, `alergia`, `conteo:<material>`, `equipo:<rol>`, `extra:<usuario>`.

- [ ] **Paso 1: Escribir la prueba**

`api/src/alertas.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { DATOS_PRUEBA, checksDeFase, cirugiaPrueba, ev, flujoCompleto, flujoHasta } from './prueba.ts';
import type { EstadoCirugia } from './tipos.ts';

const P = PROTOCOLO_CARDIO;
const c = cirugiaPrueba();
const abiertas = (s: EstadoCirugia) => s.alertas.filter(a => a.estado === 'abierta').map(a => a.id).sort();
const alerta = (s: EstadoCirugia, id: string) => s.alertas.find(a => a.id === id);

test('el flujo completo termina sin alertas abiertas', () => {
  assert.deepEqual(abiertas(derivar(c, P, flujoCompleto())), []);
});

test('datos obligatorios faltantes desde que se abre la cirugía', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: null, reserva_sangre: '' }), P, []);
  assert.deepEqual(abiertas(s), ['dato:glucometria', 'dato:reserva_sangre']);
});

test('el antibiótico queda pendiente al iniciar la anestesia y se resuelve al confirmarlo', () => {
  const base = flujoHasta('anestesia');
  assert.deepEqual(abiertas(derivar(c, P, base)), ['critico:antes_incision.antibiotico']);
  const s = derivar(c, P, [...base, ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12)]);
  assert.equal(alerta(s, 'critico:antes_incision.antibiotico')?.estado, 'resuelta');
});

test('una alerta se cierra con motivo', () => {
  const s = derivar(c, P, [
    ...flujoHasta('anestesia'),
    ev({ tipo: 'alerta_cierre', alerta: 'critico:antes_incision.antibiotico', motivo: 'Indicación del cirujano' }, 12),
  ]);
  const a = alerta(s, 'critico:antes_incision.antibiotico')!;
  assert.equal(a.estado, 'cerrada');
  assert.equal(a.motivo, 'Indicación del cirujano');
});

test('el conteo descuadrado suena al terminar la cirugía y se resuelve al cuadrar', () => {
  const fin = flujoHasta('fin_cirugia');
  const s1 = derivar(c, P, [...fin, ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 111)]);
  assert.ok(abiertas(s1).includes('conteo:Compresas'));
  assert.equal(alerta(s1, 'conteo:Compresas')?.mensaje, 'Compresas: entraron 10, salieron 9');
  const s2 = derivar(c, P, [
    ...fin,
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 111),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -1 }, 113),
  ]);
  assert.equal(alerta(s2, 'conteo:Compresas')?.estado, 'resuelta');
});

test('alergia sin validar y procedimiento que no coincide', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, alergias: 'Penicilina' }), P, [
    ev({ tipo: 'hora', hora: 'ingreso' }, 0),
    ev({ tipo: 'check', fase: 'antes_anestesia', item: 'procedimiento', valor: 'no' }, 1),
  ]);
  assert.ok(abiertas(s).includes('alergia'));
  assert.ok(abiertas(s).includes('negado:antes_anestesia.procedimiento'));
});

test('equipo programado que no se marcó presente', () => {
  assert.ok(abiertas(derivar(c, P, [ev({ tipo: 'hora', hora: 'ingreso' }, 0)])).includes('equipo:anestesiologo'));
});

test('fase cerrada con ítems no críticos sin verificar', () => {
  const s = derivar(c, P, [
    ...flujoHasta('ingreso'),
    ...checksDeFase('antes_anestesia', 5, ['riesgos']),
    ev({ tipo: 'hora', hora: 'anestesia' }, 10),
  ]);
  assert.ok(abiertas(s).includes('fase:antes_anestesia'));
});
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Run: `cd api && npm test`
Expected: FAIL con `Cannot find module` sobre `alertas.ts`.

- [ ] **Paso 3: Implementar las reglas**

`api/src/alertas.ts`:

```ts
import type { Alerta, EstadoCirugia } from './tipos.ts';

export type AlertaActiva = Pick<Alerta, 'id' | 'severidad' | 'mensaje'>;
type Regla = (s: EstadoCirugia) => AlertaActiva[];

const ROL: Record<string, string> = {
  cirujano: 'Cirujano', anestesiologo: 'Anestesiólogo', instrumentador: 'Instrumentador',
  auxiliar_enfermeria: 'Auxiliar de enfermería', perfusionista: 'Perfusionista',
};
const SIN_ALERGIAS = /^(niega|no|ninguna|negativo|\(-\)|-)?$/i;
const verificado = (s: EstadoCirugia, fase: string, item: string) =>
  ['si', 'na'].includes(s.checks[`${fase}.${item}`]?.valor ?? '');

const datoFaltante: Regla = s => s.protocolo.campos_preop
  .filter(c => c.obligatorio && (s.datos[c.id] ?? '') === '')
  .map((c): AlertaActiva => ({ id: `dato:${c.id}`, severidad: 'advertencia', mensaje: `Falta ${c.etiqueta}` }));

const criticoPendiente: Regla = s => s.protocolo.fases
  .filter(f => s.horas[f.abre_con])
  .flatMap(f => f.items
    .filter(i => i.critico && !verificado(s, f.id, i.id))
    .map((i): AlertaActiva => ({
      id: `critico:${f.id}.${i.id}`, severidad: 'critica', mensaje: `${i.texto} pendiente (${f.nombre.toLowerCase()})`,
    })));

const faseIncompleta: Regla = s => s.protocolo.fases
  .filter(f => s.horas[f.cierra_antes_de])
  .flatMap((f): AlertaActiva[] => {
    const faltan = f.items.filter(i => !i.critico && !verificado(s, f.id, i.id));
    return faltan.length
      ? [{ id: `fase:${f.id}`, severidad: 'advertencia', mensaje: `${f.nombre}: sin verificar ${faltan.map(i => i.texto.toLowerCase()).join(', ')}` }]
      : [];
  });

const checkNegado: Regla = s => s.protocolo.fases.flatMap(f => f.items
  .filter(i => s.checks[`${f.id}.${i.id}`]?.valor === 'no')
  .map((i): AlertaActiva => ({ id: `negado:${f.id}.${i.id}`, severidad: 'critica', mensaje: `${i.texto}: no coincide con lo programado` })));

const alergiaSinValidar: Regla = s => {
  const alergias = String(s.datos.alergias ?? '').trim();
  const fase = s.protocolo.fases.find(f => f.items.some(i => i.id === 'alergias'));
  if (SIN_ALERGIAS.test(alergias) || !fase || !s.horas[fase.abre_con] || verificado(s, fase.id, 'alergias')) return [];
  return [{ id: 'alergia', severidad: 'critica', mensaje: `Alergia a ${alergias} sin validar` }];
};

const conteoDescuadrado: Regla = s => !s.horas.fin_cirugia ? [] : Object.entries(s.conteo)
  .filter(([, c]) => c.entra !== c.sale)
  .map(([m, c]): AlertaActiva => ({ id: `conteo:${m}`, severidad: 'critica', mensaje: `${m}: entraron ${c.entra}, salieron ${c.sale}` }));

const equipoDistinto: Regla = s => {
  if (!s.horas.ingreso) return [];
  const programados = Object.entries(s.cirugia.equipo_programado);
  const faltan = programados
    .filter(([, p]) => p && !s.presentes.includes(p.id))
    .map(([rol, p]): AlertaActiva => ({
      id: `equipo:${rol}`, severidad: 'advertencia', mensaje: `${p!.nombre} (${ROL[rol] ?? rol}) programado y no marcado presente`,
    }));
  const ids = new Set(programados.map(([, p]) => p?.id));
  const extra = s.presentes
    .filter(id => !ids.has(id))
    .map((id): AlertaActiva => ({ id: `extra:${id}`, severidad: 'advertencia', mensaje: 'Integrante presente que no estaba programado' }));
  return [...faltan, ...extra];
};

const REGLAS: Regla[] = [datoFaltante, criticoPendiente, faseIncompleta, checkNegado, alergiaSinValidar, conteoDescuadrado, equipoDistinto];

export function alertasActivas(s: EstadoCirugia): AlertaActiva[] {
  return REGLAS.flatMap(r => r(s));
}
```

- [ ] **Paso 4: Conectar las alertas a `derivar()` con su historial**

En `api/src/estado.ts`, cambia el import de tipos y agrega el de alertas:

```ts
import type { Alerta, Cirugia, EstadoCirugia, Evento, Protocolo } from './tipos.ts';
import { alertasActivas } from './alertas.ts';
```

Agrega esta función antes de `derivar`:

```ts
// ponytail: recalcula todas las reglas en cada evento, O(eventos × reglas); sobra para ~100 eventos por cirugía.
function actualizarAlertas(s: EstadoCirugia, historial: Map<string, Alerta>, ts: string, e?: Evento): void {
  if (e?.datos.tipo === 'alerta_cierre') {
    const a = historial.get(e.datos.alerta);
    if (a?.estado === 'abierta') { a.estado = 'cerrada'; a.motivo = e.datos.motivo; a.hasta = ts; }
  }
  const activas = alertasActivas(s);
  for (const a of activas) {
    const h = historial.get(a.id);
    if (!h) historial.set(a.id, { ...a, estado: 'abierta', desde: ts, hasta: null, motivo: null });
    else if (h.estado !== 'cerrada') Object.assign(h, { mensaje: a.mensaje, severidad: a.severidad, estado: 'abierta', hasta: null });
  }
  const ids = new Set(activas.map(a => a.id));
  for (const h of historial.values()) if (h.estado === 'abierta' && !ids.has(h.id)) { h.estado = 'resuelta'; h.hasta = ts; }
}
```

Y reemplaza `derivar` por:

```ts
export function derivar(cirugia: Cirugia, protocolo: Protocolo, eventos: Evento[]): EstadoCirugia {
  const s = vacio(cirugia, protocolo);
  const historial = new Map<string, Alerta>();
  actualizarAlertas(s, historial, cirugia.fecha_programada);
  for (const e of vigentes(eventos)) {
    aplicar(s, e);
    actualizarAlertas(s, historial, e.ts, e);
  }
  s.duraciones = duraciones(s);
  s.alertas = [...historial.values()];
  return s;
}
```

- [ ] **Paso 5: Correr las pruebas**

Run: `cd api && npm test && npm run tipos`
Expected: todas en PASS (también las de la Tarea 2) y `tsc` sin errores.

- [ ] **Paso 6: Commit**

```bash
git add api/src/alertas.ts api/src/alertas.test.ts api/src/estado.ts
git commit -m "feat(api): agregar alertas con historial de apertura, resolución y cierre"
git pull --rebase && git push
```

---

### Tarea 4: Base de datos con Row-Level Security

**Archivos:**
- Crear: `api/src/db.ts`
- Prueba: `api/src/rls.dbtest.ts`
- Ya existen (no se tocan): `db/schema.sql`, `db/docker-compose.yml`, `api/.env.example`

**Interfaces:**
- Produce: `pool: pg.Pool`, `migrar(): Promise<void>`, `conClinica<T>(clinicaId: string, fn: (c: pg.PoolClient) => Promise<T>): Promise<T>`.

Las pruebas `*.dbtest.ts` necesitan Postgres local (Docker Desktop).

- [ ] **Paso 1: Postgres local y variables de entorno**

Run:

```bash
docker compose -f db/docker-compose.yml up -d
cd api && cp .env.example .env && npm ci
```

- [ ] **Paso 2: Escribir la prueba de aislamiento**

`api/src/rls.dbtest.ts`:

```ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { conClinica, migrar, pool } from './db.ts';

before(migrar);
after(() => pool.end());

async function clinica(nombre: string): Promise<string> {
  const { rows } = await pool.query(
    "INSERT INTO clinica (slug, nombre) VALUES ('prueba-' || gen_random_uuid(), $1) RETURNING id", [nombre]);
  return rows[0].id;
}

test('una clínica no ve los datos de otra', async () => {
  const a = await clinica('A');
  const b = await clinica('B');
  await pool.query("INSERT INTO quirofano (clinica_id, nombre) VALUES ($1, 'QX A'), ($2, 'QX B')", [a, b]);
  const vistos = await conClinica(a, async c => (await c.query("SELECT nombre FROM quirofano WHERE nombre IN ('QX A', 'QX B')")).rows);
  assert.deepEqual(vistos.map(r => r.nombre), ['QX A']);
});

test('sin clínica fijada no se ve nada', async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SET LOCAL ROLE healthbyte_app');
    assert.equal((await c.query('SELECT count(*)::int AS n FROM quirofano')).rows[0].n, 0);
  } finally {
    await c.query('ROLLBACK');
    c.release();
  }
});

test('los eventos no se pueden modificar ni borrar', async () => {
  const a = await clinica('C');
  await assert.rejects(conClinica(a, c => c.query("UPDATE evento SET texto = 'x'")), /permission denied/);
  await assert.rejects(conClinica(a, c => c.query('DELETE FROM evento')), /permission denied/);
});
```

- [ ] **Paso 3: Correr la prueba y verificar que falla**

Run: `cd api && npm run test:db`
Expected: FAIL con `Cannot find module` sobre `db.ts`.

- [ ] **Paso 4: Revisar el esquema**

`db/schema.sql` ya existe: crea las tablas, el rol `healthbyte_app` sin `BYPASSRLS`, la política `por_clinica` en cada tabla con datos de una clínica, y solo da `SELECT` e `INSERT` sobre `evento`. Léelo; no lo modifiques.

- [ ] **Paso 5: Implementar `db.ts`**

`api/src/db.ts`:

```ts
import pg from 'pg';
import { readFile } from 'node:fs/promises';

// Fechas como texto ISO, igual que en los tipos del contrato.
pg.types.setTypeParser(1184, v => new Date(v).toISOString()); // timestamptz
pg.types.setTypeParser(1082, v => v); // date

// Lee la conexión de PGHOST, PGUSER, PGPASSWORD, PGDATABASE y PGPORT.
export const pool = new pg.Pool({ max: 5 });

export async function migrar(): Promise<void> {
  await pool.query(await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8'));
}

/** Transacción con el rol sin privilegios y la clínica fijada: Row-Level Security filtra todo lo demás. */
export async function conClinica<T>(clinicaId: string, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SET LOCAL ROLE healthbyte_app');
    await c.query("SELECT set_config('app.clinica_id', $1, true)", [clinicaId]);
    const resultado = await fn(c);
    await c.query('COMMIT');
    return resultado;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
```

- [ ] **Paso 6: Correr las pruebas**

Run: `cd api && npm run test:db && npm test && npm run tipos`
Expected: las 3 pruebas de RLS en PASS, las anteriores siguen en PASS y `tsc` sin errores.

- [ ] **Paso 7: Commit**

```bash
git add api/src/db.ts api/src/rls.dbtest.ts
git commit -m "feat(api): agregar esquema con Row-Level Security y eventos inmutables"
git pull --rebase && git push
```

---

### Tarea 5: Siembra de datos ficticios

**Archivos:**
- Crear: `api/src/clave.ts`, `api/src/siembra.ts`
- Prueba: `api/src/clave.test.ts`, `api/src/siembra.dbtest.ts`

**Interfaces:**
- Consume: `pool` (Tarea 4), `PROTOCOLO_CARDIO`, `PROTOCOLO_GENERAL` y `conMarcacion` (Tarea 2).
- Produce: `hashClave(clave): string`, `verificarClave(clave, guardado): boolean`, `CLAVE_DEMO`, `sembrar(): Promise<void>` (solo si no existe la clínica `caribe`) y `reiniciarDemo(): Promise<void>`.

Siembra dos clínicas, `caribe` y `norte`, con protocolos distintos. Cada una tiene 60 cirugías históricas de los últimos 30 días, con eventos generados, y 3 cirugías programadas para hoy. La primera de hoy es la de la demo: revascularización miocárdica con alergia a penicilina, glucometría pendiente y reserva de sangre vacía. Usuarios de prueba: `circulante` y `coordinador` en cada clínica, con la clave `CLAVE_DEMO`.

- [ ] **Paso 1: Escribir las pruebas**

`api/src/clave.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashClave, verificarClave } from './clave.ts';

test('verifica la clave correcta y rechaza las demás', () => {
  const h = hashClave('secreta');
  assert.ok(verificarClave('secreta', h));
  assert.ok(!verificarClave('otra', h));
  assert.ok(!verificarClave('secreta', 'mal-formado'));
});
```

`api/src/siembra.dbtest.ts`:

```ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { conClinica, migrar, pool } from './db.ts';
import { sembrar } from './siembra.ts';

before(async () => { await migrar(); await sembrar(); });
after(() => pool.end());

test('siembra dos clínicas con historial y la cirugía de la demo', async () => {
  const { rows } = await pool.query("SELECT id, slug FROM clinica WHERE slug IN ('caribe', 'norte') ORDER BY slug");
  assert.deepEqual(rows.map(r => r.slug), ['caribe', 'norte']);
  const caribe = rows[0].id;
  const conteo = await conClinica(caribe, async c => (await c.query(`
    SELECT count(*)::int AS cirugias,
           count(*) FILTER (WHERE procedimiento = 'Revascularización miocárdica' AND NOT EXISTS (
             SELECT 1 FROM evento e WHERE e.cirugia_id = cirugia.id))::int AS demo
    FROM cirugia`)).rows[0]);
  assert.equal(conteo.cirugias, 63);
  assert.ok(conteo.demo >= 1);
});

test('sembrar dos veces no duplica', async () => {
  await sembrar();
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM clinica WHERE slug = 'caribe'");
  assert.equal(rows[0].n, 1);
});
```

- [ ] **Paso 2: Correr las pruebas y verificar que fallan**

Run: `cd api && npm test && npm run test:db`
Expected: FAIL con `Cannot find module` sobre `clave.ts` y `siembra.ts`.

- [ ] **Paso 3: Implementar `clave.ts`**

`api/src/clave.ts`:

```ts
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashClave(clave: string): string {
  const sal = randomBytes(16).toString('hex');
  return `${sal}:${scryptSync(clave, sal, 32).toString('hex')}`;
}

export function verificarClave(clave: string, guardado: string): boolean {
  const [sal, hash] = guardado.split(':');
  if (!sal || !hash) return false;
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(clave, sal, 32));
}
```

- [ ] **Paso 4: Implementar `siembra.ts`**

`api/src/siembra.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { pool } from './db.ts';
import { hashClave } from './clave.ts';
import { PROTOCOLO_CARDIO, PROTOCOLO_GENERAL, conMarcacion } from './protocolos.ts';
import type { DatosEvento, Fase, Persona, Protocolo, Rol } from './tipos.ts';

// Credencial de prueba de la demo. Todos los usuarios sembrados la comparten; los datos son ficticios.
export const CLAVE_DEMO = 'demo2026';

const CLINICAS = [
  { slug: 'caribe', nombre: 'Clínica Demo Caribe', protocolos: [PROTOCOLO_CARDIO, PROTOCOLO_GENERAL] },
  { slug: 'norte', nombre: 'IPS Demo Norte', protocolos: [PROTOCOLO_CARDIO, conMarcacion(PROTOCOLO_GENERAL)] },
];
const PLANTA: [Rol, number][] = [
  ['cirujano', 3], ['anestesiologo', 2], ['instrumentador', 2], ['auxiliar_enfermeria', 2], ['perfusionista', 1], ['coordinador', 1],
];
const EQUIPO_BASE: Rol[] = ['cirujano', 'anestesiologo', 'instrumentador', 'auxiliar_enfermeria'];
const NOMBRES = ['Ana', 'Carlos', 'Luisa', 'Jorge', 'María', 'Andrés', 'Paola', 'Diego', 'Valentina', 'Camilo', 'Daniela', 'Javier', 'Sofía', 'Ricardo', 'Laura', 'Mateo'];
const APELLIDOS = ['Pérez', 'Gómez', 'Rodríguez', 'Martínez', 'Díaz', 'Herrera', 'Castro', 'Ruiz', 'Vargas', 'Rojas', 'Mendoza', 'Ortiz', 'Navarro', 'Silva'];
const EPS = ['EPS Demo A', 'EPS Demo B', 'EPS Demo C'];
const PROCEDIMIENTOS: Record<string, [string, string, string][]> = {
  'Cardiovascular': [
    ['Revascularización miocárdica', 'Enfermedad coronaria multivaso', 'No aplica'],
    ['Cambio valvular aórtico', 'Estenosis aórtica severa', 'No aplica'],
  ],
  'Cirugía general': [
    ['Colecistectomía laparoscópica', 'Colelitiasis', 'No aplica'],
    ['Herniorrafia inguinal', 'Hernia inguinal', 'Derecha'],
    ['Apendicectomía', 'Apendicitis aguda', 'No aplica'],
  ],
};
const NOVEDADES = ['Falla del aspirador', 'Electrobisturí sin señal', 'Retraso en la llegada de hemoderivados', 'Monitor con artefacto en la señal'];
const DATOS_COMPLETOS = {
  peso: 72, talla: 168, alergias: 'Niega', grupo_sanguineo: 'O', rh: '+', reserva_sangre: '2 unidades',
  tipo_anestesia: 'General', comorbilidades: 'HTA', condiciones_especiales: '', aislamiento: 'No', glucometria: 110,
};
const CASOS_DEL_DIA = [
  { especialidad: 'Cardiovascular', procedimiento: PROCEDIMIENTOS['Cardiovascular'][0], hora: 7,
    datos: { ...DATOS_COMPLETOS, alergias: 'Penicilina', glucometria: null, reserva_sangre: '' } },
  { especialidad: 'Cirugía general', procedimiento: PROCEDIMIENTOS['Cirugía general'][0], hora: 9.5, datos: DATOS_COMPLETOS },
  { especialidad: 'Cirugía general', procedimiento: PROCEDIMIENTOS['Cirugía general'][1], hora: 13, datos: DATOS_COMPLETOS },
];
const HORA = 3_600_000;
const MINUTO = 60_000;

function prng(semilla: number): () => number {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function elegir<T>(r: () => number, xs: readonly T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

/** Medianoche de Bogotá (UTC−5) de hace `diasAtras` días, en milisegundos. */
function inicioDelDia(diasAtras = 0): number {
  const bogota = new Date(Date.now() - 5 * HORA);
  return Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate() - diasAtras) + 5 * HORA;
}

async function enTransaccion(fn: (c: pg.PoolClient) => Promise<void>): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await fn(c);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

export async function sembrar(): Promise<void> {
  const { rowCount } = await pool.query("SELECT 1 FROM clinica WHERE slug = 'caribe'");
  if (rowCount) return;
  const r = prng(2026);
  const hash = hashClave(CLAVE_DEMO);
  for (const def of CLINICAS) await enTransaccion(c => sembrarClinica(c, def, hash, r));
}

/** Archiva las cirugías sin terminar y vuelve a programar las del día. Corre como dueño de las tablas. */
export async function reiniciarDemo(): Promise<void> {
  await enTransaccion(async c => {
    await c.query(`UPDATE cirugia c SET archivada = true WHERE NOT archivada AND NOT EXISTS (
      SELECT 1 FROM evento e WHERE e.cirugia_id = c.id AND e.tipo = 'hora' AND e.datos->>'hora' = 'salida_recuperacion')`);
    const { rows } = await c.query("SELECT id FROM clinica WHERE slug IN ('caribe', 'norte')");
    for (const { id } of rows) await programarDelDia(c, id);
  });
}

async function sembrarClinica(c: pg.PoolClient, def: (typeof CLINICAS)[number], hash: string, r: () => number): Promise<void> {
  const id = async (sql: string, p: unknown[]) => (await c.query(sql, p)).rows[0].id as string;
  const clinicaId = await id('INSERT INTO clinica (slug, nombre) VALUES ($1, $2) RETURNING id', [def.slug, def.nombre]);

  const personal = new Map<Rol, Persona[]>();
  for (const [rol, cuantos] of PLANTA) for (let i = 1; i <= cuantos; i++) {
    const nombre = `${elegir(r, NOMBRES)} ${elegir(r, APELLIDOS)}`;
    const login = rol === 'auxiliar_enfermeria' && i === 1 ? 'circulante' : rol === 'coordinador' ? 'coordinador' : `${rol}${i}`;
    const uid = await id('INSERT INTO usuario (clinica_id, nombre, rol, login, hash_clave) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [clinicaId, nombre, rol, login, hash]);
    personal.set(rol, [...(personal.get(rol) ?? []), { id: uid, nombre }]);
  }

  const quirofanos: string[] = [];
  for (let i = 1; i <= 4; i++) quirofanos.push(await id('INSERT INTO quirofano (clinica_id, nombre) VALUES ($1, $2) RETURNING id', [clinicaId, `QX 0${i}`]));

  const protocolos = new Map<string, { id: string; p: Protocolo }>();
  for (const p of def.protocolos) {
    protocolos.set(p.especialidad, {
      id: await id('INSERT INTO protocolo (clinica_id, especialidad, definicion) VALUES ($1, $2, $3) RETURNING id', [clinicaId, p.especialidad, p]),
      p,
    });
  }

  const pacientes: string[] = [];
  for (let i = 1; i <= 40; i++) {
    const nacimiento = new Date(Date.UTC(1940 + Math.floor(r() * 66), Math.floor(r() * 12), 1 + Math.floor(r() * 28)));
    pacientes.push(await id(
      'INSERT INTO paciente (clinica_id, nombre, tipo_doc, num_doc, fecha_nacimiento, eps, hc) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [clinicaId, `${elegir(r, NOMBRES)} ${elegir(r, APELLIDOS)} ${elegir(r, APELLIDOS)}`, 'CC',
        String(10_000_000 + Math.floor(r() * 89_999_999)), nacimiento.toISOString().slice(0, 10), elegir(r, EPS),
        `HC-${def.slug}-${String(i).padStart(4, '0')}`]));
  }

  const circulante = personal.get('auxiliar_enfermeria')![0].id;
  for (let dia = 30; dia >= 1; dia--) for (const hora of [7, 11]) {
    const especialidad = r() < 0.35 ? 'Cardiovascular' : 'Cirugía general';
    const { id: protocoloId, p } = protocolos.get(especialidad)!;
    const [procedimiento, diagnostico, lateralidad] = elegir(r, PROCEDIMIENTOS[especialidad]);
    const roles: Rol[] = especialidad === 'Cardiovascular' ? [...EQUIPO_BASE, 'perfusionista'] : EQUIPO_BASE;
    const equipo = Object.fromEntries(roles.map(rol => [rol, elegir(r, personal.get(rol)!)]));
    const fecha = inicioDelDia(dia) + hora * HORA;
    const cirugiaId = await id(`INSERT INTO cirugia (clinica_id, quirofano_id, paciente_id, protocolo_id, fecha_programada,
        procedimiento, diagnostico, lateralidad, equipo_programado, datos_preop)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [clinicaId, elegir(r, quirofanos), elegir(r, pacientes), protocoloId, new Date(fecha).toISOString(),
        procedimiento, diagnostico, lateralidad, equipo, { ...DATOS_COMPLETOS, alergias: r() < 0.2 ? 'Penicilina' : 'Niega' }]);
    await c.query(`INSERT INTO evento (id, clinica_id, cirugia_id, ts, tipo, datos, registrado_por, rol_confirma, origen)
        SELECT x.id, $1, $2, x.ts, x.datos->>'tipo', x.datos, $3, x.rol, x.origen
        FROM jsonb_to_recordset($4::jsonb) AS x(id uuid, ts timestamptz, datos jsonb, rol text, origen text)`,
      [clinicaId, cirugiaId, circulante, JSON.stringify(generarEventos(p, equipo, fecha + 10 * MINUTO, r))]);
  }

  await programarDelDia(c, clinicaId);
}

async function programarDelDia(c: pg.PoolClient, clinicaId: string): Promise<void> {
  const filas = async (sql: string) => (await c.query(sql, [clinicaId])).rows;
  const usuarios = await filas('SELECT id, nombre, rol FROM usuario WHERE clinica_id = $1 ORDER BY login');
  const quirofanos = await filas('SELECT id FROM quirofano WHERE clinica_id = $1 ORDER BY nombre');
  const protocolos = await filas('SELECT id, especialidad FROM protocolo WHERE clinica_id = $1');
  const pacientes = await filas('SELECT id FROM paciente WHERE clinica_id = $1 ORDER BY hc LIMIT 3');
  for (const [i, caso] of CASOS_DEL_DIA.entries()) {
    const roles: Rol[] = caso.especialidad === 'Cardiovascular' ? [...EQUIPO_BASE, 'perfusionista'] : EQUIPO_BASE;
    const equipo = Object.fromEntries(roles.map(rol => {
      const u = usuarios.find(x => x.rol === rol);
      return [rol, { id: u.id, nombre: u.nombre }];
    }));
    const protocolo = protocolos.find(p => p.especialidad === caso.especialidad);
    await c.query(`INSERT INTO cirugia (clinica_id, quirofano_id, paciente_id, protocolo_id, fecha_programada,
        procedimiento, diagnostico, lateralidad, equipo_programado, datos_preop)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [clinicaId, quirofanos[i].id, pacientes[i].id, protocolo.id, new Date(inicioDelDia() + caso.hora * HORA).toISOString(),
        ...caso.procedimiento, equipo, caso.datos]);
  }
}

interface FilaEvento { id: string; ts: string; datos: DatosEvento; rol: Rol | null; origen: 'voz' | 'manual' }

/** Una cirugía plausible: casi siempre cumple el protocolo, a veces deja algo que el panel debe mostrar. */
function generarEventos(p: Protocolo, equipo: Record<string, Persona>, inicio: number, r: () => number): FilaEvento[] {
  const filas: FilaEvento[] = [];
  let t = inicio;
  const add = (datos: DatosEvento, minutos = 1, rol: Rol | null = null, id: string = randomUUID()) => {
    t += minutos * MINUTO;
    filas.push({ id, ts: new Date(t).toISOString(), datos, rol, origen: r() < 0.75 ? 'voz' : 'manual' });
  };
  const verificar = (f: Fase, omitir?: string) => {
    for (const i of f.items) if (i.id !== omitir) add({ tipo: 'check', fase: f.id, item: i.id, valor: 'si' }, 1, i.rol);
  };
  const [f1, f2, f3] = p.fases;
  const cardio = p.hitos.includes('Entrada a bomba');

  add({ tipo: 'hora', hora: 'ingreso' }, 0);
  for (const [rol, u] of Object.entries(equipo)) add({ tipo: 'presente', usuario_id: u.id, rol: rol as Rol }, 0);
  verificar(f1);
  add({ tipo: 'hora', hora: 'anestesia' }, 4 + r() * 10);
  const sinAntibiotico = r() < 0.06;
  verificar(f2, sinAntibiotico ? 'antibiotico' : undefined);
  if (sinAntibiotico) {
    add({ tipo: 'alerta_cierre', alerta: 'critico:antes_incision.antibiotico', motivo: 'Antibiótico administrado en hospitalización' });
  }
  add({ tipo: 'hora', hora: 'inicio_cirugia' }, 10 + r() * 20);
  for (const [material, n] of [['Compresas', 10], ['Gasas', 10], ['Agujas Sutura', 6]] as const) {
    add({ tipo: 'conteo', material, cantidad: n }, 0);
  }
  if (cardio) {
    add({ tipo: 'hito', hito: 'Heparina' }, 20);
    add({ tipo: 'hito', hito: 'Entrada a bomba' }, 10);
    add({ tipo: 'hito', hito: 'Clamp aórtico' }, 5);
    add({ tipo: 'hito', hito: 'Cardioplejía' }, 2);
    add({ tipo: 'hito', hito: 'Retiro de clamp' }, 50 + r() * 40);
    add({ tipo: 'hito', hito: 'Salida de bomba' }, 15 + r() * 15);
  }
  if (r() < 0.15) {
    const novedad = randomUUID();
    add({ tipo: 'novedad', texto: elegir(r, NOVEDADES) }, 15, null, novedad);
    add({ tipo: 'novedad_atendida', novedad_id: novedad, responsable: 'Auxiliar de enfermería' }, 2 + r() * 4);
    add({ tipo: 'novedad_solucionada', novedad_id: novedad, acciones: 'Se reemplazó el equipo' }, 3 + r() * 12);
  }
  add({ tipo: 'hora', hora: 'fin_cirugia' }, (cardio ? 40 : 30) + r() * 60);
  const descuadre = r() < 0.05;
  add({ tipo: 'conteo', material: 'Compresas', cantidad: descuadre ? -9 : -10 }, 2);
  add({ tipo: 'conteo', material: 'Gasas', cantidad: -10 });
  add({ tipo: 'conteo', material: 'Agujas Sutura', cantidad: -6 });
  if (descuadre) add({ tipo: 'conteo', material: 'Compresas', cantidad: -1 }, 4);
  verificar(f3, r() < 0.08 ? 'muestras' : undefined);
  add({ tipo: 'hora', hora: 'salida_recuperacion' }, 8 + r() * 15);
  return filas;
}
```

- [ ] **Paso 5: Correr las pruebas**

Run: `cd api && npm test && npm run test:db && npm run tipos`
Expected: todas en PASS y `tsc` sin errores. Si la base ya tenía una siembra vieja, bórrala antes con `docker compose -f db/docker-compose.yml down -v && docker compose -f db/docker-compose.yml up -d`.

- [ ] **Paso 6: Commit**

```bash
git add api/src/clave.ts api/src/clave.test.ts api/src/siembra.ts api/src/siembra.dbtest.ts
git commit -m "feat(api): sembrar dos clínicas ficticias con historial y demo del día"
git pull --rebase && git push
```

---

### Tarea 6: Consultas, login y API REST

**Archivos:**
- Crear: `api/src/repo.ts`, `api/src/auth.ts`, `api/src/app.ts`, `api/src/server.ts`
- Modificar: `README.md`
- Prueba: `api/src/app.dbtest.ts`

**Interfaces:**
- Consume: `conClinica` y `pool` (4), `derivar` (2), `verificarClave`, `sembrar`, `reiniciarDemo` y `CLAVE_DEMO` (5).
- Produce:
  - `cargarEstado(clinicaId, cirugiaId): Promise<EstadoCirugia | null>`
  - `cirugiasActivas(clinicaId): Promise<CirugiaActiva[]>`
  - `insertarEventos(clinicaId, cirugiaId, eventos: NuevoEvento[]): Promise<void>`
  - `personal(clinicaId): Promise<{ id: string; nombre: string; rol: Rol }[]>`
  - `COOKIE`, `leerSesion(req): Sesion | null`, `login(slug, usuario, clave): Promise<Sesion | null>`
  - `crearApp(): Promise<FastifyInstance>`
  - Rutas: `POST /api/login`, `POST /api/logout`, `GET /api/salud`, `GET /api/yo`, `GET /api/cirugias`, `GET /api/cirugias/:id`, `GET /api/personal`, `POST /api/demo/reiniciar`.

- [ ] **Paso 1: Instalar Fastify**

Run: `cd api && npm install fastify @fastify/cookie`

- [ ] **Paso 2: Escribir la prueba**

`api/src/app.dbtest.ts`:

```ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from './app.ts';
import { COOKIE } from './auth.ts';
import { migrar, pool } from './db.ts';
import { CLAVE_DEMO, sembrar } from './siembra.ts';
import type { CirugiaActiva, EstadoCirugia } from './tipos.ts';

const app = await crearApp();
before(async () => { await migrar(); await sembrar(); });
after(async () => { await app.close(); await pool.end(); });

async function entrar(clinica: string, usuario: string): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { clinica, usuario, clave: CLAVE_DEMO } });
  assert.equal(r.statusCode, 200);
  return r.cookies.find(c => c.name === COOKIE)!.value;
}

async function demo(cookie: string): Promise<CirugiaActiva> {
  const r = await app.inject({ url: '/api/cirugias', cookies: { [COOKIE]: cookie } });
  return (r.json() as CirugiaActiva[]).find(x => x.procedimiento === 'Revascularización miocárdica')!;
}

test('sin sesión no hay datos y con clave equivocada no entra', async () => {
  assert.equal((await app.inject({ url: '/api/cirugias' })).statusCode, 401);
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { clinica: 'caribe', usuario: 'circulante', clave: 'mala' } });
  assert.equal(r.statusCode, 401);
});

test('la cirugía de la demo trae alertas de datos faltantes y de alergia', async () => {
  const cookie = await entrar('caribe', 'circulante');
  const c = await demo(cookie);
  const estado = (await app.inject({ url: `/api/cirugias/${c.id}`, cookies: { [COOKIE]: cookie } })).json() as EstadoCirugia;
  const abiertas = estado.alertas.filter(a => a.estado === 'abierta').map(a => a.id);
  assert.ok(abiertas.includes('dato:glucometria'));
  assert.ok(abiertas.includes('dato:reserva_sangre'));
});

test('una clínica no puede abrir las cirugías de otra', async () => {
  const c = await demo(await entrar('caribe', 'circulante'));
  const norte = await entrar('norte', 'circulante');
  assert.equal((await app.inject({ url: `/api/cirugias/${c.id}`, cookies: { [COOKIE]: norte } })).statusCode, 404);
});

test('solo coordinación puede reiniciar la demo', async () => {
  const circulante = await entrar('caribe', 'circulante');
  assert.equal((await app.inject({ method: 'POST', url: '/api/demo/reiniciar', payload: {}, cookies: { [COOKIE]: circulante } })).statusCode, 403);
});
```

- [ ] **Paso 3: Correr la prueba y verificar que falla**

Run: `cd api && npm run test:db`
Expected: FAIL con `Cannot find module` sobre `app.ts`.

- [ ] **Paso 4: Implementar `repo.ts`**

`api/src/repo.ts`:

```ts
import { conClinica } from './db.ts';
import { derivar } from './estado.ts';
import type { Cirugia, CirugiaActiva, EstadoCirugia, NuevoEvento, Protocolo, Rol } from './tipos.ts';

const SQL_CIRUGIA = `
  SELECT c.id, q.nombre AS quirofano, c.fecha_programada, c.procedimiento, c.diagnostico, c.lateralidad,
         c.equipo_programado, c.datos_preop, p.definicion AS protocolo,
         json_build_object('nombre', pa.nombre, 'tipo_doc', pa.tipo_doc, 'num_doc', pa.num_doc,
           'edad', date_part('year', age(pa.fecha_nacimiento))::int, 'eps', pa.eps, 'hc', pa.hc) AS paciente
  FROM cirugia c
  JOIN quirofano q ON q.id = c.quirofano_id
  JOIN paciente pa ON pa.id = c.paciente_id
  JOIN protocolo p ON p.id = c.protocolo_id`;

const SQL_EVENTOS = `
  SELECT id, cirugia_id, ts, datos, registrado_por, rol_confirma, origen, texto, confianza
  FROM evento WHERE cirugia_id = ANY($1) ORDER BY ts, id`;

function separar(fila: Record<string, unknown>): { cirugia: Cirugia; protocolo: Protocolo } {
  const { protocolo, ...cirugia } = fila;
  return { cirugia: cirugia as unknown as Cirugia, protocolo: protocolo as Protocolo };
}

export async function cargarEstado(clinicaId: string, cirugiaId: string): Promise<EstadoCirugia | null> {
  return conClinica(clinicaId, async c => {
    const { rows: [fila] } = await c.query(`${SQL_CIRUGIA} WHERE c.id = $1`, [cirugiaId]);
    if (!fila) return null;
    const { cirugia, protocolo } = separar(fila);
    const { rows } = await c.query(SQL_EVENTOS, [[cirugiaId]]);
    return derivar(cirugia, protocolo, rows);
  });
}

export async function cirugiasActivas(clinicaId: string): Promise<CirugiaActiva[]> {
  return conClinica(clinicaId, async c => (await c.query(`
    SELECT c.id, q.nombre AS quirofano, c.fecha_programada, pa.nombre AS paciente, c.procedimiento,
           p.definicion->>'especialidad' AS especialidad,
           EXISTS (SELECT 1 FROM evento e WHERE e.cirugia_id = c.id AND e.tipo = 'hora') AS en_curso
    FROM cirugia c
    JOIN quirofano q ON q.id = c.quirofano_id
    JOIN paciente pa ON pa.id = c.paciente_id
    JOIN protocolo p ON p.id = c.protocolo_id
    WHERE NOT c.archivada AND NOT EXISTS (
      SELECT 1 FROM evento e WHERE e.cirugia_id = c.id AND e.tipo = 'hora' AND e.datos->>'hora' = 'salida_recuperacion')
    ORDER BY c.fecha_programada`)).rows);
}

export async function insertarEventos(clinicaId: string, cirugiaId: string, eventos: NuevoEvento[]): Promise<void> {
  await conClinica(clinicaId, async c => {
    for (const e of eventos) {
      await c.query(`INSERT INTO evento (clinica_id, cirugia_id, tipo, datos, registrado_por, rol_confirma, origen, texto, confianza, anula_evento_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [clinicaId, cirugiaId, e.datos.tipo, e.datos, e.registrado_por, e.rol_confirma, e.origen, e.texto, e.confianza,
          e.datos.tipo === 'anulacion' ? e.datos.evento_id : null]);
    }
  });
}

export async function personal(clinicaId: string): Promise<{ id: string; nombre: string; rol: Rol }[]> {
  return conClinica(clinicaId, async c => (await c.query('SELECT id, nombre, rol FROM usuario ORDER BY rol, nombre')).rows);
}
```

- [ ] **Paso 5: Implementar `auth.ts`**

`api/src/auth.ts`:

```ts
import type { FastifyRequest } from 'fastify';
import { conClinica, pool } from './db.ts';
import { verificarClave } from './clave.ts';
import type { Sesion } from './tipos.ts';

export const COOKIE = 'hb_sesion';

export function leerSesion(req: FastifyRequest): Sesion | null {
  const crudo = req.cookies[COOKIE];
  if (!crudo) return null;
  const firmado = req.unsignCookie(crudo);
  if (!firmado.valid || !firmado.value) return null;
  try {
    return JSON.parse(firmado.value) as Sesion;
  } catch {
    return null;
  }
}

export async function login(slug: string, usuario: string, clave: string): Promise<Sesion | null> {
  // `clinica` no tiene datos sensibles ni RLS: se consulta sin clínica fijada para saber a cuál fijar.
  const { rows: [clinica] } = await pool.query('SELECT id FROM clinica WHERE slug = $1', [slug]);
  if (!clinica) return null;
  const u = await conClinica(clinica.id, async c =>
    (await c.query('SELECT id, nombre, rol, hash_clave FROM usuario WHERE login = $1', [usuario])).rows[0]);
  if (!u || !verificarClave(clave, u.hash_clave)) return null;
  return { usuario_id: u.id, clinica_id: clinica.id, rol: u.rol, nombre: u.nombre };
}
```

- [ ] **Paso 6: Implementar `app.ts` y `server.ts`**

`api/src/app.ts`:

```ts
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { COOKIE, leerSesion, login } from './auth.ts';
import { cargarEstado, cirugiasActivas, personal } from './repo.ts';
import { reiniciarDemo } from './siembra.ts';
import type { Sesion } from './tipos.ts';

declare module 'fastify' {
  interface FastifyRequest { sesion: Sesion }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLICAS = new Set(['/api/login', '/api/salud']);

export async function crearApp() {
  if (!process.env.SESION_SECRETO) throw new Error('Falta SESION_SECRETO');
  const app = Fastify({ logger: process.env.NODE_ENV === 'production' });
  await app.register(cookie, { secret: process.env.SESION_SECRETO });
  app.decorateRequest('sesion', null as unknown as Sesion);

  app.addHook('onRequest', async (req, rep) => {
    if (PUBLICAS.has(req.url.split('?')[0])) return;
    const sesion = leerSesion(req);
    if (!sesion) return rep.code(401).send({ error: 'Sin sesión' });
    req.sesion = sesion;
  });

  app.get('/api/salud', async () => ({ ok: true }));

  app.post('/api/login', async (req, rep) => {
    const b = req.body as Record<string, unknown> | undefined;
    if (typeof b?.clinica !== 'string' || typeof b.usuario !== 'string' || typeof b.clave !== 'string') {
      return rep.code(400).send({ error: 'Datos incompletos' });
    }
    const sesion = await login(b.clinica.trim(), b.usuario.trim(), b.clave);
    if (!sesion) return rep.code(401).send({ error: 'Clínica, usuario o clave incorrectos' });
    rep.setCookie(COOKIE, JSON.stringify(sesion), {
      signed: true, httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production',
    });
    return sesion;
  });

  app.post('/api/logout', async (_req, rep) => rep.clearCookie(COOKIE, { path: '/' }).send({ ok: true }));
  app.get('/api/yo', async req => req.sesion);
  app.get('/api/cirugias', async req => cirugiasActivas(req.sesion.clinica_id));

  app.get<{ Params: { id: string } }>('/api/cirugias/:id', async (req, rep) => {
    const estado = UUID.test(req.params.id) ? await cargarEstado(req.sesion.clinica_id, req.params.id) : null;
    return estado ?? rep.code(404).send({ error: 'Cirugía no encontrada' });
  });

  app.get('/api/personal', async req => personal(req.sesion.clinica_id));

  app.post('/api/demo/reiniciar', async (req, rep) => {
    if (req.sesion.rol !== 'coordinador' && req.sesion.rol !== 'admin') return rep.code(403).send({ error: 'Solo coordinación' });
    await reiniciarDemo();
    return { ok: true };
  });

  return app;
}
```

`api/src/server.ts`:

```ts
import { crearApp } from './app.ts';
import { migrar } from './db.ts';
import { sembrar } from './siembra.ts';

await migrar();
await sembrar();
const app = await crearApp();
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8080) });
```

- [ ] **Paso 7: README**

`README.md` ya explica cómo correr en local. No lo cambies.

- [ ] **Paso 8: Correr las pruebas y el API**

Run: `cd api && npm test && npm run test:db && npm run tipos`
Expected: todas en PASS y `tsc` sin errores.

Run: `cd api && npm run dev`, y en otra terminal `curl http://localhost:8080/api/salud`
Expected: `{"ok":true}`

- [ ] **Paso 9: Commit**

```bash
git add api/src/repo.ts api/src/auth.ts api/src/app.ts api/src/server.ts api/src/app.dbtest.ts
git commit -m "feat(api): agregar login por clínica y rutas de cirugías"
git pull --rebase && git push
```

---

### Tarea 7: Salas en vivo por WebSocket

**Archivos:**
- Crear: `api/src/sesion.ts`
- Modificar: `api/src/app.ts` (reemplazo completo), `api/src/app.dbtest.ts` (una prueba más)
- Prueba: `api/src/sesion.test.ts`

**Interfaces:**
- Consume: `cargarEstado` e `insertarEventos` (6), `vocabulario` (2), los tipos `MsgCliente`, `MsgServidor` y `Decision` (1).
- Produce:
  - `crearSalas(deps: Deps)` → `{ mensaje(c, m), audio(c, buf), salir(c) }`
  - `validarDatos(d: unknown): DatosEvento | null`
  - Interfaces `Deps`, `Cliente`, `CanalVoz` y `EventosVoz`
  - `crearApp(opciones?: Partial<OpcionesApp>)`, donde `OpcionesApp = { interpretar: Deps['interpretar']; abrirVoz: Deps['abrirVoz'] }`
  - Ruta `GET /api/ws` (WebSocket)

Reglas de la sala:
- Una sala por cirugía, con todos los dispositivos conectados.
- Después de cada cambio se difunde el estado completo.
- Un solo micrófono por sala: lo tiene el último dispositivo que lo toma.
- Una confirmación pendiente vence a los 15 s.
- Deshacer anula el último evento vigente.

- [ ] **Paso 1: Instalar el plugin de WebSocket**

Run: `cd api && npm install @fastify/websocket`

- [ ] **Paso 2: Escribir la prueba de las salas**

`api/src/sesion.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as esperar } from 'node:timers/promises';
import { crearSalas, validarDatos, type Cliente, type EventosVoz } from './sesion.ts';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { CIRUGIA_ID, SESION_PRUEBA, cirugiaPrueba } from './prueba.ts';
import type { Decision, MsgServidor, NuevoEvento } from './tipos.ts';

function montar(decision: Decision = { accion: 'ignorar' }) {
  const guardados: NuevoEvento[] = [];
  const audios: Uint8Array[] = [];
  let voz: EventosVoz | null = null;
  const salas = crearSalas({
    cargarEstado: async () => derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, guardados.map((e, i) => ({
      ...e, id: `e${i}`, ts: new Date(Date.UTC(2026, 9, 1, 12, i)).toISOString(),
    }))),
    insertarEventos: async (_clinica, _cirugia, nuevos) => { guardados.push(...nuevos); },
    interpretar: async () => decision,
    abrirVoz: eventos => { voz = eventos; return { escribir: b => audios.push(b), cerrar() {} }; },
    esperaConfirmacionMs: 20,
  });
  return { salas, guardados, audios, voz: () => voz! };
}

function cliente(dispositivo: string): Cliente & { recibidos: MsgServidor[] } {
  const recibidos: MsgServidor[] = [];
  return { sesion: SESION_PRUEBA, dispositivo, recibidos, enviar: m => recibidos.push(m) };
}

const ultimoEstado = (c: { recibidos: MsgServidor[] }) =>
  c.recibidos.filter(m => m.tipo === 'estado').at(-1) as Extract<MsgServidor, { tipo: 'estado' }>;

test('un registro manual llega a todos los dispositivos de la sala', async () => {
  const { salas } = montar();
  const tv = cliente('TV');
  const tablet = cliente('Tablet');
  await salas.mensaje(tv, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'TV' });
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'registrar', datos: { tipo: 'hora', hora: 'ingreso' } });
  assert.ok(ultimoEstado(tv).estado.horas.ingreso);
});

test('rechaza registros mal formados', async () => {
  const { salas, guardados } = montar();
  const tablet = cliente('Tablet');
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'registrar', datos: { tipo: 'hora', hora: 'siesta' } as never });
  assert.equal(guardados.length, 0);
  assert.equal(tablet.recibidos.at(-1)?.tipo, 'aviso');
  assert.equal(validarDatos({ tipo: 'conteo', material: 'Gasas', cantidad: Infinity }), null);
  assert.deepEqual(validarDatos({ tipo: 'conteo', material: 'Gasas', cantidad: 5, extra: 1 }), { tipo: 'conteo', material: 'Gasas', cantidad: 5 });
});

test('solo el dueño del micrófono envía audio, y la voz registra con origen y texto', async () => {
  const { salas, guardados, audios, voz } = montar({
    accion: 'registrar', eventos: [{ tipo: 'conteo', material: 'Compresas', cantidad: 10 }], confianza: 0.93, resumen: 'Compresas +10',
  });
  const tv = cliente('TV');
  const tablet = cliente('Tablet');
  await salas.mensaje(tv, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'TV' });
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  assert.equal(ultimoEstado(tv).microfono, 'Tablet');
  salas.audio(tv, Buffer.from([1]));
  salas.audio(tablet, Buffer.from([2]));
  assert.deepEqual(audios, [Buffer.from([2])]);
  voz().onFinal('entran diez compresas');
  await esperar(5);
  assert.equal(guardados[0].origen, 'voz');
  assert.equal(guardados[0].texto, 'entran diez compresas');
  assert.equal(guardados[0].confianza, 0.93);
});

test('una confirmación pendiente se registra con sí y vence si nadie responde', async () => {
  const pedir: Decision = { accion: 'confirmar', eventos: [{ tipo: 'hito', hito: 'Heparina' }], confianza: 0.7, resumen: 'Heparina' };
  const a = montar(pedir);
  const tablet = cliente('Tablet');
  await a.salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await a.salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  a.voz().onFinal('heparina');
  await esperar(5);
  assert.equal(ultimoEstado(tablet).pendiente?.resumen, 'Heparina');
  await a.salas.mensaje(tablet, { tipo: 'confirmar', si: true });
  assert.equal(a.guardados.length, 1);

  const b = montar(pedir);
  const otra = cliente('Tablet');
  await b.salas.mensaje(otra, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await b.salas.mensaje(otra, { tipo: 'tomar_microfono' });
  b.voz().onFinal('heparina');
  await esperar(40);
  assert.equal(ultimoEstado(otra).pendiente, null);
  assert.equal(b.guardados.length, 0);
});

test('deshacer anula el último evento', async () => {
  const { salas, guardados } = montar();
  const tablet = cliente('Tablet');
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'registrar', datos: { tipo: 'hito', hito: 'Heparina' } });
  await salas.mensaje(tablet, { tipo: 'deshacer' });
  assert.deepEqual(guardados[1].datos, { tipo: 'anulacion', evento_id: 'e0' });
  assert.equal(ultimoEstado(tablet).estado.eventos.length, 0);
});

test('cuando sale el dueño, el micrófono queda libre', async () => {
  const { salas } = montar();
  const tv = cliente('TV');
  const tablet = cliente('Tablet');
  await salas.mensaje(tv, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'TV' });
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  salas.salir(tablet);
  assert.equal(ultimoEstado(tv).microfono, null);
});
```

- [ ] **Paso 3: Correr la prueba y verificar que falla**

Run: `cd api && npm test`
Expected: FAIL con `Cannot find module` sobre `sesion.ts`.

- [ ] **Paso 4: Implementar `sesion.ts`**

`api/src/sesion.ts`:

```ts
import type { CanalVoz, DatosEvento, Decision, EstadoCirugia, EventosVoz, HoraId, MsgCliente, MsgServidor, NuevoEvento, Protocolo, Rol, Sesion } from './tipos.ts';
export type { CanalVoz, EventosVoz } from './tipos.ts';
import { HORAS } from './tipos.ts';
import { vocabulario } from './protocolos.ts';

export interface Deps {
  cargarEstado(clinicaId: string, cirugiaId: string): Promise<EstadoCirugia | null>;
  insertarEventos(clinicaId: string, cirugiaId: string, eventos: NuevoEvento[]): Promise<void>;
  interpretar(frase: string, estado: EstadoCirugia, hayPendiente: boolean): Promise<Decision>;
  abrirVoz(eventos: EventosVoz, frases: string[]): CanalVoz;
  esperaConfirmacionMs?: number;
}
export interface Cliente { sesion: Sesion; dispositivo: string; enviar(m: MsgServidor): void }

interface PendienteSala { eventos: NuevoEvento[]; resumen: string; expira: number; timer: ReturnType<typeof setTimeout> }
interface Sala {
  clinicaId: string;
  cirugiaId: string;
  estado: EstadoCirugia;
  clientes: Set<Cliente>;
  microfono: Cliente | null;
  voz: CanalVoz | null;
  pendiente: PendienteSala | null;
}

// Campos obligatorios por tipo de evento. 'valor' acepta texto o número.
const FORMAS: Record<DatosEvento['tipo'], Record<string, 'string' | 'number' | 'valor'>> = {
  hora: { hora: 'string' },
  presente: { usuario_id: 'string', rol: 'string' },
  check: { fase: 'string', item: 'string', valor: 'string' },
  conteo: { material: 'string', cantidad: 'number' },
  hito: { hito: 'string' },
  medicion: { medicion: 'string', valor: 'number' },
  dato: { campo: 'string', valor: 'valor' },
  novedad: { texto: 'string' },
  novedad_atendida: { novedad_id: 'string', responsable: 'string' },
  novedad_solucionada: { novedad_id: 'string', acciones: 'string' },
  alerta_cierre: { alerta: 'string', motivo: 'string' },
  anulacion: { evento_id: 'string' },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida datos que llegan del navegador: tipo conocido, campos con el tipo correcto, sin campos extra. */
export function validarDatos(d: unknown): DatosEvento | null {
  if (typeof d !== 'object' || d === null) return null;
  const o = d as Record<string, unknown>;
  const forma = FORMAS[o.tipo as DatosEvento['tipo']];
  if (!forma) return null;
  const limpio: Record<string, unknown> = { tipo: o.tipo };
  for (const [campo, tipo] of Object.entries(forma)) {
    const v = o[campo];
    const tipoOk = tipo === 'valor' ? typeof v === 'string' || typeof v === 'number' : typeof v === tipo;
    if (!tipoOk) return null;
    if (typeof v === 'string' && (v.trim() === '' || v.length > 500)) return null;
    if (typeof v === 'number' && !Number.isFinite(v)) return null;
    limpio[campo] = v;
  }
  if (o.tipo === 'hora' && !HORAS.includes(o.hora as HoraId)) return null;
  if (o.tipo === 'check' && !['si', 'no', 'na'].includes(o.valor as string)) return null;
  return limpio as DatosEvento;
}

function rolQueConfirma(p: Protocolo, d: DatosEvento): Rol | null {
  if (d.tipo !== 'check') return null;
  return p.fases.find(f => f.id === d.fase)?.items.find(i => i.id === d.item)?.rol ?? null;
}

export function crearSalas(deps: Deps) {
  const salas = new Map<string, Sala>();
  const salaDe = new Map<Cliente, Sala>();
  const espera = deps.esperaConfirmacionMs ?? 15_000;

  const difundir = (s: Sala, m: MsgServidor) => { for (const c of s.clientes) c.enviar(m); };
  const difundirEstado = (s: Sala) => difundir(s, {
    tipo: 'estado', estado: s.estado, microfono: s.microfono?.dispositivo ?? null,
    pendiente: s.pendiente && { resumen: s.pendiente.resumen, expira: s.pendiente.expira },
  });
  const nuevo = (s: Sala, c: Cliente, datos: DatosEvento, origen: 'voz' | 'manual', texto: string | null = null, confianza: number | null = null): NuevoEvento =>
    ({ datos, registrado_por: c.sesion.usuario_id, rol_confirma: rolQueConfirma(s.estado.protocolo, datos), origen, texto, confianza });

  async function registrar(s: Sala, eventos: NuevoEvento[]): Promise<void> {
    if (!eventos.length) return;
    await deps.insertarEventos(s.clinicaId, s.cirugiaId, eventos);
    s.estado = (await deps.cargarEstado(s.clinicaId, s.cirugiaId)) ?? s.estado;
    difundirEstado(s);
  }

  function limpiarPendiente(s: Sala): void {
    if (s.pendiente) clearTimeout(s.pendiente.timer);
    s.pendiente = null;
  }

  async function responder(s: Sala, si: boolean): Promise<void> {
    const p = s.pendiente;
    if (!p) return;
    limpiarPendiente(s);
    if (si) await registrar(s, p.eventos);
    else difundirEstado(s);
  }

  async function deshacer(s: Sala, c: Cliente, origen: 'voz' | 'manual'): Promise<void> {
    const ultimo = s.estado.eventos.at(-1);
    if (ultimo) await registrar(s, [nuevo(s, c, { tipo: 'anulacion', evento_id: ultimo.id }, origen)]);
  }

  async function alFinal(s: Sala, frase: string): Promise<void> {
    const c = s.microfono;
    if (!c) return;
    let d: Decision;
    try {
      d = await deps.interpretar(frase, s.estado, s.pendiente !== null);
    } catch {
      difundir(s, { tipo: 'aviso', texto: `No interpretada: «${frase}». Regístrala a mano.` });
      return;
    }
    if (d.accion === 'ignorar') return;
    if (d.accion === 'responder') return responder(s, d.si);
    if (d.accion === 'deshacer') return deshacer(s, c, 'voz');
    const eventos = d.eventos.map(x => nuevo(s, c, x, 'voz', frase, d.confianza));
    if (d.accion === 'registrar') return registrar(s, eventos);
    limpiarPendiente(s);
    s.pendiente = {
      eventos, resumen: d.resumen, expira: Date.now() + espera,
      timer: setTimeout(() => { s.pendiente = null; difundirEstado(s); }, espera),
    };
    difundirEstado(s);
  }

  function soltarMicrofono(s: Sala): void {
    s.voz?.cerrar();
    s.voz = null;
    s.microfono = null;
  }

  function tomarMicrofono(s: Sala, c: Cliente): void {
    soltarMicrofono(s);
    s.microfono = c;
    s.voz = deps.abrirVoz({
      onParcial: texto => difundir(s, { tipo: 'parcial', texto }),
      onFinal: texto => { alFinal(s, texto).catch(() => difundir(s, { tipo: 'aviso', texto: 'No se pudo registrar por voz' })); },
      onError: () => difundir(s, { tipo: 'aviso', texto: 'Micrófono reconectando…' }),
    }, vocabulario(s.estado.protocolo));
    difundirEstado(s);
  }

  function salir(c: Cliente): void {
    const s = salaDe.get(c);
    if (!s) return;
    salaDe.delete(c);
    s.clientes.delete(c);
    if (s.microfono === c) soltarMicrofono(s);
    if (s.clientes.size) return difundirEstado(s);
    limpiarPendiente(s);
    salas.delete(s.cirugiaId);
  }

  async function unirse(c: Cliente, cirugiaId: string, dispositivo: string): Promise<boolean> {
    salir(c);
    c.dispositivo = dispositivo.trim().slice(0, 40) || 'Dispositivo';
    let s = salas.get(cirugiaId);
    if (!s) {
      const estado = await deps.cargarEstado(c.sesion.clinica_id, cirugiaId);
      if (!estado) return false;
      s = salas.get(cirugiaId) ?? { clinicaId: c.sesion.clinica_id, cirugiaId, estado, clientes: new Set(), microfono: null, voz: null, pendiente: null };
      salas.set(cirugiaId, s);
    }
    if (s.clinicaId !== c.sesion.clinica_id) return false;
    s.clientes.add(c);
    salaDe.set(c, s);
    difundirEstado(s);
    return true;
  }

  return {
    async mensaje(c: Cliente, m: MsgCliente): Promise<void> {
      if (m?.tipo === 'unirse') {
        const ok = typeof m.cirugia_id === 'string' && UUID.test(m.cirugia_id)
          && await unirse(c, m.cirugia_id, String(m.dispositivo ?? ''));
        if (!ok) c.enviar({ tipo: 'aviso', texto: 'Cirugía no encontrada' });
        return;
      }
      const s = salaDe.get(c);
      if (!s) return;
      switch (m?.tipo) {
        case 'registrar': {
          const d = validarDatos(m.datos);
          if (!d || (d.tipo === 'check' && !rolQueConfirma(s.estado.protocolo, d))) {
            c.enviar({ tipo: 'aviso', texto: 'Registro inválido' });
            return;
          }
          return registrar(s, [nuevo(s, c, d, 'manual')]);
        }
        case 'confirmar': return responder(s, m.si === true);
        case 'deshacer': return deshacer(s, c, 'manual');
        case 'tomar_microfono': return tomarMicrofono(s, c);
        case 'soltar_microfono':
          if (s.microfono === c) { soltarMicrofono(s); difundirEstado(s); }
          return;
      }
    },
    audio(c: Cliente, audio: Buffer): void {
      const s = salaDe.get(c);
      if (s?.microfono === c) s.voz?.escribir(audio);
    },
    salir,
  };
}
```

> ponytail: las salas viven en memoria de una sola instancia (Cloud Run con `max_instance_count = 1`). Para escalar, difundir con `LISTEN/NOTIFY` de Postgres.

- [ ] **Paso 5: Conectar el WebSocket en `app.ts`**

Reemplaza `api/src/app.ts` completo por:

```ts
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import { COOKIE, leerSesion, login } from './auth.ts';
import { cargarEstado, cirugiasActivas, insertarEventos, personal } from './repo.ts';
import { reiniciarDemo } from './siembra.ts';
import { crearSalas, type Cliente, type Deps } from './sesion.ts';
import type { MsgCliente, Sesion } from './tipos.ts';

declare module 'fastify' {
  interface FastifyRequest { sesion: Sesion }
}

export interface OpcionesApp { interpretar: Deps['interpretar']; abrirVoz: Deps['abrirVoz'] }

// Sin voz: lo que usan las pruebas y el arranque antes de conectar Jev y Chirp 3.
const SIN_VOZ: OpcionesApp = {
  interpretar: async () => ({ accion: 'ignorar' }),
  abrirVoz: () => ({ escribir() {}, cerrar() {} }),
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLICAS = new Set(['/api/login', '/api/salud']);

export async function crearApp(opciones: Partial<OpcionesApp> = {}) {
  if (!process.env.SESION_SECRETO) throw new Error('Falta SESION_SECRETO');
  const o = { ...SIN_VOZ, ...opciones };
  const app = Fastify({ logger: process.env.NODE_ENV === 'production' });
  await app.register(cookie, { secret: process.env.SESION_SECRETO });
  await app.register(websocket);
  app.decorateRequest('sesion', null as unknown as Sesion);

  app.addHook('onRequest', async (req, rep) => {
    if (PUBLICAS.has(req.url.split('?')[0])) return;
    const sesion = leerSesion(req);
    if (!sesion) return rep.code(401).send({ error: 'Sin sesión' });
    req.sesion = sesion;
  });

  app.get('/api/salud', async () => ({ ok: true }));

  app.post('/api/login', async (req, rep) => {
    const b = req.body as Record<string, unknown> | undefined;
    if (typeof b?.clinica !== 'string' || typeof b.usuario !== 'string' || typeof b.clave !== 'string') {
      return rep.code(400).send({ error: 'Datos incompletos' });
    }
    const sesion = await login(b.clinica.trim(), b.usuario.trim(), b.clave);
    if (!sesion) return rep.code(401).send({ error: 'Clínica, usuario o clave incorrectos' });
    rep.setCookie(COOKIE, JSON.stringify(sesion), {
      signed: true, httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production',
    });
    return sesion;
  });

  app.post('/api/logout', async (_req, rep) => rep.clearCookie(COOKIE, { path: '/' }).send({ ok: true }));
  app.get('/api/yo', async req => req.sesion);
  app.get('/api/cirugias', async req => cirugiasActivas(req.sesion.clinica_id));

  app.get<{ Params: { id: string } }>('/api/cirugias/:id', async (req, rep) => {
    const estado = UUID.test(req.params.id) ? await cargarEstado(req.sesion.clinica_id, req.params.id) : null;
    return estado ?? rep.code(404).send({ error: 'Cirugía no encontrada' });
  });

  app.get('/api/personal', async req => personal(req.sesion.clinica_id));

  app.post('/api/demo/reiniciar', async (req, rep) => {
    if (req.sesion.rol !== 'coordinador' && req.sesion.rol !== 'admin') return rep.code(403).send({ error: 'Solo coordinación' });
    await reiniciarDemo();
    return { ok: true };
  });

  const salas = crearSalas({ cargarEstado, insertarEventos, interpretar: o.interpretar, abrirVoz: o.abrirVoz });

  app.get('/api/ws', { websocket: true }, (socket, req) => {
    const cliente: Cliente = {
      sesion: req.sesion,
      dispositivo: 'Dispositivo',
      enviar: m => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(m)); },
    };
    socket.on('message', (datos, binario) => {
      if (binario) return salas.audio(cliente, datos as Buffer);
      let m: MsgCliente;
      try { m = JSON.parse(String(datos)); } catch { return; }
      salas.mensaje(cliente, m).catch(e => {
        req.log.error(e);
        cliente.enviar({ tipo: 'aviso', texto: 'No se pudo registrar' });
      });
    });
    socket.on('close', () => salas.salir(cliente));
  });

  return app;
}
```

- [ ] **Paso 6: Probar el WebSocket con la base real**

Agrega al final de `api/src/app.dbtest.ts`:

```ts
test('el WebSocket entrega el estado al unirse', async () => {
  const cookie = await entrar('caribe', 'circulante');
  const c = await demo(cookie);
  const ws = await app.injectWS('/api/ws', { headers: { cookie: `${COOKIE}=${encodeURIComponent(cookie)}` } });
  const primero = new Promise<{ tipo: string; estado: EstadoCirugia }>(ok => ws.once('message', d => ok(JSON.parse(String(d)))));
  ws.send(JSON.stringify({ tipo: 'unirse', cirugia_id: c.id, dispositivo: 'Prueba' }));
  const m = await primero;
  assert.equal(m.tipo, 'estado');
  assert.equal(m.estado.cirugia.id, c.id);
  ws.terminate();
});
```

- [ ] **Paso 7: Correr las pruebas**

Run: `cd api && npm test && npm run test:db && npm run tipos`
Expected: todas en PASS y `tsc` sin errores.

- [ ] **Paso 8: Commit**

```bash
git add api/src/sesion.ts api/src/sesion.test.ts api/src/app.ts api/src/app.dbtest.ts api/package.json api/package-lock.json
git commit -m "feat(api): sincronizar la sesión del quirófano por WebSocket"
git pull --rebase && git push
```

---

### Tarea 8: Intérprete con Jev y set de oro

**Archivos:**
- Crear: `api/src/jev.ts`, `api/src/preguntas.ts`, `api/src/interprete.ts`, `api/scripts/frases-oro.json`, `api/scripts/set-de-oro.ts`
- Modificar: `api/src/server.ts`, `api/package.json` (script `oro`)
- Prueba: `api/src/jev.test.ts`, `api/src/interprete.test.ts`

**Interfaces:**
- Consume: `numerosConContexto` y `primerNumero` (1), `EstadoCirugia` y `Decision` (1), `derivar` (2).
- Produce:
  - `crearJev(apiKey, modelo?): PreguntarFn`, donde `PreguntarFn = (state, questions) => Promise<Record<string, Respuesta>>`
  - `UMBRALES` y `construirPreguntas(frase, estado)`
  - `estadoParaJev(frase, estado, hayPendiente)` y `describir(datos, protocolo)`
  - `interpretar(frase, estado, hayPendiente, preguntar): Promise<Decision>`

Reparto de trabajo: **el código** saca los números de la frase, pone la hora y hace las cuentas. **Jev** solo elige entre opciones cerradas y responde todo en una llamada, con el patrón *speculative fan-out* de TypeSafe.

- [ ] **Paso 1: Escribir las pruebas**

`api/src/jev.test.ts`:

```ts
import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { crearJev } from './jev.ts';

test('envía la clave y el modelo, y reintenta una vez si el servicio está saturado', async () => {
  const respuestas = [
    new Response('saturado', { status: 529 }),
    Response.json({ answers: { dirigida: { type: 'noul', noul: 0.9 } } }),
  ];
  const fetch = mock.method(globalThis, 'fetch', async () => respuestas.shift()!);
  const r = await crearJev('clave')({ frase: 'hola' }, { dirigida: { type: 'noul', instructions: '¿?' } });
  assert.deepEqual(r, { dirigida: { type: 'noul', noul: 0.9 } });
  assert.equal(fetch.mock.callCount(), 2);
  const [url, init] = fetch.mock.calls[0].arguments as [string, RequestInit];
  assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal((init.headers as Record<string, string>).authorization, 'Bearer clave');
  assert.equal(JSON.parse(init.body as string).model, 'jev-latest');
  fetch.mock.restore();
});

test('falla con el detalle si la clave es inválida', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => new Response('no autorizado', { status: 401 }));
  await assert.rejects(crearJev('mala')({}, {}), /Jev 401/);
  assert.equal(fetch.mock.callCount(), 1);
  fetch.mock.restore();
});
```

`api/src/interprete.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretar } from './interprete.ts';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { cirugiaPrueba, ev } from './prueba.ts';
import type { PreguntarFn, Respuesta } from './jev.ts';
import type { Evento } from './tipos.ts';

const jev = (r: Record<string, Respuesta>): PreguntarFn => async () => r;
const estado = (eventos: Evento[] = []) => derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, eventos);
const noul = (p: number): Respuesta => ({ type: 'noul', noul: p });
const choice = (c: string, confidence: number): Respuesta => ({ type: 'choice', choice: c, confidence });

test('conteo: el código saca el número y Jev elige el material', async () => {
  const d = await interpretar('entran diez compresas', estado(), false, jev({
    dirigida: noul(0.97), intencion: choice('conteo', 0.95), movimiento: choice('entra', 0.99), material_0: choice('o0', 0.93),
  }));
  assert.deepEqual(d, {
    accion: 'registrar', eventos: [{ tipo: 'conteo', material: 'Compresas', cantidad: 10 }], confianza: 0.93, resumen: 'Compresas +10',
  });
});

test('la conversación del equipo se ignora', async () => {
  const d = await interpretar('¿alguien vio mi celular?', estado(), false, jev({ dirigida: noul(0.1), intencion: choice('nada', 0.9) }));
  assert.deepEqual(d, { accion: 'ignorar' });
});

test('con confianza media pide confirmación', async () => {
  const d = await interpretar('salen nueve compresas', estado(), false, jev({
    dirigida: noul(0.9), intencion: choice('conteo', 0.72), movimiento: choice('sale', 0.95), material_0: choice('o0', 0.9),
  }));
  assert.equal(d.accion, 'confirmar');
  assert.deepEqual(d.accion === 'confirmar' && d.eventos, [{ tipo: 'conteo', material: 'Compresas', cantidad: -9 }]);
});

test('una frase confirma varios ítems de la fase actual', async () => {
  const d = await interpretar('confirmo identidad, procedimiento y sitio', estado([ev({ tipo: 'hora', hora: 'ingreso' }, 0)]), false, jev({
    dirigida: noul(0.95), intencion: choice('check', 0.92), valor_check: choice('si', 0.95),
    item_identidad: noul(0.9), item_procedimiento: noul(0.88), item_sitio: noul(0.91), item_alergias: noul(0.1),
  }));
  assert.equal(d.accion, 'registrar');
  assert.deepEqual(d.accion === 'registrar' && d.eventos.map(e => e.tipo === 'check' && e.item), ['identidad', 'procedimiento', 'sitio']);
});

test('«sí» responde a la confirmación pendiente y se ignora si no hay ninguna', async () => {
  const r = { dirigida: noul(0.9), intencion: choice('si', 0.95) };
  assert.deepEqual(await interpretar('sí, confirmo', estado(), true, jev(r)), { accion: 'responder', si: true });
  assert.deepEqual(await interpretar('sí, confirmo', estado(), false, jev(r)), { accion: 'ignorar' });
});

test('una medición toma el valor de la frase', async () => {
  const d = await interpretar('glucometría ciento dos', estado(), false, jev({
    dirigida: noul(0.95), intencion: choice('medicion', 0.93), medicion: choice('o0', 0.9),
  }));
  assert.deepEqual(d.accion === 'registrar' && d.eventos, [{ tipo: 'medicion', medicion: 'glucometria', valor: 102 }]);
});
```

- [ ] **Paso 2: Correr las pruebas y verificar que fallan**

Run: `cd api && npm test`
Expected: FAIL con `Cannot find module` sobre `jev.ts` e `interprete.ts`.

- [ ] **Paso 3: Implementar el cliente de Jev**

`api/src/jev.ts`:

```ts
export type Pregunta =
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'noul'; instructions: string };
export type Respuesta =
  | { type: 'choice'; choice: string; confidence: number }
  | { type: 'noul'; noul: number };
export type PreguntarFn = (state: unknown, questions: Record<string, Pregunta>) => Promise<Record<string, Respuesta>>;

const URL_JEV = 'https://api.typesafe.ai/v1/systemone';

/** Una llamada a Jev con 2 s de límite y un reintento ante saturación, error del servidor o timeout. */
export function crearJev(apiKey: string, modelo = 'jev-latest'): PreguntarFn {
  return async (state, questions) => {
    for (let intento = 0; ; intento++) {
      try {
        const r = await fetch(URL_JEV, {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: modelo, state, questions }),
          signal: AbortSignal.timeout(2000),
        });
        if (r.ok) return ((await r.json()) as { answers: Record<string, Respuesta> }).answers;
        const reintentable = r.status === 429 || r.status >= 500;
        if (!reintentable || intento > 0) throw new Error(`Jev ${r.status}: ${await r.text()}`);
      } catch (e) {
        if (intento > 0 || (e as Error).message.startsWith('Jev ')) throw e;
      }
    }
  };
}
```

- [ ] **Paso 4: Escribir las preguntas y los umbrales**

`api/src/preguntas.ts` (el único lugar donde se ajustan; ver el set de oro del Paso 7):

```ts
import type { DatosEvento, EstadoCirugia, HoraId, Protocolo } from './tipos.ts';
import type { Pregunta } from './jev.ts';
import { numerosConContexto } from './numeros.ts';

/** Valores iniciales; se calibran con `npm run oro`. */
export const UMBRALES = { dirigida: 0.5, minimo: 0.6, automatico: 0.85, item: 0.7 } as const;

export const INTENCIONES = {
  hora: 'Anuncia un momento del procedimiento: paciente en sala, inicio de anestesia, inicio o fin de cirugía, salida a recuperación',
  check: 'Confirma o niega ítems de la lista de verificación de seguridad (identidad, procedimiento, sitio, alergias, antibiótico, recuentos)',
  conteo: 'Material que entra al campo o sale del campo: compresas, gasas, agujas, hojas de bisturí y similares',
  hito: 'Anuncia un hito de la cirugía, como heparina, entrada o salida de bomba, clamp o cardioplejía',
  medicion: 'Reporta una medición con su valor, como glucometría o diuresis',
  dato: 'Reporta un dato del paciente con su valor, como peso o talla',
  novedad: 'Reporta una novedad, problema o incidente que hay que dejar registrado',
  novedad_atendida: 'Dice que alguien está atendiendo la novedad abierta',
  novedad_solucionada: 'Dice que la novedad abierta quedó solucionada y qué se hizo',
  cerrar_alerta: 'Da el motivo para cerrar una alerta que no se va a resolver',
  si: 'Acepta o confirma lo que el tablero acaba de preguntar',
  no: 'Rechaza lo que el tablero acaba de preguntar',
  deshacer: 'Pide anular o deshacer el último registro',
  nada: 'Conversación del equipo que no pide registrar nada',
};

export const HORAS_TEXTO: Record<HoraId, string> = {
  ingreso: 'El paciente ingresa a la sala',
  anestesia: 'Inicia la anestesia',
  inicio_cirugia: 'Inicia la cirugía o la incisión',
  fin_cirugia: 'Termina la cirugía',
  salida_recuperacion: 'El paciente sale a recuperación',
};

/** Opciones con claves o0, o1… (el índice en la lista) más «ninguno». */
const opciones = (textos: string[]): Record<string, string> =>
  Object.fromEntries([...textos.map((t, i) => [`o${i}`, t]), ['ninguno', 'Ninguna de las anteriores']]);

export function construirPreguntas(frase: string, s: EstadoCirugia): Record<string, Pregunta> {
  const p = s.protocolo;
  const q: Record<string, Pregunta> = {
    dirigida: {
      type: 'noul',
      instructions: 'En un quirófano, ¿esta frase le dicta un registro al tablero quirúrgico (un momento, una verificación, un conteo, una medición, una novedad o una respuesta sí/no al tablero) en lugar de ser conversación del equipo?',
    },
    intencion: { type: 'choice', instructions: '¿Qué pide registrar esta frase dictada en el quirófano?', criteria: INTENCIONES },
    hora: { type: 'choice', instructions: '¿Qué momento del procedimiento anuncia la frase?', criteria: { ...HORAS_TEXTO, ninguno: 'Ninguno' } },
    movimiento: {
      type: 'choice', instructions: '¿El material entra al campo o sale del campo?',
      criteria: { entra: 'Entra, se abre, se agrega o se pasa al campo', sale: 'Sale, se retira, se cuenta de regreso o se descarta' },
    },
    valor_check: {
      type: 'choice', instructions: '¿La frase confirma, niega o dice que no aplica?',
      criteria: { si: 'Confirma, verificado, correcto', no: 'No coincide, está mal o falta', na: 'No aplica' },
    },
    hito: { type: 'choice', instructions: '¿Qué hito de la cirugía anuncia la frase?', criteria: opciones(p.hitos) },
    medicion: { type: 'choice', instructions: '¿Qué medición reporta la frase?', criteria: opciones(p.mediciones.map(m => m.etiqueta)) },
    campo: {
      type: 'choice', instructions: '¿Qué dato del paciente reporta la frase?',
      criteria: opciones(p.campos_preop.filter(c => c.tipo === 'numero').map(c => c.etiqueta)),
    },
  };
  const fase = p.fases.find(f => f.id === s.fase_actual);
  for (const item of fase?.items ?? []) {
    q[`item_${item.id}`] = { type: 'noul', instructions: `¿La frase verifica o se pronuncia sobre «${item.texto}»?` };
  }
  numerosConContexto(frase).forEach((n, i) => {
    q[`material_${i}`] = { type: 'choice', instructions: `En el fragmento «${n.span}», ¿qué material quirúrgico se nombra?`, criteria: opciones(p.materiales) };
  });
  const abiertas = s.alertas.filter(a => a.estado === 'abierta');
  if (abiertas.length) {
    q.alerta = { type: 'choice', instructions: '¿A qué alerta se refiere el motivo?', criteria: opciones(abiertas.map(a => a.mensaje)) };
  }
  return q;
}

/** Estado mínimo para Jev: el contexto irrelevante le resta precisión. */
export function estadoParaJev(frase: string, s: EstadoCirugia, hayPendiente: boolean) {
  return {
    frase,
    fase_actual: s.protocolo.fases.find(f => f.id === s.fase_actual)?.nombre ?? 'ninguna',
    ultimos_registros: s.eventos.slice(-3).map(e => describir(e.datos, s.protocolo)),
    el_tablero_pregunto_algo: hayPendiente ? 'sí' : 'no',
  };
}

export function describir(d: DatosEvento, p: Protocolo): string {
  switch (d.tipo) {
    case 'hora': return HORAS_TEXTO[d.hora];
    case 'presente': return 'Integrante presente';
    case 'check': {
      const item = p.fases.flatMap(f => f.items).find(i => i.id === d.item);
      return `${item?.texto ?? d.item}: ${d.valor === 'si' ? 'sí' : d.valor === 'no' ? 'no coincide' : 'no aplica'}`;
    }
    case 'conteo': return `${d.material} ${d.cantidad > 0 ? '+' : ''}${d.cantidad}`;
    case 'hito': return d.hito;
    case 'medicion': return `${p.mediciones.find(m => m.id === d.medicion)?.etiqueta ?? d.medicion} ${d.valor}`;
    case 'dato': return `${p.campos_preop.find(c => c.id === d.campo)?.etiqueta ?? d.campo} ${d.valor}`;
    case 'novedad': return `Novedad: ${d.texto}`;
    case 'novedad_atendida': return 'Novedad atendida';
    case 'novedad_solucionada': return 'Novedad solucionada';
    case 'alerta_cierre': return `Alerta cerrada: ${d.motivo}`;
    case 'anulacion': return 'Anulación';
  }
}
```

- [ ] **Paso 5: Implementar el intérprete**

`api/src/interprete.ts`:

```ts
import type { DatosEvento, Decision, EstadoCirugia, HoraId } from './tipos.ts';
import type { PreguntarFn } from './jev.ts';
import { UMBRALES, construirPreguntas, describir, estadoParaJev } from './preguntas.ts';
import { numerosConContexto, primerNumero } from './numeros.ts';

export async function interpretar(frase: string, s: EstadoCirugia, hayPendiente: boolean, preguntar: PreguntarFn): Promise<Decision> {
  const r = await preguntar(estadoParaJev(frase, s, hayPendiente), construirPreguntas(frase, s));
  const noul = (k: string) => { const x = r[k]; return x?.type === 'noul' ? x.noul : 0; };
  const elegir = (k: string) => { const x = r[k]; return x?.type === 'choice' ? x : undefined; };

  if (noul('dirigida') < UMBRALES.dirigida) return { accion: 'ignorar' };
  const intencion = elegir('intencion');
  if (!intencion || intencion.confidence < UMBRALES.minimo) return { accion: 'ignorar' };

  const confianzas = [intencion.confidence];
  /** Traduce la opción «oN» al elemento N de `lista`, y anota su confianza. */
  const opcion = (k: string, lista: string[]): string | null => {
    const c = elegir(k);
    if (!c || c.choice === 'ninguno') return null;
    confianzas.push(c.confidence);
    return lista[Number(c.choice.slice(1))] ?? null;
  };

  const p = s.protocolo;
  const eventos: DatosEvento[] = [];
  switch (intencion.choice) {
    case 'si':
    case 'no':
      return hayPendiente ? { accion: 'responder', si: intencion.choice === 'si' } : { accion: 'ignorar' };
    case 'deshacer':
      return { accion: 'deshacer' };
    case 'hora': {
      const h = elegir('hora');
      if (h && h.choice !== 'ninguno') { confianzas.push(h.confidence); eventos.push({ tipo: 'hora', hora: h.choice as HoraId }); }
      break;
    }
    case 'check': {
      const fase = p.fases.find(f => f.id === s.fase_actual);
      const valor = elegir('valor_check');
      if (valor) confianzas.push(valor.confidence);
      for (const item of fase?.items ?? []) {
        if (noul(`item_${item.id}`) >= UMBRALES.item) {
          eventos.push({ tipo: 'check', fase: fase!.id, item: item.id, valor: (valor?.choice ?? 'si') as 'si' | 'no' | 'na' });
        }
      }
      break;
    }
    case 'conteo': {
      const mov = elegir('movimiento');
      if (mov) confianzas.push(mov.confidence);
      const signo = mov?.choice === 'sale' ? -1 : 1;
      numerosConContexto(frase).forEach((n, i) => {
        const material = opcion(`material_${i}`, p.materiales);
        if (material) eventos.push({ tipo: 'conteo', material, cantidad: signo * n.valor });
      });
      break;
    }
    case 'hito': {
      const hito = opcion('hito', p.hitos);
      if (hito) eventos.push({ tipo: 'hito', hito });
      break;
    }
    case 'medicion': {
      const medicion = opcion('medicion', p.mediciones.map(m => m.id));
      const valor = primerNumero(frase);
      if (medicion && valor !== null) eventos.push({ tipo: 'medicion', medicion, valor });
      break;
    }
    case 'dato': {
      const campo = opcion('campo', p.campos_preop.filter(c => c.tipo === 'numero').map(c => c.id));
      const valor = primerNumero(frase);
      if (campo && valor !== null) eventos.push({ tipo: 'dato', campo, valor });
      break;
    }
    case 'novedad':
      eventos.push({ tipo: 'novedad', texto: frase });
      break;
    case 'novedad_atendida':
    case 'novedad_solucionada': {
      const n = s.novedades.findLast(x => x.estado !== 'solucionada');
      if (!n) break;
      eventos.push(intencion.choice === 'novedad_atendida'
        ? { tipo: 'novedad_atendida', novedad_id: n.id, responsable: frase }
        : { tipo: 'novedad_solucionada', novedad_id: n.id, acciones: frase });
      break;
    }
    case 'cerrar_alerta': {
      const alerta = opcion('alerta', s.alertas.filter(a => a.estado === 'abierta').map(a => a.id));
      if (alerta) eventos.push({ tipo: 'alerta_cierre', alerta, motivo: frase });
      break;
    }
  }

  if (!eventos.length) return { accion: 'ignorar' };
  const confianza = Math.min(...confianzas);
  if (confianza < UMBRALES.minimo) return { accion: 'ignorar' };
  return {
    accion: confianza >= UMBRALES.automatico ? 'registrar' : 'confirmar',
    eventos, confianza, resumen: eventos.map(e => describir(e, p)).join(' · '),
  };
}
```

- [ ] **Paso 6: Correr las pruebas**

Run: `cd api && npm test && npm run tipos`
Expected: todas en PASS y `tsc` sin errores.

- [ ] **Paso 7: Set de oro para calibrar con Jev real**

`api/scripts/frases-oro.json` (punto de partida; la instrumentadora lo amplía a unas 40 frases tal como se dicen en el quirófano):

```json
[
  { "frase": "paciente en sala", "despues_de": [], "espera": "hora" },
  { "frase": "inicia anestesia", "despues_de": ["ingreso"], "espera": "hora" },
  { "frase": "confirmo identidad, procedimiento y sitio", "despues_de": ["ingreso"], "espera": "check" },
  { "frase": "cefazolina aplicada", "despues_de": ["ingreso", "anestesia"], "espera": "check" },
  { "frase": "entran diez compresas", "despues_de": ["ingreso", "anestesia", "inicio_cirugia"], "espera": "conteo" },
  { "frase": "entran diez gasas y cinco agujas de sutura", "despues_de": ["ingreso", "anestesia", "inicio_cirugia"], "espera": "conteo" },
  { "frase": "salen nueve compresas", "despues_de": ["ingreso", "anestesia", "inicio_cirugia", "fin_cirugia"], "espera": "conteo" },
  { "frase": "glucometría ciento dos", "despues_de": ["ingreso"], "espera": "medicion" },
  { "frase": "peso setenta y uno punto tres kilos", "despues_de": [], "espera": "dato" },
  { "frase": "se administra heparina", "despues_de": ["ingreso", "anestesia", "inicio_cirugia"], "espera": "hito" },
  { "frase": "entramos en bomba", "despues_de": ["ingreso", "anestesia", "inicio_cirugia"], "espera": "hito" },
  { "frase": "se dañó el aspirador", "despues_de": ["ingreso", "anestesia", "inicio_cirugia"], "espera": "novedad" },
  { "frase": "fin de la cirugía", "despues_de": ["ingreso", "anestesia", "inicio_cirugia"], "espera": "hora" },
  { "frase": "deshaz lo último", "despues_de": ["ingreso"], "espera": "deshacer" },
  { "frase": "¿alguien vio mi celular?", "despues_de": ["ingreso"], "espera": "ignorar" },
  { "frase": "pásame la pinza kelly", "despues_de": ["ingreso", "anestesia", "inicio_cirugia"], "espera": "ignorar" }
]
```

`api/scripts/set-de-oro.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { crearJev, type PreguntarFn, type Respuesta } from '../src/jev.ts';
import { interpretar } from '../src/interprete.ts';
import { derivar } from '../src/estado.ts';
import { PROTOCOLO_CARDIO } from '../src/protocolos.ts';
import { cirugiaPrueba, ev } from '../src/prueba.ts';
import type { HoraId } from '../src/tipos.ts';

interface Caso { frase: string; despues_de: HoraId[]; espera: string }
const casos: Caso[] = JSON.parse(await readFile(new URL('./frases-oro.json', import.meta.url), 'utf8'));
if (!process.env.JEV_API_KEY) throw new Error('Falta JEV_API_KEY en api/.env');

const jev = crearJev(process.env.JEV_API_KEY);
let ultimas: Record<string, Respuesta> = {};
const capturar: PreguntarFn = async (state, q) => (ultimas = await jev(state, q));
const cuenta = { bien: 0, confirma: 0, mal: 0 };

for (const c of casos) {
  const s = derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, c.despues_de.map((hora, i) => ev({ tipo: 'hora', hora }, i)));
  const t0 = performance.now();
  const d = await interpretar(c.frase, s, false, capturar);
  const ms = Math.round(performance.now() - t0);
  const obtenido = d.accion === 'registrar' || d.accion === 'confirmar' ? d.eventos[0].tipo : d.accion;
  const resultado = obtenido !== c.espera ? 'mal' : d.accion === 'confirmar' ? 'confirma' : 'bien';
  cuenta[resultado]++;
  const dirigida = ultimas.dirigida?.type === 'noul' ? ultimas.dirigida.noul.toFixed(2) : '?';
  const intencion = ultimas.intencion?.type === 'choice' ? `${ultimas.intencion.choice} ${ultimas.intencion.confidence.toFixed(2)}` : '?';
  console.log(`${resultado.padEnd(8)} ${String(ms).padStart(4)} ms  dirigida ${dirigida}  intención ${intencion.padEnd(16)} «${c.frase}» → ${obtenido} (esperado ${c.espera})`);
}
console.log(`\nBien: ${cuenta.bien} · Pide confirmación: ${cuenta.confirma} · Mal: ${cuenta.mal} · Total: ${casos.length}`);
```

En `api/package.json`, agrega a `scripts`:

```json
"oro": "node --env-file=.env scripts/set-de-oro.ts"
```

Run (con `JEV_API_KEY` en `api/.env`): `cd api && npm run oro`
Expected: una línea por frase con su latencia y sus confianzas, y el resumen al final. Con el resultado, ajusta `UMBRALES` en `preguntas.ts`: si hay frases de conversación con `dirigida` alta, sube `dirigida`; si muchas frases correctas piden confirmación, baja `automatico`. Meta para la demo: ninguna «mal» en las frases del guion.

- [ ] **Paso 8: Conectar el intérprete al servidor**

Reemplaza `api/src/server.ts` por:

```ts
import { crearApp } from './app.ts';
import { migrar } from './db.ts';
import { sembrar } from './siembra.ts';
import { crearJev } from './jev.ts';
import { interpretar } from './interprete.ts';

await migrar();
await sembrar();
const jev = crearJev(process.env.JEV_API_KEY ?? '');
const app = await crearApp({
  interpretar: (frase, estado, hayPendiente) => interpretar(frase, estado, hayPendiente, jev),
});
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8080) });
```

- [ ] **Paso 9: Commit**

```bash
git add api/src/jev.ts api/src/jev.test.ts api/src/preguntas.ts api/src/interprete.ts api/src/interprete.test.ts api/scripts api/src/server.ts api/package.json
git commit -m "feat(api): interpretar frases con Jev y agregar set de oro para calibrar"
git pull --rebase && git push
```

---

### Tarea 9: Infraestructura base en GCP

**Archivos:**
- Crear: `infra/main.tf`, `infra/variables.tf`, `infra/outputs.tf`, `infra/terraform.tfvars.example`

**Interfaces:**
- Produce:
  - el proyecto GCP con las APIs activas;
  - Cloud SQL `healthbyte-db`, con la base `healthbyte` y el usuario `healthbyte`;
  - los secretos `jev-api-key` (sin versión), `db-password` y `sesion-secreto`;
  - el repositorio de Artifact Registry `healthbyte`;
  - la cuenta de servicio `healthbyte-api`;
  - el presupuesto con alertas;
  - las salidas `proyecto`, `registro` y `conexion_sql`.
- La Tarea 16 agrega `servicios.tf` con las dos Cloud Run.

Esta tarea puede arrancar en paralelo desde la primera hora: Cloud SQL tarda unos 10 minutos en crearse.

- [ ] **Paso 1: Preparar gcloud con la cuenta personal (una sola vez)**

```bash
gcloud config configurations create healthbyte
gcloud auth login
gcloud config set account TU_CORREO_PERSONAL
gcloud billing accounts list
```

Expected: la configuración `healthbyte` activa con tu cuenta personal, y el ID de tu cuenta de facturación (formato `XXXXXX-XXXXXX-XXXXXX`). Anota también la moneda de esa cuenta: si es COP, el presupuesto va en COP.

- [ ] **Paso 2: Escribir las variables**

`infra/variables.tf`:

```hcl
variable "project_id" {
  type        = string
  description = "ID nuevo y único, por ejemplo healthbyte-hack-1001. Un ID borrado no se puede reusar durante 30 días."
}

variable "billing_account" {
  type        = string
  description = "Cuenta de facturación personal (gcloud billing accounts list)."
}

variable "cuenta_esperada" {
  type        = string
  description = "Correo de la cuenta personal. Si Terraform corre con otra cuenta, aborta."
}

variable "region" {
  type    = string
  default = "us-east1"
}

variable "tag" {
  type        = string
  default     = ""
  description = "Tag de las imágenes. Vacío: no se crean los servicios de Cloud Run."
}

variable "api_min_instancias" {
  type        = number
  default     = 0
  description = "1 el día de la demo, para evitar el arranque en frío."
}

variable "moneda_presupuesto" {
  type        = string
  default     = "USD"
  description = "Debe coincidir con la moneda de la cuenta de facturación."
}

variable "presupuesto" {
  type    = number
  default = 25
}
```

`infra/terraform.tfvars.example` (cópialo a `terraform.tfvars`, que está en `.gitignore`):

```hcl
project_id      = "healthbyte-hack-1001"
billing_account = "XXXXXX-XXXXXX-XXXXXX"
cuenta_esperada = "tu-correo-personal@gmail.com"
```

- [ ] **Paso 3: Escribir la infraestructura base**

`infra/main.tf`:

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 7.0" }
    random = { source = "hashicorp/random", version = "~> 3.7" }
    time   = { source = "hashicorp/time", version = "~> 0.12" }
  }
}

# Credenciales: GOOGLE_OAUTH_ACCESS_TOKEN de la configuración de gcloud "healthbyte" (ver README).
provider "google" {
  region = var.region
}

# Solo para el presupuesto: la API de presupuestos exige un proyecto de cuota.
provider "google" {
  alias                 = "facturacion"
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
}

locals {
  etiquetas = { proyecto = "healthbyte" }
  apis = [
    "run.googleapis.com", "sqladmin.googleapis.com", "secretmanager.googleapis.com", "artifactregistry.googleapis.com",
    "speech.googleapis.com", "cloudbuild.googleapis.com", "compute.googleapis.com", "billingbudgets.googleapis.com", "iam.googleapis.com",
  ]
}

# Guardia: aborta antes de crear nada si la sesión de Google no es la cuenta personal.
data "google_client_openid_userinfo" "yo" {}

resource "terraform_data" "guardia_cuenta" {
  input = data.google_client_openid_userinfo.yo.email
  lifecycle {
    precondition {
      condition     = data.google_client_openid_userinfo.yo.email == var.cuenta_esperada
      error_message = "La sesión de Google no es la cuenta personal. Exporta GOOGLE_OAUTH_ACCESS_TOKEN con --configuration=healthbyte."
    }
  }
}

# El proyecto completo se borra con terraform destroy: nada queda suelto.
resource "google_project" "p" {
  project_id      = var.project_id
  name            = "HealthByte Hackathon"
  billing_account = var.billing_account
  deletion_policy = "DELETE"
  labels          = local.etiquetas
  depends_on      = [terraform_data.guardia_cuenta]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  project            = google_project.p.project_id
  service            = each.value
  disable_on_destroy = false
}

# Las APIs recién activadas tardan en propagarse.
resource "time_sleep" "apis" {
  depends_on      = [google_project_service.apis]
  create_duration = "60s"
}

resource "google_artifact_registry_repository" "repo" {
  project       = google_project.p.project_id
  location      = var.region
  repository_id = "healthbyte"
  format        = "DOCKER"
  labels        = local.etiquetas
  depends_on    = [time_sleep.apis]
}

resource "google_sql_database_instance" "db" {
  project             = google_project.p.project_id
  name                = "healthbyte-db"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = false
  settings {
    edition           = "ENTERPRISE"
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_type         = "PD_HDD"
    disk_size         = 10
    disk_autoresize   = false
    user_labels       = local.etiquetas
    backup_configuration {
      enabled = false
    }
    ip_configuration {
      ipv4_enabled = true # sin redes autorizadas: Cloud Run entra por el conector de Cloud SQL
    }
  }
  depends_on = [time_sleep.apis]
}

resource "google_sql_database" "app" {
  project  = google_project.p.project_id
  instance = google_sql_database_instance.db.name
  name     = "healthbyte"
}

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "random_password" "sesion" {
  length  = 48
  special = false
}

resource "google_sql_user" "app" {
  project  = google_project.p.project_id
  instance = google_sql_database_instance.db.name
  name     = "healthbyte"
  password = random_password.db.result
}

resource "google_secret_manager_secret" "jev" {
  project   = google_project.p.project_id
  secret_id = "jev-api-key" # el valor se carga a mano con gcloud: nunca pasa por el estado de Terraform
  labels    = local.etiquetas
  replication {
    auto {}
  }
  depends_on = [time_sleep.apis]
}

resource "google_secret_manager_secret" "db" {
  project   = google_project.p.project_id
  secret_id = "db-password"
  labels    = local.etiquetas
  replication {
    auto {}
  }
  depends_on = [time_sleep.apis]
}

resource "google_secret_manager_secret_version" "db" {
  secret      = google_secret_manager_secret.db.id
  secret_data = random_password.db.result
}

resource "google_secret_manager_secret" "sesion" {
  project   = google_project.p.project_id
  secret_id = "sesion-secreto"
  labels    = local.etiquetas
  replication {
    auto {}
  }
  depends_on = [time_sleep.apis]
}

resource "google_secret_manager_secret_version" "sesion" {
  secret      = google_secret_manager_secret.sesion.id
  secret_data = random_password.sesion.result
}

resource "google_service_account" "api" {
  project      = google_project.p.project_id
  account_id   = "healthbyte-api"
  display_name = "API de HealthByte"
  depends_on   = [time_sleep.apis]
}

resource "google_project_iam_member" "api" {
  for_each = toset(["roles/cloudsql.client", "roles/speech.client", "roles/secretmanager.secretAccessor"])
  project  = google_project.p.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.api.email}"
}

resource "google_billing_budget" "tope" {
  provider        = google.facturacion
  billing_account = var.billing_account
  display_name    = "healthbyte-hackathon"
  budget_filter {
    projects = ["projects/${google_project.p.number}"]
  }
  amount {
    specified_amount {
      currency_code = var.moneda_presupuesto
      units         = tostring(var.presupuesto)
    }
  }
  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }
  depends_on = [time_sleep.apis]
}
```

`infra/outputs.tf`:

```hcl
output "proyecto" {
  value = google_project.p.project_id
}

output "registro" {
  value = "${var.region}-docker.pkg.dev/${google_project.p.project_id}/healthbyte"
}

output "conexion_sql" {
  value = google_sql_database_instance.db.connection_name
}
```

- [ ] **Paso 4: Probar la guardia de cuenta**

Bash:

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token --configuration=healthbyte)
```

PowerShell:

```powershell
$env:GOOGLE_OAUTH_ACCESS_TOKEN = gcloud auth print-access-token --configuration=healthbyte
```

El token vence en una hora: vuelve a exportarlo antes de cada `apply` o `destroy`.

Run: `cd infra && cp terraform.tfvars.example terraform.tfvars` (completa los valores) `&& terraform init && terraform validate`
Expected: `Success! The configuration is valid.`

Run: `terraform plan -var cuenta_esperada=otra@ejemplo.com`
Expected: error con «La sesión de Google no es la cuenta personal». La guardia funciona.

- [ ] **Paso 5: Crear la infraestructura base**

Run: `terraform apply`
Expected: crea unos 25 recursos en 10 a 15 minutos y muestra `proyecto`, `registro` y `conexion_sql`.

Carga la clave de Jev (debe estar en la variable de entorno `JEV_API_KEY` de tu terminal; no la pegues en el chat ni en archivos versionados):

```bash
printf '%s' "$JEV_API_KEY" | gcloud secrets versions add jev-api-key --data-file=- --project=TU_PROJECT_ID --configuration=healthbyte
```

Verifica: `gcloud sql instances list --project=TU_PROJECT_ID --configuration=healthbyte`
Expected: `healthbyte-db` con estado `RUNNABLE`.

- [ ] **Paso 6: Commit**

```bash
git add infra/main.tf infra/variables.tf infra/outputs.tf infra/terraform.tfvars.example infra/.terraform.lock.hcl
git commit -m "feat(infra): crear proyecto GCP, Cloud SQL y secretos con guardia de cuenta"
git pull --rebase && git push
```

---

### Tarea 10: Voz con Chirp 3

**Archivos:**
- Crear: `api/src/voz.ts`, `api/scripts/probar-voz.ts`
- Modificar: `api/src/server.ts`, `api/package.json` (script `probar-voz`)
- Prueba: `api/src/voz.test.ts`

**Interfaces:**
- Consume: `CanalVoz` y `EventosVoz` (de `tipos.ts`), `vocabulario` (2).
- Produce: `crearCanalVoz(o: OpcionesCanal): CanalVoz` y `configuracion(proyecto, frases)`.

El canal abre el stream con la primera voz. Lo cierra tras 8 s sin audio o cuando supera 4,5 minutos (Google limita la duración), y lo reabre con la siguiente voz. Si el stream falla, avisa y se reabre solo en la siguiente escritura.

- [ ] **Paso 1: Instalar el cliente de Speech**

Run: `cd api && npm install @google-cloud/speech`

- [ ] **Paso 2: Escribir la prueba con un stream falso**

`api/src/voz.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setTimeout as esperar } from 'node:timers/promises';
import { crearCanalVoz } from './voz.ts';

class StreamFalso extends EventEmitter {
  escritos: unknown[] = [];
  terminado = false;
  write(x: unknown) { this.escritos.push(x); }
  end() { this.terminado = true; }
}

function montar(extra: { silencioMs?: number; maxMs?: number } = {}) {
  const streams: StreamFalso[] = [];
  const parciales: string[] = [];
  const finales: string[] = [];
  const errores: Error[] = [];
  const canal = crearCanalVoz({
    proyecto: 'p', frases: ['Compresas'],
    onParcial: t => parciales.push(t), onFinal: t => finales.push(t), onError: e => errores.push(e),
    abrirStream: () => { const s = new StreamFalso(); streams.push(s); return s; },
    ...extra,
  });
  return { canal, streams, parciales, finales, errores };
}

test('abre el stream con la configuración y luego envía el audio', () => {
  const { canal, streams } = montar();
  canal.escribir(Buffer.from([1, 2]));
  assert.equal(streams.length, 1);
  const config = streams[0].escritos[0] as { recognizer: string; streamingConfig: { config: { model: string; languageCodes: string[] } } };
  assert.equal(config.recognizer, 'projects/p/locations/us/recognizers/_');
  assert.equal(config.streamingConfig.config.model, 'chirp_3');
  assert.deepEqual(config.streamingConfig.config.languageCodes, ['es-US']);
  assert.deepEqual(streams[0].escritos[1], { audio: Buffer.from([1, 2]) });
  canal.cerrar();
});

test('separa resultados parciales y finales', () => {
  const { canal, streams, parciales, finales } = montar();
  canal.escribir(Buffer.from([1]));
  streams[0].emit('data', { results: [{ alternatives: [{ transcript: 'entran diez' }], isFinal: false }] });
  streams[0].emit('data', { results: [{ alternatives: [{ transcript: 'entran diez compresas' }], isFinal: true }] });
  assert.deepEqual(parciales, ['entran diez']);
  assert.deepEqual(finales, ['entran diez compresas']);
  canal.cerrar();
});

test('cierra tras el silencio y reabre con la siguiente voz', async () => {
  const { canal, streams } = montar({ silencioMs: 10 });
  canal.escribir(Buffer.from([1]));
  await esperar(30);
  assert.ok(streams[0].terminado);
  canal.escribir(Buffer.from([2]));
  assert.equal(streams.length, 2);
  canal.cerrar();
});

test('rota el stream al superar la duración máxima', async () => {
  const { canal, streams } = montar({ maxMs: 5 });
  canal.escribir(Buffer.from([1]));
  await esperar(10);
  canal.escribir(Buffer.from([2]));
  assert.ok(streams[0].terminado);
  assert.equal(streams.length, 2);
  canal.cerrar();
});

test('si el stream falla, avisa y se reabre en la siguiente escritura', () => {
  const { canal, streams, errores } = montar();
  canal.escribir(Buffer.from([1]));
  streams[0].emit('error', new Error('corte'));
  assert.equal(errores.length, 1);
  canal.escribir(Buffer.from([2]));
  assert.equal(streams.length, 2);
  canal.cerrar();
});
```

- [ ] **Paso 3: Correr la prueba y verificar que falla**

Run: `cd api && npm test`
Expected: FAIL con `Cannot find module` sobre `voz.ts`.

- [ ] **Paso 4: Implementar `voz.ts`**

`api/src/voz.ts`:

```ts
import { v2 } from '@google-cloud/speech';
import type { CanalVoz, EventosVoz } from './tipos.ts';

interface Resultado { isFinal?: boolean; alternatives?: { transcript?: string }[] }
export interface StreamVoz {
  write(req: unknown): void;
  end(): void;
  on(evento: 'data', f: (d: { results?: Resultado[] }) => void): unknown;
  on(evento: 'error', f: (e: Error) => void): unknown;
}
export interface OpcionesCanal extends EventosVoz {
  proyecto: string;
  frases: string[];
  abrirStream?: () => StreamVoz;
  silencioMs?: number;
  maxMs?: number;
}

export function configuracion(proyecto: string, frases: string[]) {
  return {
    recognizer: `projects/${proyecto}/locations/us/recognizers/_`,
    streamingConfig: {
      config: {
        model: 'chirp_3',
        languageCodes: ['es-US'],
        explicitDecodingConfig: { encoding: 'LINEAR16', sampleRateHertz: 16000, audioChannelCount: 1 },
        features: { enableAutomaticPunctuation: true },
        adaptation: { phraseSets: [{ inlinePhraseSet: { phrases: frases.slice(0, 1000).map(value => ({ value })) } }] },
        denoiserConfig: { denoiseAudio: true },
      },
      streamingFeatures: { interimResults: true },
    },
  };
}

let cliente: InstanceType<typeof v2.SpeechClient> | undefined;
function abrirChirp(): StreamVoz {
  cliente ??= new v2.SpeechClient({ apiEndpoint: 'us-speech.googleapis.com' });
  return cliente._streamingRecognize() as unknown as StreamVoz;
}

export function crearCanalVoz(o: OpcionesCanal): CanalVoz {
  let stream: StreamVoz | null = null;
  let abiertoEn = 0;
  let silencio: ReturnType<typeof setTimeout> | undefined;

  const cerrar = () => {
    clearTimeout(silencio);
    stream?.end();
    stream = null;
  };

  function abrir(): StreamVoz {
    const s = (o.abrirStream ?? abrirChirp)();
    s.on('data', d => {
      const rs = d.results ?? [];
      const texto = (final: boolean) => rs
        .filter(r => !!r.isFinal === final)
        .map(r => r.alternatives?.[0]?.transcript ?? '')
        .join('')
        .trim();
      const final = texto(true);
      if (final) o.onFinal(final);
      const parcial = texto(false);
      if (parcial) o.onParcial(parcial);
    });
    s.on('error', e => {
      if (stream === s) stream = null;
      o.onError(e);
    });
    s.write(configuracion(o.proyecto, o.frases));
    abiertoEn = Date.now();
    return s;
  }

  return {
    escribir(audio) {
      if (stream && Date.now() - abiertoEn > (o.maxMs ?? 270_000)) cerrar();
      stream ??= abrir();
      stream.write({ audio });
      clearTimeout(silencio);
      silencio = setTimeout(cerrar, o.silencioMs ?? 8_000);
    },
    cerrar,
  };
}
```

- [ ] **Paso 5: Correr las pruebas**

Run: `cd api && npm test && npm run tipos`
Expected: todas en PASS y `tsc` sin errores.

- [ ] **Paso 6: Conectar la voz al servidor**

Reemplaza `api/src/server.ts` por:

```ts
import { crearApp } from './app.ts';
import { migrar } from './db.ts';
import { sembrar } from './siembra.ts';
import { crearJev } from './jev.ts';
import { interpretar } from './interprete.ts';
import { crearCanalVoz } from './voz.ts';

await migrar();
await sembrar();
const jev = crearJev(process.env.JEV_API_KEY ?? '');
const proyecto = process.env.GOOGLE_CLOUD_PROJECT ?? '';
const app = await crearApp({
  interpretar: (frase, estado, hayPendiente) => interpretar(frase, estado, hayPendiente, jev),
  abrirVoz: (eventos, frases) => crearCanalVoz({ ...eventos, frases, proyecto }),
});
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8080) });
```

- [ ] **Paso 7: Prueba real contra Chirp 3**

Necesita la Tarea 9 aplicada. Para correr la voz en local, el API usa las credenciales por defecto de tu máquina con la cuenta personal. En Cloud Run no hace falta: usa la cuenta de servicio.

```bash
gcloud auth application-default login --configuration=healthbyte
gcloud auth application-default set-quota-project TU_PROJECT_ID
```

Pon `GOOGLE_CLOUD_PROJECT=TU_PROJECT_ID` en `api/.env`. Si tu máquina también usa credenciales corporativas por defecto, vuelve a configurarlas al terminar.

`api/scripts/probar-voz.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';
import { crearCanalVoz } from '../src/voz.ts';
import { PROTOCOLO_CARDIO, vocabulario } from '../src/protocolos.ts';

const archivo = process.argv[2];
if (!archivo) {
  console.error('Uso: npm run probar-voz -- grabacion.wav   (WAV de 16 kHz, mono, 16 bits)');
  process.exit(1);
}
const pcm = (await readFile(archivo)).subarray(44); // salta la cabecera WAV estándar
const canal = crearCanalVoz({
  proyecto: process.env.GOOGLE_CLOUD_PROJECT ?? '',
  frases: vocabulario(PROTOCOLO_CARDIO),
  onParcial: t => console.log('…', t),
  onFinal: t => console.log('✔', t),
  onError: e => console.error('✖', e.message),
});
for (let i = 0; i < pcm.length; i += 3200) { // 100 ms de audio por bloque
  canal.escribir(pcm.subarray(i, i + 3200));
  await esperar(100);
}
await esperar(3000);
canal.cerrar();
await esperar(1000);
process.exit(0);
```

En `api/package.json`, agrega a `scripts`:

```json
"probar-voz": "node --env-file=.env scripts/probar-voz.ts"
```

Graba un WAV de 16 kHz, mono y 16 bits (en Audacity: frecuencia del proyecto 16000 Hz y exportar como «WAV PCM 16 bits con signo») diciendo: «Entran diez compresas. Se administra heparina. Salen nueve hiladillos.»

Run: `cd api && npm run probar-voz -- ../grabacion.wav`
Expected: líneas `…` con el texto parcial y `✔` con cada frase final. «Hiladillos» y «heparina» deben salir bien escritas gracias al vocabulario. Si Google rechaza un campo de la configuración, el error dice cuál: quítalo de `configuracion()` y repite.

- [ ] **Paso 8: Commit**

```bash
git add api/src/voz.ts api/src/voz.test.ts api/scripts/probar-voz.ts api/src/server.ts api/package.json api/package-lock.json
git commit -m "feat(api): transcribir la voz con Chirp 3 en streaming"
git pull --rebase && git push
```

---

### Tarea 11: Indicadores del panel

**Archivos:**
- Crear: `api/src/panel.ts`
- Modificar: `api/src/repo.ts` (agrega `cargarEstados`), `api/src/app.ts` (agrega `GET /api/panel`)
- Prueba: `api/src/panel.test.ts`

**Interfaces:**
- Consume: `derivar` (2 y 3), `flujoCompleto` (2), el tipo `Panel` (1).
- Produce: `resumir(estados: EstadoCirugia[]): Panel`, `estadoDe(s)`, `cargarEstados(clinicaId, desde): Promise<EstadoCirugia[]>` y la ruta `GET /api/panel?dias=1|7|30`.

Definiciones:
- **Cumplimiento de protocolo:** porcentaje de cirugías realizadas en las que cada fase quedó completa (sí o no aplica) antes de registrar su hora de cierre.
- **Riesgos resueltos a tiempo:** alertas que se abrieron y luego se resolvieron.
- **Alertas frecuentes:** solo las que siguen abiertas o se cerraron con motivo.

- [ ] **Paso 1: Escribir la prueba**

`api/src/panel.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumir } from './panel.ts';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { cirugiaPrueba, ev, flujoCompleto, flujoHasta } from './prueba.ts';

const P = PROTOCOLO_CARDIO;

test('resume estados, cumplimiento y tiempos', () => {
  const completa = derivar(cirugiaPrueba(), P, flujoCompleto());
  const enCurso = derivar(cirugiaPrueba(), P, flujoHasta('anestesia'));
  const programada = derivar(cirugiaPrueba(), P, []);
  const p = resumir([completa, enCurso, programada]);
  assert.deepEqual(p.cirugias, { programadas: 1, en_curso: 1, realizadas: 1 });
  assert.deepEqual(p.checklists, { completas: 1, incompletas: 0 });
  assert.equal(p.cumplimiento, 100);
  assert.equal(p.tiempos.find(t => t.etapa === 'Cirugía')?.minutos, 90);
  assert.equal(p.lista.length, 3);
});

test('una fase verificada después de su hora de cierre no cuenta como cumplida', () => {
  const tarde = flujoCompleto().map(e =>
    e.datos.tipo === 'check' && e.datos.fase === 'antes_anestesia' ? { ...e, ts: '2026-10-01T12:30:00.000Z' } : e);
  assert.equal(resumir([derivar(cirugiaPrueba(), P, tarde)]).cumplimiento, 0);
});

test('cuenta las alertas cerradas con motivo entre las frecuentes', () => {
  const s = derivar(cirugiaPrueba(), P, [
    ...flujoHasta('anestesia'),
    ev({ tipo: 'alerta_cierre', alerta: 'critico:antes_incision.antibiotico', motivo: 'Indicación médica' }, 12),
  ]);
  const p = resumir([s]);
  assert.equal(p.alertas.cerradas, 1);
  assert.equal(p.alertas.frecuentes[0].veces, 1);
});
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Run: `cd api && npm test`
Expected: FAIL con `Cannot find module` sobre `panel.ts`.

- [ ] **Paso 3: Implementar `panel.ts`**

`api/src/panel.ts`:

```ts
import type { EstadoCirugia, HoraId, Panel } from './tipos.ts';

const ETAPAS: [string, HoraId, HoraId][] = [
  ['Ingreso → anestesia', 'ingreso', 'anestesia'],
  ['Anestesia → incisión', 'anestesia', 'inicio_cirugia'],
  ['Cirugía', 'inicio_cirugia', 'fin_cirugia'],
  ['Fin → salida', 'fin_cirugia', 'salida_recuperacion'],
];

const minutos = (a?: string | null, b?: string | null) => (a && b ? (Date.parse(b) - Date.parse(a)) / 60_000 : null);
const promedio = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};
const verificado = (s: EstadoCirugia, fase: string, item: string) =>
  ['si', 'na'].includes(s.checks[`${fase}.${item}`]?.valor ?? '');

export function estadoDe(s: EstadoCirugia): Panel['lista'][number]['estado'] {
  if (s.horas.salida_recuperacion) return 'realizada';
  return Object.keys(s.horas).length ? 'en_curso' : 'programada';
}

const checklistCompleta = (s: EstadoCirugia) => s.protocolo.fases.every(f => f.items.every(i => verificado(s, f.id, i.id)));

const cumplioProtocolo = (s: EstadoCirugia) => s.protocolo.fases.every(f => {
  const cierre = s.horas[f.cierra_antes_de];
  return !!cierre && f.items.every(i => {
    const c = s.checks[`${f.id}.${i.id}`];
    return !!c && c.valor !== 'no' && c.ts <= cierre;
  });
});

export function resumir(estados: EstadoCirugia[]): Panel {
  const realizadas = estados.filter(s => estadoDe(s) === 'realizada');
  const completas = realizadas.filter(checklistCompleta).length;
  const alertas = estados.flatMap(s => s.alertas);
  const frecuentes = new Map<string, { mensaje: string; veces: number }>();
  for (const a of alertas.filter(x => x.estado !== 'resuelta')) {
    const f = frecuentes.get(a.id) ?? { mensaje: a.mensaje, veces: 0 };
    f.veces++;
    frecuentes.set(a.id, f);
  }
  const novedades = estados.flatMap(s => s.novedades);
  const nombresDuracion = [...new Set(estados.flatMap(s => s.duraciones.map(d => d.nombre)))];

  return {
    cirugias: {
      programadas: estados.filter(s => estadoDe(s) === 'programada').length,
      en_curso: estados.filter(s => estadoDe(s) === 'en_curso').length,
      realizadas: realizadas.length,
    },
    checklists: { completas, incompletas: realizadas.length - completas },
    cumplimiento: realizadas.length ? Math.round((1000 * realizadas.filter(cumplioProtocolo).length) / realizadas.length) / 10 : null,
    alertas: {
      abiertas: alertas.filter(a => a.estado === 'abierta').length,
      resueltas: alertas.filter(a => a.estado === 'resuelta').length,
      cerradas: alertas.filter(a => a.estado === 'cerrada').length,
      frecuentes: [...frecuentes.values()].sort((a, b) => b.veces - a.veces).slice(0, 5),
    },
    tiempos: ETAPAS.map(([etapa, a, b]) => ({ etapa, minutos: promedio(realizadas.map(s => minutos(s.horas[a], s.horas[b]))) })),
    novedades: {
      abiertas: novedades.filter(n => n.estado !== 'solucionada').length,
      solucionadas: novedades.filter(n => n.estado === 'solucionada').length,
      minutos_solucion: promedio(novedades.map(n => minutos(n.ts, n.solucionada_ts))),
    },
    duraciones: nombresDuracion.map(nombre => ({
      nombre, minutos: promedio(estados.map(s => s.duraciones.find(d => d.nombre === nombre)?.minutos ?? null)),
    })),
    lista: estados
      .map(s => ({
        id: s.cirugia.id, fecha: s.cirugia.fecha_programada, quirofano: s.cirugia.quirofano,
        paciente: s.cirugia.paciente.nombre, procedimiento: s.cirugia.procedimiento, estado: estadoDe(s),
        alertas_abiertas: s.alertas.filter(a => a.estado === 'abierta').length,
        alertas_cerradas: s.alertas.filter(a => a.estado === 'cerrada').length,
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  };
}
```

> ponytail: el panel deriva cada cirugía del periodo en memoria (unas 60 en un mes). Si crece a miles, guardar el resumen por cirugía al cerrarla.

- [ ] **Paso 4: Cargar las cirugías del periodo**

Agrega al final de `api/src/repo.ts`:

```ts
export async function cargarEstados(clinicaId: string, desde: string): Promise<EstadoCirugia[]> {
  return conClinica(clinicaId, async c => {
    const { rows } = await c.query(`${SQL_CIRUGIA} WHERE c.fecha_programada >= $1 AND NOT c.archivada`, [desde]);
    const { rows: eventos } = await c.query(SQL_EVENTOS, [rows.map(r => r.id)]);
    const porCirugia = Map.groupBy(eventos, (e: { cirugia_id: string }) => e.cirugia_id);
    return rows.map(fila => {
      const { cirugia, protocolo } = separar(fila);
      return derivar(cirugia, protocolo, porCirugia.get(fila.id) ?? []);
    });
  });
}
```

- [ ] **Paso 5: Exponer la ruta**

En `api/src/app.ts`, agrega los imports:

```ts
import { cargarEstados } from './repo.ts';
import { resumir } from './panel.ts';
```

Y antes de `const salas = crearSalas(...)`, agrega:

```ts
  app.get<{ Querystring: { dias?: string } }>('/api/panel', async req => {
    const dias = Math.min(90, Math.max(1, Number(req.query.dias) || 30));
    return resumir(await cargarEstados(req.sesion.clinica_id, new Date(Date.now() - dias * 86_400_000).toISOString()));
  });
```

(Puedes unir el import de `cargarEstados` con el de `./repo.ts` que ya existe.)

Agrega al final de `api/src/app.dbtest.ts`:

```ts
test('el panel resume el último mes de la clínica', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  const p = (await app.inject({ url: '/api/panel?dias=30', cookies: { [COOKIE]: cookie } })).json();
  assert.ok(p.cirugias.realizadas >= 55);
  assert.ok(p.cumplimiento > 50);
});
```

- [ ] **Paso 6: Correr las pruebas**

Run: `cd api && npm test && npm run test:db && npm run tipos`
Expected: todas en PASS y `tsc` sin errores.

- [ ] **Paso 7: Commit**

```bash
git add api/src/panel.ts api/src/panel.test.ts api/src/repo.ts api/src/app.ts api/src/app.dbtest.ts
git commit -m "feat(api): calcular indicadores del panel de gestión"
git pull --rebase && git push
```

---

### Tarea 12: Base del front, login e inicio

**Archivos:**
- Crear: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`, `web/public/favicon.svg`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/api.ts`, `web/src/estilos.css`, `web/src/etiquetas.ts`, `web/src/Logo.tsx`, `web/src/Login.tsx`, `web/src/Inicio.tsx`

**Interfaces:**
- Consume: los tipos `Sesion` y `CirugiaActiva` (1); las rutas `/api/login`, `/api/logout`, `/api/yo`, `/api/cirugias` y `/api/demo/reiniciar` (6).
- Produce: `api<T>(ruta, cuerpo?)`, `HORAS`, `ROLES`, `hora(ts)`, `describir(datos, protocolo)`, `preferencia(clave)`, `guardarPreferencia(clave, valor)`, `<Logo />`, y los estilos con los tokens de marca del [documento de diseño](../../../Diseño/HealthByte_especificaciones_diseno.md).

- [ ] **Paso 1: Crear el proyecto**

`web/package.json`:

```json
{
  "name": "healthbyte-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "tipos": "tsc",
    "test": "node --test \"src/**/*.test.ts\""
  }
}
```

Run: `cd web && npm install react react-dom && npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node`

`web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["es2023", "dom", "dom.iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`web/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://localhost:8080', ws: true } } },
});
```

`web/index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HealthByte</title>
    <link rel="icon" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`web/public/favicon.svg` (el isotipo del documento de diseño):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112">
  <g fill="#0B5D8C">
    <rect x="40" y="0" width="32" height="32" rx="7"/><rect x="0" y="40" width="32" height="32" rx="7"/>
    <rect x="40" y="40" width="32" height="32" rx="7"/><rect x="80" y="40" width="32" height="32" rx="7"/>
    <rect x="40" y="80" width="32" height="32" rx="7"/>
  </g>
  <rect x="92" y="0" width="20" height="20" rx="5" fill="#2FB596"/>
</svg>
```

- [ ] **Paso 2: Utilidades compartidas del front**

`web/src/api.ts`:

```ts
export async function api<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(ruta, cuerpo === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json();
}
```

`web/src/etiquetas.ts`:

```ts
import type { DatosEvento, HoraId, Protocolo, Rol } from '../../api/src/tipos.ts';

export const HORAS: [HoraId, string][] = [
  ['ingreso', 'Ingreso'], ['anestesia', 'Anestesia'], ['inicio_cirugia', 'Inicio cirugía'],
  ['fin_cirugia', 'Fin cirugía'], ['salida_recuperacion', 'Salida a recuperación'],
];

export const ROLES: Record<Rol, string> = {
  cirujano: 'Cirujano', anestesiologo: 'Anestesiólogo', instrumentador: 'Instrumentador',
  auxiliar_enfermeria: 'Auxiliar de enfermería', perfusionista: 'Perfusionista', coordinador: 'Coordinación', admin: 'Administración',
};

export function hora(ts?: string | null): string {
  return ts
    ? new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
    : '—';
}

export function describir(d: DatosEvento, p: Protocolo): string {
  switch (d.tipo) {
    case 'hora': return HORAS.find(([id]) => id === d.hora)?.[1] ?? d.hora;
    case 'presente': return 'Integrante presente';
    case 'check': {
      const item = p.fases.flatMap(f => f.items).find(i => i.id === d.item);
      return `${item?.texto ?? d.item}: ${d.valor === 'si' ? '✓' : d.valor === 'no' ? '✗ no coincide' : 'no aplica'}`;
    }
    case 'conteo': return `${d.material} ${d.cantidad > 0 ? '+' : ''}${d.cantidad}`;
    case 'hito': return d.hito;
    case 'medicion': {
      const m = p.mediciones.find(x => x.id === d.medicion);
      return `${m?.etiqueta ?? d.medicion}: ${d.valor} ${m?.unidad ?? ''}`;
    }
    case 'dato': {
      const c = p.campos_preop.find(x => x.id === d.campo);
      return `${c?.etiqueta ?? d.campo}: ${d.valor} ${c?.unidad ?? ''}`;
    }
    case 'novedad': return `Novedad: ${d.texto}`;
    case 'novedad_atendida': return `Novedad atendida: ${d.responsable}`;
    case 'novedad_solucionada': return `Novedad solucionada: ${d.acciones}`;
    case 'alerta_cierre': return `Alerta cerrada: ${d.motivo}`;
    case 'anulacion': return 'Anulación';
  }
}

// Preferencias del dispositivo. El almacenamiento puede no existir (modo privado): nunca debe romper la app.
export function preferencia(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}
export function guardarPreferencia(clave: string, valor: string): void {
  try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ }
}
```

`web/src/Logo.tsx`:

```tsx
export function Logo({ tamano = 32 }: { tamano?: number }) {
  return (
    <span className="logo">
      <svg width={tamano} height={tamano} viewBox="0 0 112 112" aria-hidden="true">
        {[[40, 0], [0, 40], [40, 40], [80, 40], [40, 80]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="32" height="32" rx="7" fill="var(--brand)" />
        ))}
        <rect x="92" y="0" width="20" height="20" rx="5" fill="var(--accent)" />
      </svg>
      <span className="marca">Health<b>Byte</b></span>
    </span>
  );
}
```

- [ ] **Paso 3: Estilos con los tokens de marca**

`web/src/estilos.css`:

```css
:root {
  --brand: #0B5D8C; --brand-deep: #08405F; --secondary: #0B6B5A; --accent: #2FB596;
  --ink: #0D2232; --muted: #4D6170; --steel: #B8C7D1; --surface: #F5F9FB; --tint: #E1EEF5;
  --signal: #C8372D; --blue-900: #0A2C42; --blue-300: #8FBDD8;
  --display: 'Space Grotesk', system-ui, sans-serif;
  --sans: 'IBM Plex Sans', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, monospace;
  --r-sm: 4px; --r-md: 10px;
  font: 16px/1.5 var(--sans);
  color: var(--ink);
  background: var(--surface);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--surface); }
h1, h2, h3 { font-family: var(--display); margin: 0 0 8px; }
h1 { font-size: 28px; }
h2 { font-size: 18px; }
h3 { font-size: 15px; display: flex; justify-content: space-between; gap: 8px; }
a { color: var(--brand); }
button {
  min-height: 44px; padding: 0 16px; border: 0; border-radius: var(--r-md);
  background: var(--brand); color: #fff; font: 600 15px var(--sans); cursor: pointer;
}
button:hover { background: var(--brand-deep); }
input, select {
  min-height: 44px; padding: 0 12px; border: 1px solid var(--steel); border-radius: var(--r-md); font: inherit; width: 100%;
}
.label { font: 600 13px/18px var(--sans); letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
.metric { font-family: var(--mono); }
.quien { color: var(--muted); font-size: 13px; }
.aviso { color: var(--signal); font-weight: 600; }
.cargando { padding: 32px; }
.logo { display: inline-flex; align-items: center; gap: 8px; }
.marca { font: 500 22px var(--display); }
.marca b { color: var(--brand); font-weight: 700; }

.login { min-height: 100vh; display: grid; place-content: center; gap: 24px; padding: 16px; }
.login form { display: grid; gap: 12px; width: min(360px, 100%); }
.login label { display: grid; gap: 4px; font-weight: 600; }

.inicio { max-width: 960px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
.barra { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.barra .empuje { margin-left: auto; }
.tarjeta {
  display: grid; gap: 4px; padding: 16px; background: #fff; border: 1px solid var(--steel);
  border-radius: var(--r-md); text-decoration: none; color: var(--ink);
}
.tarjeta:hover { border-color: var(--brand); }
.pill {
  justify-self: start; padding: 2px 10px; border-radius: 999px; background: var(--tint);
  color: var(--brand); font-size: 13px; font-weight: 600;
}
```

- [ ] **Paso 4: Login, inicio y enrutado**

`web/src/Login.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import type { Sesion } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { Logo } from './Logo.tsx';

export function Login({ onEntrar }: { onEntrar: (s: Sesion) => void }) {
  const [error, setError] = useState('');
  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      onEntrar(await api<Sesion>('/api/login', Object.fromEntries(new FormData(e.currentTarget))));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <main className="login">
      <Logo tamano={48} />
      <form onSubmit={entrar}>
        <label>Clínica<input name="clinica" defaultValue="caribe" required autoComplete="organization" /></label>
        <label>Usuario<input name="usuario" required autoComplete="username" /></label>
        <label>Clave<input name="clave" type="password" required autoComplete="current-password" /></label>
        {error && <p className="aviso">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
```

`web/src/Inicio.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { CirugiaActiva, Sesion } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { hora } from './etiquetas.ts';
import { Logo } from './Logo.tsx';

export function Inicio({ yo }: { yo: Sesion }) {
  const [lista, setLista] = useState<CirugiaActiva[] | null>(null);
  const cargar = () => api<CirugiaActiva[]>('/api/cirugias').then(setLista);
  useEffect(() => { void cargar(); }, []);
  const coordina = yo.rol === 'coordinador' || yo.rol === 'admin';

  async function reiniciar() {
    if (!confirm('¿Reiniciar las cirugías de demostración del día?')) return;
    await api('/api/demo/reiniciar', {});
    await cargar();
  }

  return (
    <main className="inicio">
      <header className="barra">
        <Logo />
        <span className="empuje">{yo.nombre}</span>
        {coordina && <a href="/panel">Panel de gestión</a>}
        <button onClick={() => api('/api/logout', {}).then(() => location.assign('/'))}>Salir</button>
      </header>
      <h1>Cirugías activas</h1>
      {lista === null && <p className="cargando">Cargando…</p>}
      {lista?.length === 0 && <p>No hay cirugías pendientes.</p>}
      {lista?.map(c => (
        <a key={c.id} className="tarjeta" href={`/sesion/${c.id}`}>
          <span className="label">{c.quirofano} · {hora(c.fecha_programada)} · {c.especialidad}</span>
          <strong>{c.procedimiento}</strong>
          <span>{c.paciente}</span>
          {c.en_curso && <span className="pill">En curso</span>}
        </a>
      ))}
      {coordina && <button onClick={reiniciar}>Reiniciar demo</button>}
    </main>
  );
}
```

`web/src/App.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { Sesion as SesionUsuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { Login } from './Login.tsx';
import { Inicio } from './Inicio.tsx';

export function App() {
  const [yo, setYo] = useState<SesionUsuario | null>();
  useEffect(() => { api<SesionUsuario>('/api/yo').then(setYo, () => setYo(null)); }, []);
  if (yo === undefined) return null;
  if (yo === null) return <Login onEntrar={setYo} />;
  return <Inicio yo={yo} />;
}
```

`web/src/main.tsx`:

```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './estilos.css';

createRoot(document.getElementById('raiz')!).render(<App />);
```

- [ ] **Paso 5: Verificar**

Run: `cd web && npm run tipos && npm run build`
Expected: `tsc` sin errores y `vite build` genera `dist/`.

Con el API corriendo (`cd api && npm run dev`), corre `cd web && npm run dev` y abre http://localhost:5173.
Expected: aparece el login. Con `caribe` / `circulante` y la clave de `CLAVE_DEMO` se ven las 3 cirugías del día, y la primera es la revascularización miocárdica. Con `coordinador` aparecen además «Panel de gestión» y «Reiniciar demo».

- [ ] **Paso 6: Commit**

```bash
git add web/package.json web/package-lock.json web/tsconfig.json web/vite.config.ts web/index.html web/public/favicon.svg web/src
git commit -m "feat(web): agregar login e inicio con la marca HealthByte"
git pull --rebase && git push
```

---

### Tarea 13: Vista de sesión en vivo

**Archivos:**
- Crear: `web/src/useSesion.ts`, `web/src/Sesion.tsx`, `web/src/Bloques.tsx`
- Modificar: `web/src/App.tsx` (ruta `/sesion/:id`), `web/src/estilos.css` (estilos de la sesión)

**Interfaces:**
- Consume: los tipos `MsgCliente`, `MsgServidor`, `EstadoCirugia` y `DatosEvento` (1); `GET /api/ws` (7); `HORAS`, `ROLES`, `hora`, `describir`, `preferencia` y `guardarPreferencia` (12).
- Produce: `useSesion(cirugiaId)`, que devuelve `{ estado, microfono, pendiente, parcial, aviso, dispositivo, enviar, enviarAudio }`, y el componente `<Sesion cirugiaId />`.

La misma vista sirve para la TV, la tablet y el portátil. «Modo pared» agranda la letra y oculta los controles manuales (clase `manual`) para leer a distancia. La preferencia se guarda por dispositivo.

- [ ] **Paso 1: Hook de conexión**

`web/src/useSesion.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EstadoCirugia, MsgCliente, MsgServidor, Pendiente } from '../../api/src/tipos.ts';
import { guardarPreferencia, preferencia } from './etiquetas.ts';

function nombreDispositivo(): string {
  const guardado = preferencia('hb_dispositivo');
  if (guardado) return guardado;
  const tipo = /Android|iPad|Tablet/i.test(navigator.userAgent) ? 'Tablet' : screen.width >= 1600 ? 'Pantalla' : 'Portátil';
  const nombre = `${tipo} ${Math.random().toString(36).slice(2, 6)}`;
  guardarPreferencia('hb_dispositivo', nombre);
  return nombre;
}

export function useSesion(cirugiaId: string) {
  const [estado, setEstado] = useState<EstadoCirugia | null>(null);
  const [microfono, setMicrofono] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [parcial, setParcial] = useState('');
  const [aviso, setAviso] = useState('');
  const [dispositivo] = useState(nombreDispositivo);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let activo = true;
    let intentos = 0;
    let reintento = 0;
    const conectar = () => {
      const s = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`);
      s.binaryType = 'arraybuffer';
      s.onopen = () => {
        intentos = 0;
        setAviso('');
        s.send(JSON.stringify({ tipo: 'unirse', cirugia_id: cirugiaId, dispositivo } satisfies MsgCliente));
      };
      s.onmessage = ev => {
        const m = JSON.parse(ev.data as string) as MsgServidor;
        if (m.tipo === 'estado') {
          setEstado(m.estado);
          setMicrofono(m.microfono);
          setPendiente(m.pendiente);
          setParcial('');
        } else if (m.tipo === 'parcial') setParcial(m.texto);
        else setAviso(m.texto);
      };
      s.onclose = () => {
        if (!activo) return;
        setAviso('Reconectando…');
        reintento = window.setTimeout(conectar, Math.min(10_000, 500 * 2 ** intentos++));
      };
      ws.current = s;
    };
    conectar();
    return () => {
      activo = false;
      clearTimeout(reintento);
      ws.current?.close();
    };
  }, [cirugiaId, dispositivo]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  const enviar = useCallback((m: MsgCliente) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(m));
  }, []);
  const enviarAudio = useCallback((pcm: Int16Array) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(pcm);
  }, []);

  return { estado, microfono, pendiente, parcial, aviso, dispositivo, enviar, enviarAudio };
}
```

- [ ] **Paso 2: Bloques del tablero**

`web/src/Bloques.tsx`:

```tsx
import type { DatosEvento, EstadoCirugia, Persona, Rol } from '../../api/src/tipos.ts';
import { HORAS, ROLES, describir, hora } from './etiquetas.ts';

type P = { estado: EstadoCirugia; registrar: (d: DatosEvento) => void };

/** Pide un texto con el diálogo nativo; devuelve null si se cancela o queda vacío. */
function pedir(mensaje: string, inicial = ''): string | null {
  const r = prompt(mensaje, inicial)?.trim();
  return r ? r : null;
}

export function Alertas({ estado, registrar }: P) {
  const abiertas = estado.alertas
    .filter(a => a.estado === 'abierta')
    .sort((a, b) => Number(b.severidad === 'critica') - Number(a.severidad === 'critica'));
  if (!abiertas.length) return <section className="alertas ok"><p>✓ Sin alertas abiertas</p></section>;
  return (
    <section className="alertas">
      <h2>! {abiertas.length} {abiertas.length === 1 ? 'alerta requiere' : 'alertas requieren'} atención</h2>
      <ul>
        {abiertas.map(a => (
          <li key={a.id} className={a.severidad}>
            <span>{a.severidad === 'critica' ? '!' : '•'} {a.mensaje}</span>
            <button className="manual" onClick={() => {
              const motivo = pedir('Motivo para cerrar la alerta');
              if (motivo) registrar({ tipo: 'alerta_cierre', alerta: a.id, motivo });
            }}>Cerrar con motivo</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Tiempos({ estado, registrar }: P) {
  return (
    <section className="bloque">
      <h2>Tiempos</h2>
      <ol>
        {HORAS.map(([id, nombre]) => (
          <li key={id} className={estado.horas[id] ? 'si' : ''}>
            <span className="label">{nombre}</span>
            <span className="metric">{hora(estado.horas[id])}</span>
            {!estado.horas[id] && <button className="manual" onClick={() => registrar({ tipo: 'hora', hora: id })}>Registrar</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Checklist({ estado, registrar }: P) {
  return (
    <section className="bloque">
      <h2>Lista de verificación</h2>
      {estado.protocolo.fases.map((f, n) => {
        const hechos = f.items.filter(i => ['si', 'na'].includes(estado.checks[`${f.id}.${i.id}`]?.valor ?? '')).length;
        return (
          <div key={f.id} className={f.id === estado.fase_actual ? 'fase actual' : 'fase'}>
            <h3>0{n + 1} {f.nombre} <span className="metric">{hechos}/{f.items.length}</span></h3>
            <ul>
              {f.items.map(i => {
                const c = estado.checks[`${f.id}.${i.id}`];
                const marca = c?.valor === 'si' ? '✓' : c?.valor === 'no' ? '✗' : c?.valor === 'na' ? '–' : '!';
                return (
                  <li key={i.id} className={c?.valor ?? 'pendiente'}>
                    <span>{marca} {i.texto}</span>
                    <span className="quien">{c ? `${ROLES[c.rol ?? i.rol]} · ${hora(c.ts)}` : ROLES[i.rol]}</span>
                    {!c && (
                      <span className="manual">
                        <button onClick={() => registrar({ tipo: 'check', fase: f.id, item: i.id, valor: 'si' })}>✓</button>
                        <button onClick={() => registrar({ tipo: 'check', fase: f.id, item: i.id, valor: 'no' })}>✗</button>
                        <button onClick={() => registrar({ tipo: 'check', fase: f.id, item: i.id, valor: 'na' })}>N/A</button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

export function Conteo({ estado, registrar }: P) {
  const cierre = !!estado.horas.fin_cirugia;
  return (
    <section className="bloque">
      <h2>Recuento de material</h2>
      <table>
        <thead><tr><th>Material</th><th>Entra</th><th>Sale</th><th>En campo</th><th className="manual" /></tr></thead>
        <tbody>
          {Object.entries(estado.conteo).map(([m, c]) => (
            <tr key={m} className={cierre && c.entra !== c.sale ? 'descuadre' : ''}>
              <td>{m}</td>
              <td className="metric">{c.entra}</td>
              <td className="metric">{c.sale}</td>
              <td className="metric">{c.entra - c.sale}</td>
              <td className="manual">
                <button onClick={() => registrar({ tipo: 'conteo', material: m, cantidad: 1 })}>+1</button>
                <button onClick={() => registrar({ tipo: 'conteo', material: m, cantidad: -1 })}>−1</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function Datos({ estado, registrar }: P) {
  return (
    <section className="bloque">
      <h2>Paciente</h2>
      <dl>
        {estado.protocolo.campos_preop.map(c => {
          const v = estado.datos[c.id];
          const falta = v === null || v === undefined || v === '';
          return (
            <div key={c.id} className={falta && c.obligatorio ? 'falta' : ''}>
              <dt>{c.etiqueta}</dt>
              <dd>
                {falta ? (c.obligatorio ? '! Falta' : '—') : `${v} ${c.unidad ?? ''}`}
                <button className="manual" onClick={() => {
                  const r = pedir(c.etiqueta, falta ? '' : String(v));
                  if (!r) return;
                  const valor = c.tipo === 'numero' ? Number(r.replace(',', '.')) : r;
                  if (typeof valor === 'number' && Number.isNaN(valor)) return;
                  registrar({ tipo: 'dato', campo: c.id, valor });
                }}>Editar</button>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export function Equipo({ estado, registrar }: P) {
  const equipo = Object.entries(estado.cirugia.equipo_programado) as [Rol, Persona][];
  return (
    <section className="bloque">
      <h2>Equipo quirúrgico</h2>
      <ul>
        {equipo.map(([rol, p]) => {
          const presente = estado.presentes.includes(p.id);
          return (
            <li key={rol} className={presente ? 'si' : 'pendiente'}>
              <span>{presente ? '✓' : '·'} {p.nombre}</span>
              <span className="quien">{ROLES[rol]}</span>
              {!presente && <button className="manual" onClick={() => registrar({ tipo: 'presente', usuario_id: p.id, rol })}>Presente</button>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Bitacora({ estado, registrar }: P) {
  const p = estado.protocolo;
  const registros = estado.eventos.filter(e => e.datos.tipo === 'hito' || e.datos.tipo === 'medicion');
  return (
    <section className="bloque">
      <h2>Bitácora</h2>
      <div className="manual botones">
        {p.hitos.map(h => <button key={h} onClick={() => registrar({ tipo: 'hito', hito: h })}>{h}</button>)}
        {p.mediciones.map(m => (
          <button key={m.id} onClick={() => {
            const valor = Number(pedir(`${m.etiqueta} (${m.unidad})`)?.replace(',', '.'));
            if (Number.isFinite(valor)) registrar({ tipo: 'medicion', medicion: m.id, valor });
          }}>{m.etiqueta}</button>
        ))}
      </div>
      <ul>{registros.map(e => <li key={e.id}><span className="metric">{hora(e.ts)}</span> {describir(e.datos, p)}</li>)}</ul>
      {estado.duraciones.map(d => <p key={d.nombre}>{d.nombre}: <span className="metric">{d.minutos ?? '—'} min</span></p>)}
    </section>
  );
}

export function Novedades({ estado, registrar }: P) {
  return (
    <section className="bloque">
      <h2>Novedades</h2>
      <button className="manual" onClick={() => {
        const texto = pedir('Describe la novedad');
        if (texto) registrar({ tipo: 'novedad', texto });
      }}>Nueva novedad</button>
      <ul>
        {estado.novedades.map(n => (
          <li key={n.id} className={n.estado === 'solucionada' ? 'si' : 'pendiente'}>
            <span>{hora(n.ts)} · {n.texto}</span>
            <span className="quien">
              {n.estado === 'detectada' ? 'Detectada' : n.estado === 'atendida' ? `Atendida: ${n.responsable}` : `Solucionada: ${n.acciones}`}
            </span>
            {n.estado === 'detectada' && <button className="manual" onClick={() => {
              const responsable = pedir('¿Quién la atiende?');
              if (responsable) registrar({ tipo: 'novedad_atendida', novedad_id: n.id, responsable });
            }}>Atender</button>}
            {n.estado !== 'solucionada' && <button className="manual" onClick={() => {
              const acciones = pedir('¿Qué se hizo?');
              if (acciones) registrar({ tipo: 'novedad_solucionada', novedad_id: n.id, acciones });
            }}>Solucionar</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Paso 3: La vista de sesión**

`web/src/Sesion.tsx`:

```tsx
import { useState } from 'react';
import type { DatosEvento } from '../../api/src/tipos.ts';
import { useSesion } from './useSesion.ts';
import { describir, guardarPreferencia, hora, preferencia } from './etiquetas.ts';
import { Alertas, Bitacora, Checklist, Conteo, Datos, Equipo, Novedades, Tiempos } from './Bloques.tsx';

export function Sesion({ cirugiaId }: { cirugiaId: string }) {
  const s = useSesion(cirugiaId);
  const [pared, setPared] = useState(() => preferencia('hb_pared') === '1');
  if (!s.estado) return <p className="cargando">{s.aviso || 'Conectando…'}</p>;

  const { estado } = s;
  const c = estado.cirugia;
  const registrar = (datos: DatosEvento) => s.enviar({ tipo: 'registrar', datos });
  const ultimo = estado.eventos.at(-1);
  const alternarPared = () => {
    guardarPreferencia('hb_pared', pared ? '0' : '1');
    setPared(!pared);
  };

  return (
    <div className={pared ? 'sesion pared' : 'sesion'}>
      <header className="cabecera">
        <div>
          <p className="label">{c.quirofano} · {estado.protocolo.especialidad}</p>
          <h1>{c.paciente.nombre}</h1>
          <p>{c.paciente.edad} años · {c.paciente.tipo_doc} {c.paciente.num_doc} · {c.paciente.eps} · {c.paciente.hc}</p>
          <p className="procedimiento">{c.procedimiento} · Lateralidad: <strong>{c.lateralidad}</strong></p>
        </div>
        <div className="acciones">
          <button onClick={() => s.enviar({ tipo: 'deshacer' })}>Deshacer</button>
          <button onClick={alternarPared}>{pared ? 'Modo registro' : 'Modo pared'}</button>
          <a href="/">Salir</a>
        </div>
      </header>

      <section className="voz" aria-live="polite">
        <p className="parcial">{s.parcial || (s.microfono ? `Escuchando en ${s.microfono}` : 'Micrófono apagado')}</p>
        {ultimo && <p className="ultimo">Último: {describir(ultimo.datos, estado.protocolo)} · {hora(ultimo.ts)}</p>}
        {s.pendiente && (
          <div className="pendiente">
            ¿Registrar {s.pendiente.resumen}?
            <button onClick={() => s.enviar({ tipo: 'confirmar', si: true })}>Sí</button>
            <button onClick={() => s.enviar({ tipo: 'confirmar', si: false })}>No</button>
          </div>
        )}
        {s.aviso && <p className="aviso">{s.aviso}</p>}
      </section>

      <Alertas estado={estado} registrar={registrar} />
      <div className="rejilla">
        <Tiempos estado={estado} registrar={registrar} />
        <Checklist estado={estado} registrar={registrar} />
        <Conteo estado={estado} registrar={registrar} />
        <Datos estado={estado} registrar={registrar} />
        <Equipo estado={estado} registrar={registrar} />
        <Bitacora estado={estado} registrar={registrar} />
        <Novedades estado={estado} registrar={registrar} />
      </div>
    </div>
  );
}
```

- [ ] **Paso 4: Ruta y estilos**

En `web/src/App.tsx`, agrega el import y la ruta antes de `return <Inicio yo={yo} />;`:

```tsx
import { Sesion } from './Sesion.tsx';
```

```tsx
  const sesion = location.pathname.match(/^\/sesion\/([0-9a-f-]{36})$/);
  if (sesion) return <Sesion cirugiaId={sesion[1]} />;
```

Agrega al final de `web/src/estilos.css`:

```css
.sesion { padding: 16px; display: grid; gap: 16px; }
.cabecera {
  display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  background: var(--blue-900); color: #fff; padding: 16px; border-radius: var(--r-md);
}
.cabecera p { margin: 0; }
.cabecera .label { color: var(--blue-300); }
.acciones { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.acciones a { color: #fff; }
.voz { background: var(--tint); border-radius: var(--r-md); padding: 12px 16px; }
.voz p { margin: 0; }
.parcial { font: 500 20px var(--display); min-height: 30px; }
.pendiente { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-weight: 600; margin-top: 8px; }
.alertas { border-radius: var(--r-md); padding: 12px 16px; background: #FDECEA; border: 2px solid var(--signal); }
.alertas.ok { background: #E6F4F0; border-color: var(--secondary); color: var(--secondary); font-weight: 600; }
.alertas h2 { color: var(--signal); }
.alertas ul { list-style: none; margin: 0; padding: 0; }
.alertas li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 0; flex-wrap: wrap; }
.alertas li.critica { font-weight: 600; color: var(--signal); }
.rejilla { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); }
.bloque { background: #fff; border: 1px solid var(--steel); border-radius: var(--r-md); padding: 16px; }
.bloque ul, .bloque ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.bloque li { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.fase { padding: 8px; border-radius: var(--r-sm); }
.fase.actual { background: var(--tint); }
li.si { color: var(--secondary); }
li.no { color: var(--signal); font-weight: 600; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: 4px; text-align: left; border-bottom: 1px solid var(--tint); }
tr.descuadre { color: var(--signal); font-weight: 600; }
dl { display: grid; gap: 4px; margin: 0; }
dl div { display: flex; justify-content: space-between; gap: 8px; }
dd { margin: 0; display: flex; gap: 8px; align-items: center; }
.falta dd { color: var(--signal); font-weight: 600; }
.manual button, button.manual { min-height: 36px; padding: 0 10px; font-size: 13px; background: var(--tint); color: var(--brand); }
.manual button:hover, button.manual:hover { background: var(--blue-300); }
span.manual { display: inline-flex; gap: 4px; }
.botones { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

/* Modo pared: lectura a distancia en una TV o tablero digital */
.pared { font-size: 22px; }
.pared h1 { font-size: 44px; }
.pared h2 { font-size: 28px; }
.pared .parcial { font-size: 32px; }
.pared .manual { display: none; }
.pared .rejilla { grid-template-columns: repeat(auto-fit, minmax(min(480px, 100%), 1fr)); }
```

- [ ] **Paso 5: Verificar en dos dispositivos**

Run: `cd web && npm run tipos`
Expected: sin errores.

Con el API y el front corriendo, abre la cirugía de la demo en dos pestañas (o en el portátil y un celular de la misma red usando `npm run dev -- --host`).
Expected:
- La alerta «Falta Glucometría» aparece desde el inicio.
- Al pulsar «Registrar» en Ingreso de una pestaña, la otra muestra la hora sin recargar.
- Las alertas de identidad, procedimiento y sitio aparecen en rojo y se van al marcar ✓.
- «Deshacer» quita el último registro en ambas pestañas.
- «Modo pared» agranda todo y oculta los botones.
- A 375 px de ancho no hay scroll horizontal.

- [ ] **Paso 6: Commit**

```bash
git add web/src/useSesion.ts web/src/Bloques.tsx web/src/Sesion.tsx web/src/App.tsx web/src/estilos.css
git commit -m "feat(web): agregar vista de sesión en vivo con modo pared"
git pull --rebase && git push
```

---

### Tarea 14: Micrófono con detector de voz

**Archivos:**
- Crear: `web/public/pcm-worklet.js`, `web/src/pcm.ts`, `web/src/microfono.ts`
- Modificar: `web/src/Sesion.tsx`, `web/src/estilos.css`
- Prueba: `web/src/pcm.test.ts`

**Interfaces:**
- Consume: `enviar`, `enviarAudio`, `microfono` y `dispositivo` de `useSesion` (13).
- Produce:
  - `aInt16(f: Float32Array): Int16Array`
  - `rms(f: Float32Array): number`
  - `crearAcumulador(tamano)`
  - `crearVad({ umbral, colgadoMs, previosBloques })`
  - `iniciarMicrofono(enviar, umbral, alNivel): Promise<() => void>`

El `AudioContext` corre a 16 kHz, así que Chrome remuestrea el micrófono y no hace falta convertir. El detector manda bloques de 100 ms solo mientras hay voz, con 300 ms previos para no cortar la primera sílaba y 1,2 s de cola. El umbral es una **perilla calibrable en pantalla**: cada quirófano tiene un ruido distinto.

- [ ] **Paso 1: Escribir la prueba**

`web/src/pcm.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aInt16, crearAcumulador, crearVad, rms } from './pcm.ts';

test('convierte a PCM de 16 bits recortando los extremos', () => {
  assert.deepEqual([...aInt16(new Float32Array([1, -1, 0, 2]))], [32767, -32768, 0, 32767]);
});

test('calcula el nivel RMS', () => {
  assert.equal(rms(new Float32Array([0.5, -0.5])), 0.5);
  assert.equal(rms(new Float32Array(0)), 0);
});

test('acumula bloques de tamaño fijo', () => {
  const acumular = crearAcumulador(1600);
  let bloques = 0;
  for (let i = 0; i < 13; i++) bloques += acumular(new Float32Array(128)).length;
  assert.equal(bloques, 1); // 13 × 128 = 1664 muestras
});

test('envía la voz con los bloques previos y corta tras el silencio', () => {
  const vad = crearVad({ umbral: () => 0.1, colgadoMs: 300, previosBloques: 2 });
  const silencio = new Float32Array(1600);
  const voz = new Float32Array(1600).fill(0.5);
  assert.equal(vad.procesar(silencio, 0).length, 0);
  assert.equal(vad.procesar(silencio, 100).length, 0);
  assert.equal(vad.procesar(silencio, 200).length, 0);
  assert.equal(vad.procesar(voz, 300).length, 3); // 2 previos + la voz
  assert.equal(vad.procesar(silencio, 400).length, 1); // dentro de la cola
  assert.equal(vad.procesar(silencio, 700).length, 0);
});
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Run: `cd web && npm test`
Expected: FAIL con `Cannot find module` sobre `pcm.ts`.

- [ ] **Paso 3: Implementar el procesamiento de audio**

`web/src/pcm.ts`:

```ts
export function aInt16(f: Float32Array): Int16Array {
  const salida = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    salida[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return salida;
}

export function rms(f: Float32Array): number {
  let suma = 0;
  for (const x of f) suma += x * x;
  return f.length ? Math.sqrt(suma / f.length) : 0;
}

export function crearAcumulador(tamano: number): (entrada: Float32Array) => Float32Array[] {
  let bloque = new Float32Array(tamano);
  let n = 0;
  return entrada => {
    const listos: Float32Array[] = [];
    for (const x of entrada) {
      bloque[n++] = x;
      if (n === tamano) { listos.push(bloque); bloque = new Float32Array(tamano); n = 0; }
    }
    return listos;
  };
}

// ponytail: detector por volumen. Si el ruido del quirófano lo engaña, cambiar por un VAD entrenado (por ejemplo, Silero en WASM).
export function crearVad(o: { umbral: () => number; colgadoMs: number; previosBloques: number }) {
  const previos: Float32Array[] = [];
  let hasta = -Infinity;
  return {
    procesar(bloque: Float32Array, ahora: number): Float32Array[] {
      if (rms(bloque) >= o.umbral()) {
        hasta = ahora + o.colgadoMs;
        return [...previos.splice(0), bloque];
      }
      if (ahora <= hasta) return [bloque];
      previos.push(bloque);
      if (previos.length > o.previosBloques) previos.shift();
      return [];
    },
  };
}
```

`web/public/pcm-worklet.js`:

```js
// Copia cada bloque del micrófono (128 muestras) al hilo principal.
class CapturaPcm extends AudioWorkletProcessor {
  process(inputs) {
    const canal = inputs[0]?.[0];
    if (canal) this.port.postMessage(canal.slice(0));
    return true;
  }
}
registerProcessor('captura-pcm', CapturaPcm);
```

`web/src/microfono.ts`:

```ts
import { aInt16, crearAcumulador, crearVad, rms } from './pcm.ts';

/** Captura el micrófono a 16 kHz y envía PCM solo mientras alguien habla. Devuelve la función para apagarlo. */
export async function iniciarMicrofono(
  enviar: (pcm: Int16Array) => void,
  umbral: () => number,
  alNivel: (nivel: number) => void,
): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext({ sampleRate: 16000 });
  await ctx.audioWorklet.addModule('/pcm-worklet.js');
  const nodo = new AudioWorkletNode(ctx, 'captura-pcm');
  const acumular = crearAcumulador(1600); // 100 ms
  const vad = crearVad({ umbral, colgadoMs: 1200, previosBloques: 3 });
  nodo.port.onmessage = (e: MessageEvent<Float32Array>) => {
    for (const bloque of acumular(e.data)) {
      alNivel(rms(bloque));
      for (const b of vad.procesar(bloque, performance.now())) enviar(aInt16(b));
    }
  };
  ctx.createMediaStreamSource(stream).connect(nodo);
  nodo.connect(ctx.destination); // el nodo no produce sonido; conectarlo asegura que Chrome lo procese
  return () => {
    nodo.disconnect();
    stream.getTracks().forEach(t => t.stop());
    void ctx.close();
  };
}
```

- [ ] **Paso 4: Correr la prueba**

Run: `cd web && npm test && npm run tipos`
Expected: 4 pruebas en PASS y `tsc` sin errores.

- [ ] **Paso 5: Botón de micrófono y perilla de umbral en la sesión**

En `web/src/Sesion.tsx`, cambia el import de React y agrega el del micrófono:

```tsx
import { useEffect, useRef, useState } from 'react';
import { iniciarMicrofono } from './microfono.ts';
```

Justo después de `const [pared, setPared] = …`, agrega (va **antes** del `if (!s.estado) return …`, porque los hooks no pueden ir después de un `return`):

```tsx
  const [apagar, setApagar] = useState<(() => void) | null>(null);
  const [nivel, setNivel] = useState(0);
  const [umbral, setUmbral] = useState(() => Number(preferencia('hb_umbral') ?? 0.02));
  const umbralRef = useRef(umbral);
  umbralRef.current = umbral;
  const apagarRef = useRef(apagar);
  apagarRef.current = apagar;

  // Si otro dispositivo tomó el micrófono, este deja de capturar.
  useEffect(() => {
    if (apagar && s.microfono && s.microfono !== s.dispositivo) { apagar(); setApagar(null); }
  }, [s.microfono, s.dispositivo, apagar]);
  useEffect(() => () => apagarRef.current?.(), []);

  async function alternarMicrofono() {
    if (apagar) {
      apagar();
      setApagar(null);
      s.enviar({ tipo: 'soltar_microfono' });
      return;
    }
    try {
      const fn = await iniciarMicrofono(s.enviarAudio, () => umbralRef.current, setNivel);
      s.enviar({ tipo: 'tomar_microfono' });
      setApagar(() => fn);
    } catch {
      alert('No se pudo abrir el micrófono. Revisa el permiso del navegador.');
    }
  }
```

En el bloque `<div className="acciones">`, agrega como primer hijo:

```tsx
          <button className={apagar ? 'mic activo' : 'mic'} onClick={alternarMicrofono}>
            {apagar ? '● Micrófono activo' : 'Activar micrófono'}
          </button>
          {apagar && (
            <label className="manual umbral">
              Umbral
              <input type="range" min={0.005} max={0.1} step={0.005} value={umbral} onChange={e => {
                setUmbral(Number(e.target.value));
                guardarPreferencia('hb_umbral', e.target.value);
              }} />
              <meter min={0} max={0.1} value={nivel} />
            </label>
          )}
```

Agrega al final de `web/src/estilos.css`:

```css
.mic.activo { background: var(--signal); }
.umbral { display: inline-flex; align-items: center; gap: 8px; color: #fff; font-size: 13px; }
.umbral input { width: 120px; min-height: 0; padding: 0; }
```

- [ ] **Paso 6: Verificar con voz real**

Requiere la Tarea 10 (credenciales de Speech en local) y `JEV_API_KEY` en `api/.env`.

Abre la cirugía de la demo en Chrome y pulsa «Activar micrófono» (acepta el permiso). Habla cerca del micrófono.
Expected:
- El medidor se mueve con la voz. Ajusta el umbral para que quede justo encima del ruido de la sala.
- Mientras hablas, el texto parcial aparece en la franja de voz.
- «Paciente en sala» registra la hora de ingreso.
- «¿Alguien vio mi celular?» no registra nada.
- En otra pestaña, el texto «Escuchando en…» muestra el nombre de este dispositivo.

- [ ] **Paso 7: Commit**

```bash
git add web/public/pcm-worklet.js web/src/pcm.ts web/src/pcm.test.ts web/src/microfono.ts web/src/Sesion.tsx web/src/estilos.css
git commit -m "feat(web): capturar el micrófono con detector de voz calibrable"
git pull --rebase && git push
```

---

### Tarea 15: Panel de gestión y trazabilidad

**Archivos:**
- Crear: `web/src/Panel.tsx`
- Modificar: `web/src/App.tsx` (ruta `/panel`), `web/src/estilos.css`

**Interfaces:**
- Consume: `GET /api/panel` (11), `GET /api/cirugias/:id` y `GET /api/personal` (6), el tipo `Panel` (1), `describir`, `hora` y `ROLES` (12).
- Produce: la ruta `/panel`, con los indicadores, los tiempos por etapa, las alertas frecuentes, la lista de cirugías y la trazabilidad de cada una (línea de tiempo, alertas y novedades).

- [ ] **Paso 1: Escribir el panel**

`web/src/Panel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { EstadoCirugia, Panel as PanelDatos } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { ROLES, describir, hora } from './etiquetas.ts';
import { Logo } from './Logo.tsx';

function Tile({ titulo, valor, nota }: { titulo: string; valor: string | number; nota?: string }) {
  return (
    <div className="tile">
      <span className="label">{titulo}</span>
      <span className="metric grande">{valor}</span>
      {nota && <span className="quien">{nota}</span>}
    </div>
  );
}

function Trazabilidad({ estado, personal, onCerrar }: { estado: EstadoCirugia; personal: Record<string, string>; onCerrar: () => void }) {
  const p = estado.protocolo;
  const c = estado.cirugia;
  return (
    <section className="bloque">
      <div className="barra">
        <h2>Trazabilidad · {c.procedimiento} · {c.quirofano} · {new Date(c.fecha_programada).toLocaleDateString('es-CO')}</h2>
        <button className="empuje" onClick={onCerrar}>Cerrar</button>
      </div>
      <div className="desplazable">
        <table>
          <thead><tr><th>Hora</th><th>Evento</th><th>Registró</th><th>Confirma</th><th>Origen</th></tr></thead>
          <tbody>
            {estado.eventos.map(e => (
              <tr key={e.id}>
                <td className="metric">{hora(e.ts)}</td>
                <td>{describir(e.datos, p)}{e.texto && <div className="quien">«{e.texto}»</div>}</td>
                <td>{personal[e.registrado_por ?? ''] ?? '—'}</td>
                <td>{e.rol_confirma ? ROLES[e.rol_confirma] : '—'}</td>
                <td>{e.origen === 'voz' ? `Voz${e.confianza ? ` · ${Math.round(e.confianza * 100)} %` : ''}` : 'Manual'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Alertas</h3>
      <ul>
        {estado.alertas.map(a => (
          <li key={a.id} className={a.estado === 'abierta' ? 'no' : a.estado === 'resuelta' ? 'si' : ''}>
            <span>{a.mensaje}</span>
            <span className="quien">{a.estado} · {hora(a.desde)} → {hora(a.hasta)}{a.motivo ? ` · Motivo: ${a.motivo}` : ''}</span>
          </li>
        ))}
      </ul>
      <h3>Novedades</h3>
      <ul>
        {estado.novedades.map(n => (
          <li key={n.id}>
            <span>{hora(n.ts)} · {n.texto}</span>
            <span className="quien">{n.estado}{n.responsable ? ` · ${n.responsable}` : ''}{n.acciones ? ` · ${n.acciones} (${hora(n.solucionada_ts)})` : ''}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Panel() {
  const [dias, setDias] = useState(30);
  const [p, setP] = useState<PanelDatos | null>(null);
  const [personal, setPersonal] = useState<Record<string, string>>({});
  const [detalle, setDetalle] = useState<EstadoCirugia | null>(null);

  useEffect(() => { api<PanelDatos>(`/api/panel?dias=${dias}`).then(setP); }, [dias]);
  useEffect(() => {
    api<{ id: string; nombre: string }[]>('/api/personal').then(l => setPersonal(Object.fromEntries(l.map(u => [u.id, u.nombre]))));
  }, []);

  if (!p) return <p className="cargando">Cargando…</p>;
  const maxEtapa = Math.max(1, ...p.tiempos.map(t => t.minutos ?? 0));
  const abrir = (id: string) => api<EstadoCirugia>(`/api/cirugias/${id}`).then(setDetalle);

  return (
    <main className="panel">
      <header className="barra">
        <Logo />
        <h1>Panel de seguridad quirúrgica</h1>
        <label className="empuje">
          <select value={dias} onChange={e => setDias(Number(e.target.value))} aria-label="Periodo">
            <option value={1}>Hoy</option>
            <option value={7}>Semana</option>
            <option value={30}>Mes</option>
          </select>
        </label>
        <a href="/">Volver</a>
      </header>

      <div className="tiles">
        <Tile titulo="Cirugías" valor={p.cirugias.programadas + p.cirugias.en_curso + p.cirugias.realizadas}
          nota={`${p.cirugias.realizadas} realizadas · ${p.cirugias.en_curso} en curso · ${p.cirugias.programadas} programadas`} />
        <Tile titulo="Checklists completas" valor={p.checklists.completas} nota={`${p.checklists.incompletas} incompletas`} />
        <Tile titulo="Cumplimiento de protocolo" valor={p.cumplimiento === null ? '—' : `${p.cumplimiento} %`} nota="Fases completas antes de su hora de cierre" />
        <Tile titulo="Tiempo quirúrgico promedio" valor={`${p.tiempos.find(t => t.etapa === 'Cirugía')?.minutos ?? '—'} min`} />
        <Tile titulo="Riesgos resueltos a tiempo" valor={p.alertas.resueltas} />
        <Tile titulo="Alertas abiertas" valor={p.alertas.abiertas} nota={`${p.alertas.cerradas} cerradas con motivo`} />
        <Tile titulo="Novedades" valor={p.novedades.abiertas + p.novedades.solucionadas}
          nota={`Solución promedio: ${p.novedades.minutos_solucion ?? '—'} min`} />
      </div>

      <div className="rejilla">
        <section className="bloque">
          <h2>Tiempo promedio por etapa</h2>
          {p.tiempos.map(t => (
            <div key={t.etapa} className="etapa">
              <span>{t.etapa}</span> <span className="metric">{t.minutos ?? '—'} min</span>
              <div className="barra-h" style={{ width: `${((t.minutos ?? 0) / maxEtapa) * 100}%` }} />
            </div>
          ))}
          {p.duraciones.map(d => <p key={d.nombre}>{d.nombre}: <span className="metric">{d.minutos ?? '—'} min</span></p>)}
        </section>
        <section className="bloque">
          <h2>Alertas más frecuentes</h2>
          {p.alertas.frecuentes.length === 0 && <p>Sin alertas abiertas ni cerradas con motivo.</p>}
          <ol>{p.alertas.frecuentes.map(a => <li key={a.mensaje}><span>{a.mensaje}</span><span className="metric">{a.veces}</span></li>)}</ol>
        </section>
      </div>

      {detalle && <Trazabilidad estado={detalle} personal={personal} onCerrar={() => setDetalle(null)} />}

      <section className="bloque">
        <h2>Cirugías</h2>
        <div className="desplazable">
          <table>
            <thead><tr><th>Fecha</th><th>QX</th><th>Procedimiento</th><th>Paciente</th><th>Estado</th><th>Alertas</th></tr></thead>
            <tbody>
              {p.lista.map(c => (
                <tr key={c.id} className="fila-clic" onClick={() => abrir(c.id)}>
                  <td className="metric">{new Date(c.fecha).toLocaleDateString('es-CO')} {hora(c.fecha)}</td>
                  <td>{c.quirofano}</td>
                  <td>{c.procedimiento}</td>
                  <td>{c.paciente}</td>
                  <td>{c.estado.replace('_', ' ')}</td>
                  <td className={c.alertas_abiertas ? 'aviso' : ''}>{c.alertas_abiertas} abiertas · {c.alertas_cerradas} cerradas</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Paso 2: Ruta y estilos**

En `web/src/App.tsx`, agrega el import y la ruta antes de `return <Inicio yo={yo} />;`:

```tsx
import { Panel } from './Panel.tsx';
```

```tsx
  if (location.pathname === '/panel') return <Panel />;
```

Agrega al final de `web/src/estilos.css`:

```css
.panel { padding: 16px; display: grid; gap: 16px; max-width: 1440px; margin: 0 auto; }
.tiles { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr)); }
.tile { display: grid; gap: 4px; background: #fff; border: 1px solid var(--steel); border-radius: var(--r-md); padding: 16px; }
.metric.grande { font-size: 36px; line-height: 1.1; }
.etapa { margin-bottom: 8px; }
.barra-h { height: 12px; background: var(--brand); border-radius: var(--r-sm); margin-top: 4px; }
.desplazable { overflow-x: auto; }
.fila-clic { cursor: pointer; }
.fila-clic:hover { background: var(--tint); }
```

- [ ] **Paso 3: Verificar**

Run: `cd web && npm run tipos && npm run build`
Expected: sin errores.

Entra como `coordinador` y abre «Panel de gestión».
Expected:
- Los indicadores muestran unas 60 cirugías en el mes y un cumplimiento entre el 80 % y el 90 %.
- Las alertas frecuentes incluyen el antibiótico cerrado con motivo y las fases incompletas.
- Al hacer clic en una cirugía aparece su trazabilidad completa.
- Al cambiar a «Hoy» se ven las cirugías del día.

- [ ] **Paso 4: Commit**

```bash
git add web/src/Panel.tsx web/src/App.tsx web/src/estilos.css
git commit -m "feat(web): agregar panel de gestión con trazabilidad por cirugía"
git pull --rebase && git push
```

---

### Tarea 16: Contenedores y servicios en Cloud Run

**Archivos:**
- Crear: `cloudbuild.yaml`, `.gcloudignore`, `api/Dockerfile`, `web/Dockerfile`, `web/nginx.conf.template`, `infra/servicios.tf`
- Modificar: `README.md` (agrega la sección de despliegue al final)

**Interfaces:**
- Consume: la infraestructura de la Tarea 9 (cuenta de servicio, secretos, Cloud SQL, registro de imágenes).
- Produce: los servicios `api` y `web` en Cloud Run, y la salida `web_url`, que es la URL para el jurado.

`web` sirve el build con nginx y hace de proxy de `/api` (incluido el WebSocket) hacia `api`. Así todo sale del mismo origen: no hay CORS y la cookie de sesión funciona sin trucos. `api` tiene **máximo una instancia**, porque las salas viven en memoria.

- [ ] **Paso 1: Imágenes**

Las dos imágenes se construyen **desde la raíz del repo**, porque el API necesita `db/schema.sql`. Una sola orden de Cloud Build construye las dos en paralelo.

`cloudbuild.yaml`:

```yaml
steps:
  - id: api
    name: gcr.io/cloud-builders/docker
    args: ['build', '-f', 'api/Dockerfile', '-t', '${_REGISTRO}/api:${_TAG}', '.']
    waitFor: ['-']
  - id: web
    name: gcr.io/cloud-builders/docker
    args: ['build', '-f', 'web/Dockerfile', '-t', '${_REGISTRO}/web:${_TAG}', '.']
    waitFor: ['-']
images:
  - '${_REGISTRO}/api:${_TAG}'
  - '${_REGISTRO}/web:${_TAG}'
```

`.gcloudignore` (en la raíz; sin él se subirían `node_modules`, los `.env` y el estado de Terraform, que tiene secretos):

```
.gcloudignore
.git/
node_modules/
dist/
.env
infra/
docs/
Notas/
Diseño/
*.wav
```

`api/Dockerfile` (conserva la estructura `api/` + `db/` para que `migrar()` encuentre `../../db/schema.sql`):

```dockerfile
FROM node:24-slim
WORKDIR /app/api
ENV NODE_ENV=production
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev
COPY api/src ./src
COPY db/schema.sql /app/db/schema.sql
CMD ["node", "src/server.ts"]
```

`web/nginx.conf.template` (la imagen oficial de nginx reemplaza `${API_URL}` y `${API_HOST}` al arrancar, y deja intactas las variables propias de nginx como `$http_upgrade`):

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 8080;
  root /usr/share/nginx/html;

  location /api/ {
    proxy_pass ${API_URL};
    proxy_http_version 1.1;
    proxy_set_header Host ${API_HOST};
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_ssl_server_name on;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }

  location / {
    try_files $uri /index.html;
  }
}
```

`web/Dockerfile`:

```dockerfile
FROM node:24-slim AS build
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
COPY api/src/tipos.ts /app/api/src/tipos.ts
RUN npm run build

FROM nginx:1.29-alpine
COPY web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/web/dist /usr/share/nginx/html
```

El front solo importa tipos de `api/src/tipos.ts` y Vite los borra al compilar. Se copia igual para que la imagen no dependa de ese detalle.

- [ ] **Paso 2: Servicios en Terraform**

`infra/servicios.tf`:

```hcl
locals {
  imagen        = "${var.region}-docker.pkg.dev/${var.project_id}/healthbyte"
  con_servicios = var.tag != ""
}

resource "google_cloud_run_v2_service" "api" {
  count                = local.con_servicios ? 1 : 0
  project              = google_project.p.project_id
  name                 = "api"
  location             = var.region
  ingress              = "INGRESS_TRAFFIC_ALL"
  deletion_protection  = false
  invoker_iam_disabled = true # público: la app tiene su propio login
  labels               = local.etiquetas

  template {
    service_account = google_service_account.api.email
    timeout         = "3600s" # WebSocket de una cirugía larga
    scaling {
      min_instance_count = var.api_min_instancias
      max_instance_count = 1 # las salas viven en memoria
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.db.connection_name]
      }
    }
    containers {
      image = "${local.imagen}/api:${var.tag}"
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PGHOST"
        value = "/cloudsql/${google_sql_database_instance.db.connection_name}"
      }
      env {
        name  = "PGUSER"
        value = google_sql_user.app.name
      }
      env {
        name  = "PGDATABASE"
        value = google_sql_database.app.name
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name = "PGPASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SESION_SECRETO"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.sesion.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JEV_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jev.secret_id
            version = "latest"
          }
        }
      }
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }
  depends_on = [
    google_project_iam_member.api,
    google_secret_manager_secret_version.db,
    google_secret_manager_secret_version.sesion,
  ]
}

resource "google_cloud_run_v2_service" "web" {
  count                = local.con_servicios ? 1 : 0
  project              = google_project.p.project_id
  name                 = "web"
  location             = var.region
  ingress              = "INGRESS_TRAFFIC_ALL"
  deletion_protection  = false
  invoker_iam_disabled = true
  labels               = local.etiquetas

  template {
    timeout = "3600s"
    scaling {
      max_instance_count = 2
    }
    containers {
      image = "${local.imagen}/web:${var.tag}"
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
      env {
        name  = "API_URL"
        value = google_cloud_run_v2_service.api[0].uri
      }
      env {
        name  = "API_HOST"
        value = trimprefix(google_cloud_run_v2_service.api[0].uri, "https://")
      }
    }
  }
}

output "web_url" {
  value = try(google_cloud_run_v2_service.web[0].uri, null)
}
```

Run: `cd infra && terraform validate`
Expected: `Success! The configuration is valid.`

- [ ] **Paso 3: Construir y desplegar**

Primero exporta de nuevo `GOOGLE_OAUTH_ACCESS_TOKEN` (Tarea 9, Paso 4). Luego:

```bash
PROYECTO=TU_PROJECT_ID
TAG=$(git rev-parse --short HEAD)
gcloud builds submit --config=cloudbuild.yaml --project=$PROYECTO --configuration=healthbyte \
  --substitutions=_REGISTRO=us-east1-docker.pkg.dev/$PROYECTO/healthbyte,_TAG=$TAG
cd infra && terraform apply -var tag=$TAG
```

Expected: las dos builds en `SUCCESS` y Terraform muestra `web_url`.

Verifica:
- `curl -s $(terraform output -raw web_url)/api/salud` devuelve `{"ok":true}`.
- Al abrir `web_url` en Chrome, el login funciona.
- La cirugía de la demo abre en dos dispositivos distintos y se sincroniza.
- El micrófono transcribe y registra.

Si `api` no arranca, revisa sus logs:

```bash
gcloud run services logs read api --region=us-east1 --project=$PROYECTO --configuration=healthbyte --limit=50
```

- [ ] **Paso 4: Documentar el despliegue y el apagado**

Agrega al final de `README.md`:

````markdown
## Desplegar en GCP

Solo en la cuenta **personal**, con la configuración de gcloud `healthbyte` (ver la Tarea 9 del plan). Terraform se niega a correr con otra cuenta.

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token --configuration=healthbyte)
terraform -chdir=infra init && terraform -chdir=infra apply   # infraestructura base (la primera vez)
TAG=$(git rev-parse --short HEAD)                              # imágenes, desde la raíz del repo
gcloud builds submit --config=cloudbuild.yaml --project=<proyecto> --configuration=healthbyte \
  --substitutions=_REGISTRO=us-east1-docker.pkg.dev/<proyecto>/healthbyte,_TAG=$TAG
terraform -chdir=infra apply -var tag=$TAG                     # servicios
```

En PowerShell, el token se exporta con `$env:GOOGLE_OAUTH_ACCESS_TOKEN = gcloud auth print-access-token --configuration=healthbyte`.

Día de la demo (sin arranque en frío): `terraform -chdir=infra apply -var tag=$TAG -var api_min_instancias=1`

## Apagar todo

```bash
terraform -chdir=infra destroy
gcloud projects list --configuration=healthbyte
```

`terraform destroy` borra el proyecto completo, con todo lo que tenga adentro. Después, el proyecto no debe aparecer en la lista (o aparece en estado `DELETE_REQUESTED`).
````

- [ ] **Paso 5: Commit**

```bash
git add cloudbuild.yaml .gcloudignore api/Dockerfile web/Dockerfile web/nginx.conf.template infra/servicios.tf README.md
git commit -m "feat(infra): desplegar api y web en Cloud Run con proxy del mismo origen"
git pull --rebase && git push
```

---

### Tarea 17: Calibración y ensayo de la demo

**Archivos:**
- Modificar: `api/scripts/frases-oro.json`, `api/src/preguntas.ts` (umbrales), `docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md` (ajustes de este plan)

Esta tarea se hace con la instrumentadora. No agrega funcionalidad: deja la demo afinada.

- [ ] **Paso 1: Set de oro real**

Con la instrumentadora, amplía `api/scripts/frases-oro.json` a unas 40 frases tal como se dicen en el quirófano. Incluye al menos 8 frases de conversación que **no** deben registrarse.

Run: `cd api && npm run oro`
Expected: las frases del guion de la demo, en «bien»; ninguna de conversación, en «mal».

Ajusta `UMBRALES` en `api/src/preguntas.ts` y repite hasta lograrlo. Commit con el resultado:

```bash
git add api/scripts/frases-oro.json api/src/preguntas.ts
git commit -m "chore(api): calibrar umbrales de Jev con el set de oro"
git pull --rebase && git push
```

- [ ] **Paso 2: Prueba de voz en el hospital simulado**

En el despliegue de Cloud Run, con el micrófono que se usará en la demo, dicta el guion completo con el ruido real de la sala. Ajusta el umbral del detector con la perilla en pantalla.

Anota el **porcentaje del tiempo con voz**: dura la cirugía simulada y compáralo con los minutos facturados de Speech-to-Text en la consola de GCP. Ese dato reemplaza el supuesto del 40 % en la sección de costos del spec.

- [ ] **Paso 3: Ensayo del guion**

Antes de cada ensayo, «Reiniciar demo» desde el inicio de `coordinador`. Recorre el guion del spec (sección 2.5) con la frase de corrección del conteo «apareció una, sale una compresa». Graba un **video de respaldo** del recorrido completo, por si la red falla en el evento.

Checklist del día:
- [ ] `terraform apply -var tag=$TAG -var api_min_instancias=1` una hora antes.
- [ ] La TV o pantalla con Chrome y el modo pared activo.
- [ ] El micrófono USB o Bluetooth probado, con el umbral calibrado.
- [ ] El video de respaldo en un portátil sin depender de la red.
- [ ] Después del evento: `terraform destroy`.

- [ ] **Paso 4: Actualizar el spec con los ajustes del plan**

En el spec:
- Sección 3: «`movimiento` (*Choice*): entra · sale» (se quita «total»).
- Sección 2.5, paso 5: «*Apareció una, sale una compresa*».
- Sección 5, párrafo de Row-Level Security: «El API ejecuta `SET LOCAL ROLE healthbyte_app` y fija la clínica en cada transacción; ese rol no es dueño de las tablas, así que la política siempre aplica».
- Sección 6: agrega `"abre_con"` a cada fase del ejemplo JSON.
- Sección 8: «Los indicadores se calculan reutilizando la derivación de eventos».
- Sección 3, fila de `api/voz`: «tras 8 s de silencio».

```bash
git add docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md
git commit -m "docs: alinear el spec con las decisiones del plan de implementación"
git pull --rebase && git push
```

---

## Fuera de este plan (P2 del spec)

- Dar de alta una clínica nueva en vivo durante el pitch.
- Exportar la cirugía a PDF.
- Mostrar los eventos anulados en la trazabilidad (hoy el detalle muestra solo los vigentes; los anulados siguen en la base).
- Deshacer una frase completa cuando registró varios ítems a la vez (hoy deshace el último).
