# F-05-web — Tareas

No hay migraciones: la web no tiene base. Contrato consumido: 0.5.0 → **0.6.0**, con tipos generados desde el snapshot 0.7.0 (design D11). Las tareas se ejecutan en este orden. En cada una, el `implementer` escribe **primero la prueba** `R<n>:` (bajo `describe('F-05-web …')`), comprueba que falla, escribe el código, ejecuta la suite completa y solo entonces marca `[x]`. Las pruebas existentes se ajustan solo en lo que lista `design.md` («Pruebas existentes que cambian»). Todo texto nuevo entra en los cinco catálogos en la misma tarea que lo usa (R25). PA-1..PA-7 las cerró el humano el 2026-11-10 con la opción (a). T1 no empieza hasta que la spec esté aprobada.

- [x] **T1 — Consumir el contrato publicado (D11).**
  - En `scripts/extract-clinical-contract.mjs`, añadir `'0.7.0'` al guard de versión con el comentario `// F-05-web D11: 0.7.0 no cambia las reglas clínicas de F-03 (revisado el 2026-11-10).` y exportar `DECISION_LIMITS` (nivel mínimo y máximo, y longitud mínima y máxima del motivo), leído de `CorrectTriageDecisionRequest` y `ManualTriageDecisionRequest`.
  - Ejecutar `npm run api:types`. Comprobar que en `clinicalContract.generated.ts` solo cambian la cabecera («Generated from OpenAPI 0.7.0») y la constante nueva `DECISION_LIMITS` (`level` 1–5, motivo 1–500). Si cambia cualquier límite de `VITAL_SIGN_CONTRACT`, `CONSCIOUSNESS_LEVELS`, `FINDING_KINDS` o `FINDING_LIMITS`, parar y anotarlo (docs/specs.md §5).
  - Fijar `CONSUMED_CONTRACT = '0.6.0'` en `src/shared/api/client.ts` y añadir los alias generados `TriageDecision`, `TriageDecisionAction` y `TriageDecisionRequest`.
  - En `src/test/contractBaseline.ts`: `EXPECTED_CONTRACT = '0.6.0'`; `SCHEMA_SHA256` y `CLINICAL_CONTRACT_SHA256` con las huellas de los archivos regenerados; comentario «snapshot publicado 0.7.0, aditivo respecto a 0.6.0; F-05-web D11»; y `WEB_OPERATIONS` con `GET /api/v1/encounters/{id}/triage-decision` y `POST /api/v1/encounters/{id}/triage-decision` en orden alfabético. Para que la suite quede en verde al cerrar T1 (las pruebas exigen que `WEB_OPERATIONS` sea igual a las operaciones del código), las dos líneas se escriben en T1 comentadas con `// F-05-web T3`, y T3 las activa junto con los hooks que las usan, como en F-04-web T3.
  - Ajustar `src/test/f04Transversal.test.ts` como dice `design.md` (las dos R23 y la R20).
  - Prueba nueva `R28:` en `src/test/f05Transversal.test.ts`: `CONSUMED_CONTRACT === EXPECTED_CONTRACT === '0.6.0'`, las huellas, y que el código de aplicación no contiene `/api/v1/queue`, `start-care`, `/close'` ni esquemas `Queue*`.
  - `npm run typecheck` y `npm run api:types` sin diff.
  - Anotar D11 en `progress/history.md`.
  - (R28)
- [x] **T2 — Datos de prueba.** Crear `src/features/triage/testing/decisionFixtures.ts` con:
  - decisiones sintéticas: `VALIDATE` sobre la sugerencia con guard de `suggestionFixtures.ts` (`level` = `suggestedLevel`), `CORRECT` con un motivo de 500 caracteres sin espacios y otro corto, y `MANUAL` con `suggestionId`, `suggestedLevel` y `reason` a `null`;
  - atenciones decididas (`finalLevel`, `triagedAt` y `triagedBy` no nulos) en `TRIAGED`, `IN_CARE`, `CLOSED` y `CANCELLED`;
  - helpers de `fakeApi` para `GET` y `POST …/triage-decision`.

  No cambia nada más. (R15, R16)

