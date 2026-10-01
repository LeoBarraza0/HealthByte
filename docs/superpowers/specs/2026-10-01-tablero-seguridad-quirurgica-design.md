---
fecha: 2026-10-01
estado: diseño aprobado por secciones, pendiente de revisión final
reto: Tablero Inteligente de Seguridad Quirúrgica (hackathon Universidad Libre)
---

# HealthByte: tablero inteligente de seguridad quirúrgica

Diseño del sistema que el equipo construirá en la hackathon (24 a 48 horas, prototipo
funcional). Sale de la sesión de definición del 1 de octubre de 2026. Insumos:

- El reto oficial, «Tablero Inteligente de Seguridad Quirúrgica».
- Los campos del tablero físico que hoy llena el equipo: [campos-tablero-fisico](../../../Notas/campos-tablero-fisico.md).
- La investigación previa (cifras D1 a D15): `Notas/problematicas-y-soluciones.md`, retirada del repo; consultarla con `git show 9b5024d^:Notas/problematicas-y-soluciones.md`.
- Las planillas que hoy llena el equipo de instrumentación en la clínica donde trabaja
  la instrumentadora del equipo, transcritas en `research/`:
  [Campos_tablero_quirurgico](../../../research/Campos_tablero_quirurgico.md), el tablero
  de la foto del reto con sus campos ya escritos, y
  [Control_consumos_cirugia](../../../research/Control_consumos_cirugia.md), la hoja con la
  que se calculan los gastos de los recursos usados en la cirugía (sección 2.6).
- El análisis crítico del equipo: [analisis_critico_requerimientos_vs_propuesta](../../../Notas/analisis_critico_requerimientos_vs_propuesta.md). Las decisiones que generó están al final del plan, en «Ola 2».

## 1. Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Rumbo | El núcleo es el reto oficial. De la investigación previa se reciclan el conteo con alerta (propuesta B) y las cifras del pitch. Se descartan el 3D y la visión por computador. |
| Tiempo | De 24 a 48 horas, con prototipo funcional. La demo es una cirugía de punta a punta con datos sembrados. |
| Dispositivos | Una sola vista de sesión, que funciona completa en un solo dispositivo (TV con mini-PC, tablet o portátil). Otros dispositivos pueden abrir la misma sesión como espejos en vivo. |
| Entrada | Voz con escucha continua. El instrumentador no toca ningún aparato. La circulante puede registrar y corregir con toques. |
| Voz a texto | Google Speech-to-Text V2, modelo `chirp_3`, `es-US`, en streaming, con el vocabulario del protocolo. El modelo `medical_conversation` no sirve porque solo existe en inglés. |
| Interpretación | Jev de TypeSafe AI (la clave ya está disponible). El respaldo ante cualquier falla es el registro manual. |
| Equipo quirúrgico | Viene de la programación. La circulante marca a los presentes; no hay QR ni PIN. |
| Alertas | Nunca bloquean el acto clínico. Una alerta crítica solo se cierra resolviéndola o con un motivo dictado, y queda en la trazabilidad. |
| Especialidad de la demo | La elige la instrumentadora. Se siembran cardiovascular (el caso de las fotos) y cirugía general. |
| Clientes | Multi-clínica (multi-tenant), con un protocolo configurable por clínica. |
| Stack | TypeScript: React con Vite en el front y Node en el API. Sin Next.js, porque todo es estado en vivo y el renderizado en servidor no aporta. |
| Nube | GCP, en la cuenta personal del usuario: dos servicios de Cloud Run (`web` y `api`) y Cloud SQL Postgres `db-f1-micro`, todo con Terraform. |
| Negocio | Suscripción por quirófano al mes, con niveles. Ruta: piloto, IPS medianas y luego redes de clínicas. |

## 2. Alcance

### 2.1 Vista de sesión del quirófano

Cualquier dispositivo con Chrome que abra la sesión de una cirugía tiene todo: el
tablero, los controles y el micrófono. La vista se adapta al tamaño de la pantalla.
En una pantalla grande prioriza la lectura a distancia, con letra grande y controles
discretos; en una tablet muestra controles táctiles.

Contenido de la vista:

