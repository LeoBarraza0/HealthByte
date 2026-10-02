# Ola 3 rápida: entrega en 1:30

Este archivo **reemplaza el reparto de [ola-3.md](ola-3.md)**. Las Tareas 21 a 25 del plan siguen valiendo como referencia de código.

**Objetivo:** el producto completo desplegado y probándose en Cloud Run mientras se construye. Cada pieza que funciona se sube a `main` y se redespliega.

| Agente | Trabajo | Prompt |
| --- | --- | --- |
| Codex 1, ya corriendo | Landing, login visual y despliegue | Le envías el «Mensaje para el Codex que ya corre» |
| Codex 2 | Todo el backend: voz en el servidor, panel, insumos, eventos y consumo por voz | Prompt BACKEND |
| Antigravity 1 | Marco de la sesión: cabecera, línea de tiempo, barra de voz con Conti y micrófono | Prompt SESIÓN |
| Antigravity 2 | Bloques de la sesión: checklist, alertas, protocolo de conteo, panel lateral y consumo | Prompt BLOQUES |
| Codex 3 | Inicio, panel de gestión y trazabilidad | Prompt GESTIÓN |

Si solo tienes tres agentes libres además del Codex 1: BACKEND, GESTIÓN, y SESIÓN y BLOQUES en el mismo agente, uno detrás del otro, empezando por SESIÓN.

## Reglas de esta ola (van dentro de cada prompt)

- **`main` se despliega, así que nunca se rompe.** Antes de cada push se corre `npm run tipos`, `npm test` y, en `web`, `npm run build`.
- **Commits chicos, cada 15 o 20 minutos:** lo que ya funciona se sube.
- **A los 60 minutos se sube lo que haya,** aunque falte algo, siempre que compile.
- **Si algo bloquea más de 10 minutos,** se hace la versión más simple que funcione y se anota en el reporte.
- **Cada agente toca solo sus archivos.** `api/src/tipos.ts`, `web/src/estilos.css`, `web/src/props.ts`, `useSesion.ts`, `etiquetas.ts`, `api.ts`, `microfono.ts` y `estadoConti.ts` no se modifican.
- **Las pantallas a construir** están en `Diseño/pantallas/*.html`: se abren en el navegador y se copian la estructura, los textos y las medidas.

---

## Mensaje para el Codex que ya corre (landing, login y despliegue)

```text
Coordinación: además de ti, hay cuatro agentes trabajando en paralelo en este repo. Para no chocar:

TUS archivos:
- web/src/Landing.tsx y su CSS
- web/src/Login.tsx y su CSS
- web/src/App.tsx, solo para las rutas de la landing y el login
- los documentos del pitch
- infra/ y los scripts de despliegue
- la sección de despliegue del README

NO toques:
- web/src/Sesion.tsx, Cabecera.tsx, Pista.tsx, BarraVoz.tsx, marco*, Ahora.tsx, Atencion.tsx, Lateral.tsx, Consumo.tsx, bloques*
- web/src/Inicio.tsx, Panel.tsx, Trazabilidad.tsx, CabeceraGestion.tsx, gestion*
- nada de api/src

Rutas (en App.tsx):
- `/` sin sesión → Landing. Su botón lleva a `/entrar`.
- `/entrar` → Login. Si ya hay sesión, redirige a `/`.
- `/` con sesión → Inicio, como está hoy.
- No cambies `/sesion/:id`, `/panel` ni `/trazabilidad/:id`.

Login:
- `POST /api/login` con { clinica, usuario, clave }. Si sale bien, `location.assign('/')`.
- Si falla, el mensaje es: «La clínica, el usuario o la contraseña no coinciden. Revise los tres y vuelva a intentar.»
- El diseño está en Diseño/pantallas/Login.html, con Conti en `greeting`: `<hb-conti state="greeting">`; conti.js ya está cargado en index.html.

Despliegue:
1. USA la infraestructura que ya existe en infra/ (main.tf y servicios.tf, ya validados). No escribas Terraform nuevo para lo que ya está.
2. Sigue el README y el plan (docs/superpowers/plans/…, Tarea 16 paso 3 y la sección «Desplegar en GCP»).
3. SOLO la cuenta personal juniorrdsr12@gmail.com (configuración de gcloud `healthbyte`), nunca la corporativa. Terraform tiene una guardia con `cuenta_esperada`: no la quites.
4. El usuario te autoriza `terraform apply`, `gcloud builds submit` y `gcloud run` para este despliegue. `terraform destroy` no.
5. Empieza YA el `terraform apply` de la base: Cloud SQL tarda entre 10 y 15 minutos en crearse.
6. Antes de aplicar los servicios, el secreto `jev-api-key` necesita una versión. Pídele al usuario que la cargue con `gcloud secrets versions add jev-api-key --data-file=-`. La clave nunca va al repo ni a un archivo versionado.
7. Crea `infra/desplegar.ps1`, que en un solo comando:
   - exporta `GOOGLE_OAUTH_ACCESS_TOKEN` con la configuración healthbyte;
   - toma `TAG = git rev-parse --short HEAD`;
   - corre `gcloud builds submit` con cloudbuild.yaml;
   - corre `terraform -chdir=infra apply -var tag=$TAG -auto-approve`;
   - imprime `web_url`.
   Súbelo a main.
8. Cuando esté arriba, dile al usuario la URL web.
9. Cada 20 minutos haz `git pull --rebase origin main`, redespliega con `infra/desplegar.ps1` y avisa qué quedó arriba.

Antes de cada push: `cd web && npm run tipos && npm test && npm run build`. main se despliega: no lo rompas.
```

### Segundo mensaje para el Codex que ya corre (rebase)

