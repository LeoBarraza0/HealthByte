# Ola 1 de agentes: módulos que se pueden hacer en paralelo

Cinco tareas que no comparten archivos y no dependen entre sí. Cada una cabe en una sesión de agente.

| # | Tarea | Agente sugerido | Archivos | Necesita |
| --- | --- | --- | --- | --- |
| A | Lógica del dominio | Codex | `api/src/{numeros,protocolos,prueba,estado,alertas}*` | Node 24 |
| B | Clientes de Jev y Chirp 3 | Codex (otra sesión) | `api/src/{jev,voz}*` | Node 24 |
| C | Infraestructura | Antigravity | `infra/`, `cloudbuild.yaml`, `.gcloudignore`, Dockerfiles, `web/nginx.conf.template` | Terraform instalado |
| D | Base de datos | Antigravity (otra sesión, local) | `api/src/db.ts`, `api/src/rls.dbtest.ts` | Docker Desktop |
| E | Front sin diseño visual | Codex o Antigravity | `web/src/{api,etiquetas,useSesion,pcm,microfono}*`, `web/public/pcm-worklet.js` | Node 24 |

## Cómo correrlos

- **Un clon por agente** si trabajan en tu máquina: `git clone https://github.com/LeoBarraza0/HealthByte.git HealthByte-<letra>`. Dos agentes en la misma carpeta se pisan el índice de git.
- **Codex en la nube** suele abrir un PR en vez de empujar a `main`: revísalo y fusiónalo.
- Cuando un agente termine, pídele al orquestador «valida la tarea X». El orquestador baja `main`, corre las pruebas y revisa el diff contra el plan y el spec.

## Ola 2 (después de validar la ola 1)

Siembra (Tarea 5) → API REST (6) → salas en vivo (7) → intérprete (8, pasos 4 a 9) → voz conectada (10, pasos 6 a 8) → panel (11). El front visual (12 a 15) sale de la sesión de diseño UI/UX con el orquestador.

---

## Prompt A: lógica del dominio

```text
Trabajas en el repo HealthByte, rama main. Es el backend de un tablero de seguridad quirúrgica que se llena por voz.

Antes de empezar:
1. Corre `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee en el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md) las secciones 5, 6 y 7.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) la sección «Base ya creada por el orquestador» y las Tareas 1, 2 y 3.

Tu trabajo: la lógica pura del dominio. Convertir palabras en español a números, los protocolos quirúrgicos, derivar el estado de una cirugía a partir de sus eventos y calcular las alertas con su historial.

Haz, en este orden:
- Tarea 1, pasos 3 a 7: solo `numeros.ts` y su prueba. `tipos.ts`, `package.json` y `tsconfig.json` ya existen: no los toques.
- Tarea 2 completa.
- Tarea 3 completa.

Solo puedes crear o modificar estos archivos:
api/src/numeros.ts, api/src/numeros.test.ts, api/src/protocolos.ts, api/src/prueba.ts, api/src/estado.ts, api/src/estado.test.ts, api/src/alertas.ts, api/src/alertas.test.ts

El código está en el plan; síguelo. Sigue TDD: escribe la prueba, mírala fallar, implementa y mírala pasar. No instales dependencias: corre `cd api && npm ci`.

Verificación obligatoria antes de cada commit:
- `cd api && npm test`: todas en PASS.
- `cd api && npm run tipos`: sin errores.

Haz un commit por tarea, con los mensajes del plan, y luego `git pull --rebase && git push`. Si después del rebase `npm run tipos` falla por un archivo que no es tuyo, no lo arregles: repórtalo.

Al terminar, reporta: los archivos creados, la salida de `npm test` y de `npm run tipos`, y cualquier desviación del plan con su motivo.
```

## Prompt B: clientes de Jev y Chirp 3

```text
Trabajas en el repo HealthByte, rama main. Es el backend de un tablero de seguridad quirúrgica que se llena por voz.