- Paciente, procedimiento y lateralidad en grande, con los datos preoperatorios y la
  marca de los que faltan.
- El equipo programado, con la marca de los presentes.
- La fase actual del checklist y sus ítems.
- Las 5 horas: ingreso, anestesia, inicio de la cirugía, fin de la cirugía y salida a
  recuperación.
- El conteo de material con el balance de cada uno.
- La bitácora: hitos, mediciones y novedades con su hora.
- Las alertas abiertas, en rojo.
- La transcripción en vivo y el último registro, por ejemplo «Compresas +10 · 12:24:07».
- La confirmación pendiente, si la hay, por ejemplo «¿Registrar Compresas +10?».
- Botones para deshacer y para registrar a mano.

Hay **un solo micrófono activo por sesión**, para que nada se registre dos veces. El
dispositivo que lo activa lo toma, y los demás muestran desde dónde se está
escuchando.

> Requisito de hardware: las smart TV con navegador propio casi nunca dan acceso al
> micrófono. Lo realista es una TV con mini-PC o portátil por HDMI, más un micrófono
> USB o Bluetooth cerca del campo quirúrgico.

### 2.2 Panel de gestión

Cada clínica tiene el suyo. Lo usan la coordinación y el área de calidad. Ver la
sección 8.

### 2.3 Multi-clínica

Cada clínica tiene sus quirófanos, su personal, sus pacientes, sus cirugías y su
protocolo. La demo siembra dos clínicas con protocolos distintos y unas 60 cirugías
históricas por clínica.

### 2.4 Prioridades

| Prioridad | Contenido |
| --- | --- |
| **P0** | La sesión en vivo de una cirugía, en uno o varios dispositivos. La cadena voz → Chirp 3 → Jev → evento. El checklist de 3 fases. El conteo con alerta de discrepancia. Las 5 horas tomadas del reloj del servidor. Las alertas con cierre justificado. El registro manual y deshacer. El modelo multi-clínica con Row-Level Security. El login básico. La siembra de datos. El despliegue en GCP. |
| **P1** | El panel de gestión con indicadores y la línea de tiempo de cada cirugía. La hoja de consumo de la cirugía (2.6). |
| **P2** | Dar de alta una clínica en vivo durante el pitch, exportar la cirugía a PDF y completar la segunda especialidad. |
| Fuera de alcance | Integración con la historia clínica, modo sin conexión, formulario para programar cirugías (vienen sembradas), precios y costos de los insumos (los maneja cada institución), datos reales de pacientes y autenticación robusta (SSO o MFA). |

### 2.5 Guion de la demo (clímax, unos 2 minutos)

1. Se abre la cirugía programada. La pantalla marca los datos que faltan: glucometría
   pendiente, reserva de sangre sin cantidad.
2. *«Paciente en sala»* registra la hora de ingreso. *«Confirmo identidad,
   procedimiento y sitio»* pone los 3 ítems en verde.
3. *«Inicio de anestesia»*. Antes de la incisión aparece la alerta roja de
   antibiótico no registrado. *«Cefazolina dos gramos»* la resuelve, pero la paciente es
   alérgica a la penicilina: se abre la alerta crítica de betalactámico y Conti se pone
   serio. *«Cambiamos a clindamicina»* la resuelve, porque la regla mira el último
   antibiótico dictado.
4. *«Entran diez compresas»* y los hitos de la especialidad elegida.
5. Al cierre, *«salen nueve compresas»* dispara la alarma de discrepancia y el protocolo
   de conteo. La circulante marca «Cirujana avisada» en la tablet, y *«Apareció, salen
   diez»* la pone en verde.
6. La hoja de consumo ya tiene lo que entró al campo. *«Consumo, dos pares de guantes»*
   la completa sin que nadie la llene a mano.
7. Se pasa al panel: la cirugía ya aparece con sus tiempos y sus alertas resueltas.

### 2.6 Extra: hoja de consumo de la cirugía

Al terminar cada cirugía, la instrumentadora llena a mano el «Control de consumos de
cirugía» ([plantilla](../../../research/Control_consumos_cirugia.md)): qué insumos se
usaron y cuántos. Con esa hoja la clínica calcula después los gastos. HealthByte la arma
sola mientras transcurre la cirugía.