```text
Tu worktree salió de un commit anterior al esqueleto del front. Antes de tu próximo push:
1. `git pull --rebase origin main`. main ya tiene web/index.html, src/main.tsx, src/App.tsx, src/estilos.css, src/props.ts y public/favicon.svg.
2. Si choca web/index.html, quédate con el tuyo: ya tiene #raiz, /src/main.tsx y conti.js.
3. En App.tsx agrega solo la Landing y `/entrar` sobre lo que ya hay.
4. No subas terraform.tfstate. Revisa si los web/public/conti/*.webp.json hacen falta; si no, no los subas.
5. Tu Cloud Run de solo web (infra/web-publica) sirve para mostrar la landing ya. Para que el login y el quirófano funcionen, levanta también infra/ (API y Cloud SQL) como dice el mensaje de coordinación, y después apunta el dominio que compartas a ese web.
```

---

## Prompt BACKEND

```text
Trabajas en el repo HealthByte (rama main, tu propio worktree). Es el backend multi-clínica de un tablero de seguridad quirúrgica que se llena por voz:
- el micrófono de la tablet manda audio por WebSocket;
- Chirp 3 (Google Speech-to-Text V2) lo transcribe;
- Jev (TypeSafe AI) interpreta cada frase;
- el servidor registra eventos inmutables en Postgres, con Row-Level Security por clínica.

Hay una entrega en 1:30 y el producto ya se está desplegando en Cloud Run. Otros cuatro agentes trabajan en paralelo en el front. main se despliega: nunca lo rompas.

Preparación (5 minutos, no más):
1. `git pull --rebase origin main`. Lee AGENTS.md: sus reglas valen, salvo lo que este prompt diga explícitamente.
2. Docker Desktop: `docker compose -f db/docker-compose.yml up -d`.
3. `cd api && npm ci`. No instales dependencias. `api/.env` ya existe; si no, cópialo de `.env.example`.
4. Lee:
   - en el plan (docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md): la Tarea 10 (pasos 6 y 7), la Tarea 11 (pasos 4 y 5) y la sección final «Ola 3», con su base y las Tareas 21 y 22. Ahí está casi todo el código que necesitas, listo para copiar;
   - api/src/tipos.ts (el contrato; no lo modifiques), api/src/insumos.ts (el catálogo) y api/src/app.ts.

Trabajo, EN ESTE ORDEN DE PRIORIDAD. Cada punto se sube apenas funciona.

1. VOZ EN EL SERVIDOR. Es lo más importante para la demo desplegada.
   - Reemplaza api/src/server.ts por la versión de la Tarea 10, paso 6, que conecta `interpretar` con Jev (`crearJev(process.env.JEV_API_KEY ?? '')`) y `abrirVoz` con `crearCanalVoz({ ...eventos, frases, proyecto })`.
   - Revisa que las firmas coincidan con jev.ts, interprete.ts y voz.ts tal como están hoy; si no coinciden, adapta server.ts, no esos archivos.
   - Si `JEV_API_KEY` está vacía, el servidor igual tiene que arrancar: el registro manual siempre funciona.
   - Verifica que `npm run dev` arranque y que `curl localhost:8080/api/salud` responda `{"ok":true}`.
   Commit: «feat(api): conectar Jev y Chirp 3 al servidor». Push.

2. PANEL. La Tarea 11, pasos 4 y 5: `cargarEstados` en repo.ts, `GET /api/panel?dias=` en app.ts y la prueba en app.dbtest.ts. panel.ts ya calcula todo; no lo cambies.
   Commit: «feat(api): exponer el panel de gestión». Push.

3. INSUMOS Y EVENTOS COMPLETOS. La Tarea 21 completa, con el código del plan:
   - `sembrarInsumos()`, llamada en las dos salidas de `sembrar()`;
   - `estado.insumos` en `cargarEstado`;
   - `eventosDe()` y `GET /api/cirugias/:id/eventos`;
   - los nombres de los insumos en el vocabulario de Chirp, en sesion.ts;
   - sus dos pruebas de base de datos.
   Commit: «feat(api): sembrar el catálogo de insumos y exponer los eventos completos». Push.

4. CONSUMO POR VOZ. La Tarea 22 completa:
   - la intención `consumo` en preguntas.ts;
   - una pregunta Choice `insumo` sobre los nombres de `estado.insumos`, con el patrón `opciones()` que ya usan hitos y mediciones, máximo 254 opciones más `ninguno`;
   - en interprete.ts, la cantidad la saca el CÓDIGO con `primerNumero` de numeros.ts, y vale 1 si no hay número;
   - un insumo `ninguno` o un catálogo vacío dan `{ accion: 'ignorar', no_entendido: true }`;
   - las pruebas: «consumo, dos pares de guantes» → Guantes, par ×2; «se usó una sonda Foley» → ×1; catálogo vacío → no_entendido;
   - en api/scripts/frases-oro.json, las frases del guion: «Cambiamos a clindamicina» (check del antibiótico), «Consumo, dos pares de guantes», «Se usó el intensificador de imagen» y «Entran tres agujas de sutura» (conteo, no consumo).
   Commit: «feat(api): interpretar el consumo de insumos dictado». Push.

5. HISTORIAL MÁS RICO, para que la trazabilidad y el panel se vean vivos. En siembra.ts, a cada cirugía REALIZADA del historial agrégale entre 3 y 6 eventos `consumo`:
   - con nombres de `INSUMOS`, cantidades de 1 a 8, origen 'manual' y la hora dentro de la cirugía;
   - de forma determinista, con el generador `r()` que ya usa la siembra.
   No cambies cuántas cirugías se siembran: hay pruebas que las cuentan.
   Commit: «feat(api): sembrar consumo en el historial». Push.

6. Si sobra tiempo: crea api/scripts/probar-voz.ts (Tarea 10, paso 7). Córrelo solo si `api/.env` tiene `GOOGLE_CLOUD_PROJECT` y hay credenciales de la cuenta personal. No ejecutes comandos de gcloud.

3b. INSTRUMENTAL EN LA VOZ (va justo después del punto 3, con el mismo patrón). El orquestador ya dejó en main:
   - api/src/instrumentos.ts (`INSTRUMENTOS`);
   - la tabla `instrumento` (clinica_id, codigo, nombre, categoria);
   - `EstadoCirugia.instrumentos`;
   - api/src/correccion.ts, con `corregir(frase, nombres)` y sus pruebas.
   No modifiques correccion.ts ni instrumentos.ts. Si encuentras un falso positivo, repórtalo con la frase exacta.
   - siembra.ts: `sembrarInstrumentos()`, igual que `sembrarInsumos()`, con `ON CONFLICT (clinica_id, codigo) DO NOTHING`, llamada en las dos salidas de `sembrar()`. Prueba en siembra.dbtest.ts: cada clínica tiene `INSTRUMENTOS.length` instrumentos.
   - repo.ts, en `cargarEstado`: `estado.instrumentos = (await c.query('SELECT codigo, nombre, categoria FROM instrumento ORDER BY nombre')).rows`.
   - sesion.ts:
     - el vocabulario de Chirp suma también `s.estado.instrumentos.map(i => i.nombre)`, antes de cortar a 1000;
     - en `alFinal`, antes de interpretar: `const frase = corregir(texto, s.estado.instrumentos.map(i => i.nombre))`. Usa `frase` para interpretar, para el `texto` del evento guardado y para el mensaje `{ tipo: 'voz', texto }`.
   - Prueba en sesion.test.ts: con instrumentos en el estado falso, la frase final «se cayó la pinza queli» llega a interpretar como «se cayó la Pinzas Kelly».
   Commit: «feat(api): usar el catálogo de instrumental en la voz». Push.

Solo puedes crear o modificar estos archivos:
api/src/server.ts, api/src/repo.ts, api/src/app.ts, api/src/app.dbtest.ts, api/src/siembra.ts, api/src/siembra.dbtest.ts, api/src/sesion.ts, api/src/preguntas.ts, api/src/interprete.ts, api/src/interprete.test.ts, api/scripts/frases-oro.json, api/scripts/probar-voz.ts

Antes de CADA push, todo en verde:
- `cd api && npm test`
- `cd api && npm run test:db` (si la base vieja estorba: `docker compose -f db/docker-compose.yml down -v` y súbela de nuevo)
- `cd api && npm run tipos`

Después: `git pull --rebase origin main && git push origin HEAD:main`. Si tras el rebase algo falla por un archivo que no es tuyo, no lo arregles: repórtalo.

Reglas de tiempo:
- Si algo te bloquea más de 10 minutos, haz la versión más simple que funcione, anótalo y sigue con el siguiente punto.
- A los 60 minutos sube lo que tengas, siempre que pase las verificaciones.
- Commits en español, Conventional Commits y SIN atribución a IA.

Al terminar, reporta:
- qué puntos quedaron y cuáles no;
- la salida de las verificaciones;
- las desviaciones del plan, con su motivo.
```

