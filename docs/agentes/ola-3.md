# Ola 3 de agentes

> **Reemplazado por [ola-3-rapida.md](ola-3-rapida.md)** para la entrega: otro reparto y prompts más completos. Las Tareas 21 a 25 del plan siguen valiendo.

La ola 2 quedó validada el 1 de octubre. Así quedaron las pruebas y el chequeo de tipos:

| Módulo | Pruebas en verde | `tsc` |
| --- | --- | --- |
| `api` | 72 de lógica y 10 contra Postgres | Sin errores |
| `web` | 10 | Sin errores |

Nadie tocó archivos compartidos.

Esta ola cierra el P0 y agrega el extra de la hoja de consumo (spec 2.6):
- **Backend:** la ruta del panel, Jev y Chirp 3 conectados al servidor, el catálogo de insumos y los eventos completos para la trazabilidad.
- **Front visual:** sale de las pantallas del canvas, exportadas en `Diseño/pantallas/`.

Antes de repartir, el orquestador dejó en `main` la base de la ola 3: el contrato, el esquema, el catálogo, el esqueleto del front y las pantallas. El detalle está en el plan, sección «Ola 3», en «Base ya creada por el orquestador (ola 3)».

## Carriles

Cinco carriles en paralelo, sin archivos compartidos. Cada uno trabaja en **su propio worktree**.

| Carril | Tareas | Agente sugerido | Necesita |
| --- | --- | --- | --- |
| A | 11 (pasos 4 y 5), 21, y 10 (pasos 6 y 7) | Codex, en local con Docker | Docker Desktop |
| C | 22 | Antigravity | Node 24; la clave de Jev es opcional |
| S1 | 23 | Codex, en otra sesión | Node 24, y el API en local para verlo |
| S2 | 24 | Antigravity, en otra sesión | Node 24, y el API en local para verlo |
| G | 25 | Codex o Antigravity, en una tercera sesión | Node 24; las rutas de A para el panel y la trazabilidad |

**Orden.**
- Todos pueden empezar ya.
- S1 y S2 se ven completos cuando los dos terminan. Mientras tanto, cada uno ve el componente vacío del otro.
- G puede construir el panel y la trazabilidad contra los tipos. Las pruebas a ojo de esas dos pantallas esperan a que A suba las Tareas 11 y 21.
- C es corta. Quien la termine puede ayudar a revisar S2 contra el diseño, sin tocar sus archivos.

**Para ver el front en local** (S1, S2 y G):
1. `docker compose -f db/docker-compose.yml up -d`
2. `cd api && npm run dev`
3. En otra terminal: `cd web && npm run dev`
4. Abre http://localhost:5173 y entra con `caribe`, `circulante` o `coordinador`, y la clave `CLAVE_DEMO` de `api/src/siembra.ts`.

## Lo que haces tú (no los agentes)

- **Cuando todos terminen, decir «valida la ola 3».** El orquestador corre las pruebas, revisa las pantallas contra el canvas y une lo que falte.
- **Jev en local.** Pon `JEV_API_KEY` en `api/.env`; el carril C puede correr `npm run oro` con ella.
- **Chirp 3 en local.** Con la cuenta personal `juniorrdsr`, nunca la corporativa:
  ```bash
  gcloud auth application-default login --configuration=healthbyte
  ```
  Después agrega `GOOGLE_CLOUD_PROJECT` en `api/.env`. Así A puede correr `npm run probar-voz`.
- **Desplegar.** Plan, Tarea 16, paso 3, y las secciones «Desplegar en GCP» y «Apagar todo».
- **Ensayar.** Plan, Tarea 17: calibrar el set de oro y ensayar el guion del spec (2.5), con la instrumentadora.

---

## Prompt A: panel, hoja de consumo y voz en el servidor

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el backend multi-clínica de un tablero de seguridad quirúrgica que se llena por voz.

Antes de empezar:
1. `git pull --rebase origin main` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), secciones 2.6, 3, 4 y 5.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md):
   - la Tarea 11, pasos 4 y 5;
   - la Tarea 10, pasos 6 y 7;
   - la sección final «Ola 3», con su base y la Tarea 21.

