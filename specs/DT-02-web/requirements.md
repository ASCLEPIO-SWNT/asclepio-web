# DT-02-web — Cola: tiempo desde la clasificación (Res. 256/2016)

Brief global: `../asclepio-api/docs/product/features/F-06.md`, con **F-06.AC2**, **PA-F06-1** y **PA-F06-2** enmendados por DT-02 el 2026-11-11. Comportamiento de la API: `../asclepio-api/specs/DT-02-api/` (R1–R11; design D1–D6 y «Impacto en F-06-web»).
Contrato: consume **0.9.0** (antes 0.7.0). `GET /api/v1/queue` añade `QueueItemDto.minutesSinceTriage` (`integer`, `nullable`, requerido). Cambian la semántica de `overdue` y `maxWaitMinutes` y el orden de `triaged`. 0.9.0 trae además `GET /api/v1/reports/summary` y `GET /api/v1/reports/encounters.csv` (F-07-api), que quedan **fuera de alcance**.
RNF aplicables: RNF-10, RNF-13, RNF-14.
Depende de: F-06-web (`done`) y DT-02-api (`done`, contrato 0.9.0; la API local en la rama `feature/DT-02-api`).

Decisiones del humano de partida (2026-11-11, por chat; no se reabren). La cola sigue la Res. 256 de 2016. En `TRIAGED`, la alerta se cuenta desde la clasificación (`triaged_at`), no desde la llegada. `minutesSinceTriage` son los minutos completos desde `triaged_at` (`null` fuera de `triaged`). `overdue` lo calcula el servidor con el tiempo exacto desde la clasificación (II: más de 30 min; I: en cuanto pasa cualquier tiempo). `triaged` va por nivel y, dentro de cada nivel, primero la de mayor `minutesSinceTriage`. `waitMinutes` sigue contando desde la llegada. `maxWaitMinutes` conserva sus valores (I → 0, II → 30, III–V → `null`), pero ahora se cuenta desde la clasificación.

Requisitos de F-06-web que este slice sustituye o amplía (`specs/F-06-web/` no se reescribe: este apartado y design «Pruebas existentes que cambian» dejan constancia):

- **F-06-web R5**: se amplía. `minutesSinceTriage` también se toma tal como llega (R6).
- **F-06-web R9**: se amplía. La alerta conserva su texto visible y suma un texto accesible que dice «desde la clasificación» (R11).
- **F-06-web R10**: se sustituye el texto de «Máx. {n} min» (R5). Las condiciones no cambian.
- **F-06-web R26**: se sustituyen el texto de `guide_queue` (R12) y el texto en español de `queue_max_minutes` de su PA-2 (R5).
- **F-06-web R30**: se sustituye la versión `0.7.0` y sus huellas (R1). Las operaciones permitidas no cambian (R2).
- La frase de la cabecera de F-06-web «espera desde `arrivalAt` hasta `IN_CARE`» sigue valiendo para la espera, pero ya no para el tiempo máximo, la alerta ni el orden de «Clasificadas» (PA-F06-2 enmendada).
- **F-05-web R28**: solo cambia la versión que su prueba lee en la cabecera del archivo generado (design D2).

Glosario de la spec (complementa el de `specs/F-06-web/requirements.md`, que sigue vigente salvo lo que se indica):

- **Espera**: `waitMinutes`, en minutos completos desde la llegada. No cambia.
- **Tiempo desde la clasificación**: `minutesSinceTriage`, en minutos completos desde `triaged_at`. Llega con valor en `triaged` y con `null` en `waitingTriage` e `inCare`. Lo calcula la API (DT-02-api R1).
- **Atención vencida**: una fila con `overdue = true`. Lo decide la API con el tiempo exacto desde la clasificación (DT-02-api R2, R3). La web no lo calcula ni lo corrige.
- **Fila sin reloj de clasificación**: una fila de `triaged` con `minutesSinceTriage = null`. Es anómala: solo aparece si alguien escribió fuera de la API (DT-02-api R8).
- Las pruebas de este slice viven bajo `describe('DT-02-web …')` y su nombre empieza por `R<n>:`.