---

## Prompt SESIÓN

```text
Trabajas en el repo HealthByte (rama main, tu propio worktree). Es el front (React 19 + Vite + TypeScript, sin librería de componentes) de un tablero de seguridad quirúrgica:
- el equipo dicta en voz alta y el tablero registra cada verificación;
- se ve en vivo en una TV de pared (modo pared: solo muestra, letra grande) y en la tablet de la circulante (modo tablet: controles táctiles);
- todo se sincroniza por WebSocket.

Hay una entrega en 1:30 y el producto ya se está desplegando en Cloud Run. main se despliega: nunca lo rompas.

Tu parte es el MARCO de la sesión en vivo:
- la cabecera del paciente;
- la línea de tiempo con las 5 horas y los 4 momentos;
- la barra de voz con Conti, la mascota, el micrófono y la confirmación Sí o No;
- dónde va cada bloque.
Los bloques de adentro (`<Ahora>`, `<Atencion>` y `<Lateral>`) los construye OTRO agente en paralelo. Úsalos tal como están en web/src (hoy son componentes vacíos con `PropsBloque`) y no los modifiques.

Preparación (5 minutos):
1. `git pull --rebase origin main`. Lee AGENTS.md.
2. `cd web && npm ci`. No instales dependencias.
3. Abre en el navegador las pantallas que vas a construir:
   - Diseño/pantallas/Tablet-Registro.html (tablet, 1180×820);
   - Pared-Entrada.html, Pared-Inicio.html, Pared-Alergia.html, Pared-Durante.html y Pared-Salida.html (pared, 1920×1080).
   Tu parte es el `<header>`, la sección «Momentos de la cirugía» y la sección «Registro por voz» de abajo. Copia la estructura, los textos y las medidas.
4. Lee:
   - Diseño/conti-estados.md (cuándo cambia Conti);
   - web/src/useSesion.ts (el hook de conexión: estado, microfono, pendiente, parcial, ultimoParcial, ultimaVoz, aviso, dispositivo, enviar, enviarAudio);
   - web/src/microfono.ts (`iniciarMicrofono(enviarAudio, umbral, onNivel)`);
   - web/src/estadoConti.ts (`estadoConti(señales)`);
   - web/src/etiquetas.ts (`HORAS`, `hora()`, `describir()`, `preferencia()`, `guardarPreferencia()`);
   - web/src/props.ts, web/src/App.tsx y web/src/estilos.css (las variables de color);
   - api/src/tipos.ts: `EstadoCirugia`, `MsgCliente`, `DatosEvento` y `HoraId`.
5. Lee en el plan la Tarea 14, paso 5: la lógica exacta del micrófono (tomar y soltar, umbral, si otro dispositivo lo toma).

Contrato que no cambia:
- `export function Sesion({ cirugiaId, yo }: { cirugiaId: string; yo: Sesion })`, en web/src/Sesion.tsx.
- Modo: `preferencia('hb_pared') === '1'` es pared; si no, tablet.
- El nodo raíz lleva `className={`sesion ${modo}`}`. Los bloques del otro agente se estilizan con `.sesion.pared` y `.sesion.tablet`.
- `const registrar = (datos: DatosEvento) => s.enviar({ tipo: 'registrar', datos })`. Pásaselo a Ahora, Atencion y Lateral junto con estado y modo.

Trabajo, EN ESTE ORDEN DE PRIORIDAD. Cada punto se sube apenas funciona.

1. ESQUELETO VISIBLE:
   - Sesion.tsx con useSesion. Mientras no hay estado, «Conectando…».
   - Las cuatro filas:
     - `<Cabecera>`;
     - `<Pista>`;
     - `<main>` con dos columnas: izquierda `<Ahora/>`; derecha `<aside>` con `<Atencion/>` y `<Lateral/>`. La columna derecha mide unos 400 px en tablet y unos 620 px en pared;
     - `<BarraVoz>`.
   - En tablet, la cabecera tiene «Deshacer» (`enviar({ tipo: 'deshacer' })`) y un botón de solo icono «Modo pared», con aria-label, que alterna `hb_pared`.
   - Cabecera:
     - el nombre del paciente;
     - la alergia en una ficha roja con ícono, si `estado.datos.alergias` dice algo distinto de vacío o «ninguna»;
     - edad, documento y HC;
     - procedimiento, sitio y lateralidad;
     - quirófano;
     - el reloj HH:MM, que se actualiza cada 30 s.
   - Pista: 5 nodos (Ingreso, Anestesia, Incisión, Fin, A recuperación) con su hora, y 4 tramos (Entrada, Inicio, Durante, Salida) con los minutos; el tramo actual se resalta como «ahora». En tablet, la próxima hora sin registrar es un botón «Marcar», que envía `{ tipo: 'hora', hora }`.
   Commit: «feat(web): armar la sesión en vivo con cabecera y línea de tiempo». Push.

2. BARRA DE VOZ:
   - Conti: `<hb-conti state={estadoConti(...)}>`, con 112 px en pared y 64 px en tablet. El tipo ya está en conti.d.ts.
   - Las señales de Conti salen de funciones puras en web/src/marco.ts, con prueba en web/src/marco.test.ts (TDD):
     - `nuevaCritica(antes, ahora)` da `true` si apareció una alerta crítica abierta que antes no estaba; guarda Date.now() como `ultimaAlertaCritica`;
     - `cierreSeguro(estado)` da `true` si hay `salida_recuperacion` y ninguna alerta abierta.
   - En tablet:
     - el botón del micrófono, «Micrófono activo» o «Activar micrófono», con la lógica de la Tarea 14, paso 5;
     - la sensibilidad (range) con `hb_umbral`;
     - si otro dispositivo escucha: «Escucha: {s.microfono}».
   - El texto parcial en vivo, entre comillas.
   - Si hay `pendiente`: «¿Registrar esto?», con el resumen y los botones Sí y No (`enviar({ tipo: 'confirmar', si })`).
   - Si no hay pendiente: el último evento registrado (`describir`), la hora y «Deshacer».
   - Los `aviso` del hook se muestran aquí.
   - En pared no hay controles: solo Conti, el estado en palabras («Escuchando», «Alerta abierta», «Escucha: Tablet 3F») y el texto.
   - Sin alert(): si el micrófono no abre, el texto en la barra es «No se pudo abrir el micrófono. Revise el permiso del navegador.».
   Commit: «feat(web): agregar la barra de voz con Conti y el micrófono». Push.

3. PULIDO CONTRA EL DISEÑO, en los dos tamaños:
   - tipografías (Space Grotesk en títulos, IBM Plex Sans en el resto) y cifras tabulares;
   - colores con las variables de estilos.css;
   - foco visible y botones de al menos 44 px;
   - `prefers-reduced-motion`, que ya está en la base.
   Commit: «style(web): ajustar la sesión al diseño». Push.

Solo puedes crear o modificar estos archivos:
web/src/Sesion.tsx, web/src/Cabecera.tsx, web/src/Pista.tsx, web/src/BarraVoz.tsx, web/src/marco.ts, web/src/marco.test.ts, web/src/sesion.css

Para verlo en vivo:
1. `docker compose -f db/docker-compose.yml up -d`
2. `cd api && npm run dev`
3. `cd web && npm run dev`
4. Abre http://localhost:5173, entra con clínica `caribe`, usuario `circulante` y la clave CLAVE_DEMO de api/src/siembra.ts.
5. Abre la Revascularización miocárdica.
6. Abre una segunda pestaña en la misma cirugía: lo que marcas en una aparece en la otra.

Antes de CADA push: `cd web && npm run tipos && npm test && npm run build`, todo en verde. Después: `git pull --rebase origin main && git push origin HEAD:main`.

Reglas:
- Nada de prompt(), alert() ni confirm().
- Textos en español, iguales al diseño.
- Si algo te bloquea más de 10 minutos, haz la versión más simple y sigue.
- A los 60 minutos sube lo que tengas, siempre que compile.
- Commits en español, Conventional Commits y SIN atribución a IA.

Al terminar, reporta:
- qué quedó y qué no;
- qué no se parece al diseño;
- la salida de las verificaciones.
```

