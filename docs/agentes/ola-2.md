# Ola 2 de agentes

La ola 1 quedó validada el 1 de octubre: 31 pruebas en verde (28 de lógica y 3 contra Postgres), `tsc` sin errores y `terraform validate` correcto. Nadie tocó los archivos compartidos. Quedó pendiente la tarea E (front sin diseño), que pasa al carril D.

Cuatro carriles en paralelo, sin archivos compartidos. Cada carril tiene **su propio worktree**.

| Carril | Tareas | Agente sugerido | Archivos | Necesita |
| --- | --- | --- | --- | --- |
| A | 5 → 6 → 7, en orden | Codex (local, con Docker) | `api/src/{clave,siembra,repo,auth,app,server,sesion}*` | Docker Desktop |
| B | 18, y luego la parte pura de la 11 | Codex (otra sesión) | `api/src/{protocolos,alertas,panel}*` | Node 24 |
| C | 19, y luego la 8 sin el paso 8 | Antigravity | `api/src/{privacidad,preguntas,interprete}*`, `api/scripts/` | Node 24; clave de Jev opcional |
| D | E (pendiente de la ola 1) y 20 | Antigravity (otra sesión) | `web/src/*.ts`, `web/public/` | Node 24 |

Lo que queda para la ola 3, cuando A termine:
- La ruta del panel y `cargarEstados` (Tarea 11, pasos 4 y 5).
- Conectar Jev y la voz al servidor (Tarea 8, paso 8, y Tarea 10, pasos 6 a 8).
- El despliegue (Tarea 16, paso 3).
- El front visual (Tareas 12 a 15), después de la sesión de diseño.

Todas las tareas de la ola 2 deben leer la sección **«Ola 2: ajustes a tareas existentes y tareas nuevas»** al final del plan: ahí están los cambios que reemplazan partes del código original.

---

## Prompt A: siembra, API REST y salas en vivo

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el backend multi-clínica de un tablero de seguridad quirúrgica que se llena por voz.

Antes de empezar:
1. `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), secciones 3, 5 y 10.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md): «Base ya creada por el orquestador», las Tareas 5, 6 y 7, y la sección final «Ola 2», en especial «Cambios a la Tarea 7».

Tu trabajo, en este orden y con un commit por tarea:
- Tarea 5 completa: clave.ts y siembra.ts con sus pruebas.
- Tarea 6 completa, menos el paso 7 (el README ya existe; no lo toques).
- Tarea 7 completa CON los cambios de la sección «Ola 2»: `accion_conteo` en FORMAS y su validación, el `alFinal` que difunde `{ tipo: 'voz', fase }` y la prueba «avisa qué pasó con cada frase dictada». `CanalVoz` y `EventosVoz` se importan de ./tipos.ts y se re-exportan desde sesion.ts; no los definas de nuevo.

Solo puedes crear o modificar estos archivos:
api/src/clave.ts, api/src/clave.test.ts, api/src/siembra.ts, api/src/siembra.dbtest.ts, api/src/repo.ts, api/src/auth.ts, api/src/app.ts, api/src/app.dbtest.ts, api/src/server.ts, api/src/sesion.ts, api/src/sesion.test.ts

No toques protocolos.ts, alertas.ts, panel.ts, preguntas.ts, interprete.ts ni privacidad.ts: los hacen otros carriles en paralelo.

Requisitos: Docker Desktop corriendo, `docker compose -f db/docker-compose.yml up -d`, y `cd api && cp .env.example .env && npm ci`. No instales dependencias.

Verificación obligatoria antes de cada commit:
- `cd api && npm test` (todas en PASS)
- `cd api && npm run test:db` (todas en PASS; si la siembra vieja estorba: `docker compose -f db/docker-compose.yml down -v` y vuelve a subirla)
- `cd api && npm run tipos` (sin errores)

Después de cada commit: `git pull --rebase && git push`. Si tras el rebase falla una prueba o `tsc` por un archivo que no es tuyo, no lo arregles: repórtalo.

Al terminar, reporta: los archivos, la salida de las tres verificaciones y las desviaciones del plan con su motivo.
```

## Prompt B: reglas clínicas y panel

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el backend de un tablero de seguridad quirúrgica.

Antes de empezar:
1. `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), secciones 6 y 7.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) las Tareas 3 y 11 y la sección final «Ola 2»: «Tarea 18» y «Cambios a la Tarea 11».

Tu trabajo:
- Tarea 18 completa: ítems nuevos y rangos en protocolos.ts, y tres reglas nuevas en alertas.ts con sus pruebas. NO cambies los `id` de los ítems existentes; solo textos y agregados.
- Tarea 11, SOLO los pasos 1 a 3 (panel.ts y panel.test.ts, la parte pura) CON los cambios de «Ola 2» (CATEGORIAS y `atrapados`, más su prueba). NO hagas los pasos 4 y 5 (repo.ts y app.ts): los toca otro carril.

Solo puedes crear o modificar estos archivos:
api/src/protocolos.ts, api/src/alertas.ts, api/src/alertas.test.ts, api/src/panel.ts, api/src/panel.test.ts

TDD: escribe o ajusta la prueba, mírala fallar, implementa y mírala pasar. `cd api && npm ci`; no instales dependencias.

Verificación obligatoria antes de cada commit:
- `cd api && npm test` (todas en PASS)
- `cd api && npm run tipos` (sin errores)

Commits:
- «feat(api): agregar reglas clínicas e ítems de checklist que faltaban»
- «feat(api): calcular indicadores del panel de gestión»

Después de cada uno: `git pull --rebase && git push`.

Al terminar, reporta: los archivos, la salida de las pruebas y del chequeo de tipos, y las desviaciones del plan con su motivo.
```