- **Solo nombre y cantidad.** Por ejemplo, «Guantes, par: 8». Los precios, los códigos
  de facturación y el cálculo del gasto los maneja cada institución en su propio
  proceso; HealthByte no los guarda.
- **Catálogo por clínica.** La tabla `insumo` (sección 5) guarda los nombres de la hoja de
  cada clínica, agrupados en insumos generales, suturas, otros insumos y equipos
  especiales. La siembra trae los de la plantilla.
- **Lo que entró al campo cuenta solo.** Las entradas del conteo (compresas, gasas,
  agujas…) se suman a la hoja sin registrarlas otra vez.
- **Por voz o con un toque.** *«Consumo, dos pares de guantes»* registra un evento
  `consumo`. En la tablet, el panel «Consumo de la cirugía» busca en el catálogo y suma o
  resta de a uno. Se deshace como cualquier evento.
- **Salida.** La trazabilidad de la cirugía muestra la hoja y la descarga en CSV para
  pasarla al proceso de la clínica.

## 3. Arquitectura

```
 Dispositivo del quirófano (Chrome)                       Cloud Run "api" (Node + TS, máx. 1 instancia)
┌───────────────────────────────┐   WebSocket   ┌──────────────────────────────────────────────┐
│ web (React + Vite, estático)  │◄─────────────►│ sesion: salas por cirugía, difusión del estado│
│ • vista de sesión adaptable   │  audio PCM ↑  │ voz: stream a Chirp 3                         │──► Speech-to-Text V2 (us)
│ • micrófono + detector de voz │  estado ↓     │ interprete: frase → Jev → intención tipada    │──► Jev (TypeSafe)
│ • registro manual / deshacer  │               │ cirugia: eventos → estado, alertas, conteo    │
│ • panel de gestión            │               │ panel: indicadores con SQL                    │
└───────────────────────────────┘               └───────────────────┬──────────────────────────┘
        Cloud Run "web": nginx sirve el build y                     ▼
        hace de proxy de /api y del WebSocket           Cloud SQL Postgres 16 (db-f1-micro)
```

| Componente | Responsabilidad |
| --- | --- |
| `web` | La vista de sesión, el panel y el login. Captura el micrófono con un AudioWorklet (PCM de 16 bits a 16 kHz, mono) y un detector de voz por volumen con umbral ajustable en pantalla. Solo envía audio mientras alguien habla. |
| `api/sesion` | Mantiene un WebSocket por dispositivo y una sala por cirugía. Controla quién tiene el micrófono. Después de cada cambio difunde el estado completo de la cirugía, que es pequeño, así el cliente solo pinta. |
| `api/voz` | Mantiene un stream de Chirp 3 por micrófono activo. Lo abre con la primera voz y lo cierra tras 10 s de silencio o a los 4,5 minutos, porque Google limita la duración del stream. Difunde los resultados parciales y entrega las frases finales al intérprete. |
| `api/interprete` | Convierte una frase final en una intención tipada, con el código y Jev (sección 4). Las preguntas y los umbrales están en un solo archivo. |
| `api/cirugia` | Guarda los eventos y deriva el estado: checklist, conteo, horas, bitácora y alertas. |
| `api/panel` | Calcula los indicadores con consultas SQL sobre los eventos. |

Toda la sincronización en vivo se hace en memoria, en una sola instancia del API.

> ponytail: un solo proceso con la difusión en memoria. Para escalar a más de una
> instancia, pasar a `LISTEN/NOTIFY` de Postgres o a Pub/Sub.

### 3.1 Mensajes del WebSocket

| Dirección | Mensaje |
| --- | --- |
| Del dispositivo al API | `unirse {cirugiaId}` · audio en binario · `registrar {evento}` (manual) · `confirmar {pendienteId, si}` · `tomar_microfono` |
| Del API al dispositivo | `estado {...}` (completo) · `parcial {texto}` · `microfono {dispositivo}` · `error {mensaje}` |

Cuando un dispositivo se reconecta, vuelve a unirse y recibe el estado completo. No se
pierde nada, porque el estado se reconstruye a partir de los eventos.

