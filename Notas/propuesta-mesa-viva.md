---
tags:
  - hackathon/healthbyte
  - propuesta
aliases:
  - Mesa Viva
fecha: 2026-09-30
estado: borrador
---

Propuesta para el hackathon que une el problema con más evidencia (sets incompletos,
conteos y formación, ver [[problematicas-y-soluciones]]) con un componente
tecnológico de alto impacto: 3D, visión por computador, voz e IA generativa. «Mesa
Viva» es un nombre provisional. Las referencias D1 a D15 apuntan a la tabla de cifras
de [[problematicas-y-soluciones]].

> [!abstract] La idea en una frase
> Un **gemelo digital 3D de la mesa de instrumentación** que *ve* el set con la cámara
> del celular, *escucha* el conteo por voz sin que la instrumentadora toque nada y
> *enseña* con un simulador 3D en el navegador. Todo sin gafas de realidad virtual ni
> hardware especial.

## 1. Por qué puede ganar

| Lo que premia un jurado | Cómo lo cubre Mesa Viva |
| --- | --- |
| Problema real y medible | Los faltantes son el error de instrumental más reportado y nacen de fallas visuales (D8). Un oblito hace presumir negligencia (D6). La lista de chequeo se cumple en el 13,3 % de los casos (D4). |
| Innovación visible | Hay un modelo 3D en vivo, IA que reconoce el instrumental y voz manos libres. Todo se ve en pantalla durante la demo. |
| Demo en vivo | Se retira una pinza de la bandeja real, la mesa 3D la marca en rojo, se dicta el conteo y suena la alarma de discrepancia. |
| Aterrizada | Corre en un celular y un navegador. La investigación publicada usa HoloLens, robots o varias cámaras; nosotros llevamos la misma idea a IPS y universidades de la región. |
| Modelo de negocio | Licencias para programas de Instrumentación Quirúrgica primero, y después para centrales de esterilización. |

## 2. Componentes

### 2.1 Ver: IA que revisa el set

- **Qué hace.** Con una foto del set extendido, detecta cada instrumento, lo compara
  con la lista del set y pinta los faltantes en el gemelo 3D.
- **Problema que ataca.** Sets incompletos detectados tarde (D8) y cancelaciones por
  causas institucionales (D2, D3).