---

## Prompt BLOQUES

```text
Trabajas en el repo HealthByte (rama main, tu propio worktree). Es el front (React 19 + Vite + TypeScript, sin librería de componentes) de un tablero de seguridad quirúrgica:
- el equipo dicta en voz alta y el tablero registra cada verificación como un evento;
- se ve en vivo en una TV de pared (modo pared: solo muestra) y en la tablet de la circulante (modo tablet: con controles);
- ninguna alerta bloquea: se resuelve o se cierra con un motivo.

Hay una entrega en 1:30 y el producto ya se está desplegando en Cloud Run. main se despliega: nunca lo rompas.

Tu parte son los BLOQUES de adentro de la sesión:
- `Ahora`: la columna izquierda, con el momento actual;
- `Atencion`: «Requiere atención», con el diálogo de cerrar con motivo y el protocolo de conteo;
- `Lateral`: equipo, material o resumen, según el momento;
- `Consumo`: el panel de la hoja de consumo.
El MARCO (Sesion.tsx, la cabecera, la línea de tiempo y la barra de voz) lo construye OTRO agente en paralelo: no lo toques. Él monta tus componentes así: `<Ahora estado modo registrar/>`, y en la columna derecha `<Atencion …/>` y `<Lateral …/>`. El nodo raíz lleva la clase `sesion pared` o `sesion tablet`.

Preparación (5 minutos):
1. `git pull --rebase origin main`. Lee AGENTS.md.
2. `cd web && npm ci`. No instales dependencias.
3. Abre en el navegador:
   - Diseño/pantallas/Tablet-Registro.html, Tablet-Cerrar-Alerta.html, Tablet-Conteo.html y Tablet-Consumo.html (tablet, 1180×820);
   - las cinco Pared-*.html (pared, 1920×1080).
   Lo tuyo es lo que está entre la línea de tiempo y la barra de voz. Copia la estructura, los textos y las medidas.
4. Lee:
   - api/src/tipos.ts: `EstadoCirugia`, `DatosEvento`, `Alerta`, `Check`, `LineaConsumo`, `Insumo` y `AccionConteo`. No lo modifiques;
   - api/src/protocolos.ts: fases, ítems con su rol y si son críticos, materiales, hitos y mediciones;
   - api/src/alertas.ts: los id de las alertas. `dato:<campo>` es un dato faltante, `conteo:<material>` un descuadre, `critico:<fase>.<item>` un crítico pendiente; también están `betalactamico` y `alergia`;
   - web/src/props.ts (`PropsBloque { estado, modo, registrar }`), web/src/etiquetas.ts (`describir`, `hora`, `ROLES`) y web/src/estilos.css.

Eventos que envías con `registrar(datos)`:
- `{ tipo: 'check', fase, item, valor: 'si' | 'no' | 'na' }`
- `{ tipo: 'conteo', material, cantidad }`: positiva entra, negativa sale
- `{ tipo: 'hito', hito }`
- `{ tipo: 'presente', usuario_id, rol }`
- `{ tipo: 'dato', campo, valor }`
- `{ tipo: 'alerta_cierre', alerta, motivo }`
- `{ tipo: 'accion_conteo', accion: 'cirujano_avisado' | 'busqueda_en_campo' | 'rx_solicitada' }`
- `{ tipo: 'consumo', insumo, cantidad }`: entero distinto de 0; −1 corrige
En modo pared NO hay botones.

Trabajo, EN ESTE ORDEN DE PRIORIDAD. Cada punto se sube apenas funciona.

1. AHORA (el checklist). Lo que más se usa en la demo.
   - La fase es `estado.fase_actual`. Si es null, antes del ingreso se muestra la primera fase; si ya hay `salida_recuperacion`, un resumen.
   - Título con el nombre de la fase y «N de M verificados», con barra segmentada.
   - «Falta verificar» primero y grande: el texto del ítem, quién lo confirma y una marca «Crítico» si lo es. En tablet, tres botones: «Verificado», «No coincide» y «No aplica».
   - «Verificado» compacto: ✓, el texto, y a la derecha el rol, la hora y el ícono del origen (micrófono si `origen === 'voz'`, lápiz si es manual). Busca el evento del check en `estado.eventos`.
   - En la fase durante la cirugía (fíjate en sus `id` en protocolos.ts):
     - los hitos de la especialidad, con su hora o, en tablet, un botón para marcarlos;
     - las mediciones con su último valor;
     - las novedades.
   - En la Salida:
     - la tabla del material (entró, salió y resultado «Cuadra» o «Falta N», en rojo si falta), con −1 y +1 en tablet, que envían `conteo` con −1 o +1 (entra o sale);
     - los pendientes en una rejilla de 2 columnas.
   - Funciones puras en web/src/bloques.ts, con prueba en web/src/bloques.test.ts (TDD): `pendientes(estado, faseId)` y `verificados(estado, faseId)`.
   Commit: «feat(web): mostrar el checklist del momento actual». Push.

2. ATENCIÓN:
   - Las alertas abiertas de `estado.alertas`, críticas primero: un octágono rojo con «!» para las críticas y un triángulo ámbar para las advertencias; siempre ícono y texto, nunca solo color.
   - El contador en un círculo rojo.
   - Sin alertas abiertas: «Sin alertas abiertas».
   - En tablet, «Cerrar con motivo» abre el diálogo de Tablet-Cerrar-Alerta.html:
     - motivos con radio («Lo indicó la cirujana», «Se administró antes de ingresar a sala», «No aplica para este procedimiento», «Otro motivo») y el detalle opcional;
     - «Cerrar alerta» envía `alerta_cierre`, con motivo y detalle unidos por « — »;
     - `role="dialog"`, `aria-modal`, Escape cierra y el foco vuelve al botón que lo abrió.
   - Para alertas `dato:<campo>`, el botón «Registrar dato» abre un diálogo con un campo y envía `{ tipo: 'dato', campo, valor }`; si el campo es numérico, conviértelo a número.
   Commit: «feat(web): mostrar y cerrar alertas con motivo». Push.

3. PROTOCOLO DE CONTEO. Si hay una alerta abierta con id que empieza por `conteo:`, muestra la tarjeta de Tablet-Conteo.html en Atencion:
   - el material, cuánto entró y cuánto salió;
   - 3 pasos: «Avisar a la cirujana», «Buscar en campo, cubetas y canecas» y «Solicitar Rx intraoperatoria». Cada uno queda hecho con su hora si está en `estado.acciones_conteo`;
   - en tablet, los botones «Cirujana avisada», «Marcar búsqueda hecha» y «Rx solicitada», que envían `accion_conteo`.
   En tablet, mientras se ve el protocolo, Lateral puede devolver null.
   Función pura `pasosConteo(estado)` en bloques.ts, con prueba.
   Commit: «feat(web): agregar el protocolo de conteo». Push.

4. LATERAL, según el momento:
   - Antes de la anestesia: «Equipo en sala». Cada rol de `estado.cirugia.equipo_programado` con su nombre y si está en `estado.presentes`. En tablet, «Marcar presente» envía `presente`.
   - Antes de la incisión y durante la cirugía: «Material en campo», con lo que hay en el campo por material (`estado.conteo`, entra menos sale). Si no hay nada: «Todavía no entra material. Dígalo en voz alta o regístrelo aquí.». En tablet, «Registrar entrada de material» abre un diálogo con material (select de `estado.protocolo.materiales`) y cantidad, y envía `conteo`.
   - Antes de salir: «Hasta ahora», con las horas, las alertas resueltas y cerradas, y cuántos insumos hay en la hoja.
   - En tablet, siempre: el botón «Consumo (N)», donde N es `estado.consumo.length`, que abre `<Consumo>`.
   Commit: «feat(web): agregar el panel lateral según el momento». Push.

5. CONSUMO. En web/src/Consumo.tsx, con props `{ estado, registrar, onCerrar }`, el panel lateral de Tablet-Consumo.html:
   - Las líneas registradas, las de `estado.consumo` con `del_conteo === false`, cada una con −1 y +1 que envían `consumo` con −1 o 1.
   - Las del conteo, `del_conteo === true`, como fichas de solo lectura: «Del conteo de material, se suma solo».
   - La búsqueda en `estado.insumos`, con filtro por categoría (Todos, Generales, Suturas, Otros, Equipos) y «+1» por resultado; si un insumo ya está registrado, «ya registrada: N».
   - Al pie: «También se dicta: «consumo, dos pares de guantes».» y el botón «Listo».
   - Escape cierra.
   - `buscarInsumos(insumos, texto, categoria)` en bloques.ts, con prueba: ignora tildes y mayúsculas; «bisturi» encuentra «Hoja de bisturí».
   Commit: «feat(web): agregar la hoja de consumo en la tablet». Push.

Solo puedes crear o modificar estos archivos:
web/src/Ahora.tsx, web/src/Atencion.tsx, web/src/Lateral.tsx, web/src/Consumo.tsx, web/src/bloques.ts, web/src/bloques.test.ts, web/src/bloques.css. Importa bloques.css desde tus componentes.

Para verlo en vivo:
1. `docker compose -f db/docker-compose.yml up -d`
2. `cd api && npm run dev`
3. `cd web && npm run dev`
4. Entra en http://localhost:5173 como `caribe` / `circulante`, con la clave CLAVE_DEMO de api/src/siembra.ts.
5. Abre la Revascularización miocárdica.
Si el marco del otro agente todavía no llegó a main, monta tus bloques con un archivo temporal en tu worktree, y NO lo subas.

Recorre la demo:
- marca ítems;
- cierra una alerta con motivo;
- registra «entran 10 compresas» y «salen 9», y sigue el protocolo;
- registra consumo.

Antes de CADA push: `cd web && npm run tipos && npm test && npm run build`, todo en verde. Después: `git pull --rebase origin main && git push origin HEAD:main`.

Reglas:
- Nada de prompt(), alert() ni confirm().
- Botones de al menos 44 px.
- Textos en español, iguales al diseño.
- Si algo te bloquea más de 10 minutos, haz la versión más simple y sigue.
- A los 60 minutos sube lo que tengas, siempre que compile.
- Commits en español, Conventional Commits y SIN atribución a IA.

Al terminar, reporta:
- qué quedó y qué no;
- qué no se parece al diseño;
- la salida de las verificaciones.
```