## Requisitos

### Contrato

- **R1** (Ubicuo) El sistema deberá cumplir estas condiciones de contrato:
  - declarar `CONSUMED_CONTRACT = '0.9.0'`;
  - generar `schema.d.ts` y `clinicalContract.generated.ts` con `npm run api:types` desde el snapshot 0.9.0, sin diff al volver a ejecutarlo;
  - admitir 0.9.0 en la guarda de `scripts/extract-clinical-contract.mjs`, con su comentario de revisión, y seguir rechazando cualquier otra versión no revisada;
  - mantener el contenido generado de `VITAL_SIGN_CONTRACT`, `CONSCIOUSNESS_LEVELS`, `FINDING_KINDS`, `FINDING_LIMITS` y `DECISION_LIMITS` idéntico al generado desde 0.7.0;
  - tener `QueueItem` como alias de `Schemas['QueueItemDto']`, ya con `minutesSinceTriage`, sin tipos escritos a mano y sin dependencias nuevas.

  (→ F-06.AC1, F-06.AC2) (RNF-14)

- **R2** (Ubicuo) El sistema deberá mantener las operaciones HTTP del código de aplicación iguales a las de F-06-web, sin ninguna operación `/api/v1/reports/*` y sin alias de tipos de reportes en `client.ts`, hasta que un slice de F-07-web las incorpore. (→ F-06.AC2) (RNF-14)

### Tiempo desde la clasificación y tiempo máximo

- **R3** (Ubicuo) El sistema deberá mostrar en cada fila de «Clasificadas» con `minutesSinceTriage ≠ null` el texto «Clasificada hace {n} min», con el entero que manda la API (también con 0), en la celda «Espera», debajo de la espera «{n} min» de `waitMinutes`, que se sigue mostrando, y antes del tiempo máximo y la alerta. (→ F-06.AC1, F-06.AC3) (PA-F06-2 enmendada; decidido en PA-1 y PA-2)
- **R4** (Ubicuo) El sistema deberá mostrar el tiempo desde la clasificación solo en las filas de «Clasificadas». En «En espera de triage» y en «En atención» no deberá mostrar ni ese texto ni un sustituto, aunque el campo llegara con valor. (→ F-06.AC1)
- **R5** (Ubicuo) El sistema deberá mostrar el tiempo máximo de las filas de «Clasificadas» con las mismas condiciones de F-06-web R10, con un texto que diga que se cuenta desde la clasificación (decidido en PA-2): «Atención inmediata» si `maxWaitMinutes` vale 0, «Máx. {n} min desde la clasificación» con otro valor, y nada con `null` ni fuera de «Clasificadas». (→ F-06.AC3) (PA-F06-1 enmendada)

### El servidor decide (RNF-10)

- **R6** (Ubicuo) El sistema deberá tomar `minutesSinceTriage`, `waitMinutes`, `maxWaitMinutes` y `overdue` tal como llegan y no deberá:
  - calcular minutos a partir de `serverNow`, `arrivalAt` ni el reloj del navegador;
  - decidir la alerta comparando `minutesSinceTriage` o `waitMinutes` con `maxWaitMinutes`;
  - actualizar esos valores entre dos respuestas.

  El texto de R3 solo deberá cambiar cuando llegue una respuesta nueva de la cola. (→ F-06.AC1, F-06.AC3) (RNF-10)

- **R7** (Ubicuo) El sistema deberá mostrar las filas de «Clasificadas» en el orden exacto en que llegan, sin reordenarlas por nivel, `waitMinutes` ni `minutesSinceTriage`. Si en un nivel llega primero la fila con menos espera desde la llegada y más tiempo desde la clasificación, deberá mostrarla primero. (→ F-06.AC2 enmendado)

### Alerta: comportamientos correctos que la web no corrige

