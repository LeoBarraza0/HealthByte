---
tags:
  - hackathon/healthbyte
  - investigacion
  - requisitos
aliases:
  - Campos del tablero físico
fecha: 2026-10-01
estado: por validar con la instrumentadora
---

Transcripción de los campos del tablero físico que hoy llena el equipo quirúrgico en
una IPS colaboradora, a partir de dos fotos que compartió la integrante de
Instrumentación. Son el vocabulario base del sistema: los nombres se conservan tal
como están impresos. Complementa [[problematicas-y-soluciones]] y el reto oficial.

> [!warning] Datos personales
> Las fotos originales muestran nombre, documento e historia clínica de pacientes
> reales. No van al repositorio, ni a las diapositivas, ni a la demo sin pixelar
> (Ley 1581 de 2012). Tampoco se nombra la institución sin su autorización.

Las etiquetas que aparecen cortadas en las fotos están marcadas con **(?)**. Hay que
confirmarlas con la instrumentadora.

## 1. Encabezado (se escribe a mano, sin etiqueta impresa)

| Campo | Ejemplo de formato |
| --- | --- |
| Fecha | dd/mm/aaaa |
| HC | número de historia clínica |
| Tipo y número de documento | RC, CC o «ID» |
| Edad | años |
| EPS | nombre de la EPS |

## 2. Horas (recuadro azul)

| Campo impreso |
| --- |
| Hora Ingreso |
| Hora Anestesia |
| Hora Inicio Cirugía |
| Hora Final Cirugía |

El reto agrega **Salida a recuperación**, que no está en el tablero.

## 3. Paciente, equipo y procedimiento

| Campo impreso | Nota |
| --- | --- |
| Paciente (?) | etiqueta cortada; es el nombre completo |
| Cirujano | |
| Anestesiólogo | |
| Procedimiento (?) | etiqueta cortada («…o:») |
| Diagnóstico(s) (?) | etiqueta cortada («…co (s):») |
| Tipo de Anestesia | por ejemplo «General», «General – invasiva» |
| Lateralidad: Derecha / Izquierdo | dos casillas |
| Comorbilidades Asociadas | impreso como «Comorbolidades» |
| Condiciones Especiales | |
| Aislamiento | |
| Sangre Grupo | |
| RH | |
| Alergias | se escribe «(-)» cuando no hay |
| Reserva de Sangre y Cantidad | |

## 4. Bloque derecho: ID, FN, EDAD, A/B, PESO (?)

Por la disposición parecen datos de recién nacido (FN = fecha de nacimiento,
A/B = ¿Apgar/Ballard?). **Por confirmar.** En las dos cirugías cardiovasculares
fotografiadas, el equipo usa este bloque para anotar otra cosa (ver sección 9).

## 5. Verificaciones SI / NO

| Campo impreso |
| --- |
| Rayos X Intraoperatorio |
| «…rtos» (?) |
| Chequeo Preoperatorio |
| Chequeo Intraoperatorio |
| Chequeo Postoperatorio |
| Muestra para Patología (?) |
| «…s Contenedor Instrumental» (?) — ¿Sellos? ¿Indicadores? |

Las tres fases del checklist se reducen a una casilla SI/NO cada una: no queda ni
qué ítems se verificaron, ni quién lo hizo, ni a qué hora.

## 6. Conteo de material

| Columna izquierda | Columna derecha |
| --- | --- |
| «…ento» (?) — ¿Recuento? ¿Instrumento? | Rollos Abdominales |
| Compresas | Gasas |
| Cotonoides (?) | Drenes |
| Vendas (?) | Mechas |
| Agujas Sutura (?) | Hiladillos |
| | Agujas Hipodérmicas |
| | Hojas de Bisturí |

Cada material tiene una sola casilla: no se distingue el conteo inicial de los
adicionales ni del final.

## 7. Destino postoperatorio

Hospitalización · UCI · Ambulatorio (etiqueta de la fila cortada: «…no
Postoperatorio», probablemente «Destino Postoperatorio»).

## 8. Observaciones (?)

Última fila, etiqueta cortada («…s:»).

## 9. Lo que se escribe fuera de los campos

Esto es lo más útil para el diseño: lo que el equipo necesita registrar y para lo que
el tablero no tiene lugar.

| Se anota a mano | Dónde lo escriben | Implicación |
| --- | --- | --- |
| Peso y talla | en la línea de Aislamiento | El reto los pide y el tablero no tiene campo. |
| Glucometrías numeradas (1, 2, 3) en mg/dl | en el margen derecho | El reto la pide «cuando aplique»; es una medición repetida con hora. |
| Diuresis (orina) con hora y volúmenes numerados | junto al conteo | Medición repetida con hora. |
| Heparina: dosis y hora | esquina superior derecha | Medicamento con hora. |
| Bomba (inicio y fin), clamp y cardioplejía, con hora | sobre el bloque ID/FN/EDAD/A/B | Hitos propios de la cirugía cardiovascular. |
| Hallazgos clínicos (porcentajes de estenosis) | en Lateralidad y Condiciones Especiales | Los campos se reutilizan para otra cosa. |

Además, en las dos fotos el recuadro de horas está vacío. Puede que se llene al final
del procedimiento; **hay que validarlo**, porque si se llena de memoria las horas
pierden valor para el análisis de tiempos.

## 10. Preguntas para la instrumentadora

- [ ] ¿Qué dicen completas las etiquetas cortadas marcadas con (?)?
- [ ] ¿Para qué es el bloque ID / FN / EDAD / A/B / PESO? ¿Qué significa A/B?
- [ ] ¿Qué se verifica en «…s Contenedor Instrumental»?
- [ ] ¿En qué momento se llenan las horas: en el instante o al final?
- [ ] ¿Quién llena cada parte del tablero (circulante, instrumentadora, anestesia)?
- [ ] ¿El conteo se hace al inicio, en los cierres de cavidad y al final? ¿Dónde se
      anotan los adicionales que se abren durante la cirugía?
- [ ] ¿Qué otras mediciones o hitos se anotan a mano según la especialidad?
- [ ] ¿Qué pasa con el tablero al terminar? ¿Se borra? ¿Se transcribe a algún lado?