- [x] **T3 — Hooks y operaciones (D2, D4, D5).**
  - Pruebas `R14:` (tras 201, `['triage','decision',id]` tiene la respuesta sin un `GET` nuevo, y se invalidan la atención, la captura y `ENCOUNTERS_KEY`), `R18:` (409: se invalidan la captura, la atención y `['triage','suggestions',id]`), `R17:` (`useTriageDecision` no hace petición si `enabled` es falso, y usa `retry: false`) y `R12:` (`mutationKey` del envío y de la solicitud de sugerencia, observables con `useIsMutating`).
  - Después, implementar `useTriageDecision` y `useDecideTriage`, y añadir `mutationKey` a `useRequestTriageSuggestion`.
  - Activar en `WEB_OPERATIONS` las dos operaciones de `triage-decision` que T1 dejó comentadas. Prueba `R28:` (las operaciones del código son iguales a `WEB_OPERATIONS`, que contiene las dos).
  - (R12, R14, R17, R18, R28)
- [x] **T4 — Funciones puras del formulario (D6).**
  - Pruebas `R6:` (`decisionFormSchema('correct', 2)`: sin nivel, nivel 2, nivel 0 y 6, motivo vacío, solo espacios, 500 caracteres válido y 501 inválido tras recortar, cada uno con su clave `decision_error_*`; límites leídos de `DECISION_LIMITS`), `R9:` (`'manual'` sin nivel), `R7:` y `R13:` (`toDecisionRequest` devuelve exactamente las claves de cada acción, el motivo recortado y `suggestionId = current.id`, y nunca horas, responsable, tenant, `finalLevel` ni `id`) y `R22:` (con un borrador de nivel 3 y una vigente nueva con `suggestedLevel` 3, la validación da `decision_error_level_same`).
  - Después, implementar `src/features/triage/decisionForm.ts`.
  - (R6, R7, R9, R13, R22)
- [x] **T5 — Selector de nivel (D7).**
  - Pruebas `R5:` (cinco radios I–V en un `fieldset` con `legend`, ninguno elegido, y con `disabledLevel` la opción deshabilitada y rotulada «(sugerido)», sin color ni nombre por nivel) y `R27:` (navegación con flechas, foco visible, y el error asociado al `fieldset` con `aria-describedby`).
  - Después, implementar `LevelPicker.tsx`.
  - (R5, R27)
- [x] **T6 — Tarjeta de triage y espera de la vigente (D1, D2, D3).**
  - Pruebas `R1:` (NURSE ve la región «Triage de enfermería» justo después del panel de sugerencia y antes del historial; RECEPTION, PHYSICIAN y ADMIN no la ven; `/atenciones/:id` y los dashboards no registran peticiones a `triage-decision`) y `R11:` (con la consulta de sugerencias cargando o en 500, o con una solicitud en curso con `deferred`, no hay Validar, Corregir ni Manual, y aparece el texto de espera).
  - Prueba `R15:` en el panel: con `decided` no hay botón de solicitud, ni texto «Guarda primero una toma…», ni `renderActions`, y la vista de la sugerencia sigue visible.
  - Después, implementar `TriageDecisionCard` (sin acciones aún), montarla en `ClinicalCapturePage` y añadir la prop `decided` al panel.
  - (R1, R11, R15)
- [x] **T7 — Validar y Corregir (D6, D8, D13).**
  - Pruebas `R2:` (vigente `OK` con guard: «Validar nivel II» con el `suggestedLevel` y no con `llmLevel`, y «Corregir», sin triage manual), `R3:` (los dos con la misma `className`, un icono cada uno, el mismo contenedor, orden Validar → Corregir, `type="button"`, sin `autoFocus`, fuera de cualquier `form`, y deshabilitados a la vez), `R4:` (un clic → un solo `POST` `{action:'VALIDATE', suggestionId}`), `R5:` (Corregir abre el formulario sin `POST`, y Cancelar lo cierra y descarta el borrador), `R6:` (cada error junto a su campo, sin `POST`, con el foco en el primer campo con error), `R7:` (un `POST` `CORRECT` con el motivo recortado) y `R24:` (antes de decidir, la región del panel no tiene controles ni términos «final», «decisión», «decidido» ni «clasificado», y la insignia sigue en «En espera de triage»).
  - Después, implementar `TriageDecisionActions` en modo propuesta, con el CSS `/* F-05-web */`.
  - (R2, R3, R4, R5, R6, R7, R24)
