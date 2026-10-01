---
tags:
  - hackathon/healthbyte
  - diseno
  - mascota
fecha: 2026-10-01
estado: borrador
---

# HealthByte · Mascota y visuales: prompts de generación

Prompts para generar a **Conti** (la mascota) y el resto de visuales de la web, con
fondo transparente, y el lugar exacto de cada uno en el canvas *HealthByte · Diseño*.
Se apoyan en [[HealthByte_especificaciones_diseno]] y en la versión aprobada del
personaje:

![[Conti Logo.png|320]]

## 1. Quién es Conti

Conti es **el isotipo de HealthByte con vida**: la cruz de cinco cuadros que escucha
lo que se dicta en el quirófano y lo convierte en registro en el tablero.

| Pieza | Papel | En la imagen aprobada |
|---|---|---|
| Cuadro central | Cara y cuerpo, con una pantalla clara | Azul medio (≈ `#0777BF`), pantalla `#DCF4FC`, ojos `#0D2232` |
| Cuadros izquierdo y derecho | Manos flotantes | Azul medio |
| Cuadro inferior | Pie flotante | Azul medio |
| Cuadro superior | Gorro quirúrgico | Azul profundo (≈ `#08507B`) |
| Cuadro *byte* | **Luz de estado** | Verde menta `#2FB596` |

**Siempre de frente.** Conti no gira: se expresa con tres cosas.

1. **La pantalla**: ojos y boca.
2. **La luz *byte***: verde cuando escucha y está todo bien, rojo `#C8372D` en
   alerta, gris `#B8C7D1` en pausa.
3. **Las manos**: los cuadros laterales suben, se inclinan o se adelantan; nunca se
   pegan al cuerpo.

Alrededor van **gráficos del mismo material** (fichas, barras de sonido, insignias)
que explican qué está pasando.

> [!note] Color del render frente a los tokens
> Con la iluminación 3D, el azul del cuerpo sale más brillante que `brand` (`#0B5D8C`).
> Está bien para la mascota. La interfaz sigue usando los tokens del sistema de diseño.

## 2. Cómo generarlos

1. **Adjunta [[Conti Logo.png]] al inicio de cada chat** y escribe: *"Use this exact
   character as reference."* Esa imagen es la que mantiene a Conti igual en todas las
   versiones.
2. **Un chat, un prompt por mensaje.** Si Conti empieza a cambiar (colores, cuadros
   pegados, proporciones), abre un chat nuevo y vuelve a adjuntar la imagen.
3. **Arma cada prompt así:** bloque A + bloque B + el texto de la imagen. En los
   visuales sin Conti (sección 5) va solo el bloque B.
4. **Fondo transparente.** Va en los bloques. Además, en ChatGPT pide «PNG con fondo
   transparente» en el mismo mensaje. Si la herramienta no exporta transparencia,
   cambia la frase por *"on a flat solid magenta #FF00FF background"* y quita el fondo
   con remove.bg. Usa magenta, no blanco: la pantalla de Conti es casi blanca.
5. **Sin texto en las imágenes.** Las IA inventan letras. Los textos van en HTML,
   encima o al lado del PNG.

## 3. Bloques base

### A. Personaje

```text
Transparent background PNG with alpha channel: the character alone, isolated, with no background of any color.
CHARACTER: "Conti", exactly as in the reference image. A mascot made of five separate puffy rounded square tiles arranged as a plus sign, with small even gaps so the tiles float and never touch. Center tile: medium blue #0777BF, with an inset rounded screen in very pale blue #DCF4FC showing two vertical pill-shaped eyes in dark navy #0D2232 and a small mouth. Left and right tiles: floating hands, medium blue #0777BF. Bottom tile: floating foot, medium blue #0777BF. Top tile: deeper blue #08507B, reads as a surgical scrub cap. A smaller mint green #2FB596 tile, about 60% the size of the others, floats off the upper-right corner of the top tile: the "byte", the character's status light.
ALWAYS FRONT VIEW, facing the viewer. The character never turns. It expresses itself only through the face screen (eyes and mouth), the color of the byte light, and small moves of the floating tiles (hand tiles can rise, tilt or come forward; the whole figure can lean a few degrees). The tiles keep their shape and never merge.
```

### B. Estilo y salida

