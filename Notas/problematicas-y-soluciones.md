---
tags:
  - hackathon/healthbyte
  - investigacion
aliases:
  - Problemáticas y soluciones HealthByte
fecha: 2026-09-30
estado: borrador
---

Primer corte de la investigación documental del [[plan-de-investigacion]]: qué
problemas de la instrumentación quirúrgica tienen evidencia en Colombia y en la Costa
Caribe, qué existe ya para resolverlos y qué propuestas vale la pena considerar. Solo
usa fuentes secundarias; falta validar con entrevistas y encuesta. Cada cifra lleva su
fuente. Lo que es inferencia nuestra está marcado como tal.

> [!abstract] Recomendación preliminar
> Apostar por **A. Verificación visual del instrumental con IA desde el celular**, y
> sumar **B** (conteo en quirófano) y **E** (modo estudio) como módulos del mismo
> producto. Ataca el error de instrumental más reportado, que son las piezas faltantes, y se puede
> demostrar en vivo durante el pitch con un set real del hospital simulado de la Unilibre.
> Además no exige la inversión en marcado láser o RFID que piden las soluciones de
> trazabilidad que ya existen. Si en las entrevistas domina el dolor de ortopedia, la
> alternativa es **C** (material en consignación).

## 1. Panorama en cifras

