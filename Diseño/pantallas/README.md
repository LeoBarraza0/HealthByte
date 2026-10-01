# Pantallas del front

Exportadas del canvas [HealthByte · Diseño](https://claude.ai/artifact/BVc3RmxgBV4rEsipq6h74L),
página «Rediseño». Son la referencia visual del front: ábrelas en el navegador y copia la
estructura, los textos, los colores y las medidas. Conti funciona porque cada archivo carga
`web/public/conti/conti.js`.

No se editan a mano. Si cambia el diseño, se cambia en el canvas y se exporta de nuevo.

| Archivo | Qué muestra | Componente | Carril (ola 3) |
| --- | --- | --- | --- |
| `Login.html` | Iniciar sesión, Conti saludando | `Login.tsx` | G |
| `Inicio-Cirugias.html` | Cirugías de hoy y uso del dispositivo | `Inicio.tsx` | G |
| `Tablet-Registro.html` | La sesión en la tablet, 11:46 | `Sesion.tsx` (marco) + `Ahora`, `Atencion`, `Lateral` | S1 + S2 |
| `Tablet-Cerrar-Alerta.html` | Cerrar una alerta con motivo | dentro de `Atencion.tsx` | S2 |
| `Tablet-Conteo.html` | Protocolo de conteo, 14:57 | dentro de `Atencion.tsx` y `Ahora.tsx` | S2 |
| `Tablet-Consumo.html` | Hoja de consumo de la cirugía | `Consumo.tsx`, se abre desde `Lateral.tsx` | S2 |
| `Pared-Entrada.html` | Pared, antes de la anestesia | `Sesion.tsx` en modo pared | S1 + S2 |
| `Pared-Inicio.html` | Pared, antes de la incisión | igual | S1 + S2 |
| `Pared-Alergia.html` | Pared con la alerta de betalactámico | igual | S1 + S2 |
| `Pared-Durante.html` | Pared durante la cirugía | igual | S1 + S2 |
| `Pared-Salida.html` | Pared antes de salir, con el protocolo de conteo | igual | S1 + S2 |
| `Panel.html` | Panel de gestión con filtros y paginación | `Panel.tsx` | G |
| `Trazabilidad.html` | Registro cronológico de una cirugía | `Trazabilidad.tsx` | G |
| `Programacion.html` | Agenda por quirófano y nueva cirugía | fuera de la ola 3 | — |
| `Usuarios.html` | Personal | fuera de la ola 3 | — |
| `Conti-Estados.html` | Los 10 estados de Conti | ya hecho: `web/public/conti/` | — |
| `Mapa.html` | Mapa de pantallas y flujo de datos | referencia | — |

Lo que es del marco de la sesión (S1): la cabecera del paciente, la pista del tiempo y la
barra de voz con Conti. Lo que va dentro (S2): «Ahora» (columna izquierda), «Requiere
atención» y el panel lateral (columna derecha).