---

## Prompt GESTIÓN

```text
Trabajas en el repo HealthByte (rama main, tu propio worktree). Es el front (React 19 + Vite + TypeScript, sin librería de componentes) de un tablero de seguridad quirúrgica multi-clínica. Tu parte son las pantallas fuera del quirófano:
- el inicio con las cirugías de hoy;
- el panel de gestión;
- la trazabilidad de cada cirugía, con la hoja de consumo.

Hay una entrega en 1:30 y el producto ya se está desplegando en Cloud Run. main se despliega: nunca lo rompas.

OJO, coordinación con otros agentes:
- la landing y el Login los hace OTRO agente: no toques Login.tsx, Landing.tsx ni App.tsx;
- la sesión del quirófano (Sesion.tsx y sus bloques) la hacen otros dos agentes: no la toques.
Rutas, ya definidas en App.tsx:
- `/` con sesión → `<Inicio yo/>`;
- `/panel` → `<Panel yo/>`;
- `/trazabilidad/:id` → `<Trazabilidad cirugiaId yo/>`;
- `/sesion/:id` → la sesión.
Navegación con `<a href>`. «Salir» hace `POST /api/logout` y luego `location.assign('/')`.

Preparación (5 minutos):
1. `git pull --rebase origin main`. Lee AGENTS.md.
2. `cd web && npm ci`. No instales dependencias.
3. Abre en el navegador:
   - Diseño/pantallas/Inicio-Cirugias.html (tablet, 1180×820);
   - Panel.html (1440 de ancho);
   - Trazabilidad.html (1440 de ancho).
   Copia la estructura, los textos y las medidas.
4. Lee:
   - api/src/tipos.ts: `Sesion`, `CirugiaActiva`, `EstadoCirugia`, `Evento`, `Panel`, `LineaConsumo` y `Rol`. No lo modifiques;
   - api/src/app.ts, para las rutas;
   - web/src/api.ts (`api<T>(ruta, cuerpo?)`), web/src/etiquetas.ts (`describir`, `hora`, `ROLES`, `preferencia`, `guardarPreferencia`) y web/src/estilos.css.

Rutas del API:
- `GET /api/yo` devuelve `Sesion`.
- `GET /api/cirugias` devuelve las `CirugiaActiva[]` de hoy.
- `GET /api/cirugias/:id` devuelve `EstadoCirugia`.
- `GET /api/cirugias/:id/eventos` devuelve `Evento[]`, también los anulados. La agrega el agente de backend: si todavía devuelve 404, usa `estado.eventos`.
- `GET /api/panel?dias=1|7|30` devuelve `Panel`. También la agrega el backend: si devuelve 404, muestra «El panel se está desplegando».
- `POST /api/logout` cierra la sesión.
- `POST /api/demo/reiniciar` reinicia la demo; solo para coordinador o admin.

Trabajo, EN ESTE ORDEN DE PRIORIDAD. Cada punto se sube apenas funciona.

1. CABECERA E INICIO. Sin esto no se llega al quirófano.
   - web/src/CabeceraGestion.tsx:
     - el logo HealthByte, en SVG en línea, copiado del diseño;
     - el nombre de la clínica, si lo tienes;
     - el menú «Cirugías de hoy» (`/`), y además «Panel de gestión» (`/panel`) si el rol es `coordinador` o `admin`;
     - el nombre del usuario y su rol (`ROLES`);
     - «Salir».
   - web/src/Inicio.tsx, igual que Inicio-Cirugias.html:
     - «Cirugías de hoy» en tarjetas: quirófano grande, procedimiento, paciente, especialidad y hora, y «En curso» si `en_curso`. Cada tarjeta es un enlace a `/sesion/:id`;
     - a la derecha, «Este dispositivo»: el nombre visible (input guardado en `hb_dispositivo`) y «Se usa como» con radio Registro o Pared (guardado en `hb_pared`: '0' o '1'), con su explicación;
     - para coordinación o admin, el botón «Reiniciar demo», con un diálogo propio de confirmación (no confirm()).
   Commit: «feat(web): agregar el inicio con las cirugías de hoy». Push.

2. TRAZABILIDAD (web/src/Trazabilidad.tsx), igual que Trazabilidad.html:
   - la cabecera con el procedimiento, el paciente, la fecha, el quirófano y el estado;
   - el resumen: las horas y la duración;
   - el «Registro cronológico» agrupado por fase. Cada evento con hora, `describir()`, rol y origen (voz o manual). Los anulados, tachados con «Anulado» (cruza `anulacion.evento_id` con la lista completa de `/eventos`);
   - a la derecha: las alertas con su estado y su motivo, las novedades y los tiempos;
   - la sección NUEVA «Consumo de la cirugía»: una tabla con `estado.consumo` (Insumo, Cantidad, y «Del conteo» o «Registrado») y el botón «Descargar consumo (CSV)».
   Funciones puras en web/src/gestion.ts, con prueba en web/src/gestion.test.ts (TDD):
   - `csv(filas: (string | number)[][])`: separador `;`, comillas cuando hace falta, BOM `﻿` al inicio para Excel;
   - `csvConsumo(estado)`: primero las filas Paciente, Procedimiento, Fecha y Quirófano; una línea vacía; luego `Insumo;Cantidad;Origen`.
   Descarga con Blob y un `<a download>`.
   Commit: «feat(web): agregar la trazabilidad con la hoja de consumo». Push.

3. PANEL (web/src/Panel.tsx), igual que Panel.html:
   - el periodo con radiogroup Hoy, Semana o Último mes (dias 1, 7 o 30);
   - «Ahora en los quirófanos»: con `/api/cirugias` y el estado de cada cirugía activa (`/api/cirugias/:id`, como máximo 4), cada 30 s. Muestra el momento, «verificados N de M», las alertas abiertas y el tiempo en sala;
   - las 4 métricas: cumplimiento, riesgos atrapados, cerradas con motivo y tiempo quirúrgico promedio;
   - «Cumplimiento por pausa de verificación» con barras;
   - «Cuánto dura cada momento»;
   - «Lo que el tablero atrapó a tiempo», desde `atrapados`;
   - «Lo que quedó sin resolver», desde `alertas.frecuentes`;
   - «Cirugías del periodo»:
     - búsqueda por paciente o procedimiento;
     - filtros de quirófano, especialidad y protocolo (Cumplido o Incompleto, de `protocolo_cumplido`) y la casilla «Con alertas sin resolver»;
     - fichas de filtros activos con ×, y «Quitar filtros»;
     - «N cirugías de M»;
     - orden por fecha con botón;
     - paginación con Anterior, números y Siguiente, y 10, 25 o 50 por página;
     - «Exportar CSV» de lo filtrado;
     - cada fila es un enlace a `/trazabilidad/:id`.
   Funciones puras en gestion.ts, con prueba: `filtrar(lista, filtros)` y `paginar(lista, pagina, porPagina)`.
   Commit: «feat(web): agregar el panel de gestión con filtros y paginación». Push.

Solo puedes crear o modificar estos archivos:
web/src/CabeceraGestion.tsx, web/src/Inicio.tsx, web/src/Panel.tsx, web/src/Trazabilidad.tsx, web/src/gestion.ts, web/src/gestion.test.ts, web/src/gestion.css. Importa gestion.css desde tus componentes.

Para verlo en vivo:
1. `docker compose -f db/docker-compose.yml up -d`
2. `cd api && npm run dev`
3. `cd web && npm run dev`
4. Entra en http://localhost:5173 como `caribe` / `circulante` y como `caribe` / `coordinador`, con la clave CLAVE_DEMO de api/src/siembra.ts.
Si el login del otro agente todavía no está, inicia sesión con:
`fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clinica: 'caribe', usuario: 'coordinador', clave: '<CLAVE_DEMO>' }) })`
en la consola del navegador, y recarga.

Antes de CADA push: `cd web && npm run tipos && npm test && npm run build`, todo en verde. Después: `git pull --rebase origin main && git push origin HEAD:main`.

Reglas:
- Nada de prompt(), alert() ni confirm().
- Botones de al menos 44 px, etiquetas visibles en cada campo y foco visible.
- Textos en español, iguales al diseño.
- Si algo te bloquea más de 10 minutos, haz la versión más simple y sigue.
- A los 60 minutos sube lo que tengas, siempre que compile.
- Commits en español, Conventional Commits y SIN atribución a IA.

Al terminar, reporta:
- qué quedó y qué no;
- qué no se parece al diseño;
- la salida de las verificaciones.
```

