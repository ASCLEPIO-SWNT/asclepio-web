# DT-02-web — Tareas

No hay migraciones: la web no tiene base. El contrato consumido pasa de 0.7.0 a **0.9.0** (design D1).

Reglas para todas las tareas:

- Se ejecutan en este orden.
- En cada una, el `implementer` escribe **primero la prueba** `R<n>:` (bajo `describe('DT-02-web …')`), comprueba que falla, escribe el código, ejecuta la suite completa y solo entonces marca `[x]`.
- Las pruebas existentes se ajustan solo en lo que lista `design.md` («Pruebas existentes que cambian»). Cada ajuste va en la tarea que lo provoca, para que la suite no quede en rojo entre tareas.
- Todo texto nuevo o cambiado entra en los cinco catálogos en la misma tarea que lo usa (R13).
- Prohibido escribir en `../asclepio-api/` y añadir dependencias.
- Commits con el pie `Refs: DT-02-web` (docs/conventions.md).
- PA-1..PA-4 las cerró el humano el 2026-11-11 con la opción (a). T1 no empieza hasta que la spec esté aprobada.

- [x] **T1 — Consumir el contrato 0.9.0 (D1, D2, D3).**
  - Antes de regenerar nada, calcular el SHA-256 de `src/features/triage/clinicalContract.generated.ts` sin su primera línea y guardarlo como `CLINICAL_RULES_BODY_SHA256` en `src/test/contractBaseline.ts`.
  - Pruebas en `src/test/dt02Transversal.test.ts`:
    - `R1:` `CONSUMED_CONTRACT === EXPECTED_CONTRACT === '0.9.0'`, las huellas, la huella del cuerpo clínico sin cambios y la guarda de `scripts/extract-clinical-contract.mjs` con la lista exacta `['0.4.0', '0.5.0', '0.6.0', '0.7.0', '0.9.0']` y el comentario `DT-02-web D1`;
    - `R2:` sin `/api/v1/reports` en `WEB_OPERATIONS` ni en el código de aplicación, sin `ReportSummary` ni `Schemas['Report`, y sin alias de reportes en `client.ts`. El mensaje de la prueba dice que la levanta F-07-web.
  - Añadir `'0.9.0'` a la guarda con el comentario de D1. Ejecutar `npm run api:types`. Comprobar que en `clinicalContract.generated.ts` solo cambia la línea 1 y que una segunda ejecución no produce diff. Si cambia el cuerpo, parar y anotarlo en `progress/current/DT-02-web.md`.
  - `CONSUMED_CONTRACT = '0.9.0'` en `client.ts`. En `contractBaseline.ts`: `EXPECTED_CONTRACT = '0.9.0'`, `SCHEMA_SHA256` y `CLINICAL_CONTRACT_SHA256` nuevas, y el comentario «snapshot publicado 0.9.0; DT-02-web D1».
  - Para que compile: añadir `minutesSinceTriage` a `queueItem()` y a las filas existentes de `queueFixtures.ts`, con los valores de D7 (`triagedLevel1` 0, `triagedLevel2Overdue` 30, `triagedLevel2` 8, `triagedLevel4` 40, el resto `null`), sin cambiar el orden ni las cifras de `queue`.
  - Ajustar, como dice `design.md`: `f06Transversal.test.ts` (R30 sin el literal `'0.7.0'`) y `f05Transversal.test.ts` (cabecera desde `EXPECTED_CONTRACT`).
  - `npm run typecheck` y la suite completa en verde. Anotar D1 (huellas y revisión de la guarda) en `progress/history.md` al cerrar.
  - (R1, R2)
- [x] **T2 — Fixtures de la semántica nueva (D7).**
  - Añadir a `queueFixtures.ts` `triagedLevel2EarlyTriage`, `triagedLevel2LateArrival`, `triageClockQueue`, `triagedWithoutClock` y `queueWithoutClock`, como dice D7. Iniciales y edades ficticias, sin nombres. Actualizar el comentario del archivo: contrato 0.9.0, DT-02-web D7.
  - Ajustar `QueuePage.test.tsx` R21: `moved` con `minutesSinceTriage: null`.
  - No cambia nada más.
  - (R7, R8, R9, R10)
