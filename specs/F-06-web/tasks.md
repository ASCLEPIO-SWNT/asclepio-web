# F-06-web — Tareas

No hay migraciones: la web no tiene base. Contrato consumido: 0.6.0 → **0.7.0**, sin diff en los tipos generados (design D1). Las tareas se ejecutan en este orden. En cada una, el `implementer` escribe **primero la prueba** `R<n>:` (bajo `describe('F-06-web …')`), comprueba que falla, escribe el código, ejecuta la suite completa y solo entonces marca `[x]`. Las pruebas existentes se ajustan solo en lo que lista `design.md` («Pruebas existentes que cambian»), y cada ajuste va en la tarea que lo provoca. Todo texto nuevo entra en los cinco catálogos en la misma tarea que lo usa (R26). PA-1..PA-12 las cerró el humano el 2026-11-10 con la opción (a). T1 no empieza hasta que la spec esté aprobada.

- [x] **T1 — Consumir el contrato 0.7.0 (D1).**
  - Ejecutar `npm run api:types` y comprobar que no hay diff en `schema.d.ts` ni en `clinicalContract.generated.ts`. Si lo hay, parar y anotarlo (docs/specs.md §5).
  - Fijar `CONSUMED_CONTRACT = '0.7.0'` en `src/shared/api/client.ts` y añadir los alias generados `Queue`, `QueueItem` y `QueuePatient`.
  - En `src/test/contractBaseline.ts`: `EXPECTED_CONTRACT = '0.7.0'`, las mismas huellas y el comentario «snapshot publicado 0.7.0; F-06-web D1». Añadir a `WEB_OPERATIONS`, en orden alfabético y comentadas con `// F-06-web T4`, `GET /api/v1/queue`, `POST /api/v1/encounters/{id}/close` y `POST /api/v1/encounters/{id}/start-care`.
  - Ajustar `src/test/f05Transversal.test.ts` como dice `design.md`: la R28 de versión compara con `EXPECTED_CONTRACT`; se retira la R28 «no usa nada que sea solo de 0.7.0» y su invariante se acota a `DECISION_FILES`; se quita `toHaveLength(20)`.
  - Prueba nueva `R30:` en `src/test/f06Transversal.test.ts`: `CONSUMED_CONTRACT === EXPECTED_CONTRACT === '0.7.0'`, las huellas, y que los alias `Queue*` de `client.ts` salen de `Schemas[...]`.
  - `npm run typecheck` y `npm run api:types` sin diff. Anotar D1 en `progress/history.md`.
  - (R30)
- [x] **T2 — Datos de prueba (D13).** Crear `src/features/queue/testing/queueFixtures.ts` con la cola sintética de D13 (incluida la sección de control con un orden que no es el ascendente), colas vacías y de una sede, un `serverNow` UTC fijo, y helpers de `fakeApi` para `GET /queue`, `POST …/start-care` y `POST …/close`. Iniciales y edades ficticias, sin nombres. No cambia nada más. (R3, R4, R9, R10)
- [x] **T3 — `romanLevel` compartido (D9).**
  - Prueba `R4:` en `src/shared/lib/level.test.ts`: 1–5 → I–V.
  - Después, mover la función a `src/shared/lib/level.ts` y reexportarla desde `features/triage/suggestionView.ts`. Las pruebas de F-04-web y F-05-web siguen en verde sin cambios.
  - (R4)
- [x] **T4 — Hooks y operaciones (D3, D5, D10, D11).**
  - Pruebas `R2:` (`useQueue(null)` hace un `GET /queue` sin parámetros y `useQueue(id)` lo hace con `siteId`, con clave `['queue', …]`), `R11:` (opciones de `autoRefresh`: 30 s, sin segundo plano, sin foco ni reconexión, `retry: false`), `R15:` (cambiar de sede cambia la clave y no usa `placeholderData`), `R19:` (`start-care` y `close` se envían sin cuerpo), `R21:` (200 invalida `QUEUE_KEY` y `ENCOUNTERS_KEY`, sin `setQueryData`), `R22:` y `R23:` (409 y 404 invalidan `QUEUE_KEY`) y `R20:` (`mutationKey ['queue','transition']` observable con `useIsMutating`, `retry: false`).
  - Después, implementar `useQueue` y `useQueueTransition`.
  - Activar en `WEB_OPERATIONS` las tres operaciones que T1 dejó comentadas. Prueba `R30:` (las operaciones del código son iguales a `WEB_OPERATIONS`, que contiene las tres).
  - (R2, R11, R15, R19, R20, R21, R22, R23, R30)