```text
STYLE: soft 3D render matching the reference: matte soft-touch rubber tiles with puffy rounded edges, gentle studio light from the upper left, soft ambient occlusion only between nearby pieces, no glossy reflections. Any surrounding graphics use the same matte rubber material and the same palette: #0777BF, #08507B, #0B5D8C, #DCF4FC, #F5F9FB, #0D2232, #2FB596, #B8C7D1, plus surgical green #0B6B5A and alert red #C8372D only where stated. Calm, precise, friendly but not childish. Square 1:1, subject centered with generous padding.
OUTPUT: transparent background (alpha channel). Nothing behind the subject: no white, no color fill, no checkerboard pattern, no floor, no cast shadow, no frame, no text, no letters, no numbers, no watermark.
```

### C. Negativo (si la herramienta lo admite)

```text
text, letters, numbers, watermark, background, checkerboard, floor, cast shadow, side view, back view, profile, glossy plastic, realistic human, lab coat, stethoscope, red cross emblem, blood, syringe, kawaii sparkle eyes, tiles touching or merged, extra limbs
```

## 4. Expresiones de Conti

Cada prompt va después de **A + B**. Los estados siguen el flujo real del dictado en
la pantalla de pared: pregunta → escucha → procesa → registra → confirma o alerta.

### E1. Reposo

No hace falta generarla: es [[Conti Logo.png]].

### E2. Saludo

```text
Front view. The right hand tile (viewer's left) is raised high and tilted about 20 degrees as if waving, with two short curved motion marks made of small rounded mint bars next to it. Eyes squint happily into upward arcs, open small smile. The byte light floats a little higher than usual, as if bouncing. Welcoming, confident.
```

### E3. Escuchando (voz activa)

```text
Front view, listening carefully. Eyes a bit larger and focused on the viewer. The mouth becomes a tiny audio waveform of five rounded vertical bars of different heights in mint #2FB596. The byte light glows mint with two thin rounded-square outline rings around it. Three curved sound-wave arcs made of matte mint rubber approach from the viewer's left toward the face. Hand tiles slightly lowered and still, as if not to make noise.
```

### E4. Pregunta (le pide un dato al equipo)

```text
Front view. One eye slightly smaller than the other to look curious, small round "o" mouth. The left hand tile (viewer's right) is raised next to the face, palm-like, as if asking. Floating at the upper left of the character is a rounded speech-bubble tile in pale #F5F9FB with a bold question mark symbol in #0B5D8C. The byte light is mint.
```

### E5. Registrando (convierte lo dicho en datos)

```text
Front view, focused and pleased. Eyes look toward the viewer's right, small concentrated mouth. From the left hand tile (viewer's right) a short tidy stream of small rounded tiles flies out to the right and lines up into three neat rows, like fields being filled: the first tiles are solid blue #0B5D8C, the one arriving now is mint #2FB596, the last ones are empty pale outlines. The byte light is mint.
```

### E6. Procesando

```text
Front view. Eyes look up and to the viewer's right, thinking. The mouth is replaced by three small round dots in a row in mint #2FB596, like a loading indicator. The byte light is half mint and half pale. Hand tiles close to the body. Patient and calm.
```

### E7. No entendí (ruido en la sala)

```text
Front view. Eyes shown as two short flat horizontal lines squeezed together, a small wavy mouth, the whole figure tilted about 8 degrees to the viewer's right. The right hand tile (viewer's left) is raised next to the head as if cupping an ear. Next to it float three short broken, uneven sound bars in steel grey #B8C7D1, as if the signal was scrambled. The byte light is steel grey #B8C7D1. Not sad, just asking to repeat.
```

### E8. Verificado

```text
Front view, satisfied. Eyes are happy upward arcs, small smile. The left hand tile (viewer's right) holds up, slightly forward, a round badge tile in surgical green #0B6B5A with a bold white check mark. The byte light is mint. Quiet confidence: a step checked, signed and timed.
```

### E9. Alerta (algo por validar)

```text
Front view, serious and attentive, not scared. Eyes with flat top edges, straight line mouth. The figure leans a few degrees forward. The left hand tile (viewer's right) points to a floating rounded-square badge tile in alert red #C8372D with a bold white exclamation mark. The byte light has turned alert red #C8372D. Conveys: stop and check this before going on.
```

### E10. Bloqueo (no se puede avanzar)

