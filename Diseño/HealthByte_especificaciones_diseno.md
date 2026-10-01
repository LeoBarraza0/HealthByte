# HealthByte · Especificaciones de diseño

> Hackathon Universidad Libre · Barranquilla · 2026
> Lema: **Precisión que se puede contar.**

HealthByte une Instrumentación Quirúrgica e Ingeniería de Sistemas para que el trabajo del quirófano sea trazable, contable y seguro. Este documento reúne el sistema de marca y las especificaciones de cada pieza diseñada en el canvas *HealthByte · Diseño*.

**Plataforma:** HealthByte se desarrolla solo como aplicación web (escritorio). No hay versión móvil.

**Enfoque del pitch:** no presentamos requerimientos. Presentamos una **propuesta para resolver el problema**: cajas quirúrgicas que llegan incompletas y conteos que no dejan rastro.

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

### 8.1 Landing page (1280 px, fluida)

| Sección | Contenido |
|---|---|
| Navegación | Logo · Problema · Flujo · **Agendar demo** |
| Hero (HB.01 — Trazabilidad quirúrgica) | Título: "Ningún instrumento fuera de la **cuenta.**" Texto: HealthByte conecta la central de esterilización con el quirófano para que cada caja, pinza y gasa tenga registro, del lavado al cierre. Botones: *Agendar demo* / *Ver cómo funciona*. Tarjeta de caja LAP-07 · QX 03 con piezas verificadas /30 y "1 pieza sin registrar". |
| Cifras | Tres métricas en `[DATO]`: % de cajas incompletas, minutos perdidos buscando instrumental, % de registros de esterilización en papel. Fuente pendiente. |
| HB.02 — El problema | El conteo se hace en voz alta y se anota a mano. Cuando algo no cuadra, **nadie sabe en qué momento se perdió.** |
| HB.03 — Flujo | "Un solo registro, de la central al cierre." Tres pasos: **T − 6 H** Central de esterilización (escaneo, ciclo y lote) · **T − 30 MIN** Montaje de la mesa (verificación contra lista y preferencias del cirujano) · **T + 0** Cierre del conteo (compara inicial vs. final y alerta). |
| Cierre | "Precisión que se puede contar." + *Agendar demo*. Pie: Hackathon Universidad Libre · Barranquilla · 2026. |

### 8.2 Web · Conteo quirúrgico (escritorio 1440 × 900)

- Menú lateral oscuro (`blue-900`, 248 px): logo invertido; Panel, Conteo quirúrgico, Central de esterilización, Cajas e instrumental, Reportes; usuario [NOMBRE] · Instrumentador.
- Encabezado: QUIRÓFANO 03 · CAJA LAP-07, título "Conteo final", Laparotomía exploratoria. Botones *Escanear pieza* y **Localizar faltante**.
- Tres tarjetas de cifra: Piezas contadas **41/42** (anillo de progreso), Faltantes **1** en `signal`, Tiempo en quirófano [HH:MM].
- Tabla Instrumental y textiles (Grupo · Código · Inicial · Final · Estado): Gasas 20 → 19 con "! Falta 1" en fila resaltada; Pinzas Kelly, Tijeras Metzenbaum, Compresas y Separadores Farabeuf con "✓ Completo".
- Panel derecho "Registro del conteo": conteo inicial ✓ → antes del cierre de cavidad ✓ → conteo final en curso. Botón *Confirmar cierre* deshabilitado hasta que el final coincida con el inicial.

### 8.3 Web · Central de esterilización (escritorio 1440 × 900)

- Mismo menú lateral, activo "Central de esterilización".
- Encabezado: CENTRAL DE ESTERILIZACIÓN · TURNO A, "Cajas del turno". Botones *Exportar registro* y **Escanear caja**.
- Caja seleccionada LAP-07 · Laparotomía (30 piezas, lote 2210, ciclo [N.º]) con línea de etapas horizontal: Lavado y secado ✓ → Empaque y etiqueta ✓ → **Autoclave 134 °C en curso** → Almacén estéril → Quirófano 03.
- Tabla Todas las cajas (Caja · Procedimiento · Piezas · Lote · Etapa · Destino): LAP-07, CES-02 Cesárea, ORT-04 Ortopedia básica.

### 8.4 Pitch · Portada (1280 × 720)

- Fondo `blue-900`, logo invertido arriba y numeración 01 / 10.
- Etiqueta: INSTRUMENTACIÓN QUIRÚRGICA × INGENIERÍA DE SISTEMAS.
- Título 96 px: "Precisión que se puede **contar.**" ("contar." en `accent`).
- Subtítulo: "Cada caja, contada. Cada ciclo, registrado. Del lavado al quirófano en un solo registro."
- Pie: [NOMBRE DEL HACKATHON] · Universidad Libre · Barranquilla · [FECHA].
- Derecha: isotipo grande sobre textura pixel cross.

### 8.5 Pitch · Diapositiva de métrica (1280 × 720)

- Izquierda en `surface`: HB.02 — El problema, cifra gigante `[DATO]` en `brand` y "de las cajas quirúrgicas llegan incompletas al quirófano." Fuente pendiente.
- Derecha en `blue-900`: cuadrícula de 30 piezas con una vacía (borde rojo punteado). "Una pieza faltante basta para detener una cirugía."

### 8.6 Credenciales · Roles en escena (54 × 86 mm)

Carné con cabecera oscura (ranura para cordón, isotipo y logotipo), rol en `brand`, descripción, nombre y programa, y franja inferior `brand` + `accent`.

| Código | Rol | Descripción |
|---|---|---|
| HB-01 | **Propuesta** | Cómo resolvemos el problema |
| HB-02 | Arquitectura | Cómo se conecta cada registro |
| HB-03 | UX/UI | Lo que se ve con guantes puestos |
| HB-04 | Marketing | Cómo lo contamos |
| HB-05 | Instrumentación | La caja, pieza por pieza |

---

## 9. Pendientes

- Reemplazar los `[DATO]` con cifras reales de la investigación de campo y citar la fuente.
- Completar [NOMBRE DEL HACKATHON], [FECHA], y [NOMBRE] / [PROGRAMA] en cada credencial.
- Diapositiva de la propuesta (qué hace HealthByte y cómo resuelve el problema).
- Resto de diapositivas del pitch, mascota o avatar, y archivos de fuentes locales.
