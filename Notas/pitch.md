---
tags:
  - hackathon/healthbyte
  - pitch
fecha: 2026-10-01
estado: borrador para ensayar
duracion: 5 minutos
---

# Pitch de HealthByte

Guion de 5 minutos para el jurado de la hackathon. Arranca con la demo en vivo: Conti
anota lo que dice la instrumentadora y, a los 30 segundos, atrapa una compresa que
falta. Después se explica el problema, la solución, cómo funciona y el negocio. Al
final la misma compresa aparece y la cirugía cierra en verde.

## 1. Estructura y por qué

La nota de [consideraciones](consideraciones.md) pide cuatro tiempos: **introducción
(gancho), calentamiento, clímax y moraleja**, con métricas, modelo de negocio y roles
claros. Las guías de pitch para hackathon coinciden en tres reglas más:

- **Mostrar la solución pronto.** El error más común es tardar en enseñar el producto.
  Aquí se ve en el segundo 0.
- **Un solo recorrido**, no un tour de funciones. La demo es una cirugía, de punta a punta.
- **Plan B a la vista.** Un respaldo no le quita credibilidad a la demo; permite que el
  jurado evalúe aunque falle la red.

| Tiempo | Bloque (consideraciones) | Qué se lleva el jurado | Habla |
| --- | --- | --- | --- |
| 0:00–0:30 | **Gancho** | «Esto escucha el quirófano y atrapa errores» | Instrumentación, Requisitos |
| 0:30–1:15 | **Calentamiento**: el problema | El tablero de papel falla, y falla caro | Instrumentación, Requisitos |
| 1:15–1:45 | La solución | Qué es HealthByte, en una frase y tres reglas | Requisitos |
| 1:45–3:15 | **Clímax**: la demo | Funciona, con un flujo real | Instrumentación, UX/UI |
| 3:15–3:45 | Cómo funciona | Es serio por dentro: IA medida, privacidad, aislamiento | Arquitectura |
| 3:45–4:25 | Modelo de negocio | Quién paga, cuánto y cómo crece | Marketing y ventas |
| 4:25–5:00 | **Moraleja** | Las cifras de lo que acaban de ver y el lema | Instrumentación, Requisitos |

**Ritmo.** En español se hablan unas 130 palabras por minuto. El texto hablado de este
guion suma unas 520 palabras con las frases dictadas (unos 4 minutos); el minuto restante es la pantalla registrando, los silencios y los cambios de sala.
No hay que agregar texto: los silencios de la demo son parte del pitch.

**En escena.** Los cinco con las credenciales de «Roles en escena» del
[documento de diseño](../Diseño/HealthByte_especificaciones_diseno.md) (HB-01 a HB-05).
Una persona opera la pantalla y las diapositivas y no habla durante la demo, como
recomienda la nota de consideraciones. Las voces del anestesiólogo y del cirujano en la
demo las hace un integrante con la credencial de ese papel.

**Utilería.** Gorro y bata para Instrumentación, diez compresas de verdad, una
riñonera y un campo quirúrgico sobre la mesa. Una compresa queda escondida bajo el campo.

---

## 2. Guion

Convención: **[PANTALLA]** es lo que debe verse; *cursiva* es acción.

### 0:00–0:30 · Gancho (en vivo)

**[PANTALLA]** Sin portada. El proyector ya muestra el tablero de QX 02 (colecistectomía,
cirugía en curso). Conti está en reposo: «Escuchando».

*Instrumentación, de pie junto a la mesa, deja caer diez compresas en la riñonera, una por una.*

> **Instrumentación:** Conti, entran diez compresas.

**[PANTALLA]** Conti levanta las manos: «Registrado: Compresas +10 · 10:42:07».

*Saca las compresas de la riñonera. Cuenta rápido, en voz baja. Son nueve.*

> **Instrumentación:** Salen nueve compresas. Fin de cirugía.

**[PANTALLA]** Conti se pone serio y la luz pasa a roja: «Compresas: entraron 10, salieron 9».

*Dos segundos de silencio. Instrumentación mira al público.*

> **Instrumentación:** Falta una compresa. Y el paciente sigue en la mesa.
>
> **Requisitos:** Eso que acaban de ver no es un video. Es HealthByte escuchando un
> quirófano. Hoy, esa compresa se cuenta con marcador, en una pizarra.

