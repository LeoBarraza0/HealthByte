---
tags:
  - hackathon/healthbyte
  - diseno
  - mascota
fecha: 2026-10-01
estado: propuesta para el front
---

# Conti en el producto: estados y reglas

Conti es la cara del registro por voz. Esta nota dice **cuándo** cambia de estado,
**dónde** aparece y **cómo** se implementa. Parte de
[[HealthByte_mascota_prompts]] (el personaje) y de `Visuales/conti/conti.js` (el
componente que ya funciona). El spec del producto manda sobre esta nota.

## 1. Qué se conserva de la propuesta del equipo

- El personaje: el isotipo con vida, siempre de frente, cinco cuadros que no se tocan.
- La luz *byte* como indicador: verde menta cuando todo va bien, roja en alerta y gris
  en pausa.
- `conti.js` como componente web (`<hb-conti state="…">`), que ya respeta
  `prefers-reduced-motion`.
- Nada de texto dentro de las imágenes.

## 2. Qué cambia y por qué

| Propuesta | Cambio | Motivo |
| --- | --- | --- |
| E10 «Bloqueo» | Se retira. Se usa E9 «Alerta». | El sistema no bloquea el acto clínico (spec, sección 7). |
| E4 «Pregunta»: el asistente pide un dato | Pasa a ser la confirmación «¿Registrar esto?» cuando Jev duda. | La voz no guía un cuestionario de 17 pasos: registra lo que se dice, en cualquier orden. |
| E5 «Registrando» | Solo para ilustraciones de la landing. | En la app el paso es corto: procesando → registrado. |
| Conti en el chip del encabezado y en los avisos | Conti vive en la barra de voz, y en ningún otro lugar de la sesión. | Un solo punto de atención. Si aparece en todas partes, deja de significar algo. |

**Conti acompaña, no informa.** Cada estado va siempre junto a un texto que dice lo
mismo (por ejemplo, «Escuchando» o «¿Registrar esto?»). Nadie tiene que interpretar la
cara para saber qué pasó, y un lector de pantalla lee el texto, no la mascota.

## 3. Estados

| Estado (`state`) | Cuándo | Cara | Luz *byte* | Cuánto dura | Texto al lado |
| --- | --- | --- | --- | --- | --- |
| `paused` (E12) | El micrófono está apagado o lo tiene otro dispositivo | Ojos cerrados | Gris | Mientras siga así | «Micrófono apagado» o «Escucha: Tablet 3F» |
| `idle` (E1) | Micrófono activo y nadie habla | Reposo | Menta | Por defecto | «Escuchando» |
| `listening` (E3) | Llegó texto parcial hace menos de 1,5 s | Boca de onda de sonido | Menta, pulsando | Mientras se habla | La transcripción en vivo |
| `processing` (E6) | El API avisa `voz: procesando` | Mira arriba, tres puntos | Menta | Hasta la decisión, máximo 5 s | La frase entre comillas |
| `asking` (E4) | Hay una confirmación pendiente | Curiosa, boca en «o», una mano arriba | Menta | Hasta el sí, el no o el vencimiento | «¿Registrar esto?» |
| `verified` (E8) | El API avisa `voz: registrado` | Feliz, manos arriba | Menta | 2,5 s | «Registrado: …» |
| `confused` (E7) | El API avisa `voz: no_entendido` | Ojos planos, boca ondulada, inclinado | Gris | 3 s | «No entendí. Repita o regístrelo a mano.» |
| `alert` (E9) | Se abre una alerta crítica nueva | Seria, sacude | Roja | 4 s | El mensaje de la alerta |
| `celebrate` (E11) | Se registra la salida a recuperación sin alertas abiertas | Feliz, manos arriba, *byte* más grande | Menta | 4 s, una vez | «Cierre seguro» |
| `greeting` (E2) | Pantalla de inicio de sesión | Saluda con una mano | Menta | Mientras esté la pantalla | — |

La conversación del equipo que no va dirigida al tablero (`voz: ignorado`) **no cambia
a Conti**: sigue en `idle` o en `listening`.

**Prioridad cuando coinciden dos condiciones**, de mayor a menor:
`paused` > `asking` > `alert` > `processing` > `listening` > `verified` > `confused` >
`celebrate` > `idle`.

## 4. Dónde aparece

| Pantalla | Lugar | Tamaño |
| --- | --- | --- |
| Pared | Barra de voz, a la izquierda, en lugar del círculo del micrófono | 112 px |
| Tablet, modo registro | Barra de voz, junto al botón del micrófono | 64 px |
| Inicio de sesión | Junto al formulario, en `greeting` | 160 px |
| Panel de gestión y trazabilidad | No aparece | — |

En la pared, el flotado de reposo va con la mitad de la amplitud de `conti.js`: la
pantalla está en la periferia del equipo y el movimiento constante distrae. Solo
`listening` tiene animación continua visible.

## 5. Accesibilidad

- `role="img"` y `aria-label` con el estado: «Conti: escuchando».
- El anuncio para lectores de pantalla lo da el texto de la barra de voz
  (`aria-live="polite"`), no Conti.
- Ningún estado depende solo del color de la luz: siempre hay texto y cambio de cara.
- Con `prefers-reduced-motion`, Conti cambia de cara sin animarse.

## 6. Implementación

- **Componente:** se reutiliza `conti.js`. Se copia con sus `.webp` a
  `web/public/conti/` y se carga con `<script src="/conti/conti.js" defer>`. React 19
  usa `<hb-conti state={estado}>` sin envoltorio.
- **Estados que faltan en `conti.js`:** `asking`, `confused`, `celebrate`, `greeting`.
  También el alias `alert`, que hoy comparte animación con `error`.
- **Cálculo del estado:** una función pura `estadoConti()` en `web/src/estadoConti.ts`.
  Recibe si el micrófono está activo, si llegó texto parcial, la confirmación pendiente,
  la última fase de voz (`MsgServidor` de tipo `voz`), la hora en que se abrió la última
  alerta crítica y la hora actual. Devuelve un estado aplicando la prioridad y las
  duraciones de este documento. Se prueba con `node --test`.
- **Mensajes del API:** `sesion.ts` envía `{ tipo: 'voz', fase }` con `procesando` al
  recibir una frase final, `registrado` al guardar, `ignorado` si no iba dirigida y
  `no_entendido` si iba dirigida pero no se pudo interpretar (`Decision` con
  `no_entendido: true`) o si Jev falló.