## 4. Flujo de voz con Jev

Recorrido de una frase, por ejemplo «entran diez compresas»:

1. **Navegador.** El detector de voz deja pasar el audio y lo envía en bloques de 100 ms.
2. **Chirp 3.** Usa `chirp_3`, `es-US`, región `us`, con resultados parciales
   activados. La adaptación se hace en línea, con hasta 1.000 frases sacadas del
   protocolo de la clínica: nombres de campos, materiales, hitos e ítems.
3. **Código.** Convierte los números en palabras a cifras («diez» → 10, «treinta y
   dos» → 32) y acepta también los que ya vienen en dígitos. Una expresión regular
   busca los pares *número + palabra* como candidatos.
4. **Jev, una sola llamada con todas las preguntas en paralelo** (el patrón que TypeSafe
   llama *speculative fan-out*):

   | Pregunta | Tipo | Opciones |
   | --- | --- | --- |
   | `dirigida` | Noul | ¿La frase es un registro para el tablero quirúrgico y no conversación del equipo? |
   | `intencion` | Choice | hora · ítem del checklist · conteo · hito · medición · dato · novedad · novedad atendida · novedad solucionada · sí · no · deshacer · nada |
   | `hora` | Choice | ingreso · anestesia · inicio de cirugía · fin de cirugía · salida a recuperación · ninguna |
   | `item_<id>` | Noul, una por ítem de la fase actual | ¿La frase confirma este ítem? Permite confirmar varios con una sola frase. |
   | `material_<n>` | Choice, una por cada par número + palabra | los materiales del protocolo · ninguno |
   | `movimiento` | Choice | entra · sale · total |
   | `hito` | Choice | los hitos de la especialidad · ninguno |
   | `medicion` | Choice | las mediciones del protocolo (glucometría, diuresis…) · ninguna |
   | `campo` | Choice | los campos preoperatorios numéricos (peso, talla…) · ninguno |

   El *state* que recibe Jev es mínimo, porque con contexto irrelevante pierde
   precisión: la frase, la fase actual con sus ítems y los 3 últimos eventos (para
   entender un «sí, confirmo»).
5. **Decisión con umbrales.** Son valores iniciales que se calibran con el set de oro
   (sección 13):
   - Si `dirigida` es menor que 0,5, o la confianza de `intencion` es menor que 0,6, la
     frase se ignora y **no se guarda**.
   - Con una confianza de `intencion` entre 0,6 y 0,85 queda una confirmación
     pendiente. Se confirma con un «sí» o con un toque, y vence a los 15 s.
   - Con 0,85 o más se registra el evento de inmediato.
6. **El código hace lo que Jev hace mal**: las cuentas (el balance del conteo), la hora
   (siempre la del servidor en el instante de la frase; nunca se dicta) y cualquier
   comparación de fechas.

El único texto libre que se guarda es la transcripción literal de las novedades y de
los motivos de cierre de alertas.

### 4.1 Corrección de nombres de instrumental

Chirp puede transcribir mal un instrumento («pinza queli»). Cada clínica tiene su catálogo
en la tabla `instrumento`, sembrado de
[instrumentos_quirurgicos.csv](../../../research/instrumentos_quirurgicos.csv). Se usa de
dos formas:
- Sus nombres entran como frases de adaptación de Chirp.
- Antes de Jev, `corregir()` (`api/src/correccion.ts`) cambia lo transcrito por el nombre
  del catálogo que suena igual, por ejemplo «Pinzas Kelly».

Lo corregido es lo que se guarda en `evento.texto`.

## 5. Modelo de datos

Postgres 16. Todas las tablas llevan `clinica_id` y Row-Level Security.