### 0:30–1:15 · Calentamiento: el problema

**[PANTALLA]** Diapositiva 2: foto del tablero real, **pixelada**, sin nombre de la
institución. Dos círculos rojos: el recuadro de horas vacío y las anotaciones en el margen.

> **Instrumentación:** Soy instrumentadora quirúrgica. Este es el tablero que llenamos
> en cada cirugía. En las dos pizarras que fotografiamos, las horas estaban en blanco,
> y la glucometría y la heparina, escritas en las márgenes, porque no tienen campo.
>
> **Requisitos:** De ese tablero no queda quién verificó, ni a qué hora, ni qué faltó.
> En un hospital de Santander, la lista de cirugía segura se cumplía completa en el
> **13,3 %** de los casos. Y en Colombia, si una gasa se queda dentro de un paciente,
> se **presume negligencia**.

> [!warning] Validar antes de decirlo
> Instrumentación debe confirmar por qué las horas estaban vacías (¿se llenan al final?)
> y qué pasa con el tablero al terminar. Si la respuesta es «se llena de memoria» o
> «se borra», esa frase es más fuerte que cualquier cifra: úsenla.

### 1:15–1:45 · La solución

**[PANTALLA]** Diapositiva 3: «Precisión que se puede contar.» y las tres reglas.

> **Requisitos:** HealthByte es el tablero de seguridad quirúrgica que se llena
> hablando. El equipo dicta lo que ya dice hoy en voz alta, y el sistema registra,
> valida, alerta y mide. Lo guían tres reglas. Nadie toca un aparato con guantes
> estériles. Una alerta nunca frena al cirujano, pero no se cierra sin un motivo. Y lo
> que se registra no se puede borrar.

### 1:45–3:15 · Clímax: la demo

**[PANTALLA]** El operador cambia a QX 01: revascularización miocárdica. El paciente
todavía no entra.

> **UX/UI:** Sala 1, una revascularización. Antes de que entre el paciente, el tablero
> ya marca lo que falta: la glucometría y la cantidad de sangre de reserva. Y avisa
> que el paciente es alérgico a la penicilina.

| # | Quién dicta | Frase | Lo que muestra la pantalla |
| --- | --- | --- | --- |
| 1 | Instrumentación | «Paciente en sala.» | Hora de ingreso tomada del reloj del servidor. Fase 1 abierta. |
| 2 | Instrumentación | «Glucometría ciento diez.» | Glucometría 110 mg/dl. El dato faltante desaparece. |
| 3 | Anestesiólogo | «Confirmo identidad, procedimiento, sitio y alergias.» | Cuatro ítems en verde, cada uno con rol y hora. La alerta de alergia se resuelve. |
| 4 | Cirujano, al aire | «¿Y cómo le fue al Junior anoche?» | **Nada.** Conti sigue «Escuchando». |

> **UX/UI:** Conti lo escuchó y no anotó nada. En un quirófano se habla todo el tiempo,
> y no todo es un registro.

| # | Quién dicta | Frase | Lo que muestra la pantalla |
| --- | --- | --- | --- |
| 5 | Instrumentación | «Inicio de anestesia.» | Hora de anestesia. Fase 2. Alerta roja: «Antibiótico profiláctico pendiente». |
| 6 | Anestesiólogo | «Cefazolina aplicada.» | Conti en alerta: «Alergia a penicilina y betalactámico dictado: confirme compatibilidad». |

> **UX/UI:** El tablero no decide por el médico. Le avisa, a tiempo.

| # | Quién dicta | Frase | Lo que muestra la pantalla |
| --- | --- | --- | --- |
| 7 | Anestesiólogo | «Cierro la alerta: alergia leve, sin anafilaxia, cefazolina compatible.» | La alerta pasa a «cerrada con justificación», con el motivo dictado. |

**[PANTALLA]** El operador abre la trazabilidad de QX 01.

> **UX/UI:** Y esto es lo que queda: quién verificó, a qué hora, qué se alertó y por
> qué se cerró. No se puede editar ni borrar.

### 3:15–3:45 · Cómo funciona

**[PANTALLA]** Diapositiva 5: el flujo voz → Chirp 3 → Jev → evento (versión simple del
diagrama de secuencia del [SRS](../research/SRS_HealthByte.md), sección 4.4).