- [x] **T5 — Funciones puras de la vista (D6, D7).**
  - Pruebas `R3:` (`sectionsOf` devuelve las tres secciones en su orden y con las filas tal cual, sin reordenar la sección de control), `R4:` (`patientLabel` con iniciales, edad y sexo; con `initials`, `ageYears` o `sex` a `null`; `waitLabel`) y `R10:` (`maxWaitLabel` con 0 → «Atención inmediata», 30 → «Máx. 30 min» y `null` → nada; fuera de «Clasificadas», nada).
  - Después, implementar `src/features/queue/queueView.ts`.
  - (R3, R4, R10)
- [x] **T6 — Página de la cola: estructura, filas y estados (D2, D4, D6, D14).**
  - Pruebas `R1:` (los tres roles ven el `h1`, «Actualizar» como única acción del encabezado, la región «Indicadores» con tres celdas y el filtro, y las tres secciones en orden, sin «Atenciones recientes» ni franja «pendiente»), `R2:` (cifras = filas de cada sección, un solo `GET /queue` y ningún `GET /encounters`), `R3:` (orden recibido con la fixture de control, y `WAITING_TRIAGE` solo en su sección), `R4:` (columnas por sección y contenido de cada fila, «Ver atención» a `/atenciones/{id}` con `aria-describedby`), `R6:` (sin nombre, documento, fecha de nacimiento ni motivo, y sin peticiones a `/encounters/{id}`, `/patients` ni `/pre-registrations`), `R7:` (cada sección vacía con su mensaje y las otras con filas), `R8:` (carga inicial con `deferred`: un solo `role="status"` y celdas `aria-busy`) y `R29:` (sin «sugerencia», «IA», nivel sugerido, acción ni motivo de la decisión).
  - Después, reescribir `QueuePage`, crear `QueueSection` y el CSS `/* F-06-web */`.
  - Ajustar en esta tarea, como dice `design.md`: `QueuePage.test.tsx` (sustituido), `dashboards.test.tsx` (`DASHBOARDS`, `ALLOWED_REQUESTS`, la R1 de los tres roles, `dashboardApi` y los escenarios de privacidad de `/cola`), `pendingStrip.test.tsx`, `networkErrors.test.tsx` y los handlers de `GET /queue` en las pruebas que abren `/cola`.
  - (R1, R2, R3, R4, R6, R7, R8, R29)
- [x] **T7 — Tiempo máximo, alerta y hora de la cola (D7, D8).**
  - Pruebas `R9:` (las filas I y II vencidas llevan «Tiempo máximo superado» con icono `aria-hidden` y `tone--error`, la II sin vencer y la IV no la llevan, y el texto existe aunque se ignore el color), `R10:` («Atención inmediata» en la fila I, «Máx. 30 min» en las II, nada en la IV ni en «En espera de triage» ni «En atención») y `R5:` (con `serverNow` UTC fijo, «Datos del servidor de las {hora de Bogotá}» en un `<time dateTime>`; al avanzar el reloj falso 29 s sin respuesta nueva, la espera, la alerta y la hora no cambian; con una fila `overdue: false` y `waitMinutes` mayor que `maxWaitMinutes`, no hay alerta).
  - Después, implementar `QueueWait` y la hora de la cola.
  - (R5, R9, R10)