---

## Reparto de GESTIÓN entre los dos Antigravity (ya está el inicio)

El orquestador ya subió `Inicio.tsx`, `CabeceraGestion.tsx` (`<CabeceraGestion yo actual>` y `esCoordinacion`), `gestion.css` y `gestion.ts` (`csv`, `csvConsumo` y `descargar`, con sus pruebas). Esos archivos no se tocan: se importan.

### Prompt TRAZABILIDAD (Antigravity 1)

```text
Trabajas en el repo HealthByte (rama main, tu propio worktree). La entrega es en menos de 1 hora y main se despliega: nunca lo rompas. `git pull --rebase origin main`, `cd web && npm ci`.

Lee en docs/agentes/ola-3-rapida.md el «Prompt GESTIÓN» completo, para el contexto, las rutas del API y las reglas. Haz SOLO su punto 2, TRAZABILIDAD, con estos cambios:
- Usa `<CabeceraGestion yo={yo} actual="otra" />` de web/src/CabeceraGestion.tsx. Ya existe; no lo modifiques.
- Para el CSV usa `csvConsumo(estado)` y `descargar('consumo-<procedimiento>.csv', …)` de web/src/gestion.ts. Ya existen, con prueba; no los modifiques.
- Tus estilos van en web/src/trazabilidad.css, NO en gestion.css.
- Diseño: Diseño/pantallas/Trazabilidad.html. Tómale la estructura: cabecera de la cirugía, resumen, registro cronológico por fase con los anulados tachados y, a la derecha, alertas, novedades y tiempos. Suma la sección «Consumo de la cirugía», con su tabla y el botón «Descargar consumo (CSV)».
- Los eventos completos están en `GET /api/cirugias/:id/eventos` (ya existe); si falla, usa `estado.eventos`.
- Agrega un enlace «Abrir sesión» a `/sesion/:id`.

Solo puedes crear o modificar: web/src/Trazabilidad.tsx y web/src/trazabilidad.css

Antes de CADA push: `cd web && npm run tipos && npm test && npm run build`, todo en verde. Después: `git pull --rebase origin main && git push origin HEAD:main`. Haz commits pequeños: primero la tabla de consumo con el CSV, que es lo nuevo, y después el resto.

Commit: «feat(web): agregar la trazabilidad con la hoja de consumo». En español, sin atribución a IA.

Para verlo: `docker compose -f db/docker-compose.yml up -d`, `cd api && npm run dev` y `cd web && npm run dev`. Entra como caribe / coordinador con la clave CLAVE_DEMO de api/src/siembra.ts y abre /trazabilidad/<id> de una cirugía realizada; los id salen de GET /api/panel → lista.

Al terminar, reporta qué quedó, qué no y la salida de las verificaciones.
```