> **Arquitectura:** Chirp 3, de Google, transcribe en español. Jev interpreta la frase
> y nos dice qué tan seguro está: si está seguro, registra; si duda, pregunta; si es
> conversación, la ignora. Antes de interpretar, el nombre y el documento del paciente
> se cambian por marcadores, por la Ley 1581, y el audio no se guarda. Cada clínica ve
> solo sus datos: lo garantiza la base de datos.

### 3:45–4:25 · Modelo de negocio

**[PANTALLA]** Diapositiva 6: tres niveles, costo y ruta de mercado.

> **Marketing:** Paga la clínica, por quirófano al mes. Básico: registro táctil,
> alertas y panel. Estándar: suma la voz. Red: varias sedes. La voz nos cuesta unos 85
> dólares por quirófano al mes; cobrando cerca de 300, el margen ronda el 70 %. Otras
> soluciones exigen gasas con código de barras; HealthByte, una pantalla y un
> micrófono. Primero, piloto en el hospital simulado de la Unilibre; luego, las IPS
> medianas de la Costa; después, redes de clínicas.

> [!note] El precio es una hipótesis
> Sale de un margen objetivo, no de clientes. Si el jurado pregunta, se dice así y se
> explica cómo se va a validar (entrevista con coordinaciones quirúrgicas).

### 4:25–5:00 · Moraleja y cierre

**[PANTALLA]** El operador vuelve a QX 02. La alerta de la compresa sigue en rojo.

> **Instrumentación:** ¿Se acuerdan de la compresa?

*Levanta el campo y saca la compresa escondida.*

> **Instrumentación:** Apareció, salen diez. Recuentos completos, muestra identificada,
> sin novedades, procedimiento realizado. Salida a recuperación.

**[PANTALLA]** Todo en verde. Conti celebra: «Cierre seguro». El operador abre el panel de
gestión: las dos cirugías aparecen con sus tiempos y sus alertas.

**[PANTALLA]** Diapositiva 8, con las cifras que salgan del ensayo (ver sección 4).

> **Requisitos:** En cinco minutos: **[N] registros** sin escribir una sola hora y
> **[N] riesgos** atrapados antes de llegar al paciente. Somos cuatro ingenieros y una
> instrumentadora, y queremos llevar esto al hospital simulado de la Unilibre este
> semestre.
>
> **Todos:** HealthByte. Precisión que se puede contar.

---

## 3. Diapositivas

Ocho diapositivas, con la marca del documento de diseño (fondo `blue-900` en portada y
cierre). Tres de ellas son la aplicación en vivo.

| # | Diapositiva | Contenido | Momento |
| --- | --- | --- | --- |
| 1 | **App en vivo: QX 02** | Tablero real, sin portada | Gancho |
| 2 | El problema | Foto pixelada del tablero con dos círculos; **13,3 %** y «se presume negligencia», con la fuente en letra pequeña | Calentamiento |
| 3 | La solución | «Precisión que se puede contar.» Registra · valida · alerta · mide. Las tres reglas | Solución |
| 4 | **App en vivo: QX 01** y trazabilidad | — | Clímax |
| 5 | Cómo funciona | Voz → Chirp 3 → Jev → evento inmutable. Tres sellos: seudonimización (Ley 1581), aislamiento por clínica, respaldo manual | Cómo funciona |
| 6 | Negocio | Básico · Estándar · Red; costo de voz y margen; ruta Unilibre → IPS de la Costa → redes | Negocio |
| 7 | **App en vivo: QX 02** y panel | — | Moraleja |
| 8 | Cierre | [N] registros · [N] riesgos atrapados · 0 horas escritas a mano. Equipo y pedido. Lema | Moraleja |

---

## 4. Cifras: qué decir y de dónde sale

**Regla:** en el pitch solo se dicen cifras con fuente o medidas en el ensayo. Las
guías lo marcan como error frecuente: los números sin respaldo restan credibilidad.