- **Respaldo.** Hay modelos de detección de instrumental con 98,5 % de precisión en
  11 categorías ([2024](https://link.springer.com/article/10.1186/s13037-024-00406-y))
  y un sistema de Taiwán con 58 tipos de instrumental ortopédico
  ([2026](https://academic.oup.com/intqhc/article/38/2/mzag058/8667170)).

### 2.2 Mostrar: gemelo 3D y guía de armado

- **Qué hace.** Muestra una mesa de Mayo o una bandeja en 3D con cada instrumento en su
  lugar. En la central guía el armado paso a paso: resalta la siguiente pieza y dónde
  va. En el celular puede verse en realidad aumentada sobre la bandeja real (WebXR, si
  el equipo lo soporta).
- **Problema que ataca.** Errores de ensamble y falta de estandarización. Además,
  usamos solo del 13 % al 22 % del instrumental (D7), y el gemelo muestra qué sobra.
- **Respaldo.** En un estudio con 32 participantes (16 instrumentadores), la guía de
  armado en realidad aumentada igualó y en parte superó a las instrucciones en papel
  ([*Virtual Reality*, 2026](https://link.springer.com/article/10.1007/s10055-026-01491-3)).
  Otro trabajo con varias cámaras mejoró el desempeño de instrumentadores sin
  entrenamiento ([arXiv, 2026](https://arxiv.org/html/2606.04992v1)).

### 2.3 Escuchar: conteo por voz manos libres

- **Qué hace.** La instrumentadora dice, por ejemplo, «entran diez compresas» o «sale
  una aguja». La API de Claude convierte la frase en un registro estructurado, lo
  refleja en el gemelo y alerta si al cierre el conteo no cuadra. El resultado queda
  como la fase de salida de la lista de chequeo.
- **Por qué voz.** Con las manos estériles no se puede tocar una pantalla. Además, el
  conteo sufre en promedio **8,7 interrupciones por hora**, según la observación de
  1.015 cirugías
  ([estudio en PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11008047/)).
- **Respaldo.** Una lista de chequeo por voz fue aceptada por el personal en quirófanos
  reales, aunque el ruido afecta el reconocimiento
  ([*Patient Safety in Surgery*, 2025](https://link.springer.com/article/10.1186/s13037-025-00460-0)).
  Por eso siempre hay confirmación visual en pantalla.

### 2.4 Enseñar: simulador 3D del «cirujano virtual»

- **Qué hace.** Un cirujano virtual pide instrumentos por voz siguiendo los pasos de un
  procedimiento, por ejemplo una apendicectomía. El estudiante los elige en la mesa 3D
  y recibe puntaje por acierto, tiempo y anticipación. El diálogo del cirujano lo
  genera la API de Claude a partir de un guion que valida la integrante de
  Instrumentación.
- **Problema que ataca.** El acceso a quirófano es limitado para practicar (propuesta
  E del documento anterior).
- **Respaldo.** En la artroplastia de revisión de rodilla, con realidad virtual
  inmersiva, la habilidad de los instrumentadores pasó del 11 % al 84 % de pasos
  correctos y el tiempo para completar el procedimiento bajó un 47 %
  ([Arch Orthop Trauma Surg, 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8317146/)).
  Esos estudios usan cascos de realidad virtual; el nuestro corre en el navegador.

### 2.5 El truco técnico: datos sintéticos desde el 3D

Los mismos modelos 3D del instrumental sirven para **renderizar miles de fotos
sintéticas de bandejas**, con posiciones, luces y fondos al azar, y entrenar la IA de
2.1. Así no hacen falta cientos de fotos reales etiquetadas a mano: bastan unas pocas
para ajustar. Esto conecta el 3D con la IA y es un argumento técnico fuerte ante el
jurado.

## 3. Qué puede construir Claude y qué no

| Pieza | Con Claude | Lo que pone el equipo |
| --- | --- | --- |
| Modelos 3D del instrumental | Scripts de Blender en Python que modelan cada pieza por parámetros (pinzas, tijeras, porta-agujas, separadores) y la exportan a glTF | La integrante de Instrumentación valida las formas y las medidas con piezas reales |
| Gemelo 3D y simulador web | Código en Three.js o React Three Fiber, animaciones, WebXR y la lógica del juego | Diseño UX/UI y la identidad visual |
| Datos sintéticos | Script de renderizado aleatorio en Blender que exporta las etiquetas en formato YOLO | Unas 50 a 100 fotos reales del hospital simulado de la Unilibre (D14) |
| IA de visión | Scripts de entrenamiento y exportación con Ultralytics YOLO | GPU: Google Colab gratuito basta para un set pequeño |
| Voz | Integración de la Web Speech API en español y del parseo con la API de Claude | Pruebas con ruido real de quirófano simulado |
| Guiones clínicos | Borradores de los pasos del procedimiento y los instrumentos por paso | **Validación obligatoria** de la integrante de Instrumentación |

> [!warning] Riesgos técnicos
> - **Metal brillante.** La fotogrametría (escanear piezas reales con el celular)
>   falla con superficies reflectivas. Por eso se modela por parámetros en Blender.
> - **Brecha sintético-real.** Una IA entrenada solo con renders falla con fotos
>   reales. Hay que mezclarla con fotos reales y medir la precisión en fotos que no se
>   usaron para entrenar.
> - **Ruido de quirófano.** Degrada el reconocimiento de voz. Siempre debe haber
>   confirmación en pantalla y un botón de respaldo para el personal circulante.
> - **Alcance.** Un solo set de 10 a 15 instrumentos y un solo procedimiento. Nada de
>   integrarse con la historia clínica en el hackathon.

## 4. Alcance del MVP por prioridad

1. **Imprescindible.** El gemelo 3D de un set básico, más la foto que señala
   faltantes en el gemelo. Es el corazón de la demo.
2. **Muy deseable.** El conteo por voz con alarma de discrepancia al cierre.
3. **Si alcanza el tiempo.** El simulador del cirujano virtual (un procedimiento) y la
   realidad aumentada con WebXR.

El orden se puede ajustar cuando se conozca la duración del hackathon.

## 5. Guion de la demo (5 minutos)

1. **Gancho (30 s).** Una cifra real, por ejemplo: «En un hospital de Barranquilla se
   cancelaron 244 cirugías en un año; 4 de cada 10 por causas de la propia
   institución» (D2). También sirve la de la gasa y la presunción de negligencia (D6).
2. **Problema (60 s).** La integrante de Instrumentación cuenta, en primera persona,
   cómo se arma y se cuenta un set hoy.
3. **Clímax (2 min).** En vivo: se toma la foto de la bandeja sin una pinza y la mesa
   3D la marca en rojo. Luego se dicta el conteo, se omite una compresa y suena la
   alarma. Cierra con 20 segundos del simulador.
4. **Moraleja (60 s).** Métricas: minutos ahorrados por verificación e instrumentos que
   sobran por bandeja (D7). Modelo de negocio: primero universidades, luego centrales
   de esterilización.
5. **Cierre (30 s).** Equipo, siguiente paso (piloto en el hospital simulado de la
   Unilibre) y la petición al jurado.

## 6. Validar antes de construir

- [ ] Con la integrante de Instrumentación: ¿qué set básico usamos (instrumentos y
      cantidades) y qué procedimiento para el simulador?
- [ ] En entrevistas: ¿el conteo por voz sería aceptable en su quirófano? ¿Qué
      palabras usan realmente al contar?
- [ ] Con el programa de Instrumentación de la Unilibre: acceso al hospital simulado
      para las fotos y la demo, y disposición a ser el primer piloto.
- [ ] Confirmar la duración y las reglas del hackathon para cerrar el alcance del MVP.