| Tabla | Columnas principales |
| --- | --- |
| `clinica` | `id`, `nombre`, `plan` |
| `quirofano` | `id`, `clinica_id`, `nombre` |
| `usuario` | `id`, `clinica_id`, `nombre`, `rol` (cirujano, anestesiólogo, instrumentador, auxiliar de enfermería, perfusionista, coordinador, admin), `login`, `hash_clave` |
| `protocolo` | `id`, `clinica_id`, `especialidad`, `definicion` (JSONB, sección 6) |
| `paciente` | `id`, `clinica_id`, `nombre`, `tipo_doc`, `num_doc`, `fecha_nacimiento`, `eps`, `hc` |
| `cirugia` | `id`, `clinica_id`, `quirofano_id`, `paciente_id`, `protocolo_id`, `fecha_programada`, `procedimiento`, `diagnostico`, `lateralidad`, `equipo_programado` (JSONB: rol → usuario), `datos_preop` (JSONB: los campos del protocolo) |
| `insumo` | `id`, `clinica_id`, `nombre`, `categoria` (general, sutura, otro o equipo). Sin precios (sección 2.6) |
| `evento` | `id`, `clinica_id`, `cirugia_id`, `ts` (hora del servidor), `tipo`, `datos` (JSONB), `registrado_por` (usuario de la sesión), `rol_confirma`, `origen` (voz o manual), `texto`, `confianza`, `anula_evento_id` |

En `evento` solo se agregan filas; nunca se modifican ni se borran. Deshacer es un
evento de tipo `anulacion`.

Tipos de evento:

| Tipo | Ejemplo |
| --- | --- |
| `hora` | ingreso, anestesia, inicio de cirugía, fin de cirugía, salida a recuperación |
| `presente` | un integrante del equipo marcado como presente |
| `check` | fase, ítem y valor (sí, no o no aplica) |
| `conteo` | material, cantidad (positiva si entra, negativa si sale) o total |
| `hito` | heparina, inicio de bomba, clamp… |
| `medicion` | glucometría 102 mg/dl, diuresis 29 cc |
| `dato` | campo preoperatorio y valor, por ejemplo peso 71,3 |
| `novedad` | texto libre; abre una novedad (detectada) |
| `novedad_atendida` | la novedad y quién la atiende |
| `novedad_solucionada` | la novedad y las acciones realizadas (texto dictado) |
| `alerta_cierre` | alerta y motivo |
| `accion_conteo` | un paso del protocolo de conteo: cirujano avisado, búsqueda en campo o Rx solicitada |
| `consumo` | insumo del catálogo y cantidad (negativa si corrige un registro de más) |
| `anulacion` | el evento que se anula |

**Row-Level Security.** Cada tabla tiene una política
`USING (clinica_id = current_setting('app.clinica_id')::uuid)` con `FORCE ROW LEVEL
SECURITY`. El API se conecta con un rol que no es dueño de las tablas y ejecuta
`SET LOCAL app.clinica_id` en cada transacción, a partir de la sesión del usuario. Las
migraciones y la siembra corren con el rol dueño.

**Quién verificó.** Cada ítem del checklist tiene en el protocolo el rol que lo
confirma. El evento guarda ese rol, y el nombre se resuelve con el equipo programado.
`registrado_por` es el usuario que inició sesión en el dispositivo.

## 6. Protocolo configurable

Cada clínica tiene un protocolo por especialidad. Así se ve, recortado:

```json
{
  "especialidad": "Cardiovascular",
  "campos_preop": [
    { "id": "peso", "etiqueta": "Peso", "tipo": "numero", "unidad": "kg", "obligatorio": true },
    { "id": "reserva_sangre", "etiqueta": "Reserva de Sangre y Cantidad", "tipo": "texto", "obligatorio": true },
    { "id": "alergias", "etiqueta": "Alergias", "tipo": "texto", "obligatorio": true }
  ],
  "fases": [
    { "id": "antes_anestesia", "nombre": "Antes de la anestesia", "cierra_antes_de": "anestesia",
      "items": [{ "id": "identidad", "texto": "Identidad del paciente", "rol": "anestesiologo" }] },
    { "id": "antes_incision", "nombre": "Antes de la incisión", "cierra_antes_de": "inicio_cirugia",
      "items": [{ "id": "antibiotico", "texto": "Antibiótico profiláctico", "rol": "anestesiologo", "critico": true }] },
    { "id": "antes_salida", "nombre": "Antes de salir del quirófano", "cierra_antes_de": "salida_recuperacion",
      "items": [{ "id": "conteo_final", "texto": "Recuento de gasas y material", "rol": "instrumentador", "critico": true }] }
  ],
  "materiales": ["Compresas", "Gasas", "Cotonoides", "Rollos Abdominales", "Mechas", "Hiladillos", "Agujas Hipodérmicas", "Agujas Sutura", "Hojas de Bisturí", "Drenes"],
  "hitos": ["Heparina", "Entrada a bomba", "Salida de bomba", "Clamp aórtico", "Retiro de clamp", "Cardioplejía"],
  "duraciones": [
    { "nombre": "Tiempo de bomba", "desde": "Entrada a bomba", "hasta": "Salida de bomba" },
    { "nombre": "Tiempo de clamp", "desde": "Clamp aórtico", "hasta": "Retiro de clamp" }
  ],
  "mediciones": [{ "id": "glucometria", "unidad": "mg/dl" }, { "id": "diuresis", "unidad": "cc" }]
}
```