- [x] **T8 — Refresco (D4, D5).**
  - Pruebas `R11:` (con timers falsos, un `GET /queue` a los 30 s con el mismo `siteId`; pestaña oculta sin peticiones; foco y reconexión sin peticiones; «Actualizar» pide al instante), `R12:` (durante un refresco con `deferred`, filas, cifras, foco del enlace enfocado y desplazamiento conservados, sin `role="status"`, y «Actualizar» con `aria-busy` y habilitado; una fila nueva no mueve el foco), `R13:` (refresco con red caída o 500: filas del último éxito y el aviso con la hora de la cola y «Reintentar», que pide solo al pulsarlo, y el siguiente ciclo vuelve a pedir y quita el aviso; carga inicial fallida: error traducido con «Reintentar» y sin secciones) y `R14:` (403: «No tienes permiso para ver esta página.» sin «Reintentar» y sin más peticiones a los 30 s; 401: cierre de sesión).
  - Después, implementar los estados de D4 en la página.
  - (R11, R12, R13, R14)
- [x] **T9 — Filtro de sede (D3).**
  - Pruebas `R15:` (opción «Todas las sedes» por defecto; elegir una sede hace un `GET /queue?siteId=…`; con la respuesta retenida por `deferred`, no se ven filas ni cifras de la opción anterior; la URL y el almacenamiento no cambian; `GET /public/tenants` una sola vez) y `R16:` (sedes en 500: error bajo el filtro con «Reintentar» y la cola de todas las sedes visible).
  - Después, implementar el filtro con `SummaryFilter` y `useSites`.
  - (R15, R16)
- [x] **T10 — Acciones del médico y confirmación (D10).**
  - Pruebas `R17:` (PHYSICIAN: «Iniciar atención» en cada fila de «Clasificadas» y «Cerrar atención» en cada una de «En atención», con `aria-describedby` a su fila y la misma clase que «Ver atención», y nada en «En espera de triage»; NURSE y ADMIN: ningún botón y ningún `POST` tras cargar y refrescar), `R18:` (el diálogo muestra el título y el texto con las iniciales y el nivel de la fila; «Volver» y `Escape` lo cierran sin petición y devuelven el foco al botón; «Confirmar» hace un único `POST` a la ruta de la fila), `R19:` (el `POST` va sin cuerpo) y `R20:` (con `deferred`: todas las acciones del médico deshabilitadas, un segundo clic ignorado, `role="status"` con «Iniciando la atención…» o «Cerrando la atención…», y un tick del intervalo durante la petición no la repite ni la cancela).
  - Después, implementar los botones, el diálogo y el bloqueo.
  - (R17, R18, R19, R20)
- [x] **T11 — Resultado de las acciones (D11).**
  - Pruebas `R21:` (200 en `start-care`: aviso «Atención iniciada.» con el foco, `GET /queue` nuevo y la fila en «En atención» solo cuando llega esa respuesta; lo mismo con `close` y «Atención cerrada.», con la fila fuera de la cola), `R22:` (409 en cada acción: su aviso con el foco, un `GET /queue` nuevo y ningún `POST` repetido), `R23:` (404: «Esta atención ya no existe. La cola se actualizó.» y un `GET /queue` nuevo; 403: «No tienes permiso para esta acción.» sin «Reintentar»; 401: cierre de sesión) y `R24:` (red y 500: error traducido con «Reintentar», que repite la misma acción sobre la misma atención solo al pulsarlo; 400: error genérico sin «Reintentar»; sin reintento automático).
  - Después, implementar el manejo de resultados en la página.
  - (R21, R22, R23, R24)
- [x] **T12 — Línea de tiempo (D12).**
  - Prueba `R25:` `/atenciones/:id` con eventos `STATUS_CHANGED` de `TRIAGED` a `IN_CARE` y de `IN_CARE` a `CLOSED` muestra «Cambio de estado» con «En atención» y «Cerrada», en los cinco idiomas, sin ninguna etiqueta de evento desconocido.
  - No debería hacer falta código. Si falla, parar y anotarlo.
  - (R25)