| Cifra | Fuente | Dónde se usa |
| --- | --- | --- |
| 13,3 % de cumplimiento global de la lista de verificación en un hospital público de Santander (2018) | [Sepúlveda Plata et al., *Revista Cuidarte*, 2021](https://www.redalyc.org/journal/3595/359572127014/html/) | Calentamiento |
| La sola presencia de un cuerpo extraño retenido hace presumir negligencia | [Consejo de Estado, exp. 43179 de 2019](https://normograma.supersalud.gov.co/compilacion/docs/05001-23-31-000-2004-06213-02(43179).htm) | Calentamiento |
| Costo de voz de US$75 a 95 por quirófano al mes; precio de US$250 a 320 para un margen de ~70 % | [Spec](../docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md), sección 15 (precios públicos de Chirp 3 y Jev, octubre de 2026) | Negocio |
| [N] registros y [N] riesgos atrapados | Se cuentan en el panel después del ensayo final | Cierre |
| Acierto del intérprete con el set de oro: [X %] | `npm run oro`, con las 40 frases de Instrumentación | Preguntas del jurado |

**De reserva**, por si el jurado pregunta por la magnitud:

- El 10,5 % de los pacientes hospitalizados sufrió un evento adverso y cerca del 60 %
  era evitable ([estudio IBEAS](https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/CA/resultados-estudio-ibeas.pdf), con Colombia entre los países).
- Un cuerpo extraño retenido aparece en 1 de cada 1.000 a 18.000 cirugías, y la gasa es
  lo más frecuente ([*BioData Mining*, 2024](https://link.springer.com/article/10.1186/s13040-024-00367-z)).

---

## 5. Plan B

| Si falla | Qué se hace | Qué se dice |
| --- | --- | --- |
| Conti no entiende una frase | Se repite una vez. Si vuelve a fallar, el operador la registra con un toque | «Y si la voz falla, la circulante lo registra con un toque. Eso también es parte del diseño.» |
| Conti registra algo que no era | «Deshacer» | Nada: es una función más |
| Se cae el micrófono o Jev | Registro manual para el resto de la demo | Lo mismo que arriba |
| Se cae internet | Video de respaldo de la demo completa, ya cargado y en pausa | «Les mostramos la grabación del ensayo de esta mañana.» |
| El tiempo se acaba | Saltar la diapositiva 5 (cómo funciona): queda para las preguntas | — |

---

## 6. Preparación

### Antes del día

- [ ] **La voz debe estar conectada al servidor.** Hoy `server.ts` arranca sin Jev ni
      Chirp 3 (RF-VOZ-15 del [SRS](../research/SRS_HealthByte.md)); sin eso no hay gancho.
- [ ] La vista de sesión, la trazabilidad y el panel en el front.
- [ ] Agregar «Conti» al vocabulario de Chirp 3 y al set de oro, porque las frases
      empiezan con su nombre.
- [ ] Pasar **todas las frases de este guion** por el set de oro, dichas por
      Instrumentación, con ruido de fondo. Cambiar la redacción de la que falle.
- [ ] Confirmar con Instrumentación que las frases suenan como se dicen en un
      quirófano real. Si no, se cambian las frases, no la forma de hablar.
- [ ] Pixelar la foto del tablero y quitar todo lo que identifique a la institución
      (Ley 1581).
- [ ] Grabar el video de respaldo en el último ensayo.
- [ ] Ensayar al menos cinco veces con cronómetro. Practicar también la versión de un
      minuto (sección 8).

### El día de la demo, una hora antes

- [ ] `terraform -chdir=infra apply -var tag=$TAG -var api_min_instancias=1` para que
      el API no arranque en frío.
- [ ] Reiniciar la demo como coordinación.
- [ ] **Dejar lista QX 02** con toques: presentes marcados, ingreso, fase 1 completa,
      anestesia, fase 2 completa e inicio de cirugía. Así, en el gancho solo se ve la
      alerta de la compresa.
- [ ] **Dejar lista QX 01**: presentes marcados y nada más.
- [ ] Micrófono USB cerca de la mesa; probar el umbral del detector de voz con el
      ruido real de la sala.
- [ ] Notificaciones apagadas, pestañas cerradas, el video de respaldo abierto en otra
      ventana.
- [ ] Diez compresas contadas, una escondida bajo el campo.

---

## 7. Preguntas del jurado

| Pregunta | Respuesta corta |
| --- | --- |
| ¿Qué tan preciso es en español y con ruido? | Lo medimos con un set de oro de 40 frases reales: [X %]. Además, nunca registra lo que no entiende: si duda, pregunta, y siempre se puede deshacer. |
| ¿Y si se cae internet en el quirófano? | Hoy necesita conexión; el modo sin conexión está fuera de este prototipo. La voz es lo único que depende de servicios externos, y el registro manual está siempre disponible. |
| ¿Por qué las alertas no bloquean? | Un software no puede frenar a un cirujano en una emergencia. Lo que sí hace es no dejar cerrar una alerta crítica sin un motivo, y ese motivo queda con nombre y hora. |
| ¿Cómo saben quién verificó de verdad? | Cada ítem guarda el rol que lo confirma, según el protocolo de la clínica, y el usuario que tiene la sesión. Una firma individual con PIN es el siguiente paso; la dejamos fuera para no meter fricción en la sala. |
| ¿Los datos del paciente salen del país? | El audio va a Google para transcribirse y no se guarda. Antes de llegar al intérprete, el nombre y el documento se cambian por marcadores. Cada clínica está aislada en la base de datos. En la demo todo es ficticio. |
| ¿Es un dispositivo médico ante el INVIMA? | Lo posicionamos como apoyo al registro y la trazabilidad, no como decisión clínica. La clasificación según el Decreto 4725 de 2005 la vamos a confirmar. |
| ¿Se integra con la historia clínica? | No en esta versión. Los eventos son inmutables, con autor y hora, que es lo que pide la Resolución 1995 de 1999. La exportación a PDF y la integración vienen después. |
| ¿En qué se diferencia de una tablet con un formulario? | En que el instrumentador no toca nada, en que valida y alerta mientras pasa la cirugía, y en que convierte cada cirugía en indicadores sin transcribir. |
| ¿Qué construyeron en la hackathon? | El API con la voz, el intérprete, las 10 reglas de alerta y la sesión en vivo; la base de datos multi-clínica; el front; y la infraestructura en GCP con Terraform. Todo con pruebas automatizadas. |
| ¿Qué sigue? | El piloto en el hospital simulado de la Unilibre, y el control de consumos de cirugía, que hoy se llena en otro papel para facturar. Así una sola voz alimenta la seguridad y la facturación. |
| ¿Cuántos clientes hay? | Lo estamos contando en el REPS, que publica las sedes con servicio quirúrgico habilitado. [Llevar el número si está listo.] |

---

## 8. Versión de un minuto

Para el pasillo, para un mentor o si el jurado recorta el tiempo.

> En Colombia, la seguridad de una cirugía se anota con marcador en una pizarra. Las
> horas se quedan en blanco, los datos van en las márgenes, y al final no queda quién
> verificó qué. Y si una gasa se queda dentro de un paciente, la justicia presume
> negligencia. HealthByte es el tablero quirúrgico que se llena hablando: la
> instrumentadora dice «entran diez compresas» y queda registrado con la hora del
> servidor. Si al cierre salen nueve, la alarma suena antes de que el paciente salga.
> Valida datos, alerta riesgos como un antibiótico con alergia, guarda una
> trazabilidad que no se puede borrar y le da a la clínica sus indicadores. Se cobra
> por quirófano al mes y solo necesita una pantalla y un micrófono. Precisión que se
> puede contar.

---

## Fuentes de las buenas prácticas

- [Hacktribe: How to Build a Hackathon Pitch Deck, 5-Minute Structure](https://hacktribe.co/blog/how-to-build-a-hackathon-pitch-deck-practical-5-minute-structure): tiempos, 5 a 7 diapositivas, errores frecuentes, plan B.
- [AngelHack: Hackathon Best Practices 2026](https://angelhack.com/blog/hackathon-best-practices/)
- [DEV Community: The hackathon demo that works live](https://dev.to/pranjulrathour/the-hackathon-demo-that-works-live-a-technical-checklist-4k1): demo controlada y alineada con la propuesta de valor.
- [OBS Business School: cómo estructurar el pitch deck](https://www.obsbusiness.school/blog/pitch-deck-como-estructurar-tu-presentacion-para-inversores-y-destacar-tu-startup)
- [Nexen Capital: cómo hacer un pitch efectivo](https://nexencapital.com/fundraising/hacer-pitch-startup/): contar una historia, no una ficha técnica; tener la versión de 5 minutos y la de 1.