Antes de empezar:
1. Corre `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee en el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md) la sección 4.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) la sección «Base ya creada por el orquestador», la Tarea 8 y la Tarea 10.

Tu trabajo: dos clientes de servicios externos, probados con dobles (sin red ni credenciales).
- `jev.ts`: cliente REST de Jev (TypeSafe AI), con timeout de 2 s y un reintento.
- `voz.ts`: canal de streaming a Google Speech-to-Text V2 (Chirp 3). Abre con la primera voz, cierra tras el silencio y rota antes del límite de duración.

Haz:
- Tarea 8: el Paso 1 solo para `api/src/jev.test.ts`, y el Paso 3 (`jev.ts`). NO hagas `interprete.test.ts`, `preguntas.ts` ni `interprete.ts`: dependen de otra tarea en curso.
- Tarea 10, pasos 2 a 5 (`voz.ts` y su prueba). `voz.ts` importa `CanalVoz` y `EventosVoz` desde `./tipos.ts`, que ya existe. NO hagas los pasos 6 a 8.

Solo puedes crear o modificar estos archivos:
api/src/jev.ts, api/src/jev.test.ts, api/src/voz.ts, api/src/voz.test.ts

El código está en el plan; síguelo. Sigue TDD. No instales dependencias: corre `cd api && npm ci` (`@google-cloud/speech` ya está). No llames a las APIs reales: las pruebas usan `mock.method(globalThis, 'fetch', …)` y un stream falso.

Verificación obligatoria antes de cada commit:
- `cd api && npm test`: todas en PASS.
- `cd api && npm run tipos`: sin errores.

Commits:
- «feat(api): agregar cliente de Jev con timeout y reintento»
- «feat(api): agregar canal de voz de Chirp 3 en streaming»

Después de cada uno: `git pull --rebase && git push`. Si después del rebase `npm run tipos` falla por un archivo que no es tuyo, no lo arregles: repórtalo.

Al terminar, reporta: los archivos creados, la salida de las pruebas y del chequeo de tipos, y cualquier desviación del plan con su motivo. Si `_streamingRecognize` no existe en el tipo de `v2.SpeechClient` de la versión instalada, dime cuál es el método equivalente.
```

## Prompt C: infraestructura

```text
Trabajas en el repo HealthByte, rama main. Es un tablero de seguridad quirúrgica que se despliega en Google Cloud con Terraform.

Antes de empezar:
1. Corre `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee en el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md) la sección 11.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) la sección «Base ya creada por el orquestador», la Tarea 9 y la Tarea 16.

Tu trabajo: escribir la infraestructura como código, SIN desplegarla.

Haz:
- Tarea 9, pasos 2 y 3: `variables.tf`, `terraform.tfvars.example`, `main.tf` y `outputs.tf`.
- Tarea 16, pasos 1 y 2: `cloudbuild.yaml`, `.gcloudignore` (en la raíz), `api/Dockerfile`, `web/Dockerfile`, `web/nginx.conf.template` e `infra/servicios.tf`.
- Tarea 16, paso 4: agrega al final de `README.md` la sección de despliegue y apagado del plan. No cambies el resto del README.

Solo puedes crear o modificar estos archivos:
infra/main.tf, infra/variables.tf, infra/outputs.tf, infra/servicios.tf, infra/terraform.tfvars.example, infra/.terraform.lock.hcl, cloudbuild.yaml, .gcloudignore, api/Dockerfile, web/Dockerfile, web/nginx.conf.template, README.md (solo agregar al final)

PROHIBIDO: `terraform apply`, `terraform destroy`, `terraform plan` y cualquier comando de `gcloud` que cree, cambie o borre recursos. Las credenciales y el despliegue los maneja el usuario. Nunca crees `infra/terraform.tfvars` ni escribas correos, IDs de facturación o claves en el repo.

Verificación obligatoria:
- `terraform -chdir=infra init -backend=false`
- `terraform -chdir=infra fmt -check`
- `terraform -chdir=infra validate`: debe decir «Success! The configuration is valid.»
- Revisa que `.gcloudignore` excluya `infra/` (el estado de Terraform tiene secretos), `node_modules/` y `.env`.

No construyas las imágenes con Docker: el código del API y del front todavía no existe completo.

Commits:
- «feat(infra): crear proyecto GCP, Cloud SQL y secretos con guardia de cuenta» (Tarea 9)
- «feat(infra): agregar imágenes y servicios de Cloud Run» (Tarea 16)