- [x] **T3 — Funciones puras y textos (D4, D5).**
  - Pruebas en `src/features/queue/queueView.dt02.test.ts`:
    - `R3:` `sinceTriageLabel` con 0 → «Clasificada hace 0 min», 30 → «Clasificada hace 30 min» y 135 → «Clasificada hace 135 min», sin pasar a horas;
    - `R4:` con `WAITING_TRIAGE` o `IN_CARE`, devuelve `null` aunque el campo traiga valor;
    - `R10:` en `TRIAGED` con `null`, devuelve `null`;
    - `R5:` `maxWaitLabel` con 30 → «Máx. 30 min desde la clasificación», 0 → «Atención inmediata» y `null` → nada;
    - `R7:` `sectionsOf(triageClockQueue)` conserva las referencias y el orden.
  - Después: implementar `sinceTriageLabel` en `queueView.ts`, añadir `queue_since_triage` y `queue_overdue_a11y`, y cambiar `queue_max_minutes` en los cinco catálogos.
  - Ajustar, como dice `design.md`: `queueView.test.ts` (R10, el texto con 30) y, en `f06Transversal.test.ts`, `QUEUE_KEYS` y el texto en español de `queue_max_minutes`.
  - (R3, R4, R5, R7, R10, R13)
- [x] **T4 — Celda «Espera» y alerta accesible (D4, D6).**
  - Pruebas en `src/features/queue/components/QueuePage.dt02.test.tsx`:
    - `R3:` en la fila de nivel II vencida, dentro de la celda «Espera» y en este orden: «31 min», «Clasificada hace 30 min», el máximo y la alerta;
    - `R5:` «Máx. 30 min desde la clasificación» en las filas II, «Atención inmediata» en la I y nada en la IV;
    - `R4:` sin «Clasificada hace» en «En espera de triage» ni en «En atención»;
    - `R8:` nivel I con «Clasificada hace 0 min», «Atención inmediata» y la alerta; nivel II con «Clasificada hace 30 min», máximo 30 y la alerta;
    - `R10:` con `queueWithoutClock`, la fila anómala muestra paciente, llegada, espera, sede, «Ver atención» e «Iniciar atención» (PHYSICIAN), sin «Clasificada hace» ni «—» en la celda, sin alerta, sin error y con las otras filas intactas;
    - `R11:` la insignia tiene el icono `aria-hidden`, la clase `tone--error`, el texto visible en un `span` `aria-hidden` y un `.visually-hidden` con «Tiempo máximo superado desde la clasificación», y la fila no lleva la clase `tone--`.
  - Después: implementar `QueueWait` y, si hace falta, el bloque CSS `/* DT-02-web */` solo con tokens.
  - Ajustar `QueuePage.test.tsx` R9 (helper `overdueBadge` y texto visible) como dice `design.md`.
  - (R3, R4, R5, R8, R10, R11)
- [x] **T5 — El servidor decide: orden, reloj y alertas que no se corrigen (D8, D9).**
  - Pruebas en `QueuePage.dt02.test.tsx`:
    - `R7:` con `triageClockQueue`, en «Clasificadas» el orden del DOM es el recibido (la fila que llegó hace 50 min antes que la que llegó hace 90), y lo mismo con `unorderedQueue`;
    - `R6:` con timers falsos, 29 s sin respuesta nueva no cambian «Clasificada hace 30 min», la espera ni la alerta; un refresco con `LATER_SERVER_NOW` y `minutesSinceTriage: 31` muestra «Clasificada hace 31 min»; y no hay más `GET /queue` que los del intervalo;
    - `R9:` `triagedLevel2LateArrival` (90/10, `overdue: false`) y una fila 45/30/`false` se muestran sin alerta.
  - No debería hacer falta código: si falla alguna, parar y anotarlo.
  - (R6, R7, R9)
