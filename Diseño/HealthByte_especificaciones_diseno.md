# HealthByte · Especificaciones de diseño

> Hackathon Universidad Libre · Barranquilla · 2026
> Lema: **Precisión que se puede contar.**

HealthByte une Instrumentación Quirúrgica e Ingeniería de Sistemas para responder al reto del hackathon: el **Tablero Inteligente de Seguridad Quirúrgica**. Este documento reúne el sistema de marca y las especificaciones de cada pieza del canvas *HealthByte · Diseño*.

**El reto:** los quirófanos usan tableros físicos que se llenan a mano. Eso trae errores de escritura, información omitida, pérdida de trazabilidad, ningún histórico y ninguna alerta. La solución debe digitalizar la verificación de seguridad quirúrgica para que no solo **registre**, sino que también **valide, alerte, deje trazabilidad, produzca indicadores y apoye decisiones**, respetando el flujo real del quirófano. No basta con cambiar el tablero por un formulario.

> **Fuente de verdad:** el producto y la técnica se definen en el
> [spec de diseño](../docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md).
> Este documento cubre la marca y las pantallas. Si algo de aquí contradice el spec,
> manda el spec.
>
> **Pantallas para construir el front:** el canvas
> [HealthByte · Diseño](https://claude.ai/artifact/BVc3RmxgBV4rEsipq6h74L), página
> «Rediseño»: pared, tablet, gestión, Conti y el mapa de pantallas y flujo de datos.

**Plataforma:** aplicación web que se adapta a TV, tablet o portátil. Una sola
sesión funciona completa en un solo dispositivo, y otros dispositivos pueden abrirla
como espejo en vivo. Es multi-clínica: cada clínica tiene sus quirófanos, su personal
y su protocolo.

**Entrada por voz:** el instrumentador no toca ningún aparato. Lo que dice lo
transcribe Speech-to-Text (Chirp 3) y lo interpreta Jev. El sistema registra solo
cuando está seguro y pide confirmación cuando duda. La circulante puede registrar y
corregir con toques.

**Enfoque del pitch:** no presentamos requerimientos, sino una **propuesta para resolver el problema**.

---

## 1. Concepto de marca

**Salud + byte.** El isotipo es una cruz de salud hecha con cinco cuadros, como píxeles en una cuadrícula de 3×3. En la esquina superior derecha va un cuadro menor en verde (el *byte*): el dato que se cuenta, se registra y no se pierde.

- Los cuadros separados recuerdan una bandeja de instrumental ordenada y una pantalla de píxeles.
- Los colores vienen del quirófano: azul y verde de la ropa y los campos quirúrgicos, blanco clínico y gris acero del instrumental.
- Personalidad: **precisa como un instrumentador, clara como un buen sistema.** Confiable, técnica sin ser fría, cercana sin ser infantil.

## 2. Logo

| Pieza | Uso |
|---|---|
| `healthbyte-lockup.svg` | Versión principal sobre fondos claros (`surface`, `tint`, blanco). |
| `healthbyte-lockup-dark.svg` | Sobre fondos oscuros o fotos (incluye fondo `ink`). |
| `healthbyte-mark.svg` | Isotipo solo: avatares, favicon, esquinas de diapositiva. |
| `healthbyte-app-icon.svg` | Favicon grande y foto de perfil en redes. |

**Construcción del isotipo** (viewBox 112×112): cinco cuadros de 32×32 con radio 7, en las posiciones (40,0), (0,40), (40,40), (80,40), (40,80), más el cuadro *byte* de 20×20 con radio 5 en (92,0), color `accent`.

**Reglas**

- Espacio libre alrededor del logo igual a un cuadro del isotipo.
- No cambiar colores, no rotar, sin sombras ni degradados.
- El nombre se escribe siempre **HealthByte**: una palabra, H y B mayúsculas.
- Logotipo: "Health" en `ink` (peso 500) y "Byte" en `brand` (peso 700). En versión invertida: cruz en `surface`, "Health" en blanco y "Byte" en `blue-300`.

## 3. Color

### Roles semánticos

| Token | Hex | Uso |
|---|---|---|
| `brand` | `#0B5D8C` | Azul quirúrgico. Logo, botones primarios, enlaces, títulos de énfasis. |
| `brand-deep` | `#08405F` | Hover/pressed de brand, fondos de título. |
| `secondary` | `#0B6B5A` | Verde quirúrgico. Estados correctos (conteo completo, ciclo validado). |
| `accent` | `#2FB596` | Verde byte. Solo el dato que importa; nunca como texto sobre fondo claro. |
| `ink` | `#0D2232` | Texto principal; fondo de portadas. |
| `muted` | `#4D6170` | Texto secundario y etiquetas. |
| `steel` | `#B8C7D1` | Bordes y divisores. No para texto. |
| `surface` | `#F5F9FB` | Blanco clínico: fondo general. |
| `tint` | `#E1EEF5` | Azul pálido para tarjetas y bloques destacados. |
| `signal` | `#C8372D` | Rojo de alerta clínica. Solo riesgos: conteo incompleto, error. |

**Proporción por pantalla o diapositiva:** 60 % `surface`/`tint` · 25 % `ink` · 10 % `brand` · 5 % `secondary`/`accent`.

### Escala de azules

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| `#F0F6FA` | `#E1EEF5` | `#C2DCEB` | `#8FBDD8` | `#4F95C0` | `#1E75A8` | `#0B5D8C` | `#094C73` | `#08405F` | `#0A2C42` |

### Escala de grises (fríos)

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| `#F5F9FB` | `#E9EFF3` | `#D3DDE4` | `#B8C7D1` | `#8FA1AE` | `#6B7E8C` | `#4D6170` | `#364856` | `#22333F` | `#0D2232` |

### Accesibilidad

- `brand`, `secondary`, `ink`, `muted` y `signal` cumplen 4.5:1 sobre `surface`.
- Texto sobre fondo claro: `blue-500` o más oscuro, `gray-600` o más oscuro. Los pasos 300–400 solo para gráficos, íconos y bordes.
- `secondary` (correcto) y `signal` (alerta) tienen luminosidad parecida: **todo estado lleva ícono o palabra** (✓ completo / ! incompleto).
- Gráficos con varias series: `blue-600`, `blue-400`, `blue-300`, en ese orden.

## 4. Tipografía

| Familia | Token | Uso |
|---|---|---|
| **Space Grotesk** | `display` | Títulos, gancho del pitch, logotipo. |
| **IBM Plex Sans** | `sans` | Texto corrido. |
| **IBM Plex Mono** | `mono` | Métricas, códigos de instrumental, lotes y ciclos. |

Las tres son gratuitas en Google Fonts.

| Estilo | Familia | Tamaño / interlineado | Peso | Ejemplo |
|---|---|---|---|---|
| display | Space Grotesk | 56 / 60 px, −0.02em | 700 | Cero instrumentos perdidos |
| h1 | Space Grotesk | 36 / 42 px | 700 | El problema |
| h2 | Space Grotesk | 24 / 30 px | 500 | Central de esterilización |
| body | IBM Plex Sans | 16 / 24 px | 400 | Trazabilidad de cada caja quirúrgica… |
| label | IBM Plex Sans | 13 / 18 px, +0.04em, MAYÚSCULAS | 600 | CAJA DE LAPAROTOMÍA |
| metric | IBM Plex Mono | 40 / 44 px | 500 | 98,7 % |
| code | IBM Plex Mono | 14 / 20 px | 400 | INS-0421 · LOTE 2210 |

## 5. Espaciado y radios

| Token | Valor | Uso |
|---|---|---|
| `space-1` | 4 px | Ícono–texto; hueco entre cuadros del isotipo pequeño. |
| `space-2` | 8 px | Padding de chips, separación dentro de grupos. |
| `space-4` | 16 px | Padding de tarjetas y botones. |
| `space-8` | 32 px | Entre secciones; márgenes de diapositiva. |
| `radius-sm` | 4 px | Cuadros del patrón pixel cross, chips. |
| `radius-md` | 10 px | Botones, tarjetas, bloques de color. |
| `radius-pill` | 999 px | Etiquetas de estado tipo píldora. |

Controles de al menos 44 px de alto (se usan con guantes, en pantallas táctiles o con mouse).

## 6. Voz

Como un instrumentador experimentado que también sabe de software: frases cortas, verbos concretos, cifras reales.

- Sí: "Cada caja, contada. Cada ciclo, registrado."
- Sí: "Del lavado al quirófano en un solo registro."
- No: "Revolucionamos la salud con IA disruptiva."
- No: jerga clínica sin explicar ante un jurado no clínico.

## 7. Iconografía e imágenes

- Íconos de línea de 2 px con esquinas suaves (familia tipo Lucide), en `ink` o `brand`.
- Patrón **pixel cross**: cuadros de `radius-sm` en cuadrícula de 16 px con 4 px de separación. Textura de portadas, nunca detrás de texto.
- Fotos: instrumental real, manos con guantes, bandejas ordenadas. Sin cirujanos posando de stock ni sangre.

---

## 8. Piezas diseñadas

Los datos que aparecen en las pantallas son de demostración. Ningún dato de pacientes reales se usa en el diseño. Las cifras del panel son ilustrativas.

### 8.1 Presentación comercial (landing, 1280 px, fluida)

Página pública de venta. Presenta el problema y la propuesta y lleva a **Agendar demo**. No forma parte de la plataforma.

| Sección | Contenido |
|---|---|
| Navegación | Logo · Problema · Flujo · Solución · **Agendar demo** |
| Hero (HB.01) | "Ningún paso del quirófano sin **verificar.**" HealthByte convierte el tablero que hoy se llena a mano en un tablero inteligente: registra, valida y alerta, y deja trazabilidad antes, durante y después de la cirugía. A la derecha, una vista previa del tablero en vivo: 01 anestesia 6/6, 02 incisión 4/6, 03 salida 0/5, 10/17 verificaciones y la alerta «Antibiótico pendiente antes de la incisión». |
| Cifras | Tres `[DATO]`: tableros con campos sin diligenciar, verificaciones sin registro de quién ni cuándo, registros que no se pueden consultar después. Fuente pendiente. |
| HB.02 — El problema | El tablero se llena a mano y se borra al final del día. Si falta un dato, nadie lo advierte a tiempo. Y al revisar una cirugía, **no queda rastro de quién verificó qué.** |
| HB.03 — Flujo | "Tres pausas de verificación, un solo registro": **Antes de la anestesia** (identificación del paciente), **Antes de la incisión** (pausa quirúrgica), **Antes de salir del quirófano** (cierre seguro). |
| HB.04 — Qué hace el tablero | "No reemplaza el tablero por un formulario. Lo vuelve un sistema de control." Cuatro tarjetas: **Registra · Valida · Alerta · Mide**. |
| Cierre | "Precisión que se puede contar." + *Agendar demo*. |

### 8.2 Tablero en vivo (web, 1440 × 2120) — pieza central

La pantalla que reemplaza la pizarra del quirófano. Ejemplo: QX 03, revascularización miocárdica, en la pausa antes de la incisión. El diseño de 1440 px es la referencia de escritorio y TV; falta adaptarlo a tablet.

- **Menú lateral** (`blue-900`): Panel de gestión · **Tablero en vivo** · Trazabilidad · Alertas · Históricos.
- **Voz:** el estado del micrófono (activo y en qué dispositivo), la transcripción en vivo mientras alguien habla, el último registro («Compresas +10 · 12:24:07»), la confirmación pendiente cuando el sistema duda («¿Registrar Compresas +10?», con *Sí* / *No*), y los botones *Deshacer* y *Registrar a mano*.
- **Tiempos del procedimiento:** Ingreso del paciente → Inicio de anestesia → Inicio de cirugía → Fin de cirugía → Salida a recuperación. La hora se toma del reloj del servidor en el instante en que se dicta; nadie la escribe.
- **Alertas** (bloque rojo): "2 alertas requieren atención antes de la incisión". Antibiótico profiláctico no registrado y alergia a penicilina por validar, cada una con su responsable y sus acciones (*Registrar*, *Validar*, *Cerrar con motivo*). **Las alertas nunca bloquean el acto clínico:** una alerta crítica solo se cierra resolviéndola o con un motivo dictado, y eso queda en la trazabilidad.
- **Paciente:** indicador de completitud (11/12 datos), documento, edad, peso y talla, glucometría, grupo y RH, reserva de sangre y alergias.
- **Procedimiento:** procedimiento, anestesia, diagnóstico y comorbilidades; validación "Coincide con lo programado"; sitio quirúrgico con confirmación (quién y a qué hora); información clínica (obstrucción coronaria).
- **Equipo quirúrgico:** cirujano, anestesiólogo, instrumentador quirúrgico, auxiliar de enfermería y perfusionista, cada uno con su hora de ingreso. Sus verificaciones quedan firmadas con rol y hora.
- **Lista de verificación de seguridad**, en tres momentos:
  - 01 Antes de la anestesia (completa 6/6): identificación, procedimiento, sitio, alergias, riesgos y equipamiento.
  - 02 Antes de la incisión (en curso 4/6): paciente, procedimiento, sitio y equipo ✓; antibiótico profiláctico ! pendiente; riesgos previstos.
  - 03 Antes de salir del quirófano (pendiente 0/5): recuento de instrumental, recuento de gasas y material, identificación de muestras, novedades y procedimiento realizado.
  - Cada ítem muestra quién lo verificó (rol abreviado) y la hora.
- **Recuento de material** (los elementos de la pizarra física): compresas, gasas, agujas de sutura e hipodérmicas, hojas de bisturí, hiladillos, drenes, rollos abdominales, cotonoides y mechas. Para cada material, el balance entre lo que entra (inicial y adicionales) y lo que sale; al cierre debe dar cero, y si no da, se dispara la alerta de conteo.
- **Registro del procedimiento:** las casillas Sí/No de la pizarra (rayos X intraoperatorio, injertos, bloqueos pre/intra/postoperatorio, muestra para patología, contenedor instrumental) y el destino postoperatorio (Hospitalización / UCI / Ambulatorio).
- **Módulo cardiovascular** (solo en cirugía cardiovascular): heparina, entrada a bomba, clamp aórtico, dosis de cardioplejia y salida de bomba. Calcula los tiempos de bomba y de clamp.

### 8.3 Panel de gestión (web, 1440 × 1340)

Para los responsables del proceso quirúrgico. Los valores son ilustrativos y vienen del documento del reto.

- Filtro de periodo: Hoy / Semana / Mes, y botón *Exportar*.
- Indicadores: Cirugías hoy **24** · Checklists completas **21** · Pendientes **2** · Procedimientos con alertas **1** · Cumplimiento de protocolo **91,6 %** (anillo) · Tiempo promedio **87 min** · Incidencias **3**.
- **Quirófanos ahora:** tabla de QX 01 a 06 con procedimiento, etapa (5 pasos), avance de la lista de verificación, alertas y tiempo transcurrido.
- Gráficos: cumplimiento por momento de verificación, tiempo promedio por fase y alertas más frecuentes de la semana.

### 8.4 Trazabilidad del procedimiento (web, 1440 × 1120)

Reconstruye lo ocurrido en una cirugía.

- Cuatro preguntas clave: ¿Quién verificó? · ¿A qué hora? · ¿Qué quedó pendiente? · ¿Cuándo se solucionó?
- **Registro cronológico inalterable:** hora, evento, quién (nombre y rol) y detalle. Las alertas del sistema se resaltan.
- **Novedades** con su ciclo de vida: Detectada → Asignada / Atendida → Solucionada, con responsable, hora y acciones realizadas. Ejemplo abierto: antibiótico profiláctico. Ejemplo cerrado: glucometría pendiente, resuelta en 7 minutos.

### 8.5 Pitch · Portada (1280 × 720)

- Fondo `blue-900`, logo invertido y numeración 01 / 10.
- Título: "Precisión que se puede **contar.**"
- Subtítulo: "Tablero inteligente de seguridad quirúrgica: registra, valida, alerta y mide cada verificación del quirófano."
- Pie: [NOMBRE DEL HACKATHON] · Universidad Libre · Barranquilla · [FECHA].

### 8.6 Pitch · Diapositiva de métrica (1280 × 720)

- Cifra `[DATO]`: "de los tableros quirúrgicos físicos tienen al menos un campo sin diligenciar."
- A la derecha, «Un tablero · 30 campos · 1 sin diligenciar»: una cuadrícula de 30 casillas con una vacía. "Un dato faltante basta para poner en riesgo a un paciente."

### 8.7 Credenciales · Roles en escena (54 × 86 mm)

| Código | Rol | Descripción |
|---|---|---|
| HB-01 | **Propuesta** | Cómo resolvemos el problema |
| HB-02 | Arquitectura | Cómo se conecta cada registro |
| HB-03 | UX/UI | Lo que se ve con guantes puestos |
| HB-04 | Marketing | Cómo lo contamos |
| HB-05 | Instrumentación | El quirófano real, paso a paso |

---

## 9. Cobertura del reto

| Punto del reto | Dónde se resuelve |
|---|---|
| 3. Identificación y preparación del paciente | Tablero en vivo › Paciente (completitud de datos, glucometría, reserva, alergias) |
| 4. Identificación del equipo quirúrgico | Tablero en vivo › Equipo (ingreso con hora; verificaciones firmadas) |
| 5. Lista de verificación de seguridad | Tablero en vivo › 3 momentos de verificación |
| 6. Registro y trazabilidad de tiempos | Tablero en vivo › Tiempos; Panel › tiempo por fase |
| 7. Gestión de alertas y riesgos | Tablero en vivo › Alertas (no bloquean; se resuelven o se cierran con motivo); Panel › alertas frecuentes |
| 8. Trazabilidad del procedimiento | Pantalla Trazabilidad (registro cronológico + novedades) |
| 9. Panel de gestión | Pantalla Panel de gestión |
| 10. IA y analítica | Registro por voz: Chirp 3 transcribe y Jev interpreta cada frase dentro de un esquema cerrado, con confianza calibrada (registra solo si está seguro, pide confirmación si duda) |

## 10. Pendientes

- Reemplazar los `[DATO]` con cifras reales y citar la fuente.
- Completar [NOMBRE DEL HACKATHON], [FECHA], y [NOMBRE] / [PROGRAMA] en cada credencial.
- Adaptar el tablero en vivo a tablet y a TV vista a distancia.
- Pantallas de Alertas e Históricos (están en el menú, pero aún no tienen diseño).
- Resto de diapositivas del pitch.