- **R8** (Por estado) Mientras una fila de «Clasificadas» tenga `overdue = true`, el sistema deberá mostrar la alerta de R11 sea cual sea `minutesSinceTriage`. Dos casos:
  - una fila de nivel I con `minutesSinceTriage = 0` deberá mostrar «Clasificada hace 0 min», «Atención inmediata» y la alerta;
  - una fila de nivel II con `minutesSinceTriage = 30` y `maxWaitMinutes = 30` deberá mostrar «Clasificada hace 30 min», el máximo de 30 min y la alerta.

  (→ F-06.AC3) (PA-F06-1 enmendada; DT-02-api R3)

- **R9** (No deseado) Si una fila llega con `overdue = false`, entonces el sistema no deberá mostrar la alerta, aunque `waitMinutes` o `minutesSinceTriage` superen `maxWaitMinutes`. Por ejemplo, una fila de nivel II con `waitMinutes = 90` y `minutesSinceTriage = 10` se muestra sin alerta. (→ F-06.AC3)
- **R10** (No deseado) Si una fila de «Clasificadas» llega con `minutesSinceTriage = null`, entonces el sistema deberá:
  - mostrarla en la posición recibida, con el paciente, el nivel si lo hay, la llegada, la espera, la sede, «Ver atención» y, para PHYSICIAN, «Iniciar atención»;
  - no mostrar el texto de R3 ni un sustituto en su lugar;
  - mostrar el tiempo máximo y la alerta solo según `maxWaitMinutes` y `overdue`;
  - no mostrar ningún error, y seguir mostrando con normalidad las demás filas y secciones.

  (→ F-06.AC1) (DT-02-api R8)

### Accesibilidad, guía e idiomas

- **R11** (Ubicuo) El sistema deberá mostrar la alerta de las filas con `overdue = true` así:
  - con el icono `aria-hidden`, el tono de error y el texto visible «Tiempo máximo superado», como en F-06-web R9;
  - con un texto accesible que dicen las tecnologías de apoyo, «Tiempo máximo superado desde la clasificación» (decidido en PA-3);
  - sin depender solo del color y sin colorear la fila entera.

  (→ F-06.AC3) (RNF-13)

- **R12** (Ubicuo) El sistema deberá actualizar la guía `guide_queue` en los cinco idiomas con el texto de PA-4 (a) (decidido en PA-4). La guía nueva deberá:
  - decir que, dentro de cada nivel, las clasificadas van primero por más tiempo desde la clasificación;
  - decir que el tiempo máximo se cuenta desde la clasificación y la espera, desde la llegada;
  - no decir que el orden es por mayor espera;
  - seguir siendo estática, sin cifras ni parámetros;
  - seguir incluyendo «Actualizar», «se actualiza sola» y el texto visible de la alerta.

  (→ F-06.AC2, F-06.AC3)

- **R13** (Ubicuo) El sistema deberá ofrecer los textos nuevos o cambiados de este slice en español, inglés, portugués, francés y alemán, con estas condiciones:
  - las mismas claves, con el prefijo `queue_`, salvo `guide_queue`;
  - los mismos parámetros en los cinco catálogos (`npm run i18n:check`);
  - el inglés distinto del español;
  - ninguna excepción nueva en `noUiLiterals`;
  - ninguna mención de «sugerencia», «IA» ni de un código `F-0<n>`.

  (→ F-06.AC3)

- **R14** (Por evento) Cuando cambien el idioma, el tema o el ancho de la ventana (375, 768, 1024 y 1440 px, y zoom al 200 %), el sistema deberá mantener legible la fila de «Clasificadas» con la espera, el tiempo desde la clasificación, el tiempo máximo y la alerta. No deberá haber desbordamiento horizontal, la alerta deberá seguir visible y los textos deberán verse traducidos. (→ F-06.AC3) (RNF-13)

> Trazabilidad: AC1 → R1, R3, R4, R6, R10 · AC2 → R1, R2, R7, R12 · AC3 → R3, R5, R6, R8, R9, R11–R14.

## Preguntas abiertas