| # | Dato | Fuente |
| --- | --- | --- |
| D1 | El 10,5 % de los pacientes hospitalizados en 58 hospitales de 5 países, Colombia entre ellos, sufrió al menos un evento adverso. Cerca del 60 % era evitable. | [Estudio IBEAS, OPS y MinSalud](https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/CA/resultados-estudio-ibeas.pdf) |
| D2 | En un hospital universitario de **Barranquilla** se cancelaron 244 de 3.207 cirugías programadas en 2016 (7,6 %). El 38,1 % de las cancelaciones fue atribuible a la institución, **ortopedia concentró el 34,8 %** y el 41 % era evitable. | [Domínguez Lozano et al., *Enfermería Global*, 2020](https://revistas.um.es/eglobal/article/view/380441) |
| D3 | En Colombia la cancelación de cirugías oscila entre el 2,7 % y el 7,6 %. El 44,2 % de las causas es administrativa: programación, falta de equipos o de materiales. | [Segnini, Domínguez-Torres y Vega, *Iatreia*, 2022](https://www.redalyc.org/journal/1805/180574389011/html/) |
| D4 | En un hospital público de Santander, el cumplimiento global de la lista de verificación de cirugía segura fue del **13,3 %** (2018). Instrumentación cumplió en el 100 % de los casos y enfermería, que lidera la lista, en el 25 %. | [Sepúlveda Plata et al., *Revista Cuidarte*, 2021](https://www.redalyc.org/journal/3595/359572127014/html/) |
| D5 | En 2023 se notificaron 4.248 infecciones asociadas a 801.551 procedimientos vigilados (0,5 por cada 100). La vigilancia nacional solo cubre cesárea, parto vaginal, colecistectomía, herniorrafia y revascularización miocárdica, **no la cirugía ortopédica ni la estética**. | [INS, informe de evento IAPMQ 2023](https://www.ins.gov.co/buscador-eventos/Informesdeevento/IAMPQ%20INFORME%20DE%20EVENTO%202023.pdf) |
| D6 | La literatura cita un cuerpo extraño retenido en 1 de cada 1.000 a 18.000 cirugías, y la gasa es lo más frecuente. Para el Consejo de Estado, la sola presencia del oblito hace presumir negligencia. | [Revisión en *BioData Mining*, 2024](https://link.springer.com/article/10.1186/s13040-024-00367-z) · [Consejo de Estado, exp. 43179 de 2019](https://normograma.supersalud.gov.co/compilacion/docs/05001-23-31-000-2004-06213-02(43179).htm) |
| D7 | De una bandeja quirúrgica solo se usa entre el **13 % y el 21,9 %** del instrumental, y reprocesar cada instrumento cuesta entre 0,35 y 0,51 USD, se use o no. | [Stockert y Langerman, *J Am Coll Surg*, 2014](https://www.sciencedirect.com/science/article/abs/pii/S1072751514005109) |
| D8 | Los instrumentos faltantes son el error de instrumental más reportado por el personal, y la causa raíz principal es la falla en la verificación visual humana. (Porcentaje exacto por confirmar en el texto completo.) | [*Perioperative Care and OR Management*, 2023](https://www.sciencedirect.com/science/article/abs/pii/S2405603023000511) |
| D9 | En neurocirugía, los insumos que se abren y no se usan cuestan en promedio 653 USD por cirugía, el 13,1 % del gasto en insumos. | [Zygourakis et al., *J Neurosurg*, 2017](https://pubmed.ncbi.nlm.nih.gov/27153160/) |
| D10 | Los sets de préstamo de casas comerciales llegan tarde e incompletos y obligan a esterilizar a la carrera. La buena práctica internacional pide recibirlos al menos 24 horas antes de la cirugía. | [Revisión en PMC sobre sets de préstamo](https://pmc.ncbi.nlm.nih.gov/articles/PMC13408902/) · políticas hospitalarias de [Denver Health](https://www.denverhealth.org/-/media/files/about/for-vendors/2022/management-of-loaner-and-consignment-instruments-and-implants) y [Providence](https://www.providence.org/-/media/Project/psjh/providence/kadlec/files/student-faculty-resources/sterile-policies/delivery-processing-of-loaner-inst-implants-for-perioperative-services-320505.pdf) |
| D11 | **Barranquilla** registra 5 muertes en 16 meses (abril de 2025 a agosto de 2026) tras procedimientos estéticos irregulares. La Secretaría Distrital de Salud ha impuesto 13 medidas de seguridad desde 2024. | [El Tiempo, 9 de agosto de 2026](https://www.eltiempo.com/colombia/barranquilla/barranquilla-ha-cerrado-13-servicios-por-procedimientos-esteticos-irregulares-cti-investiga-muerte-de-fiscal-tras-lipoescultura-3577108) |
| D12 | 44 mujeres se infectaron con micobacterias en un centro estético de Medellín (marzo a junio de 2024). La literatura atribuye estos brotes a esterilización deficiente y al reúso de material. | [El Colombiano](https://www.elcolombiano.com/medellin/mujeres-infectadas-micobacteria-centro-estetico-arte-en-tu-cuerpo-HG25239538) · [*Infectio*](http://www.scielo.org.co/scielo.php?script=sci_arttext&pid=S0123-93922010000200002) |
| D13 | Según instrumentadores de Medellín, el reúso de dispositivos de un solo uso es frecuente, y exige registros rigurosos para ser seguro. | [UdeA, 2022](https://bibliotecadigital.udea.edu.co/server/api/core/bitstreams/76848662-734f-4fdf-ba9c-1eda2f222d09/content) |
| D14 | La Unilibre Barranquilla tiene un programa de Instrumentación Quirúrgica con 25 años de trayectoria y un hospital simulado. | [Unilibre](https://www.unilibre.edu.co/pregrados/instrumentacion-quirurgica-barranquilla/) |
| D15 | El REPS se publica como datos abiertos: prestadores, sedes y servicios habilitados. | [datos.gov.co, prestadores y sedes](https://www.datos.gov.co/Salud-y-Protecci-n-Social/Registro-Especial-de-Prestadores-y-Sedes-de-Servic/c36g-9fc2) · [servicios habilitados](https://www.datos.gov.co/widgets/p9n2-9qsb) |

Para el plan: la Resolución 3100 de 2019 **sigue vigente**. La Resolución 2080 de 2026
revocó la 1732 de 2026, que pretendía reemplazarla
([QSystems](https://www.qsystems.com.co/resolucion-2080-2026-revocatoria-1732-vigencia-3100/)).

## 2. Qué existe ya

| Frente | Soluciones | Límite para nuestro contexto |
| --- | --- | --- |
| Trazabilidad de esterilización | T-DOC (Getinge), SPM (Steris), Censitrac; [Interlab](https://interlabd.com/) (Argentina, opera en Colombia, con marcado láser, Micro ID y RFID); [Esterilcontrol](https://esterilcontrol.com/); [Trazins](https://www.palexsolucioneshospitalarias.es/productos/trazins/) (Palex, España); [Serafín](https://serafinsalud.com/) (QR) | Registran el recorrido del set, pero **no verifican qué hay dentro**. Para rastrear pieza por pieza exigen marcar el instrumental. |
| Conteo de gasas | SurgiCount (Stryker, código de barras), RF Assure (Medtronic, RFID) | Exigen comprar gasas etiquetadas en cada cirugía. |
| Visión por computador | Investigación, no productos masivos: [prueba de concepto de 2024](https://link.springer.com/article/10.1186/s13037-024-00406-y) con 98,5 % de precisión en 11 categorías; [Taiwán, 2026](https://academic.oup.com/intqhc/article/38/2/mzag058/8667170) con 58 tipos de instrumental ortopédico y 99 % de exactitud apoyada con báscula; [SmartSurgiCount](https://link.springer.com/chapter/10.1007/978-981-95-9843-4_32), que funciona en el celular y lee hojas de conteo manuscritas | Muestra que es técnicamente viable y reciente. |
| Educación | [App de realidad aumentada para instrumental de enfermería](https://revistas.milpaalta.tecnm.mx/index.php/IPSUMTEC/article/view/358) (México, 2025) | No se orienta a instrumentación ni a los sets colombianos. |

**Inferencia nuestra.** La trazabilidad por software ya está resuelta para quien puede
pagar el marcado y la integración. Quedan tres huecos: verificar el contenido del set
sin marcar piezas, atender a las IPS medianas y pequeñas de la región, y resolver el
flujo con las casas comerciales.

## 3. Problemáticas y propuestas

### A. Sets incompletos: verificación visual con IA

- **Problema.** Faltan piezas o llegan equivocadas y nadie lo nota hasta abrir el set
  en quirófano. La verificación depende del ojo humano, que es justo donde falla (D8).
- **Propuesta.** Una app que, con una foto del set abierto tomada con el celular o una
  tablet, detecta cada instrumento, lo compara con la lista digital del set y señala lo
  que falta, por ejemplo: «falta: 1 pinza Kelly curva». Se usa en dos momentos: en la
  central, antes de empacar, y en el quirófano, al abrir y al cerrar.
- **Por qué es innovadora y aterrizada.** No hay que marcar piezas ni comprar lectores.
  Solo se necesitan un celular y una superficie despejada. La visión por computador para
  instrumental ya funciona en investigación (sección 2), pero no hay un producto
  accesible para IPS medianas.
- **Valor a mediano plazo.** Con el tiempo, los registros muestran qué instrumentos no
  se usan nunca y permiten recomendar bandejas más pequeñas. Eso ahorra reprocesamiento
  (D7).
- **MVP para el hackathon.**
  - Un solo set básico de 10 a 15 clases de instrumento, fotografiado en el hospital
    simulado de la Unilibre (D14). Se entrena YOLO (Ultralytics) con las fotos
    etiquetadas en Roboflow o Label Studio.
  - La interfaz es una app web con cámara (PWA) y la inferencia corre en un servidor
    sencillo o en el navegador.
  - Demo en vivo: se retira una pinza de la bandeja, se toma la foto y la app la marca
    como faltante.
- **Quién paga.** Las centrales de esterilización, con una suscripción por central o
  por número de sets. La puerta de entrada es una licencia educativa para programas de
  instrumentación (ver E).
- **Riesgos.**
  - Instrumentos superpuestos o muy parecidos (Kelly y Crile) bajan la precisión, y la
    precisión cae con la superposición (sección 2). Se mitiga así: la app exige
    extender el instrumental sin superponerlo y pide confirmación humana cuando la
    confianza es baja.
  - Hay que confirmar si el INVIMA la consideraría software dispositivo médico. Se
    posiciona como apoyo logístico, y el conteo manual sigue siendo el estándar.
- **Validar en entrevistas.** Con qué frecuencia llega un set incompleto, cuánto tiempo
  se pierde y cómo se verifica hoy.

### B. Conteo quirúrgico y lista de chequeo en papel: registro digital en el quirófano

- **Problema.** El conteo de gasas, compresas, agujas e instrumental se lleva en
  tablero u hoja. La lista de chequeo se diligencia como trámite: 13,3 % de
  cumplimiento global (D4). Un oblito expone a la IPS a responsabilidad presunta (D6).
- **Propuesta.** Es un módulo de A. En el quirófano, una tablet lleva el conteo inicial,
  intermedio y final, con doble confirmación y alertas de discrepancia. El conteo del
  instrumental se hace con la foto de A. La lista de chequeo no se puede cerrar si el
  conteo no cuadra. Todo queda con hora y responsable, lo que sirve de evidencia ante
  auditorías y demandas.
- **Por qué es aterrizada.** No requiere gasas especiales (a diferencia de SurgiCount o
  RF Assure). La instrumentación ya cumple la lista (D4), así que el usuario natural
  está dispuesto.
- **MVP.** Una pantalla de conteo más la lista de la OMS de tres fases, que exporta un
  PDF por cirugía.
- **Quién paga.** La IPS, a través de las áreas de calidad y seguridad del paciente. El
  argumento es el riesgo legal y los indicadores de calidad.
- **Validar.** Cuántas discrepancias de conteo hay al mes, qué se hace cuando no cuadra
  y quién audita la lista.

### C. Material en consignación y cancelaciones en ortopedia

- **Problema.** Ortopedia concentra un tercio de las cancelaciones en el hospital de
  Barranquilla (D2). El material de osteosíntesis de las casas comerciales llega tarde
  o incompleto (D10). Su consumo por paciente se reporta a mano para facturar, y las
  diferencias de cantidad generan glosas
  ([Resolución 2284 de 2023](https://www.minsalud.gov.co/Normatividad_Nuevo/Resoluci%C3%B3n%20No%202284%20de%202023.pdf)).
- **Propuesta.** Un flujo compartido entre la IPS y la casa comercial:
  1. La solicitud de material se crea al programar la cirugía.
  2. Un semáforo avisa si el material no llega 24 horas antes.
  3. La recepción se verifica con foto, reutilizando A.
  4. En cirugía, el instrumentador fotografía las etiquetas de los implantes usados.
     Con OCR o código de barras se registran referencia y lote por paciente.
  5. Ese registro sirve de soporte de cobro y de trazabilidad del implante para
     tecnovigilancia.
- **Por qué es innovadora.** Cierra en un solo flujo la logística, la factura y la
  trazabilidad del implante, que hoy van por separado. Los instrumentadores trabajan
  en ambos lados como asesores quirúrgicos de casas comerciales (hay ofertas en
  Barranquilla y Montería), así que el usuario ya existe.
- **MVP.** El flujo web de solicitud, semáforo y recepción, más la lectura por foto de
  una etiqueta de implante.
- **Quién paga.** La casa comercial (pierde menos material y cobra más rápido) o la IPS
  (menos glosas y cancelaciones). Es el caso con el dinero más visible, pero requiere
  dos partes.
- **Validar.** Cuántas cirugías de ortopedia se retrasan por material, cuántas glosas
  hay por osteosíntesis y cómo se registra hoy el consumo.

### D. Cirugía estética irregular en Barranquilla: verificador ciudadano

- **Problema.** Hubo 5 muertes en 16 meses en Barranquilla (D11), y brotes de
  micobacterias por esterilización deficiente (D12). La misma prensa recomienda
  consultar el REPS y el ReTHUS antes de operarse, pero pocos pacientes saben hacerlo.
- **Propuesta.** El paciente escribe el nombre de la clínica o del profesional. El
  verificador cruza los datos abiertos del REPS (D15) para confirmar si esa sede tiene
  habilitado el servicio de cirugía, y consulta el ReTHUS del cirujano, el
  anestesiólogo y el instrumentador. Devuelve un semáforo y una lista de preguntas para
  hacer antes de pagar, por ejemplo: «¿Quién esteriliza el instrumental?».
- **Por qué es aterrizada.** Los datos de habilitación ya son públicos, y el gancho es
  local y actual.
- **Límites.** Toca menos el núcleo de la instrumentación. El modelo de negocio es
  débil: *freemium* para pacientes y, del lado B2B, un sello para clínicas habilitadas.
  Falta verificar cómo consultar el ReTHUS de forma automatizada. Hay riesgo legal si
  se señala a terceros: solo se deben mostrar datos oficiales.
- **Uso sugerido.** Aunque no sea el producto, puede ser el **gancho del pitch** (D11)
  o un complemento social.

### E. Formación del instrumentador: modo estudio que alimenta a A

- **Problema.** Los estudiantes deben reconocer cientos de instrumentos y sets, y el
  acceso a quirófano es limitado. No encontramos datos locales sobre esto; hay que
  validarlo con docentes.
- **Propuesta.** Un modo estudio de la misma app: el estudiante fotografía un
  instrumento y la app le dice el nombre, el uso y a qué sets pertenece. Incluye
  quizzes por set y preferencias por especialidad.
- **Lo innovador.** Las fotos de los estudiantes, etiquetadas y revisadas por un
  docente, **alimentan el dataset de A**. El programa de instrumentación aprende y, al
  mismo tiempo, entrena el modelo.
- **Quién paga.** Licencias para programas de Instrumentación Quirúrgica del Caribe y
  del país. Es el primer cliente y el primer socio de datos.
- **Validar.** Con docentes de la Unilibre: cómo enseñan hoy el instrumental y si
  usarían la app en el hospital simulado.

## 4. Priorización preliminar

Puntuación del 1 al 5 con los criterios del [[plan-de-investigacion]]. Es opinión
nuestra basada solo en fuentes secundarias; hay que rehacerla después de las
entrevistas.

| Criterio (peso) | A | B | C | D | E |
| --- | --- | --- | --- | --- | --- |
| Seguridad del paciente (25 %) | 4 | 5 | 3 | 5 | 2 |
| Frecuencia y evidencia (20 %) | 4 | 4 | 4 | 4 | 2 |
| MVP demostrable (20 %) | 5 | 4 | 4 | 4 | 5 |
| Modelo de negocio (15 %) | 4 | 3 | 5 | 2 | 3 |
| Pertinencia regional (10 %) | 3 | 3 | 4 | 5 | 4 |
| Diferenciación (10 %) | 4 | 2 | 4 | 2 | 3 |
| **Total ponderado** | **4,1** | **3,8** | **3,9** | **3,85** | **3,05** |

**Lectura.** A, B y E funcionan como un solo producto con tres puertas de entrada:
la central, el quirófano y el aula. Comparten modelo, app y datos, lo que concentra el
esfuerzo del equipo. C es la alternativa si ortopedia domina en las entrevistas.

## 5. Ganchos candidatos para el pitch

- «En un hospital de Barranquilla se cancelaron 244 cirugías en un año; 4 de cada 10
  por causas de la propia institución» (D2).
- «De cada 10 instrumentos que se esterilizan para una cirugía, se usan 2» (D7).
- «En Colombia, si una gasa se queda dentro del paciente, se presume negligencia» (D6).
- «En Barranquilla, 5 mujeres murieron en 16 meses por cirugías estéticas en lugares
  no habilitados» (D11).

## 6. Pendientes

- [ ] Llevar las propuestas a la integrante de Instrumentación para descartar,
      corregir o añadir antes de las entrevistas.
- [ ] Agregar a la guía de entrevista las preguntas de validación de A, B y C.
- [ ] Pedir al programa de Instrumentación de la Unilibre acceso al hospital simulado
      para fotografiar un set.
- [ ] Confirmar la cifra exacta de D8 en el texto completo.
- [ ] Buscar cifras locales de sets incompletos, conteos y glosas por osteosíntesis;
      por ahora solo hay evidencia internacional.
- [ ] Confirmar con el INVIMA la clasificación del software (Decreto 4725 de 2005).