```text
Front view, firm and calm. Both hand tiles are brought forward and up in front of the body, side by side, like a clear "stop" gesture. Eyes are steady, straight line mouth. The byte light is alert red #C8372D with one thin red outline ring around it. Conveys: this step cannot start yet. Professional, not angry.
```

### E11. Cierre seguro (procedimiento completo)

```text
Front view, celebrating with restraint. Both hand tiles raised high and outward. Eyes are happy upward arcs, open smile. Around the character float about a dozen tiny rounded tiles in #0B5D8C, #2FB596 and #DCF4FC, like neat pixel confetti, all perfectly square, none touching the character. The byte light is mint and slightly bigger than usual.
```

### E12. En pausa (micrófono apagado)

```text
Front view, resting. Eyes closed, drawn as two short downward arcs, tiny relaxed mouth. All tiles sit slightly closer together and a bit lower, as if settling down, still with visible gaps. The byte light is steel grey #B8C7D1 and dimmer. Calm, waiting to be called.
```

### E13. Avatar (solo cara)

Cambia `{EXPRESIÓN}` por la de E1, E3, E8 o E9 para tener los avatares de la interfaz.

```text
Close-up icon of the character: only the center face tile and the byte light at its upper right, centered, filling most of the frame. Expression: {EXPRESIÓN}. Bold simple shapes that stay readable at 40 px, no thin lines, no small details.
```

## 5. Otros visuales de la web (sin Conti)

Solo bloque **B** + el prompt. Conti no aparece en todos los visuales para que no se
desgaste.

### V1. El tablero de hoy (el problema)

```text
A small physical surgical whiteboard as a soft matte 3D object, slightly tilted toward the viewer, in pale #F5F9FB with a steel grey #B8C7D1 frame. On it: illegible abstract marker scribbles in navy #0D2232, a grid of boxes where some are empty, one row half-erased into a grey smudge, and a single empty box outlined in alert red #C8372D. In front of the board: a marker without its cap and a felt eraser, same matte material. Conveys: handwritten, erased at the end of the day, gaps nobody notices. No readable words.
```

### V2. Las tres pausas (íconos del flujo)

Tres imágenes, una por tarjeta. Mismo encuadre y tamaño para que se vean como serie.

```text
01 · A single soft matte 3D icon object, front three-quarter view: a curled hospital patient identification wristband in pale #F5F9FB with a blank blue #0B5D8C tag and a small mint #2FB596 snap button. Simple, iconic, centered.
```

```text
02 · A single soft matte 3D icon object, front view: a round stopwatch in blue #0B5D8C with a pale #DCF4FC face showing a bold pause symbol (two vertical bars) in navy #0D2232, and a mint #2FB596 top button. Simple, iconic, centered.
```

```text
03 · A single soft matte 3D icon object, front three-quarter view: a small rectangular steel-grey #B8C7D1 instrument tray holding neatly folded white surgical gauze squares in a tidy row and one simple surgical clamp, with a round surgical green #0B6B5A badge with a white check mark floating at its upper right. No blood. Simple, iconic, centered.
```

### V3. De la voz al registro (la solución)

Esta escena es la excepción: lleva a Conti, así que va con **A + B** y formato 16:9.

```text
Wide 16:9 composition instead of square. Left third: curved sound-wave arcs and a short waveform of rounded bars in mint #2FB596, entering from the left edge. Center: the character in the listening expression (waveform mouth, mint byte light). Right third: a floating soft matte board tile in pale #F5F9FB with a steel grey #B8C7D1 rim, holding four horizontal rows of small rounded tiles: the top rows filled in blue #0B5D8C, the current tile mint #2FB596, the rest empty pale outlines, and a small surgical green #0B6B5A check badge on the finished row. A few small tiles travel from the character's left hand tile to the board. Reads left to right: voice, Conti, structured record.
```

### V4. Campo de fichas (portada del pitch)

```text
Wide 16:9 composition. A loose field of floating soft matte rounded square tiles of three sizes, in #0B5D8C, #08507B, #0777BF and a few mint #2FB596, arranged on an invisible grid with some gaps, denser at the right edge and fading out toward the left (tiles get fewer, not transparent). No character. Calm, orderly, like a tray of pixels.
```

## 6. Dónde va cada visual