Los nombres de los campos y de los materiales son los del tablero físico. De este
JSON salen la pantalla, las opciones de las preguntas a Jev y el vocabulario de
Chirp 3. Las `duraciones` las calcula el código a partir de las horas de los hitos.
Una clínica nueva no requiere código.

La marca, los colores, las tipografías y las pantallas están en el
[documento de diseño](../../../Diseño/HealthByte_especificaciones_diseno.md).

## 7. Alertas

Son funciones puras en el código que se recalculan con cada evento. Cada una tiene un
`id`, una severidad y un mensaje.

| Alerta | Se dispara cuando | Severidad |
| --- | --- | --- |
| Dato obligatorio vacío | Falta un `campo_preop` obligatorio al abrir la sesión | Advertencia |
| Fase incompleta | Se registra la hora que cierra una fase (`cierra_antes_de`) y esa fase tiene ítems pendientes | Crítica si falta un ítem crítico; si no, advertencia |
| Antibiótico no registrado | Se registra el inicio de la cirugía sin el ítem `antibiotico` | Crítica |
| Alergia sin validar | Hay alergias registradas y el ítem de alergias no está confirmado | Advertencia |
| Conteo descuadrado | Se confirma el ítem `conteo_final` o se registra la hora de salida a recuperación, y el balance de algún material no da cero | Crítica |
| Equipo distinto al programado | Al registrar el ingreso, falta un rol programado o hay un presente que no estaba en la programación | Advertencia |
| Procedimiento distinto | El procedimiento confirmado no coincide con el programado | Crítica |

Una alerta deja de estar abierta cuando la condición desaparece (*resuelta*) o cuando
se registra un `alerta_cierre` con su motivo (*cerrada con justificación*). Ninguna
alerta bloquea el registro.

## 8. Panel de gestión

Muestra los datos de una clínica. Con la siembra, el panel ya tiene historia desde el
primer día.

- Cirugías del día: programadas, en curso y realizadas.
- Checklists completos e incompletos.
- **Cumplimiento del protocolo**: el porcentaje de cirugías en las que cada fase se
  completó antes de registrar la hora que la cierra.
- Alertas abiertas, resueltas y cerradas con justificación, por tipo.
- Tiempos promedio por etapa: de ingreso a anestesia, de anestesia a incisión, de
  incisión a fin, y de fin a salida.
- Novedades abiertas, atendidas y solucionadas, con el tiempo hasta la solución.
- Los tiempos de bomba y de clamp en cirugía cardiovascular.
- La lista de cirugías, con el detalle de cada una: la línea de tiempo de eventos con
  quién, qué, cuándo y su origen, más las alertas y cómo se cerraron.

## 9. Manejo de errores

| Falla | Comportamiento |
| --- | --- |
| Se cae el stream de Chirp 3 | Se reabre solo. La pantalla muestra «micrófono reconectando». |
| Jev falla o tarda más de 2 s | Un reintento. Si vuelve a fallar, la frase aparece como «no interpretada» para asignarla con un toque. |
| Se cae el WebSocket | El cliente se reconecta con espera creciente y recibe el estado completo. |
| Se cierra el dispositivo que tenía el micrófono | El micrófono queda libre y otro dispositivo puede tomarlo. |
| El registro manual | Siempre está disponible: es el respaldo de todo lo anterior. |

