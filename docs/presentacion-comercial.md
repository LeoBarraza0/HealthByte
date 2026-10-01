# Presentación de HealthByte al cliente

## Propuesta

**La seguridad de tu quirófano, a la vista de todos.**

Tu equipo se enfoca en cuidar. HealthByte acompaña cada verificación, mantiene visibles los pendientes y conserva la historia de cada cirugía.

El producto reúne verificaciones, conteos, tiempos y novedades en una vista compartida. El equipo puede dictar o registrar a mano. Cada evento conserva su hora, rol y origen; las correcciones forman parte del histórico.

## Para quién

Para equipos quirúrgicos que necesitan consultar el mismo estado durante una cirugía y para coordinación y calidad que necesitan revisar el cumplimiento del protocolo después. La presentación asume una clínica o IPS como cliente institucional, según el contexto del proyecto; no atribuye necesidades concretas a un cliente aún no identificado.

## Campos de evidencia del Pitch

Los tres campos `[DATO]` se sustituyen por capacidades comprobables. No existe en el repositorio una investigación de campo con muestra, metodología y resultados que respalde los porcentajes sugeridos en el artefacto.

| Campo original | Contenido publicado | Evidencia |
| --- | --- | --- |
| Tableros con campos sin diligenciar | Pendientes y alertas a la vista del equipo | Fases y alertas del contrato; lógica en `api/src/estado.ts` y `api/src/alertas.ts`. |
| Verificaciones sin responsable u hora | Cada registro con rol, hora y origen | Campos de `Evento` y persistencia del repositorio. |
| Registros que no se pueden consultar | Una historia de cada cirugía | Registro de eventos, anulaciones y estado reconstruido del backend. |

La diapositiva de métrica usa **3 momentos de verificación** (Entrada, Inicio y Salida), una característica del protocolo. Las cantidades de la landing se refieren a ejemplos ficticios, nunca a una medición clínica.

## Relato comercial

1. **Equipo:** el cuidado se comparte en una misma pantalla.
2. **Uso:** lo dictado se vuelve un registro visible; si hay duda, se confirma.
3. **Protocolo:** el sistema acompaña las pausas y las novedades durante la cirugía.
4. **Gestión:** la clínica conserva evidencia para revisar lo ocurrido.
5. **Acceso:** el visitante abre `/entrar` con las credenciales asignadas por su institución.

## Alcance actual y siguiente etapa

La landing es pública y funciona sin backend. El ejemplo de tablero es interactivo y está identificado como ilustrativo. El login llama a la API real; no simula una sesión. Sin backend responde con un mensaje de indisponibilidad. Tras autenticación, el navegador vuelve a `/` y abre el inicio que implementa el carril de gestión. El registro completo del quirófano se integra en su tarea posterior.

Programación, administración de personal y otras pantallas no se anuncian como funciones completas. Un piloto requiere definir institución, usuarios, dispositivos, protocolo, responsabilidades y forma de evaluar resultados. No se promete reducción de incidentes ni se inventan certificaciones, integraciones o clientes.

## Criterios para evaluar un piloto

Completitud de cada pausa, duración del registro, verificaciones que necesitan corrección, alertas atendidas y facilidad de uso para el equipo. Se necesita una línea base, período y muestra acordados antes de publicar cifras de impacto.