Después de cada uno: `git pull --rebase && git push`.

Al terminar, reporta: los archivos creados, la salida de `fmt -check` y `validate`, la versión de Terraform y del provider de Google que quedó en el lock, y cualquier ajuste que hayas tenido que hacer porque el provider rechazó un argumento.
```

## Prompt D: base de datos

```text
Trabajas en el repo HealthByte, rama main. Es el backend multi-clínica de un tablero de seguridad quirúrgica, con Postgres y Row-Level Security.

Antes de empezar:
1. Corre `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee en el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md) la sección 5.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) la sección «Base ya creada por el orquestador» y la Tarea 4.
4. Lee `db/schema.sql`: ya existe y NO se modifica.

Tu trabajo: la conexión a Postgres y la garantía de aislamiento entre clínicas. Es la Tarea 4 completa: `db.ts` con `pool`, `migrar()` (lee `../../db/schema.sql`) y `conClinica()`, más las pruebas de Row-Level Security.

Solo puedes crear o modificar estos archivos:
api/src/db.ts, api/src/rls.dbtest.ts
(Puedes crear `api/.env` copiando `api/.env.example`; está en .gitignore y no se sube.)

Requisitos: Docker Desktop corriendo.
- `docker compose -f db/docker-compose.yml up -d`
- `cd api && cp .env.example .env && npm ci`

El código está en el plan; síguelo. Sigue TDD. No instales dependencias (`pg` ya está).

Verificación obligatoria:
- `cd api && npm run test:db`: las 3 pruebas en PASS (una clínica no ve a otra, sin clínica no se ve nada, los eventos no se pueden modificar ni borrar).
- `cd api && npm test` y `npm run tipos`: sin errores.

Si una prueba de RLS falla, NO cambies `db/schema.sql` ni relajes la prueba: reporta el error exacto.

Commit: «feat(api): conectar a Postgres con Row-Level Security por clínica». Luego `git pull --rebase && git push`.

Al terminar, reporta: los archivos creados, la salida de `npm run test:db` y cualquier desviación del plan con su motivo.
```

## Prompt E: front sin diseño visual

```text
Trabajas en el repo HealthByte, rama main. Es el front (React + Vite) de un tablero de seguridad quirúrgica que se llena por voz y se sincroniza en vivo entre una TV, una tablet y un portátil.

Antes de empezar:
1. Corre `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee en el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md) las secciones 2.1, 3 y 4 (paso 1).
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) la sección «Base ya creada por el orquestador» y las Tareas 12, 13 y 14.
4. Lee `api/src/tipos.ts`: es el contrato con el backend. Solo se importan tipos (`import type`), nunca código.

Tu trabajo: la capa del front que NO es visual. El diseño de pantallas, estilos y componentes se hace en otra sesión: no crees componentes .tsx, ni CSS, ni index.html.

Haz:
- Tarea 12, paso 2: solo `web/src/api.ts` y `web/src/etiquetas.ts`. NO hagas `Logo.tsx`.
- Tarea 13, paso 1: `web/src/useSesion.ts` (conexión WebSocket con reconexión).
- Tarea 14, pasos 1 a 4: `web/src/pcm.ts`, `web/src/pcm.test.ts`, `web/public/pcm-worklet.js` y `web/src/microfono.ts`.

Solo puedes crear o modificar estos archivos:
web/src/api.ts, web/src/etiquetas.ts, web/src/useSesion.ts, web/src/pcm.ts, web/src/pcm.test.ts, web/src/microfono.ts, web/public/pcm-worklet.js

El código está en el plan; síguelo. Sigue TDD para `pcm.ts`. No instales dependencias: corre `cd web && npm ci`.

Verificación obligatoria:
- `cd web && npm test`: las 4 pruebas de pcm en PASS.
- `cd web && npm run tipos`: sin errores.

Commits:
- «feat(web): agregar cliente HTTP, etiquetas y hook de sesión en vivo»
- «feat(web): capturar audio a 16 kHz con detector de voz»

Después de cada uno: `git pull --rebase && git push`.

Al terminar, reporta: los archivos creados, la salida de las pruebas y del chequeo de tipos, y cualquier desviación del plan con su motivo.
```