### Prompt PANEL (Antigravity 2)

```text
Trabajas en el repo HealthByte (rama main, tu propio worktree). La entrega es en menos de 1 hora y main se despliega: nunca lo rompas. `git pull --rebase origin main`, `cd web && npm ci`.

Lee en docs/agentes/ola-3-rapida.md el «Prompt GESTIÓN» completo, para el contexto, las rutas del API y las reglas. Haz SOLO su punto 3, PANEL, con estos cambios:
- Usa `<CabeceraGestion yo={yo} actual="panel" />` de web/src/CabeceraGestion.tsx. Ya existe; no lo modifiques.
- Para «Exportar CSV» usa `csv(filas)` y `descargar('cirugias.csv', …)` de web/src/gestion.ts. Ya existen; no los modifiques.
- Las funciones puras de la lista van en web/src/panelLista.ts, con prueba en web/src/panelLista.test.ts (TDD):
  - `filtrar(lista, filtros)`;
  - `paginar(lista, pagina, porPagina)`;
  - `opciones(lista)`, que da los quirófanos y especialidades que existen, para los select.
- Tus estilos van en web/src/panel.css, NO en gestion.css.
- Diseño: Diseño/pantallas/Panel.html.
- Prioridad si no alcanza el tiempo:
  1. las 4 métricas y «Cirugías del periodo» con filtros, paginación y enlace a /trazabilidad/:id;
  2. «Ahora en los quirófanos»;
  3. lo demás.

Solo puedes crear o modificar: web/src/Panel.tsx, web/src/panelLista.ts, web/src/panelLista.test.ts y web/src/panel.css

Antes de CADA push: `cd web && npm run tipos && npm test && npm run build`, todo en verde. Después: `git pull --rebase origin main && git push origin HEAD:main`. Haz commits pequeños: sube apenas la lista con filtros funcione.

Commit: «feat(web): agregar el panel de gestión con filtros y paginación». En español, sin atribución a IA.

Para verlo: `docker compose -f db/docker-compose.yml up -d`, `cd api && npm run dev` y `cd web && npm run dev`. Entra como caribe / coordinador con la clave CLAVE_DEMO de api/src/siembra.ts y abre /panel.

Al terminar, reporta qué quedó, qué no y la salida de las verificaciones.
```