Tu trabajo, en este orden y con un commit por punto:
1. La Tarea 11, pasos 4 y 5: `cargarEstados` en repo.ts, la ruta `GET /api/panel` en app.ts y su prueba en app.dbtest.ts. panel.ts ya está hecho: no lo toques.
   Commit: «feat(api): exponer el panel de gestión».
2. La Tarea 21 completa: el catálogo sembrado, los insumos en `cargarEstado`, `eventosDe` con la ruta `/api/cirugias/:id/eventos`, y el vocabulario de Chirp con los insumos.
   Commit: «feat(api): sembrar el catálogo de insumos y exponer los eventos completos».
3. La Tarea 10, paso 6: reemplaza server.ts por la versión que conecta Jev y Chirp 3. Esa versión cubre también el paso 8 de la Tarea 8.
   Después, el paso 7: crea api/scripts/probar-voz.ts. El script `probar-voz` ya está en api/package.json.
   Corre `npm run probar-voz` solo si `api/.env` ya tiene `GOOGLE_CLOUD_PROJECT` y la máquina tiene credenciales de la cuenta personal. Si no, dilo en el reporte. No ejecutes ningún comando de gcloud.
   Commit: «feat(api): conectar Jev y Chirp 3 al servidor».

Solo puedes crear o modificar estos archivos:
api/src/repo.ts, api/src/app.ts, api/src/app.dbtest.ts, api/src/server.ts, api/src/siembra.ts, api/src/siembra.dbtest.ts, api/src/sesion.ts, api/scripts/probar-voz.ts

No toques tipos.ts, estado.ts, panel.ts, alertas.ts, insumos.ts, preguntas.ts, interprete.ts ni db/schema.sql: son del orquestador o de otro carril.

Requisitos:
- Docker Desktop corriendo y `docker compose -f db/docker-compose.yml up -d`.
- `cd api && npm ci`. No instales dependencias.
- `api/.env` ya existe. Si no, cópialo de `.env.example`.

Verificación obligatoria antes de cada commit:
- `cd api && npm test` (todas en PASS)
- `cd api && npm run test:db` (todas en PASS; si la base vieja estorba: `docker compose -f db/docker-compose.yml down -v` y vuelve a subirla)
- `cd api && npm run tipos` (sin errores)

Después de cada commit: `git pull --rebase origin main && git push origin HEAD:main`. Si tras el rebase falla algo por un archivo que no es tuyo, no lo arregles: repórtalo.

Al terminar, reporta:
- los archivos;
- la salida de las tres verificaciones;
- la de probar-voz, si la corriste;
- las desviaciones del plan, con su motivo.
```

## Prompt C: consumo por voz

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el backend de un tablero quirúrgico que se llena por voz: Chirp 3 transcribe y Jev (TypeSafe AI) interpreta cada frase con preguntas Choice, Noul y Score.

Antes de empezar:
1. `git pull --rebase origin main` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), secciones 2.5, 2.6 y 4.
3. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md) la Tarea 8 y la sección final «Ola 3», en especial la Tarea 22.
4. Lee api/src/preguntas.ts, api/src/interprete.ts y api/src/interprete.test.ts completos. Las reglas nuevas siguen el mismo patrón que hitos, mediciones y conteo.

Tu trabajo: la Tarea 22 completa.
- La intención `consumo`, con la pregunta Choice sobre el catálogo `estado.insumos`.
- La cantidad la saca el código, no Jev; si la frase no trae número, es 1.
- Las pruebas nuevas.
- Las frases del guion en el set de oro.

Solo puedes crear o modificar estos archivos:
api/src/preguntas.ts, api/src/interprete.ts, api/src/interprete.test.ts, api/scripts/frases-oro.json

No toques tipos.ts ni estado.ts. Para tus pruebas, el catálogo está en `INSUMOS` de api/src/insumos.ts: impórtalo, no lo copies.

TDD: escribe la prueba, mírala fallar, implementa y mírala pasar. `cd api && npm ci`; no instales dependencias. Las pruebas usan el Jev falso: no hace falta red.

Verificación obligatoria antes del commit:
- `cd api && npm test` (todas en PASS)
- `cd api && npm run tipos` (sin errores)

Opcional: si `api/.env` tiene JEV_API_KEY, corre `cd api && npm run oro` y pega la salida completa en tu reporte. Si no hay clave, no la pidas ni la inventes: dilo en el reporte.

Commit: «feat(api): interpretar el consumo de insumos dictado».
Después: `git pull --rebase origin main && git push origin HEAD:main`.

Al terminar, reporta:
- los archivos;
- la salida de las pruebas;
- la del set de oro, si la corriste;
- las desviaciones del plan, con su motivo.
```