- [x] **T6 — Guía, idiomas y documentación (D10).**
  - Pruebas en `dt02Transversal.test.ts`:
    - `R12:` `guide_queue` en los cinco idiomas sin la frase vieja del orden por espera, con el texto de PA-4 (a) en español y sin cifras ni parámetros, con `feature_refresh`, «se actualiza sola» y `queue_overdue`;
    - `R13:` `queue_since_triage`, `queue_overdue_a11y` y `queue_max_minutes` en los cinco idiomas con los mismos parámetros, el inglés distinto del español, sin «sugerencia», «IA» ni `F-0<n>`, y `noUiLiterals` sin excepciones nuevas;
    - `R14:` si existe, el bloque CSS `/* DT-02-web */` sin colores literales.
  - Prueba `R14:` en `src/app/router/dt02Routes.test.tsx`: al cambiar a inglés con la cola en pantalla, la fila de nivel II muestra traducidos el tiempo desde la clasificación, el máximo, la alerta y su texto accesible.
  - Después: cambiar `guide_queue` en `messages/common/*.json` y ajustar `dashboards.test.tsx` (`NEW_MESSAGES.guide_queue.es`).
  - Actualizar `src/features/queue/README.md` y la enmienda de F-06-web en `docs/ui-dashboards.md` (PA-F06-1 y PA-F06-2 enmendadas por DT-02, 2026-11-11).
  - (R12, R13, R14)
- [x] **T7 — Verificación y cierre.**
  - Comprobaciones automáticas en verde: `./init.sh` (lint, typecheck y Vitest), `npm run i18n:check`, `npm run build` y `npm run api:types` sin diff.
  - Preparación: arrancar la API local en `../asclepio-api` en la rama `feature/DT-02-api` con `npm run start:dev`, solo leyendo ese repo, sin escribir en él. Crear datos sintéticos `DEV-…` (RNF-15) con `../prereg.sh`, recepción y `../triage.sh` o el triage manual de la web como NURSE:
    - **A**: llega, espera unos 5 min y se clasifica de nivel II;
    - **B**: llega después que A y se clasifica de nivel II antes que A;
    - **C**: llega y se clasifica de nivel I;
    - **D**: espera unos 10 min antes del triage y se clasifica de nivel IV;
    - **E**: una más, en `WAITING_TRIAGE`.

    Los niveles solo sirven para ejercitar la cola: no son un criterio clínico.

  - Verificación manual como PHYSICIAN, en el navegador, a 1440, 768 y 375 px, con tema claro y oscuro y con zoom al 200 %:
    1. **Tiempo desde la clasificación**: cada fila de «Clasificadas» muestra la espera desde la llegada y «Clasificada hace N min» con valores distintos para A y D, iguales a `waitMinutes` y `minutesSinceTriage` de la respuesta en la pestaña Red. «En espera de triage» (E) no lo muestra.
    2. **Orden**: en el nivel II, B va antes que A aunque A llegó antes, igual que en la respuesta. C (nivel I) va primero.
    3. **Alerta de nivel I**: C sale con «Tiempo máximo superado» desde la primera lectura, con «Clasificada hace 0 min» o 1 min. La web no la quita.
    4. **Nivel II**: A y B sin alerta mientras `overdue` sea `false`. Si se deja pasar más de 30 min desde la clasificación de B (paso opcional y largo), la alerta aparece cuando lo dice la API, aunque se muestre «Clasificada hace 30 min».
    5. **Máximo**: «Máx. 30 min desde la clasificación» en A y B, «Atención inmediata» en C y nada en D.
    6. **Refresco**: a los 30 s llega un `GET /queue` nuevo y «Clasificada hace N min» avanza solo con esa respuesta.
    7. **Accesibilidad**: con el lector de pantalla del sistema (o el árbol de accesibilidad de DevTools), la alerta se lee «Tiempo máximo superado desde la clasificación». Sin color (escala de grises de DevTools), la alerta se reconoce por icono y texto.
    8. **Idiomas**: en inglés, portugués, francés y alemán, los textos nuevos y la guía de `/cola` se ven traducidos. En 375 px, nada desborda.
    9. **Roles**: como NURSE y ADMIN, la misma información sin botones.
  - En todos los casos, comprobar en DevTools que no hay datos de la cola en el almacenamiento, la URL ni la consola, y que no hay peticiones a `/api/v1/reports`.
  - Dejar la tabla R1–R14 → `archivo::prueba` y los resultados del recorrido en `progress/impl_DT-02-web.md`.
  - (R1–R14)