- [x] **T8 — Triage manual (D6).**
  - Pruebas `R8:` (vigente `FAILED`, `TIMEOUT` o `INVALID_OUTPUT`, o ninguna: formulario manual sin Validar ni Corregir, y el aviso de modo manual sigue en el panel; con la atención sin tomas también se ofrece el formulario manual, PA-7 a), `R9:` (sin nivel, error junto al selector y sin `POST`) y `R10:` (un `POST` `{action:'MANUAL', level}`).
  - Después, implementar el modo manual de `TriageDecisionActions`.
  - (R8, R9, R10)
- [x] **T9 — Envío, 201 y decisión en solo lectura (D4, D5, D12).**
  - Pruebas `R12:` (con `deferred`: acciones y botón de pedir sugerencia deshabilitados, un segundo clic ignorado y `LoadingState` «Registrando el triage…»).
  - `R14:` tras 201, la decisión aparece sin esperar al `GET` de la atención, el foco va a la decisión y desaparecen las acciones.
  - `R15:` con las atenciones decididas de T2 en sus cuatro estados: se pide `GET …/triage-decision`, se muestra la decisión y no hay acciones, botón de solicitud ni texto de tomas.
  - `R16:` nivel final en romano dentro de `badge tone--neutral`, el texto de cada acción, el responsable y la hora en `America/Bogota` con una hora UTC fija, el nivel sugerido cuando no es `null` y el motivo literal cuando no es `null` (PA-3 a), y ningún control.
  - `R17:` la consulta de la decisión cargando, en 500 y en 404 con `finalLevel ≠ null`, con «Reintentar» que la repite solo al pulsarlo y sin acciones.
  - Después, implementar `TriageDecisionView` y el estado decidido de la tarjeta.
  - (R12, R14, R15, R16, R17)
- [x] **T10 — Errores del envío (D9, D10).**
  - Pruebas `R18:` 409 con tres desenlaces:
    - tras la comprobación, la atención decidida: decisión y aviso `decision_already_decided`;
    - sigue en `WAITING_TRIAGE` con otra vigente: aviso `decision_conflict_changed` con el foco, borrador conservado y acciones de la nueva vigente;
    - atención cancelada: sin acciones.
  - `R19:` 422 con `errors[]` de `level` y de `reason` muestra los textos de los catálogos, no el de la API, y conserva el borrador; sin campo reconocido, error genérico.
  - `R20:` red y 500: `ActionError` con «Reintentar», que repite el mismo cuerpo solo al pulsarlo, y borrador conservado.
  - `R21:` 401 → login; 403 → vista sin permiso; 404 → atención no encontrada; tanto en el envío como en la consulta, salvo el 404 de R17.
  - Después, implementar el manejo de errores en la tarjeta y la página.
  - (R18, R19, R20, R21)
- [x] **T11 — Borrador y salida (D6, D14).**
  - Pruebas `R22:` con un nivel y un motivo escritos, pedir otra sugerencia y recibir un 409 no los borra, y cambiar de idioma o de tema tampoco. Al pasar de Corregir a Manual por un cambio de la vigente, el nivel aparece ya elegido, y al volver a Corregir reaparece el motivo (PA-5 a). Un nivel igual al nuevo sugerido se marca al enviar.
  - `R23:` con un borrador, salir de la página muestra el aviso de cambios sin guardar; tras un 201 ya no lo muestra.
  - Después, implementar `onDirtyChange` y conectarlo al guard de la página.
  - (R22, R23)
