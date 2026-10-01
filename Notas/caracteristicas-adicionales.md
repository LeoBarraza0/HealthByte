| Característica | Qué hace | Esfuerzo |
|---|---|---|
| **Circuito cerrado por voz** | El tablero repite el conteo y anuncia las alertas críticas | Bajo: `speechSynthesis` en el front |
| **Briefing predictivo** | Al abrir la cirugía: "con este cirujano y este procedimiento dura en promedio 142 min; en 4 de las últimas 10 se descuadraron las compresas; vigilar el antibiótico". Esto sí es lo que pide la sección 10 del reto (identificar patrones) | Medio: SQL sobre los eventos más una plantilla de texto; el LLM es opcional |
| **Redosis de antibiótico en vivo** | Un reloj que avisa "pasaron 4 h desde la cefazolina: toca redosis". Tiene base clínica y es una función pura más en [alertas.ts](../api/src/alertas.ts) | Muy bajo |
| **Entrega a recuperación** | Al registrar la salida se genera un resumen: procedimiento, hitos, alertas, novedades y conteo. Se abre con un QR en el celular de quien recibe en recuperación. Los errores en la entrega del paciente son una causa conocida de eventos adversos | Medio-bajo |
| **Torre de control con hora estimada de fin** | Todos los quirófanos de la clínica en vivo, con semáforo y "termina ~14:10: avisar a recuperación y preparar al siguiente paciente". Aporta a la gestión (rotación entre cirugías) | Medio: necesita varias cirugías simuladas al mismo tiempo |
| **Sugerencias para mejorar el protocolo** | El panel detecta "el ítem X se omite en el 40 % de las cirugías" y propone cambiarlo. Es mejora continua con datos | Bajo-medio |