Ninguna decide un umbral clínico. Los máximos, el punto desde el que se cuentan, la precisión de la alerta y el orden los fijan el brief enmendado y DT-02-api, y el humano los decidió el 2026-11-11. Lo que sigue es de presentación y no está en las fuentes. Todas las cerró el humano por chat el 2026-11-11 con la opción (a) en cada una.

- [x] **PA-1** ¿Dónde va «Clasificada hace {n} min» en la fila de «Clasificadas»? Opciones:
  - **(a)** En la celda «Espera», con este orden de arriba abajo: la espera «{n} min» (desde la llegada), «Clasificada hace {n} min», el tiempo máximo y la alerta. La columna sigue llamándose «Espera» y las columnas no cambian.
  - (b) Una columna nueva, «Desde la clasificación», solo en «Clasificadas», con el tiempo desde la clasificación, el máximo y la alerta. «Espera» se queda solo con la espera desde la llegada.
  - (c) Como (a), pero la espera se escribe «Llegó hace {n} min».

  → **Opción (a)** (humano, 2026-11-11). Cubierto por R3 y R14. No cambia las columnas de F-06-web R4 ni su prueba, y el `flex-wrap` de la celda (F-06-web D15) ya resuelve los 375 px. El máximo queda pegado al tiempo con el que se compara. (b) aclara más, pero añade una séptima columna en escritorio. (c) cambia un texto que no pide la decisión.

- [x] **PA-2** ¿Con qué textos se muestran el tiempo desde la clasificación y el máximo? Opciones:
  - **(a)** «Clasificada hace {minutes} min», literal también con 0 («Clasificada hace 0 min»). El máximo pasa a «Máx. {minutes} min desde la clasificación», y «Atención inmediata» no cambia.
  - (b) «Clasificada hace {minutes} min», y el máximo se queda en «Máx. {minutes} min»: se entiende por estar al lado.
  - (c) Como (a), pero con «Recién clasificada» cuando el valor es 0.

  → **Opción (a)** (humano, 2026-11-11). Cubierto por R3, R5 y R8. El máximo dice por sí mismo desde cuándo se cuenta, también en la vista apilada de móvil y para quien lee una sola línea. (c) sería la web reinterpretando un valor del servidor.

- [x] **PA-3** ¿Cómo incluye la alerta «desde la clasificación» en su texto accesible? Opciones:
  - **(a)** La insignia conserva el texto visible «Tiempo máximo superado» dentro de un `span` con `aria-hidden`, y suma un `span.visually-hidden` con la clave nueva `queue_overdue_a11y`, «Tiempo máximo superado desde la clasificación».
  - (b) El texto visible pasa a «Tiempo máximo superado desde la clasificación» para todos (cambia `queue_overdue`).
  - (c) No cambia la insignia, y se confía en las líneas de al lado.

  → **Opción (a)** (humano, 2026-11-11). Cubierto por R11. La insignia sigue corta en 375 px, la guía sigue citando el texto visible y el lector de pantalla oye la frase completa. (c) no cumple el alcance pedido.

- [x] **PA-4** Texto nuevo de `guide_queue` en español (el `implementer` traduce en, pt, fr y de). Opciones:
  - **(a)** «Esta pantalla muestra la cola priorizada en tres secciones: en espera de triage, clasificadas y en atención. Cada sección conserva el orden del servidor; las clasificadas van por nivel y, en cada nivel, primero la que lleva más tiempo desde la clasificación. La espera se cuenta desde la llegada y el tiempo máximo de cada nivel, desde la clasificación. Si una atención lo supera, verás la marca Tiempo máximo superado. Con el filtro Sede puedes ver una sola sede. La cola se actualiza sola de forma periódica; usa Actualizar para consultar al instante. La guía no lee datos de pacientes.»
  - (b) El mismo texto con los cambios que indique el humano.

  → **Opción (a)** (humano, 2026-11-11). Cubierto por R12. Solo cambia las dos frases que dejan de ser ciertas y conserva lo que exigen UI-02-web R33 y F-06-web R26.