- [x] **T12 — Etiqueta del evento (D16).**
  - Prueba `R29:` `/atenciones/:id` con un evento `TRIAGE_DECIDED` muestra «Triage registrado», sin nivel, acción ni motivo, en los cinco idiomas.
  - Ajustar `labels.test.ts` como dice `design.md`.
  - Después, implementar la entrada en `EVENT_LABELS`.
  - (R29)
- [x] **T13 — Transversales.**
  - Pruebas `R25:` `npm run i18n:check`; las claves `decision_*` y `feature_event_triage_decided` en los cinco idiomas con los mismos parámetros; el inglés no repite el español; `noUiLiterals` sin excepciones nuevas; ninguna clave nueva con prefijo `suggestion_`; el motivo se muestra literal en inglés.
  - `R26:` tras escribir un motivo y decidir, `localStorage`, `sessionStorage`, la URL y los espías de `console` no contienen el motivo ni el nivel; el borrador de UI-03-web no los incluye; la guía de voz no los lee.
  - `R27:` el CSS `/* F-05-web */` no tiene colores literales, aplica la misma regla a los dos botones y usa `overflow-wrap: anywhere` en el motivo; los componentes no usan estilos en línea; el orden de tabulación de la tarjeta es correcto.
  - `R28:` sin dependencias nuevas en `package.json`.
  - (R25, R26, R27, R28)
- [x] **T14 — Verificación y cierre.**
  - Comprobaciones automáticas en verde: `./init.sh` (lint, typecheck y Vitest), `npm run i18n:check`, `npm run build` y `npm run api:types` sin diff.
  - Verificación manual en el navegador contra la API local (`npm run start:dev` en `asclepio-api` con F-05-api, y claves LLM configuradas por el humano) como **NURSE** (`demo.*@dev.local`), a 1440, 768 y 375 px, tema claro y oscuro, y con zoom al 200 %:
    1. **Validar un caso con guard**: datos sintéticos con NEWS2 total ≥ 7, por ejemplo FR 30, SpO₂ 88, PAS 85, FC 135 y conciencia V. No es un criterio clínico; solo sirve para disparar G1 (tabla D10 de F-04-api). Pedir la sugerencia, ver el aviso de regla de seguridad y que «Validar nivel …» lleva el nivel ajustado y no `llmLevel`, y comprobar que Validar y Corregir pesan lo mismo en los cuatro anchos. Validar y ver la decisión en solo lectura (nivel final, «Sugerencia validada», responsable y hora en Bogotá), sin acciones ni botón de pedir sugerencia, con la insignia en `TRIAGED`.
    2. **Corregir con motivo** en otra atención: intentar enviar sin motivo, con solo espacios y con el nivel sugerido, y ver los errores sin petición en la pestaña Red. Después, corregir con un nivel distinto y un motivo, y ver la decisión con el nivel sugerido y el motivo (PA-3 a).
    3. **Caso manual con sugerencia `FAILED`**: el humano arranca la API local sin acceso a los proveedores o con `LLM_TIMEOUT_MS=1` y `LLM_TOTAL_BUDGET_MS=1` (los agentes no leen ni editan `.env`). Pedir la sugerencia, ver el modo manual en el panel y el triage manual en la tarjeta, sin Validar ni Corregir, y registrar un nivel.
    4. **Decidir dos veces**: abrir la misma atención en dos pestañas y decidir en la primera. En la segunda, sin recargar, enviar otra decisión: ver el aviso de que ya tenía un triage registrado y la decisión de la primera, y comprobar en la pestaña Red el 409. Además, con una sugerencia nueva pedida en la otra pestaña antes de validar, ver el aviso de que la sugerencia cambió con el borrador conservado.
  - En los cuatro casos, comprobar en DevTools que no hay motivo ni nivel en el almacenamiento, en la URL ni en la consola, y que `/atenciones/:id` muestra «Triage registrado» en la línea de tiempo.
  - Dejar la tabla R1–R29 → `archivo::prueba` y los resultados del recorrido en `progress/impl_F-05-web.md`.
  - (R1–R29)