## Prompt S1: marco de la sesión en vivo

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el front (React 19 + Vite, TypeScript sin librería de componentes) de un tablero quirúrgico que se llena por voz y se ve en vivo en una TV de pared y en la tablet de la circulante.

Antes de empezar:
1. `git pull --rebase origin main` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), secciones 2.1, 2.5, 3 y 4.
3. Lee Diseño/conti-estados.md y Diseño/pantallas/README.md.
4. Abre en el navegador y estudia:
   - Diseño/pantallas/Tablet-Registro.html;
   - Pared-Entrada.html, Pared-Inicio.html, Pared-Alergia.html, Pared-Durante.html y Pared-Salida.html.
   Son el diseño que hay que construir: copia la estructura, los textos y las medidas.
5. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md):
   - la Tarea 13 y la Tarea 14, paso 5: de ahí sale la lógica; lo visual se reemplaza;
   - la sección final «Ola 3», con su base, sus reglas del front y la Tarea 23.
6. Lee estos archivos, que ya existen y que no modificas:
   - api/src/tipos.ts, el contrato; en el front solo se importan tipos con `import type`;
   - web/src/App.tsx, props.ts, useSesion.ts, microfono.ts, estadoConti.ts, etiquetas.ts y estilos.css.

Tu trabajo: la Tarea 23 completa.
- El marco de la sesión: la cabecera del paciente, la pista del tiempo y la barra de voz con Conti, el micrófono, la sensibilidad y la confirmación Sí o No.
- Los modos pared y tablet.
- Dónde van `<Ahora>`, `<Atencion>` y `<Lateral>`. Esos tres los construye otro carril en paralelo; úsalos tal como están, con `PropsBloque`, aunque hoy estén vacíos.

Solo puedes crear o modificar estos archivos:
web/src/Sesion.tsx, web/src/Cabecera.tsx, web/src/Pista.tsx, web/src/BarraVoz.tsx, web/src/marco.ts, web/src/marco.test.ts, web/src/sesion.css

Reglas del front:
- Nada de prompt(), alert() ni confirm().
- Botones de al menos 44 px, foco visible y textos en español, iguales al diseño.
- Los colores salen de las variables de estilos.css; si te falta una, usa el valor del diseño en sesion.css y repórtalo.
- Nada de dependencias nuevas.

TDD para marco.ts. `cd web && npm ci`.

Verificación obligatoria antes del commit:
- `cd web && npm test` (todas en PASS)
- `cd web && npm run tipos` (sin errores)
- `cd web && npm run build` (sin errores)

Para verlo en vivo:
1. `docker compose -f db/docker-compose.yml up -d`
2. `cd api && npm run dev`
3. `cd web && npm run dev`
4. Entra como `caribe` / `circulante` con la clave CLAVE_DEMO de api/src/siembra.ts.

Compara la demo a 1180×820 (tablet) y a 1920×1080 (pared) con las pantallas del diseño. Abre dos pestañas en la misma cirugía y comprueba que lo que se marca en una aparece en la otra.

Commit: «feat(web): armar la sesión en vivo con cabecera, pista y barra de voz».
Después: `git pull --rebase origin main && git push origin HEAD:main`.