## 10. Seguridad y privacidad

- **Login** por usuario, con contraseña sembrada y cookie de sesión firmada
  (`httpOnly`, `secure`, `SameSite=Lax`). La sesión lleva el usuario, la clínica y el
  rol.
- **Aislamiento entre clínicas** en la base de datos, con Row-Level Security (sección 5).
- **Secretos** en Secret Manager. La clave de Jev se carga con `gcloud` y nunca pasa
  por el estado de Terraform.
- **El audio no se guarda.** La conversación que no va dirigida al tablero tampoco.
- **Solo datos ficticios.** Las fotos del tablero real no se usan sin pixelar
  (Ley 1581 de 2012).
- Se posiciona como **apoyo al registro y la trazabilidad, no como decisión clínica**
  (hay que confirmar la clasificación del INVIMA, Decreto 4725 de 2005).

## 11. Infraestructura

Todo se maneja con Terraform en `infra/`, en la **cuenta personal de GCP** del usuario.

| Pieza | Configuración |
| --- | --- |
| Proyecto | Lo crea Terraform, enlazado a la cuenta de facturación. Con `terraform destroy` se elimina el proyecto completo. |
| Protección de cuenta | `data "google_client_openid_userinfo"` más una `precondition` que aborta si el correo autenticado no es el esperado (`var.cuenta_esperada`). Se usa una configuración de gcloud dedicada (`healthbyte`). |
| APIs | Run, SQL Admin, Secret Manager, Artifact Registry, Speech, Cloud Build y Billing Budgets |
| Región | `us-east1`; Chirp 3 usa `us` |
| Cloud SQL | Postgres 16, edición Enterprise, `db-f1-micro` (núcleo compartido, unos 0,6 GB; sin SLA, para pruebas), 10 GB HDD, sin backups ni alta disponibilidad, `deletion_protection = false`. Conexión desde Cloud Run con el conector nativo. |
| Cloud Run `api` | 1 vCPU y 512 Mi. Entre 0 y 1 instancias (`var.api_min_instancias`, que se pone en 1 el día de la demo). Timeout de 3600 s. Su propia cuenta de servicio con `cloudsql.client`, acceso a los secretos y `speech.client`. |
| Cloud Run `web` | nginx con el build y proxy de `/api` y del WebSocket hacia `api`, para que todo salga del mismo origen. Entre 0 y 2 instancias. |
| Artifact Registry | Un repositorio Docker |
| Secretos | `jev-api-key` (el valor se carga a mano) y `db-password` (con `random_password`) |
| Presupuesto | US$25, con alertas al 50 %, 90 % y 100 % |
| Etiquetas | `proyecto=healthbyte` en todo |

**Despliegue:**
1. `terraform apply` (los servicios arrancan con una imagen de marcador).
2. `gcloud builds submit` para `api` y `web`.
3. `terraform apply -var tag=<tag>`.

El API corre las migraciones y la siembra al arrancar si la base está vacía.

**Apagado:** `terraform destroy` y luego `gcloud projects list`, para confirmar que el
proyecto quedó en estado de borrado.

## 12. Estructura del repositorio

```
api/      Node + TypeScript
web/      React + Vite + TypeScript
infra/    Terraform
docs/     diseño y planes
Notas/    investigación
```

## 13. Pruebas

| Prueba | Qué demuestra |
| --- | --- |
| **Set de oro de Jev** | Unas 40 frases reales dictadas por la instrumentadora, cada una con su intención esperada. Un script las pasa por el intérprete, mide el acierto y fija los umbrales. Se corre el día 1. |
| Eventos → estado | El balance del conteo, que las alertas se abran y se cierren, y las anulaciones |
| Row-Level Security | Una sesión de la clínica A no lee filas de la clínica B |
| Prueba de voz | 10 frases con ruido real en el hospital simulado. Mide también qué porcentaje del tiempo hay voz, que es el dato para los costos. |
| Ensayo de la demo | El guion completo, más un video de respaldo |