---

## Lista para el compañero que prueba (en la URL desplegada)

Cada vez que el Codex 1 avise de un redespliegue:

1. **Landing y entrada.**
   - La landing abre sin sesión y su botón lleva al login.
   - Con `caribe`, `circulante` y la clave de la demo, entra.
   - Con una clave mala, muestra el mensaje de error y no entra.
2. **Inicio.**
   - Aparecen las cirugías de hoy y abren la sesión.
   - «Este dispositivo» guarda el nombre y el uso, registro o pared.
3. **Sesión en dos dispositivos** (un celular o una tablet, y un portátil en modo pared).
   - Lo que se marca en uno aparece en el otro en menos de un segundo.
   - Deshacer funciona.
4. **Guion de la demo.**
   - Se marcan los ítems.
   - La alerta de antibiótico aparece antes de la incisión.
   - «Entran 10 compresas» y luego «salen 9»: aparece el protocolo de conteo. Se marca «Cirujana avisada»; luego «salen 10» la resuelve.
   - Se cierra una alerta con motivo.
5. **Voz** (en Chrome, aceptando el permiso).
   - El micrófono se activa y el texto parcial aparece.
   - «Paciente en sala» registra la hora.
   - Una conversación cualquiera no registra nada.
   - Conti cambia de cara.
6. **Consumo.**
   - El botón «Consumo» abre la hoja; +1 y −1 funcionan.
   - Las compresas del conteo aparecen solas.
7. **Gestión,** entrando como `coordinador`.
   - El panel carga, con filtros y paginación.
   - Una fila abre su trazabilidad.
   - El CSV del consumo se descarga y abre en Excel.

Anota cada fallo con la URL, el paso, lo que esperabas y lo que pasó, y pásaselo al orquestador.