Las ubicaciones se refieren a los artboards del canvas
[HealthByte · Diseño](https://claude.ai/artifact/2k5KRsbo3y6qyv7med2zY5).

### Presentación comercial (landing, `Main`)

| Sección | Lugar exacto | Visual | Tamaño en pantalla |
|---|---|---|---|
| Navegación | Nada. El logo ya cumple. | — | — |
| HB.01 · Hero (`#inicio`) | Columna derecha, encima de la esquina superior derecha de la tarjeta «QX 03 · TABLERO EN VIVO». Conti asomado sobre el borde, sobresaliendo unos 40 px hacia afuera. | **E2 Saludo** | ≈ 180 px |
| Cifras `[DATO]` | Nada. Las cifras se sostienen solas. | — | — |
| HB.02 · El problema | Columna izquierda, debajo de la etiqueta «HB.02 — EL PROBLEMA», que hoy deja ese espacio vacío frente al párrafo grande. | **V1 Tablero de hoy** | ≈ 360 px de ancho |
| HB.03 · Flujo (`#flujo`) | Arriba de cada una de las tres tarjetas, sobre el número 01, 02 y 03. | **V2** 01, 02 y 03 | 96 px |
| HB.04 · Solución (`#solucion`) | Entre el título «No reemplaza el tablero por un formulario…» y la cuadrícula Registra · Valida · Alerta · Mide, a todo el ancho. | **V3 De la voz al registro** | 1120 × 630 px |
| Cierre (`#contacto`) | Columna derecha del bloque azul: Conti de pie sobre la cuadrícula de cuadros, como si se hubiera armado con ellos. | **E11 Cierre seguro** | ≈ 220 px |
| Pie de página | Nada. | — | — |

### Tablero inteligente · Pantalla de pared (`Pared-Tablero`)

Es donde Conti más trabaja: muestra en cada momento qué está haciendo el sistema.

| Lugar exacto | Visual |
|---|---|
| Chip «VOZ ACTIVA» del encabezado | **E13** con E3 (avatar escuchando), 32–40 px. Con el micrófono apagado, **E13** con E12. |
| Panel de dictado inferior, a la izquierda de «PASO 11/17 · ANESTESIÓLOGO ¿Qué antibiótico…?» (≈ 120 px) | Cambia según el estado: **E4** mientras espera la respuesta → **E3** mientras alguien habla → **E6** mientras procesa → **E5** mientras se llenan Medicamento, Dosis, Vía y Hora → **E8** al pulsar *Confirmar*. **E7** si no entendió. |
| Aviso «Alergia a penicilina: confirme compatibilidad» | **E9 Alerta** en lugar del ícono, 56 px. |
| Chip «INCISIÓN BLOQUEADA» del encabezado | **E13** con E9 (avatar en alerta), 32–40 px. |

### Tablero en vivo (`Web-Tablero`)

| Lugar exacto | Visual |
|---|---|
| Banda «2 alertas bloquean el inicio de la cirugía», a la izquierda del texto | **E10 Bloqueo**, 72 px |
| Fase «03 · BLOQUEADA — Se habilita al registrar el fin de cirugía» | **E12 En pausa**, 64 px, como estado vacío |
| Usuario del menú lateral | Nada: ahí va la persona, no la mascota. |

### Pitch

| Artboard | Lugar exacto | Visual |
|---|---|---|
| Portada (`Slide-Portada`) | Mitad derecha, en lugar de la textura pixel cross; el isotipo grande puede quedar encima. | **V4 Campo de fichas**. Opcional: **E2** en vez del isotipo. |
| Diapositiva de métrica (`Slide-Pitch`) | Nada: la cuadrícula de 30 piezas ya es la imagen. | — |
| Diapositiva de la propuesta (pendiente) | Centro. | **V3 De la voz al registro** |

## 7. Revisión antes de aprobar una imagen

- [ ] Conti está de frente y se parece a [[Conti Logo.png]].
- [ ] Son cinco cuadros separados, sin piezas fusionadas, y el *byte* está arriba a
      la derecha.
- [ ] El color de la luz *byte* corresponde al estado (verde, rojo o gris).
- [ ] No hay texto ni letras inventadas.
- [ ] El PNG tiene transparencia real: sin cuadrícula gris pintada y sin halo blanco
      en los bordes.
- [ ] Los avatares (E13) se leen a 40 px.