## 14. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Jev rinde menos en español (lo dice su documentación) | Set de oro el día 1 y registro manual |
| Ruido del quirófano o micrófono lejos | Micrófono USB o Bluetooth cerca y vocabulario cargado en Chirp 3 |
| Registros falsos por la escucha continua | El filtro `dirigida`, la banda de confirmación y deshacer |
| Jev en beta (límites de uso o caídas) | Registro manual y video de respaldo |
| Las smart TV no dan acceso al micrófono | TV con mini-PC o portátil |
| `db-f1-micro` no tiene SLA | No afecta la prueba. En producción se usa otra máquina. |
| Costo de voz por encima de lo previsto | El detector de voz, medir el porcentaje real de habla y el nivel Básico sin voz |

## 15. Negocio y costos (insumo del pitch)

**Modelo de cobro:** suscripción por quirófano al mes, con tres niveles.

| Nivel | Incluye | Costo variable para nosotros |
| --- | --- | --- |
| Básico | Registro táctil, alertas, trazabilidad y panel | Casi cero |
| Estándar | Lo anterior más la voz (Chirp 3 + Jev) | Unos US$75 a 95 por quirófano al mes (abajo) |
| Red | Lo anterior, varias sedes y un panel consolidado | Lo mismo por quirófano, más la configuración |

**Costo variable por cirugía (Estándar), con precios públicos de octubre de 2026:**

- Chirp 3 cuesta US$0,016 por minuto hasta 500.000 minutos al mes y US$0,010 desde ahí.
- En una cirugía de 90 minutos, con voz el 40 % del tiempo (supuesto que se mide en la
  prueba de voz), son 36 minutos: unos **US$0,58**. Sin detector de voz serían US$1,44.
- Jev: unas 1.500 frases × unos 2.000 tokens × US$0,042 por millón de tokens = unos
  **US$0,13**.
- Con 130 cirugías por quirófano al mes (5 diarias durante 26 días), el costo
  variable queda **entre US$75 y 95 por quirófano al mes**, más la parte que le toque
  de la infraestructura compartida.

**Precio:** es una hipótesis que hay que validar con la pregunta 8 de la guía de
entrevista. Para un margen bruto del 70 % en el nivel Estándar, el precio tendría que
rondar los US$250 a 320 por quirófano al mes. El nivel Básico permite un precio menor
para las IPS pequeñas de la región.

**Ruta de mercado:**
1. Piloto sin costo en el hospital simulado de la Unilibre, que da validación y datos.
2. Primer cliente que paga: IPS privadas medianas de Barranquilla y la Costa, que las
   soluciones grandes (T-DOC, Censitrac) no atienden por costo.
3. Escala con redes de clínicas de varias sedes: una venta son muchos quirófanos.

**Qué gana la clínica** (con evidencia citada en la investigación previa):

- Trazabilidad que sirve como prueba ante demandas por cuerpo extraño retenido, que
  hacen presumir negligencia (D6).
- Cumplimiento medible de la lista de verificación, que en un hospital estudiado era
  del 13,3 % (D4).
- Tiempos e indicadores sin transcribir nada a mano.
- Menos carga de auditoría.

**Para inversores:**
- Ingreso recurrente por quirófano.
- Una clínica nueva cuesta casi solo la voz: el multi-clínica y el protocolo
  configurable evitan desarrollos a la medida.
- El margen mejora con el volumen gracias a los tramos de precio de Google.
- El mercado se puede medir con el REPS (D15).

**Pendiente:** contar en el REPS las sedes con servicio quirúrgico habilitado, en el
Caribe y en el país, para dimensionar el mercado.

## 16. Por validar con la instrumentadora

- [ ] Las etiquetas cortadas del tablero y el bloque ID / FN / EDAD / A/B / PESO
      (ver [campos-tablero-fisico](../../../Notas/campos-tablero-fisico.md)).
- [ ] La especialidad y la cirugía de la demo.
- [ ] El set de oro: las 40 frases tal como se dicen en el quirófano.
- [ ] Qué hardware hay hoy en el quirófano: TV, PC y dónde se pondría un micrófono.
- [ ] Qué ítems del checklist confirma cada rol en su institución.
- [ ] Los nombres de la hoja de consumo de su clínica y cómo los dicen en voz alta.