Al terminar, reporta:
- los archivos y la salida de las tres verificaciones;
- qué comparaste a ojo y qué no quedó igual al diseño;
- las desviaciones del plan, con su motivo.
```

## Prompt S2: bloques de la sesión, protocolo de conteo y consumo

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el front (React 19 + Vite, TypeScript sin librería de componentes) de un tablero quirúrgico que se llena por voz y se ve en vivo en una TV de pared y en la tablet de la circulante.

Antes de empezar:
1. `git pull --rebase origin main` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), secciones 2.1, 2.5, 2.6, 6 y 7.
3. Lee Diseño/pantallas/README.md.
4. Abre en el navegador y estudia:
   - Diseño/pantallas/Tablet-Registro.html, Tablet-Cerrar-Alerta.html, Tablet-Conteo.html y Tablet-Consumo.html;
   - las cinco Pared-*.html.
   Tu parte es la columna izquierda («Ahora»), «Requiere atención» y el panel lateral de la derecha.
5. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md):
   - la Tarea 13, paso 2: de ahí sale qué evento registra cada control; lo visual se reemplaza;
   - la sección final «Ola 3», con su base, sus reglas del front y la Tarea 24.
6. Lee estos archivos, que ya existen y que no modificas:
   - api/src/tipos.ts, el contrato; en el front solo se importan tipos con `import type`;
   - api/src/protocolos.ts, para saber qué fases, ítems, materiales, hitos y mediciones hay;
   - api/src/alertas.ts, para saber los `id` de las alertas: `dato:`, `conteo:` y `critico:`;
   - web/src/props.ts, etiquetas.ts y estilos.css.

Tu trabajo: la Tarea 24 completa.
- `Ahora`, `Atencion` (con el diálogo «Cerrar alerta con motivo» y el protocolo de conteo), `Lateral` (equipo, material o resumen, según el momento) y `Consumo`, el panel de la hoja de consumo.
- Las funciones puras de bloques.ts, con su prueba.
- Todos funcionan en los dos modos. El marco les pone la clase `.sesion.pared` o `.sesion.tablet`; en pared no hay controles.
- El marco (Sesion.tsx, la cabecera, la pista y la barra de voz) lo construye otro carril en paralelo: no lo toques.

Solo puedes crear o modificar estos archivos:
web/src/Ahora.tsx, web/src/Atencion.tsx, web/src/Lateral.tsx, web/src/Consumo.tsx, web/src/bloques.ts, web/src/bloques.test.ts, web/src/bloques.css

Reglas del front:
- Nada de prompt(), alert() ni confirm(). Los diálogos son los del diseño, con foco atrapado, Escape para cerrar y el foco de vuelta al botón que los abrió.
- Botones de al menos 44 px.
- Las alertas nunca se marcan solo con color: llevan ícono y texto.
- Textos en español, iguales al diseño. Los colores salen de las variables de estilos.css.
- Nada de dependencias nuevas.

TDD para bloques.ts. `cd web && npm ci`.

Verificación obligatoria antes del commit:
- `cd web && npm test` (todas en PASS)
- `cd web && npm run tipos` (sin errores)
- `cd web && npm run build` (sin errores)

Para verlo en vivo:
1. `docker compose -f db/docker-compose.yml up -d`
2. `cd api && npm run dev`
3. `cd web && npm run dev`
4. Entra como `caribe` / `circulante` con la clave CLAVE_DEMO de api/src/siembra.ts.

Si el marco todavía está vacío cuando quieras ver tus bloques, crea en tu worktree un archivo temporal que los monte, y bórralo antes del commit. No lo subas.

Recorre la demo:
- marca ítems;
- cierra una alerta con motivo;
- dicta o registra «entran diez compresas» y luego «salen nueve», y sigue el protocolo de conteo;
- registra consumo y comprueba que la otra pestaña se actualiza.

Commit: «feat(web): agregar los bloques de la sesión, el protocolo de conteo y el consumo».
Después: `git pull --rebase origin main && git push origin HEAD:main`.

Al terminar, reporta:
- los archivos y la salida de las tres verificaciones;
- qué comparaste a ojo y qué no quedó igual al diseño;
- las desviaciones del plan, con su motivo.
```