- [x] **T13 — Transversales.**
  - Pruebas `R26:` `npm run i18n:check`; las claves `queue_*` del plan i18n en los cinco idiomas con los mismos parámetros; el inglés distinto del español; los textos en español de PA-2; `guide_queue` nueva, estática, sin cifras, con «Actualizar» y «se actualiza sola» en los cinco idiomas; `noUiLiterals` sin excepciones nuevas; ninguna clave nueva con «sugerencia», «IA» ni `F-0<n>`.
  - Retirar de los cinco catálogos las nueve claves que lista el plan i18n y ajustar `dashboards.test.tsx` (`NEW_MESSAGES`, recuento, `guide_queue`, `LABEL_KEYS`, `PLAN_I18N_KEYS`) como dice `design.md`.
  - `R27:` tras cargar, refrescar, filtrar y operar como PHYSICIAN, `localStorage`, `sessionStorage`, la URL y los espías de `console` no contienen iniciales, edades ni ids de atención; y los archivos de `features/queue` no usan almacenamiento, `useSearchParams`, `console.` ni `useDraft`.
  - `R28:` el CSS `/* F-06-web */` no tiene colores literales; los componentes de la cola no usan estilos en línea; la celda de espera usa `flex-wrap`; el orden de tabulación de una fila es «Ver atención» → acción; tras cambiar el idioma con la cola en pantalla, las filas y la alerta se muestran traducidas.
  - `R30:` sin dependencias nuevas en `package.json`.
  - (R26, R27, R28, R30)
- [x] **T14 — Verificación y cierre.**
  - Comprobaciones automáticas en verde: `./init.sh` (lint, typecheck y Vitest), `npm run i18n:check`, `npm run build` y `npm run api:types` sin diff.
  - Preparación con la API local (`npm run start:dev` en `asclepio-api`, con F-06-api) y datos sintéticos `DEV-…` (RNF-15). Con `../prereg.sh`, recepción y `../triage.sh` (o el triage manual de la web como NURSE), crear en dos sedes al menos: dos atenciones en `WAITING_TRIAGE`; en `TRIAGED`, una de nivel I con más de 1 min desde la llegada, una de nivel II con más de 30 min desde la llegada (crearla primero y dejarla esperar), una de nivel II reciente y una de nivel IV; y una en `IN_CARE`. Los niveles se eligen solo para ejercitar la cola, no son un criterio clínico.
  - Verificación manual en el navegador a 1440, 768 y 375 px, tema claro y oscuro, y con zoom al 200 %:
    1. **Cola y orden** como PHYSICIAN: tres secciones, «En espera de triage» aparte, «Clasificadas» con I antes que II y II antes que IV, y en cada nivel la mayor espera primero, igual que en la respuesta de la pestaña Red. Iniciales, edad y sexo, sin nombre ni documento en la página ni en la respuesta.
    2. **Alerta**: «Tiempo máximo superado» en la I y en la II de más de 30 min; nada en la II reciente ni en la IV; «Atención inmediata» y «Máx. 30 min» donde corresponde.
    3. **Refresco**: sin tocar nada, a los 30 s llega un `GET /queue` nuevo (pestaña Red), la hora de la cola cambia y la espera avanza. Con la pestaña oculta no hay peticiones. Parar la API un ciclo y ver el aviso con la hora de los datos y las filas conservadas; al volver a arrancarla, el siguiente ciclo lo quita.
    4. **Filtro de sede**: elegir cada sede y «Todas las sedes»; ver `siteId` en la petición y que no se mezclan filas.
    5. **Iniciar y cerrar**: «Iniciar atención» en una fila clasificada, comprobar el diálogo con iniciales y nivel, «Volver» sin petición, confirmar, ver «Atención iniciada.» y la fila en «En atención». Después «Cerrar atención» y ver la fila fuera de la cola. En `/atenciones/:id`, los dos «Cambio de estado» en la línea de tiempo.
    6. **409**: abrir `/cola` en dos pestañas como PHYSICIAN e iniciar la misma atención en la primera; en la segunda, sin esperar al refresco, iniciarla también y ver el 409 en la pestaña Red, el aviso «Esta atención ya no está clasificada…» y la cola actualizada. Lo mismo con «Cerrar atención» sobre una atención ya cerrada en la otra pestaña («Esta atención ya no está en atención…»).
    7. **Roles**: como NURSE y como ADMIN, la misma cola sin botones de acción y sin `POST` en la pestaña Red.
  - En todos los casos, comprobar en DevTools que no hay datos de la cola en el almacenamiento, la URL ni la consola.
  - Dejar la tabla R1–R30 → `archivo::prueba` y los resultados del recorrido en `progress/impl_F-06-web.md`.
  - (R1–R30)