## Prompt C: seudonimización e intérprete con Jev

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el backend de un tablero quirúrgico que se llena por voz: Chirp 3 transcribe y Jev (TypeSafe AI) interpreta cada frase.

Antes de empezar:
1. `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), sección 4.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) la Tarea 8 y la sección final «Ola 2»: «Tarea 19» y «Cambios a la Tarea 8».

Tu trabajo, en este orden:
- Tarea 19 completa: privacidad.ts con seudonimizar() y su prueba.
- Tarea 8, pasos 1 (solo interprete.test.ts; jev.test.ts ya existe), 2, 4, 5, 6 y 7, CON los cambios de «Ola 2»: ACCIONES_CONTEO y el caso `accion_conteo` en describir, seudonimizar antes de Jev, `no_entendido` y el caso 'nada', y las dos pruebas nuevas. NO hagas el paso 8 (server.ts lo toca otro carril). jev.ts ya existe: no lo cambies.

Solo puedes crear o modificar estos archivos:
api/src/privacidad.ts, api/src/privacidad.test.ts, api/src/preguntas.ts, api/src/interprete.ts, api/src/interprete.test.ts, api/scripts/frases-oro.json, api/scripts/set-de-oro.ts

TDD como dice el plan. `cd api && npm ci`; no instales dependencias. Las pruebas usan un Jev falso: no hace falta red.

Verificación obligatoria antes de cada commit:
- `cd api && npm test` (todas en PASS)
- `cd api && npm run tipos` (sin errores)

Opcional: si `api/.env` tiene JEV_API_KEY, corre `cd api && npm run oro` y pega la salida completa en tu reporte. Si no hay clave, no la pidas ni la inventes: dilo en el reporte.

Commits:
- «feat(api): seudonimizar la identidad del paciente antes de Jev»
- «feat(api): interpretar frases con Jev y agregar set de oro para calibrar»

Después de cada uno: `git pull --rebase && git push`.

Al terminar, reporta: los archivos, la salida de las pruebas, la del set de oro si la corriste, y las desviaciones del plan con su motivo.
```

## Prompt D: front sin diseño y Conti

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el front (React + Vite) de un tablero quirúrgico que se llena por voz y se sincroniza en vivo entre una TV, una tablet y un portátil. Conti es la mascota que muestra el estado de la voz.

Antes de empezar:
1. `git pull --rebase` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), secciones 2.1, 3 y 4.
3. Lee Diseño/conti-estados.md completo.
4. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) las Tareas 12, 13 y 14, y la sección final «Ola 2»: «Cambios a las Tareas 12 y 13» y «Tarea 20».
5. Lee api/src/tipos.ts: es el contrato. En el front solo se importan tipos (`import type`), nunca código.

Tu trabajo es la capa del front que NO es visual. Las pantallas, los componentes .tsx, el CSS y el index.html salen de otra sesión de diseño: no los crees.
- Tarea 12, paso 2: solo web/src/api.ts y web/src/etiquetas.ts, con el caso `accion_conteo` de «Ola 2». NO hagas Logo.tsx.
- Tarea 13, paso 1: web/src/useSesion.ts CON el cambio de «Ola 2» (ultimoParcial, ultimaVoz y el mensaje 'voz').
- Tarea 14, pasos 1 a 4: pcm.ts, pcm.test.ts, public/pcm-worklet.js y microfono.ts.
- Tarea 20 completa: copiar Conti a web/public/conti/, sus estados nuevos en conti.js, estadoConti.ts con su prueba y conti.d.ts.

Solo puedes crear o modificar estos archivos:
web/src/api.ts, web/src/etiquetas.ts, web/src/useSesion.ts, web/src/pcm.ts, web/src/pcm.test.ts, web/src/microfono.ts, web/src/estadoConti.ts, web/src/estadoConti.test.ts, web/src/conti.d.ts, web/public/pcm-worklet.js, web/public/conti/ (todo su contenido)

No modifiques Visuales/conti/: es el original del equipo; trabaja sobre la copia en web/public/conti/.

TDD para pcm.ts y estadoConti.ts. `cd web && npm ci`; no instales dependencias.

Verificación obligatoria antes de cada commit:
- `cd web && npm test` (todas en PASS)
- `cd web && npm run tipos` (sin errores)

Commits:
- «feat(web): agregar cliente HTTP, etiquetas y hook de sesión en vivo»
- «feat(web): capturar audio a 16 kHz con detector de voz»
- «feat(web): agregar a Conti con sus estados de voz»

Después de cada uno: `git pull --rebase && git push`.

Al terminar, reporta: los archivos, la salida de las pruebas y del chequeo de tipos, y las desviaciones del plan con su motivo. Si revisaste los estados de Conti a ojo, di cuáles se ven bien y cuáles no.
```