## Prompt G: login, inicio, panel y trazabilidad

```text
Trabajas en el repo HealthByte, rama main, en tu propio worktree. Es el front (React 19 + Vite, TypeScript sin librería de componentes) de un tablero quirúrgico multi-clínica: login, cirugías de hoy, panel de gestión y trazabilidad de cada cirugía.

Antes de empezar:
1. `git pull --rebase origin main` y lee AGENTS.md completo. Si este prompt choca con AGENTS.md, manda AGENTS.md.
2. Lee el spec (docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), secciones 2.2, 2.6, 8 y 10.
3. Lee Diseño/pantallas/README.md.
4. Abre en el navegador y estudia Diseño/pantallas/Login.html, Inicio-Cirugias.html, Panel.html y Trazabilidad.html. Son el diseño que hay que construir.
5. Lee en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md):
   - la Tarea 12, paso 4, y la Tarea 15: de ahí sale la lógica; lo visual se reemplaza;
   - la sección final «Ola 3», con su base, sus reglas del front y la Tarea 25.
6. Lee estos archivos, que ya existen y que no modificas:
   - api/src/tipos.ts, el contrato, con `Panel`, `CirugiaActiva`, `EstadoCirugia`, `Evento` y `LineaConsumo`; en el front solo se importan tipos con `import type`;
   - api/src/app.ts, para las rutas;
   - web/src/App.tsx, api.ts, etiquetas.ts y estilos.css.

Tu trabajo: la Tarea 25 completa.
- `Login`, con Conti saludando.
- `Inicio`: las cirugías de hoy y «Este dispositivo».
- `Panel`: el periodo; la lista con búsqueda, filtros, fichas de filtros activos, orden, paginación y CSV.
- `Trazabilidad`: el registro con los anulados tachados, y la sección «Consumo de la cirugía» con su CSV.
- Las funciones puras de gestion.ts, con su prueba.

Las rutas `GET /api/panel` y `GET /api/cirugias/:id/eventos` las agrega otro carril en paralelo. Construye contra los tipos, y verifica en vivo cuando aparezcan en main (`git pull --rebase origin main`).

Programación y Personal no entran en esta ola: en el menú van solo «Cirugías de hoy» y «Panel de gestión».

Solo puedes crear o modificar estos archivos:
web/src/Login.tsx, web/src/Inicio.tsx, web/src/Panel.tsx, web/src/Trazabilidad.tsx, web/src/Logo.tsx, web/src/gestion.ts, web/src/gestion.test.ts, web/src/gestion.css

Reglas del front:
- Nada de prompt(), alert() ni confirm().
- Botones de al menos 44 px, etiquetas visibles en cada campo y foco visible.
- Textos en español, iguales al diseño. Los colores salen de las variables de estilos.css.
- Nada de dependencias nuevas.

TDD para gestion.ts. `cd web && npm ci`.

Verificación obligatoria antes del commit:
- `cd web && npm test` (todas en PASS)
- `cd web && npm run tipos` (sin errores)
- `cd web && npm run build` (sin errores)

Para verlo en vivo:
1. `docker compose -f db/docker-compose.yml up -d`
2. `cd api && npm run dev`
3. `cd web && npm run dev`
4. Entra como `caribe` / `circulante` y como `caribe` / `coordinador`, con la clave CLAVE_DEMO de api/src/siembra.ts.

Recorre el inicio, el panel con filtros y paginación, y la trazabilidad de una cirugía realizada. Abre el CSV del consumo en Excel.

Commit: «feat(web): agregar login, inicio, panel con filtros y trazabilidad con consumo».
Después: `git pull --rebase origin main && git push origin HEAD:main`.

Al terminar, reporta:
- los archivos y la salida de las tres verificaciones;
- qué comparaste a ojo y qué no quedó igual al diseño;
- las desviaciones del plan, con su motivo.
```
