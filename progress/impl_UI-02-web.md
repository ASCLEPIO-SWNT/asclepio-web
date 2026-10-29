# impl_UI-02-web — Etapa A, base compartida (T1 a T5)

Fecha: 2026-10-28, America/Bogota. Rol `implementer`. Partida: `main` en `7043fc1`, contrato 0.4.0 sin cambios. La etapa B (T6 a T9) empieza leyendo esta nota.

## Resultado

T1 a T5 hechas y marcadas `[x]` en `specs/UI-02-web/tasks.md`, en orden y con la prueba `R<n>:` escrita primero (cada prueba se vio fallar antes del código). Sin dependencias nuevas (`package.json` y `package-lock.json` intactos), sin `console`, sin colores literales en el CSS nuevo, sin archivos temporales dentro del repo y sin procesos en marcha.

| Comprobación | Resultado |
| --- | --- |
| `./init.sh` completo | VERDE, FAIL 0, WARN 0 (lint, typecheck y pruebas) |
| `npm test` | 38 archivos y **522 pruebas** en verde (línea base: 30 archivos y 399; +8 archivos y +123 pruebas). Tres ejecuciones seguidas sin fallos |
| `npm run i18n:check` | Correcto: 36 claves nuevas en los cinco idiomas (`common` 100 a 111, `features` 232 a 257 por idioma) |
| `npm run build` | Correcto: el CSS compila con las consultas de contenedor |
| Mutaciones | Cada grupo de pruebas se comprobó con mutaciones del código o del CSS (política de refresco, colores, `px`, `minmax`, roles, `aria-busy`, `banner`...): todas las detectan; el código se restauró idéntico |
| Comprobación visual | Arnés desechable fuera del repo con los componentes y el CSS reales, en Chromium a 375, 768, 1024 y 1440 px, claro y oscuro: sin desbordamiento, columnas de la barra de resumen y apilado de tablas como en la maqueta |

## Archivos

### Creados

- `src/shared/lib/counts.ts`, `indicator.ts`, `refresh.ts`, `encounterStatus.ts` y sus pruebas (`*.test.ts`).
- `src/shared/hooks/useEncounters.ts` (movido desde `features/triage/hooks`), `useEncounterCount.ts` y `encounterQueries.test.tsx`.
- `src/shared/ui/`: `DashboardPage.tsx`, `PageHeader.tsx`, `SummaryBar.tsx`, `SummaryCell.tsx`, `SummaryFilter.tsx`, `Panel.tsx`, `PanelState.tsx`, `StatusBadge.tsx`, `DataTable.tsx` (con `DataRow` y `DataCell`), `LiveNote.tsx`, `PendingStrip.tsx`, `RefreshButton.tsx`, `dashboard.css`, `dashboard.test.tsx` y `dashboardStyles.test.ts`.
- `src/test/text.ts` (`norm`).
- `src/app/router/dashboards.test.tsx` (solo la sección de catálogos; T10 a T14 añaden las suyas).
- `docs/ui-dashboards-verification.md` y 16 capturas `docs/ui-evidence/ui02-<rol>-antes-<claro|oscuro>-<375|1440>.jpg`.

### Tocados

- `src/shared/lib/datetime.ts` (+ `formatTimeBogota`, `formatDateBogota`, `formatDateTimeBogota`; `formatBogota` y `formatCivilDate` no cambian) y `datetime.test.ts` (+ bloque `describe('UI-02-web …')`).
- `src/shared/ui/Notice.tsx` (prop opcional `icon`; sin ella el marcado es idéntico).
- `src/shared/hooks/README.md`.
- `src/main.tsx` (importa `dashboard.css` justo después de `index.css`).
- `src/test/fakeApi.ts` (solo añadidos: `SITE_ESTE`, `publicTenantsWith`, `encounterSummaries`, `encountersFor`, `encountersInEveryStatus`).
- `src/features/triage`: `EncounterListPage.tsx`, `TriageTrayPage.tsx` (import y `manualRefresh: true` pasa a `refresh: true`), `hooks/invalidateClinicalCapture.ts`, `hooks/useCancelEncounter.ts` y `hooks/clinicalCaptureHooks.test.tsx` (solo la ruta de import). Se elimina `features/triage/hooks/useEncounters.ts`.
- `messages/common/*.json` y `messages/features/*.json` (36 claves nuevas por idioma, ningún texto existente cambia ni se retira ninguna clave).
- `specs/UI-02-web/tasks.md` (T1 a T5 en `[x]`).

### Fuera del repo (`../../local-analysis/ui02-verification/`)

`ui02-preview-api.mjs` (API sintética), `capture-dashboards.mjs` (capturas y medidas, reutilizable en T13 con `PHASE=despues`), `add-dashboard-messages.py` (alta de las claves), `metrics-antes.json`, `init-inicio.log`, `init-etapa-a.log` y `dist-antes/` (build del árbol de partida). El script `f03-preview-api.mjs` no se tocó.

## Trazabilidad R → `archivo::prueba` (solo lo hecho en la etapa A)

Abreviaturas: `lib/` = `src/shared/lib/`; `hooks` = `src/shared/hooks/encounterQueries.test.tsx`; `ui` = `src/shared/ui/dashboard.test.tsx`; `css` = `src/shared/ui/dashboardStyles.test.ts`; `router` = `src/app/router/dashboards.test.tsx`. Todas viven bajo `describe('UI-02-web …')`; los nombres se citan por su inicio.

| R | Pruebas |
| --- | --- |
| R2 | `ui::R2: PageHeader tiene un único h1…`; `ui::R2: sin acciones el encabezado no abre un contenedor vacío`; `css::R2: el encabezado reserva el título…` |
| R3 | `ui::R3: DashboardPage monta encabezado, barra de resumen, panel y franja…`; `ui::R3: la franja «pendiente» es opcional…`; `ui::R3: Panel es una región nombrada por su h2…`; `ui::R3: SummaryBar es la región «Indicadores»…`; `ui::R3: el filtro vive dentro de la región…`; `css::R3: la franja «pendiente» es discreta…` |
| R4 | `css::R4: el CSS nuevo no declara colores literales…`; `css::R4: dashboard.css se importa en main.tsx justo después de index.css…`; `css::R4: las variables que usa son tokens de index.css…`; `css::R4: ninguna clase nueva existe ya en index.css…`; `css::R4: la escala única de espacios y de radios es local…`; `css::R4: el CSS nuevo no usa el carácter «·»…` |
| R5 | `ui::R5: SummaryCell muestra icono, etiqueta y cifra…`; `css::R5: la cifra de resumen usa cifras proporcionales…`; `css::R5: la cifra de resumen mide 2 rem semibold…`; `css::R5: las tablas y las insignias siguen las medidas del diseño` |
| R6 | `hooks::R6: solo se piden lecturas de GET /api/v1/encounters…`; `lib/datetime.test.ts::R6: las horas del servidor se muestran en America/Bogota…` |
| R7 | `hooks::R7: … es una única petición con limit=100…` (4 casos); `hooks::R7: la caché del conteo guarda solo { count, capped }…` |
| R8 | `lib/counts.test.ts::R8` (3 pruebas); `hooks::R8: con %i atenciones en el servidor…` (0, 12, 99, 100 y 250); `ui::R8: una cifra que llena la página se escribe «N+»…` |
| R12 (solo `Notice`) | `ui::R12: Notice sin icono conserva exactamente su marcado`; `ui::R12: Notice con icono…` |
| R14 (solo el hook) | `hooks::R14: sin opciones pide páginas de 50…` |
| R15 (solo la tabla) | `lib/encounterStatus.test.ts::R15: los indicadores… son los tres estados activos…` |
| R16 (solo el hook) | `hooks::R16: con limit=8 pide las atenciones recientes…` |
| R18 (solo `PendingStrip`) | `ui::R18: PendingStrip no tiene botones, enlaces ni formularios…` |
| R19 | `lib/indicator.test.ts::R19`; `ui::R19: un indicador que carga…`; `ui::R19: SummaryFilter asocia la etiqueta «Sede»…`; `ui::R19: la carga de un panel es un role="status"…` |
| R20 | `lib/indicator.test.ts::R20`; `ui::R20: un indicador vacío muestra la cifra 0`; `ui::R20: un panel vacío…` (2) |
| R21 | `lib/indicator.test.ts::R21`; `lib/refresh.test.ts::R21`; `hooks::R21: un error de red en un refresco…`; `hooks::R21: con refresh un error de red…`; `ui::R21: un indicador con error…`; `ui::R21: el error de un panel…` |
| R22 | `lib/indicator.test.ts::R22`; `lib/refresh.test.ts::R22`; `hooks::R22: un 403 deja el indicador sin permiso…`; `hooks::R22: con refresh un 403…`; `ui::R22: un indicador con 403…`; `ui::R22: el 403 de un panel…` |
| R23 | `hooks::R23: un refresco conserva los datos anteriores y no vuelve al estado de carga` |
| R24 | `lib/refresh.test.ts::R24`; `hooks::R24: repite la petición cada 30 s…`; `hooks::R24: con refresh repite la lista cada 30 s…` |
| R25 | `lib/refresh.test.ts::R25`; `hooks::R25: no repite por foco de la ventana ni por reconexión`; `hooks::R25: no repite mientras la pestaña está oculta…`; `hooks::R25: con refresh no repite por foco ni por reconexión…` |
| R29 | `router::R29` (5 pruebas: las 36 claves por idioma, parámetros, texto en español de `design.md`, sin claves `dash_` de más ni las de la versión 1, compilación) |
| R30 | `lib/encounterStatus.test.ts::R30` (2); `ui::R30: el estado %s se presenta con icono, texto y clase de tono…` (seis estados); `ui::R30: la identidad verificada y sin verificar…`; `css::R30: cada tono semántico fija --tone y --tone-bg…` |
| R31 | `ui::R31: «Actualizar» es un botón secundario…`; `ui::R31: DataTable usa table, row, columnheader y cell explícitos…`; `ui::R31: el encabezado de la acción está visualmente oculto…`; `css::R31` (3: movimiento solo con `no-preference`, foco visible, botón pequeño y suave) |
| R32 | `css::R32: solo unidades relativas…`; `css::R32: ningún contenedor de texto tiene altura fija ni recorta…` |
| R33 (solo el catálogo) | `router::R33: guide_queue y guide_reports son instrucciones estáticas propias…` |
| R34 | `css::R34` (5: contenedores y cortes, barra de resumen, acciones del encabezado, preregistros, tablas apiladas); `ui::R34: --cells cuenta solo los indicadores que se pintan…`; `ui::R34: la tabla simple (por sede)…` |
| R35 | `css::R35: columnas con minmax(0, …), contenedores con min-width: 0 y sin anchos fijos en px` |
| R36 (solo el movimiento de los hooks) | `hooks::R36: useEncounters, ENCOUNTERS_KEY y PAGE_SIZE viven en shared/hooks…`; `hooks::R36: invalidar ENCOUNTERS_KEY repite a la vez las listas y los conteos` |
| R37 (solo componentes) | `ui::R37: «Actualizar» no se deshabilita, marca aria-busy…`; `ui::R37: las filas con key = id conservan el nodo enfocado y su estado local…` |
| R38 | `ui::R38: la nota de actualización es texto plano…`; `css::R38: la nota de actualización es texto con un punto decorativo…`; `router::R38: dash_live lleva {seconds}…` |
| R39 (solo CSS y `banner`) | `css::R39: las reglas del marco privado…`; `ui::R39: el encabezado de página, el panel y su pie no añaden un segundo banner…` |
| R41 | `lib/datetime.test.ts::R41` (5 pruebas: hora, fecha, fecha y hora, sin segundos y `formatBogota` intacto) |

Sin prueba todavía (llegan en B y C): R1, R9 a R11, R13, R17, R26 a R28, R40, y la parte de pantalla de R12, R14 a R16, R18, R33, R36, R37 y R39.

## Pruebas existentes modificadas

Solo las que lista `design.md`: `clinicalCaptureHooks.test.tsx` (únicamente la ruta de import de `ENCOUNTERS_KEY`) y `datetime.test.ts` (se añade el bloque `describe('UI-02-web …')`; ninguna aserción de `formatBogota` ni de `formatCivilDate` cambia). `fakeApi.ts` solo gana ayudantes. Las pruebas vigiladas por el sondeo de 30 s (`routes.test.tsx` R14, `privacy.test.tsx` R24 y `f03Routes.test.tsx` R3 y R4) siguen en verde sin tocarlas, aunque `TriageTrayPage` ya sondea desde T2 (ver abajo).

## Desviaciones de la spec y de la maqueta (todas menores)

1. **`PageHeader` lleva `role="none"`**: sigue siendo `header.page-header` (D2), pero en jsdom Testing Library toma todo `header` por un `banner` y la prueba R39 de T10 espera uno solo. En un navegador un `header` dentro de `main` ya es genérico, así que `role="none"` no cambia nada para el usuario. Lo fija la prueba `R39: el encabezado de página, el panel y su pie no añaden un segundo banner…`. Por la misma razón la cabecera de `Panel` es un `div` (el diseño no fija su etiqueta); `Panel` conserva `footer.panel__foot` (en jsdom es un `contentinfo`, que nadie consulta).
2. **`SummaryFilter` recibe `error` como datos** (`{ message, onRetry, retrying? }`) y pinta el `LoadError` vigente; el diseño dice que `error` «pinta» el `LoadError`, sin fijar la forma de la prop.
3. **«Reintentar» de `PanelState` no se deshabilita** mientras repite: usa `aria-busy` (el diseño lista `retrying?` sin fijar el efecto). Con el sondeo de 30 s, un botón que se deshabilita pierde el foco (D19). El `LoadError` vigente, que sigue en las pantallas fuera de alcance y en el filtro de sedes, conserva su `disabled`.
4. **`Notice` recibe `icon` como componente** (como el resto de props `icon`) y, con él, agrupa el contenido en un `span` para que texto y enlace fluyan juntos dentro del flex del aviso.
5. **CSS respecto a la maqueta** (adaptaciones, no cambios visuales): `.table` pasa a `.data-table`; `.summary > .summary__cell:last-of-type:nth-child(odd)` pasa a `.summary__list > :last-child:nth-child(odd)` (las celdas son `li` de un `ul` con `display: contents`); los restablecimientos que la maqueta tenía en su CSS global (`margin: 0` de `h1`, `h2`, `h3`, `p`, `dl`, `dd` y `ul`, y `list-style`) van bajo `.dashboard`; `.stack` declara `grid-template-columns: minmax(0, 1fr)` (la maqueta lo dejaba implícito) para que la columna nunca crezca con el contenido (R35); la franja «pendiente» usa la frase de `common_pending` en lugar de «Llega con F-06» (desviación 2 ya aprobada en `design.md`). Las desviaciones 1, 3 a 7 de `design.md` («Referencia visual aprobada») no se tocan en esta etapa.
6. **T1: la API sintética es una copia** (`ui02-preview-api.mjs`) y no `f03-preview-api.mjs` tal cual, porque los puertos 3002 y 5176 ya los ocupaban servidores de sesiones anteriores (también 3000, 3001 y 5173; el de 5173 cuelga de un terminal del usuario y no se tocó). La copia cambia el puerto y el origen CORS (variables de entorno, 3012 y 5186), siembra más datos ficticios (tres preregistros, nueve atenciones y una tercera sede, «Sede Este», con los nombres y horas de la maqueta) y añade `POST /__reset` y `POST /__arrive`. Detalle en `docs/ui-dashboards-verification.md`.

## Para la etapa B (lo que hay que saber)

- **Sondeo ya activo en la bandeja actual**: T2 cambió `manualRefresh` por `refresh` en `TriageTrayPage.tsx`, así que hasta T7 la pantalla antigua ya se repite cada 30 s (decisión PA-3). Conserva sus botones con `disabled={isFetching}`; T7 los sustituye.
- **Hooks**: `useEncounters(filters, { refresh?, limit? })` y `useEncounterCount({ status?, siteId? })` (`shared/hooks`); ambos con la clave base `['encounters', …]`, y `ENCOUNTERS_KEY` invalida listas y conteos a la vez. Para `usePendingPreRegistrations` (T6) basta `...autoRefresh()` dentro de `useQuery` (`shared/lib/refresh`, ya incluye `retry: false`, y quita `refetchOnWindowFocus` y `refetchOnReconnect`). `indicatorOf(query)` da el estado de una celda (`loading`, `ready`, `error`, `forbidden`) y `countOf(recibidas, offset, limit)` el `{ count, capped }` de la bandeja de enfermería (`limit` = `PAGE_SIZE`).
- **Componentes** (`shared/ui`): `Panel` exige `id` (el del `h2`) y `DataTable` se nombra con `labelledBy` = ese mismo `id`. `SummaryBar` cuenta los hijos que se pintan para `--cells`. `SummaryFilter` pide el `id` del control que envuelve. `StatusBadge`, `SummaryCell` y `Notice` reciben el icono como componente de Heroicons. `DataCell` acepta `kind` (`main`, `time`, `num`, `actions`) y `label` (va a `data-label`). La insignia de identidad (icono y tono) no está en `shared/lib`: va en la tarjeta de recepción (T6): `ShieldCheckIcon` con tono `ok` y `ExclamationTriangleIcon` con tono `warn`.
- **Datos de prueba** (`src/test/fakeApi.ts`): `encountersFor(({ status, siteId }) => cuenta)` es un `Handler` que responde `min(cuenta, limit)` atenciones desde `offset` (úsalo para 0, 12, 99, 100 y 250); `encounterSummaries(n, overrides?)`, `encountersInEveryStatus` (seis estados, una NN en espera y una cancelada con motivo), `SITE_ESTE` y `publicTenantsWith(sites)`. `norm` está en `src/test/text.ts`.
- **Trampa de `renderHook` con TanStack**: la consulta solo avisa de los cambios de las propiedades que se leen durante el render (`tracked`) y `renderHook` no lee ninguna. Si una prueba espera una transición como `isFetching`, hay que leerlas todas en el render (`return { ...useEncounterCount(…) }`), como hacen `useTrackedCount` y `useTrackedList` en `encounterQueries.test.tsx`.
- **`Intl` en este Node** (22.23.1, ICU 78.2, CLDR 48.0) escribe espacios normales (U+0020) en «8:05 a. m.»; con otras versiones de ICU puede ser un espacio duro. Las pruebas usan `\s` o `norm`, nunca el espacio tecleado.
- **jsdom y `banner`**: ver la desviación 1. En la prueba R39 de T10 (con `renderApp`), el único `banner` es el del marco; ningún componente de dashboard añade otro.
- **Rutas del arnés para T13**: `capture-dashboards.mjs` y `ui02-preview-api.mjs` en `../../local-analysis/ui02-verification/` (`POST /__reset` antes de cada serie y `POST /__arrive` para la llegada nueva entre dos ciclos). Compilar el «después» con `npm run build -- --outDir <carpeta fuera del repo> --emptyOutDir` y servirlo con `vite preview` en puertos propios.

---

# Etapa B, los cuatro dashboards (T6 a T9)

Se anota tarea a tarea; la nota de cierre de la etapa (tabla R → prueba, pruebas existentes tocadas y resultado de `./init.sh`) va al final.

## T6, dashboard de recepción (hecha)

Prueba primero: `ReceptionDashboard.test.tsx` se vio fallar entera (32 de 33; solo pasaba la negativa de R26) antes de tocar el código.

- **Código**: `ReceptionPage.tsx` pasa a componer `DashboardPage`, `PageHeader` (`h1` = `common_nav_recepcion`, descripción `dash_reception_lead`, `RefreshButton` y «Registro directo» como único botón sólido), `SummaryBar` con dos `SummaryCell` («Preregistros pendientes», derivada de la longitud de la bandeja, y «En espera de triage», con `useEncounterCount({ status: 'WAITING_TRIAGE', siteId })`) y `SummaryFilter` con el selector «Sede» (el error de sedes sale en esa celda), y `Panel` con `LiveNote`, el aviso y el error huérfano de acción arriba del cuerpo, `PanelState` y la `ul.prereg-grid` (`key` = id). «Actualizar» repite la bandeja y el conteo; confirmar invalida además `ENCOUNTERS_KEY`; rechazar, solo la bandeja. `PreRegistrationCard.tsx` (tarjeta `article` con un `h3`, insignia de identidad `ShieldCheckIcon`/ok o `ExclamationTriangleIcon`/warn, datos en `dt`/`dd` contiguos dentro de `div`, casilla y botones pequeños al pie, `formatDateTimeBogota`, `CONFIRM_MESSAGES` y `REJECT_MESSAGES` con «preregistro») y `RejectForm.tsx` (`form reject`, «Confirmar rechazo» y «Volver» pequeños). `usePendingPreRegistrations.ts` usa `autoRefresh()` (`TRAY_REFRESH_MS` queda como alias de `DASHBOARD_REFRESH_MS`). Las nueve claves de «preregistro» en `messages/features/es.json` y las tres entradas de `featureMessages.ts`.
- **Pruebas nuevas** (`ReceptionDashboard.test.tsx`, 33, bajo `describe('UI-02-web dashboard de recepción')`): R3, R8, R9, R10 (2), R11, R12 (4), R19 (2), R20, R21 (4), R22 (4), R23, R24, R25 (2), R26, R28, R34, R37 (2), R38, R40 y R41. Helper nuevo `src/test/scroll.ts` (`watchScrolling`: cuenta las llamadas a `window.scrollTo`, `Element.scrollTo` y `Element.scrollIntoView`; lo reutilizan T7 a T9). Mutaciones comprobadas (11 válidas, todas detectadas; la 12.ª estaba mal formada y se descartó, y la 13.ª era un cambio de comportamiento que se revirtió, ver abajo): «Actualizar» sin repetir el conteo, confirmar sin invalidar, `key` por índice, foco y reconexión activos, `formatBogota`, punto añadido al aviso, conteo sin sede, 403 pintado como error, tono de identidad, «Registro directo» secundario y nota viva con `role`.
- **Pruebas existentes tocadas** (solo lo que lista `design.md`): `ReceptionPage.test.tsx` (handler de `GET /encounters` en `setup()`, `Preregistro`/`Expira` con `norm(formatDateTimeBogota(…))`, aviso sin punto añadido, textos y dos títulos de prueba en «preregistro»), `FeatureLocalization.test.tsx` (`R14`), `f02Transversal.test.tsx` (líneas 178 y 357 y `R38`: la lista de `/atenciones` es la última petición de atenciones, y se comprueba también que la primera es la del indicador, `limit` y `status`), `f02Routes.test.tsx` (título `Recepción`) y `routes.test.tsx` (`Recepción` en `HOME` y en `R5`). Quedan citas de «pre-registro» solo en lo que `design.md` deja fuera (`roleMatrix.ts`, `ArrivalForm`, `featureMessages.ts` para el conflicto de llegada, `/atenciones`, la landing, comentarios y datos de muestra de `problem.test.ts` y `dashboard.test.tsx`).
- **Corrección de la etapa A (visual)**: al comparar con la captura 01 de la maqueta, las tarjetas quedaban pegadas al borde del panel: `.dashboard ul` (clase y elemento) pisaba el relleno de `.prereg-grid` (una clase). El restablecimiento de listas pasa a `:where(.dashboard) ul` (especificidad cero, como el `ul` de la maqueta) en `dashboard.css`, con una prueba nueva en `dashboardStyles.test.ts` (`R34: el restablecimiento de listas no pisa el relleno…`, que falla con el CSS anterior).
- **Comprobación visual** (Chromium con el arnés, tema claro y oscuro, 375, 768 y 1440 px; fuera del repo): sin desbordamiento (`scrollWidth` = `clientWidth`), barra de resumen en tres columnas a 1440 px (dos indicadores y filtro de 304 px), dos columnas con el filtro a fila completa a 768 px y una a 375 px, tarjetas en dos columnas de la misma altura a 1440 y 768 px y en una a 375 px, nota «Se actualiza cada 30 s» a la derecha del título del panel y botones abajo. Parece la captura 01 y la 07 de la maqueta; la única diferencia visible es el marco (la cabecera aún repite la marca; es T10, etapa C).
- **Desviaciones**: ninguna respecto de la spec. Decisión menor: se conserva `items = tray.data ?? []` (como antes) para el error huérfano de acción, de modo que un fallo de refresco no cambie dónde se muestra un error de acción.

## T7, dashboard de enfermería (hecha)

Prueba primero: `TriageDashboard.test.tsx` se vio fallar (29 de 31; pasaban dos regresiones que ya cumplía la bandeja: el 403 detiene el intervalo y el foco de «Siguiente» tras un ciclo ya terminado, que se reforzó para comprobar el estado durante el refresco) antes de recomponer la pantalla.

- **Código**: `TriageTrayPage.tsx` compone `DashboardPage`, `PageHeader` (`h1` = `common_nav_triage`, descripción `clinical_tray_intro`, `RefreshButton`), `SummaryBar` con una sola celda «En espera de triage», que sale de la propia bandeja (`countOf(recibidas, offset, PAGE_SIZE)`: `offset` más las atenciones recibidas y «N+» con la página llena, sin petición adicional) y `SummaryFilter` con el selector «Sede» (el error de sedes sale en esa celda), y `Panel` «Atenciones pendientes» con `LiveNote`, `PanelState` (carga, vacío con pista y sin acción, error, 403) y una `DataTable` (Paciente con el documento solo si existe, Sede, Llegada con la hora en `<time dateTime>` y la fecha debajo, y la columna «Acción» oculta con el enlace «Capturar información clínica» como `button button--soft button--sm`, que conserva `siteId` y `offset` y se asocia a su fila con `aria-describedby`). Sin insignia de estado, sin `h3` por fila y sin el panel lateral «Espacio de enfermería». El pie, siempre presente, lleva «Página N» a la izquierda y «Anterior» y «Siguiente» (pequeños, con chevrones) a la derecha, deshabilitados solo por los datos (`offset` 0; lista sin cargar o con menos de 50 atenciones), nunca por `isFetching`. Las filas llevan `key` = id.
- **`shared/ui`**: `DataCell` recibe un `id` opcional (la celda del nombre lo necesita para el `aria-describedby` del enlace; T8 lo reutiliza en «Ver atención»), con su prueba en `dashboard.test.tsx` (`R31: DataCell acepta un id…`, que falla sin el prop).
- **Pruebas nuevas** (`TriageDashboard.test.tsx`, 31, bajo `describe('UI-02-web dashboard de enfermería')`): R2, R3, R8 (5 casos: 49, 50, 120, `offset` 50 con 57 y con 120), R13, R14 (5), R19, R20, R21 (3), R22 (2), R23, R24, R25 (2), R26, R28, R34, R37 (2), R38 y R41. Mutaciones comprobadas (todas detectadas): `isFetching` en «Siguiente» y en «Anterior», `key` por índice, cifra sin `offset`, tope `PAGE_SIZE + 1`, sin `aria-describedby`, enlace sólido, hora con `formatBogota`, sin la pista del vacío, 403 como error, sin refresco, documento inventado para un NN, pie ausente con la lista sin cargar y fecha dentro del `<time>`.
- **Pruebas existentes tocadas** (solo lo que lista `design.md`): `f03Routes.test.tsx`: `R3: paginates by 50…` (`getAllByText(norm(formatTimeBogota(…)))`) y `R21` (sin el `h2` «Espacio de enfermería»; la celda del paciente en lugar del `h3`, con los `columnheader` `Paciente`, `Sede` y `Llegada`). `R3: exposes a manual refresh…`, `R3: the tray does not refresh automatically on focus or reconnect` y `R4` siguen en verde sin cambios, y también `privacy.test.tsx` `R24`, que vigila el sondeo.
- **Comprobación visual** (Chromium con el arnés, claro y oscuro, 375, 768 y 1440 px; fuera del repo): sin desbordamiento; a 1440 px la celda del indicador ocupa el espacio restante junto al filtro de 304 px, a 768 px la celda y el filtro van cada uno en una fila completa y a 375 px la tabla se apila como tarjetas con «Sede» y «Llegada» y el botón a ancho completo; la de 768 px no se apila. Coincide con las capturas 02 y 08 de la maqueta (a 375 px el pie también envuelve «Página 1» y los botones, como en la 08).
- **Desviaciones**: ninguna respecto de la spec. Observación sin cambio: como `design.md` D6 fija `offset` más las recibidas, un `offset` fuera de rango (URL editada a mano, o una lista que se encoge mientras se está en una página alta) muestra en la celda el `offset` mientras el panel dice que no hay atenciones; es lo que pide la spec y se anota para quien la revise.

## T8, dashboard de medicina (hecha)

Prueba primero: `QueuePage.test.tsx` se vio fallar (el archivo ni siquiera resolvía `../routes`) antes de crear la pantalla.

- **Código** (feature nueva `features/queue`): `components/QueuePage.tsx` y `routes.tsx` (`queueRoutes`, que `app/router/routes.tsx` añade a `FEATURE_ROUTES` como `'/cola'`). La página compone `DashboardPage`, `PageHeader` (`h1` = `common_nav_cola`, descripción `dash_queue_lead`, `RefreshButton`), `SummaryBar` con tres `SummaryCell` (`INDICATOR_STATUSES`: «En espera de triage», «Clasificadas» y «En atención», con el icono y el tono de `ENCOUNTER_STATUS_VIEW`, una `useEncounterCount({ status })` cada una, sin sede ni filtro), `Panel` «Atenciones recientes» con `LiveNote` y una `DataTable` de `useEncounters({ status: null, siteId: null, offset: 0 }, { refresh: true, limit: RECENT_LIMIT })` (Paciente solo con el nombre, Sede, Llegada con hora y fecha sin segundos, Estado con `StatusBadge` y «Ver atención» como `button button--secondary button--sm` a `/atenciones/{id}`, asociado a su fila con `aria-describedby`), pie «Las N atenciones más recientes» o «La atención más reciente» y el enlace «Ver todas las atenciones» (solo con filas; en carga, vacío, error y 403 no hay pie), y `PendingStrip` de F-06. «Actualizar» invalida `ENCOUNTERS_KEY` (repite las cuatro lecturas, también una que haya parado por un 403) y marca `aria-busy` con `useIsFetching`, sin deshabilitarse. Es el mismo dashboard para PHYSICIAN, NURSE y ADMIN.
- **Pruebas nuevas** (`QueuePage.test.tsx`, 38, bajo `describe('UI-02-web dashboard de medicina')`): R2, R3, R8, R15 (2), R16 (11: orden y sin documento, seis insignias por estado, hora y fecha, pie con 6, 8 y 1 filas, y el enlace de pie), R18, R19, R20, R21 (3), R22 (4), R23, R24, R25 (2), R26, R28 (PHYSICIAN, NURSE y ADMIN), R34, R37, R38 y R41. Mutaciones comprobadas (14, todas detectadas): `busy` fijo, «Actualizar» solo con la lista, documento visible, pie siempre en plural, sin insignia, «Ver atención» suave, `RECENT_LIMIT` distinto, 403 como error, `key` por índice, pie durante la carga, sin franja, botón en la franja, etiqueta de celda cambiada y `siteId` en un conteo.
- **Pruebas existentes tocadas** (solo lo que lista `design.md`): `routes.test.tsx` `R23: el marcador del inicio de %s…` se acota a ADMIN (PHYSICIAN ya tiene dashboard; `/reportes` sigue siendo marcador hasta T9). Con `/cola` real siguen en verde sin cambios las pruebas vigiladas por el sondeo: `routes.test.tsx` `R14` (8 h simuladas con `/cola` abierto) y `privacy.test.tsx` `R24` (con `/cola` tras el login), `AppShell.test.tsx` y las `R5` de ruta de origen.
- **Comprobación visual** (Chromium con el arnés, claro y oscuro, 375, 768 y 1440 px; fuera del repo): sin desbordamiento; tres columnas de celdas a 1440 px, dos con la última a fila completa a 768 px y una a 375 px; la tabla no se apila a 768 px y a 375 px se apila con «Sede», «Llegada» y «Estado» y el botón a ancho completo; la franja discontinua con la insignia y la frase de F-06. Coincide con las capturas 03 de la maqueta (y con su comportamiento estrecho).
- **Desviaciones**: ninguna respecto de la spec. Detalle de la prueba de R18: la franja dice «Aquí aparecerá la cola priorizada por nivel de triage y tiempo de espera…», así que la prueba no prohíbe esas palabras sino cualquier dato (ninguna cifra salvo «F-06», ningún control, imagen ni gráfico), y la de R26 prohíbe niveles concretos («Nivel 1», «ESI 2») y prioridades, no la palabra «nivel».

## T9, dashboard de administración (hecha)

Prueba primero: `ReportsPage.test.tsx` se escribió antes que el código, pero no se ejecutó en rojo antes de crear los archivos (el único fallo posible era el módulo `../routes` ausente, como en T8); en su lugar se comprobó con 16 mutaciones que cada grupo de pruebas detecta su regresión. La prueba de la regla CSS nueva sí se vio fallar antes de añadirla.

- **Código** (feature nueva `features/reports`): `components/ReportsPage.tsx`, `components/SiteCountTable.tsx` y `routes.tsx` (`reportRoutes`, que `app/router/routes.tsx` añade a `FEATURE_ROUTES` como `'/reportes'`). La página compone `DashboardPage`, `PageHeader` (`h1` = `common_nav_reportes`, descripción `dash_reports_lead`, `RefreshButton`), la misma `SummaryBar` de tres celdas por estado que medicina (tres `useEncounterCount`, sin sede ni filtro), `Panel` «Atenciones por sede» con `LiveNote` y la franja `PendingStrip` de F-07. El panel resuelve las sedes con `useSites` (carga: «Cargando las sedes…»; vacío: «El tenant no tiene sedes registradas.»; error con su «Reintentar», que repite solo las sedes; 403) y, con sedes, pinta `SiteCountTable`: `DataTable simple` (Sede y «En espera de triage» con la cifra a la derecha) con una `SiteRow` por sede (`key` = id) que llama a su propia `useEncounterCount({ status: 'WAITING_TRIAGE', siteId })`, así que cada fila resuelve sola la carga (esqueleto con `aria-busy` y texto oculto), la cifra («N+» con «Al menos N» oculto), el error («No se pudo cargar» y «Reintentar: {sede}») y el 403 («Sin permiso»), con `StatusBadge` de tono `error` (icono y texto) y sin regiones vivas. Pie «N sedes» («1 sede» con una) y el enlace «Ver todas las atenciones» solo con sedes. «Actualizar» invalida `ENCOUNTERS_KEY` (repite los 3 + S conteos; no las sedes, que solo repite su «Reintentar») y marca `aria-busy` con `useIsFetching`.
- **CSS**: una sola regla nueva, `.data-table td.num .skeleton` (3 rem por 1.25 rem, en `dashboard.css`), porque el esqueleto de 3.5 rem de un panel no cabe en una fila; con su prueba en `dashboardStyles.test.ts` (`R19: la cifra de una fila de la tabla de sedes tiene su propio esqueleto…`). El estado de error y de «sin permiso» de la fila reutiliza `.badge` y el botón pequeño ya existentes.
- **Pruebas nuevas** (`ReportsPage.test.tsx`, 29, bajo `describe('UI-02-web dashboard de administración')`): R2, R3, R7 (una petición por indicador y por sede; la caché de los seis conteos guarda solo `{ count, capped }`), R8 (0, 99 y 100), R15, R17 (3: tabla simple, pie con 3 y con 1 sede), R18, R19 (2), R20, R21 (4), R22 (4), R23, R24 (3 + S = 6 peticiones por ciclo y por «Actualizar»; las sedes no), R25 (2), R26, R28, R34, R37 y R38. Mutaciones comprobadas (16, todas detectadas): estado o sede equivocados en la fila, pie siempre en plural, sin «+», botón de fila sin nombre propio, 403 de fila o de sedes como error, tabla apilada, «Actualizar» inerte o que invalida todo (repetiría las sedes), enlace de pie, vacío sin icono, `aria-busy` y texto oculto de la fila, `busy` fijo y franja con enlace.
- **Pruebas existentes tocadas** (solo lo que lista `design.md`): `routes.test.tsx` elimina `R23: el marcador del inicio de %s…` (ya no queda ningún marcador). El campo `feature` de la constante `HOME` de ese archivo queda sin lector (limpieza para T12). Las aserciones `queryByText(/Esta funcionalidad llega en/)` de `R18` y `R19` se conservan: siguen siendo ciertas para las rutas prohibidas.
- **Comprobación visual** (Chromium con el arnés, claro y oscuro, 375, 768 y 1440 px, y los estados por fila con peticiones interceptadas; fuera del repo): sin desbordamiento; tres celdas, tabla simple con la cifra a la derecha (no se apila ni a 375 px), pie «3 sedes» y franja discontinua de F-07 como en la captura 04 de la maqueta; «100+», «Sin permiso», «No se pudo cargar» con «Reintentar» y el esqueleto de una fila se ven bien y la fila cargando mide lo mismo que las cargadas (sin salto de maquetación). A 375 px el nombre de una sede con error envuelve en dos líneas porque la insignia y el botón no se parten; no desborda.
- **Desviaciones**: ninguna respecto de la spec. Decisión menor: el 403 de las sedes (`GET /public/tenants` es público y no debería darse) se muestra como el resto de paneles, con `PanelState forbidden` («No tienes permiso para ver esta página.»), porque la matriz solo nombra «Sin permiso» para las celdas y las filas.

---

# Etapa B, nota de cierre (T6 a T9)

Fecha: 2026-10-29, America/Bogota. Rol `implementer`. T6, T7, T8 y T9 hechas y marcadas `[x]` en `specs/UI-02-web/tasks.md`, en orden y con la prueba `R<n>:` escrita primero (ver la salvedad de T9). Contrato 0.4.0 sin cambios, `package.json` y `package-lock.json` intactos, sin `console`, sin TODOs, sin colores literales en el CSS nuevo, sin archivos temporales dentro del repo, sin imports entre features y sin procesos en marcha. No se tocó `feature_list.json`, `docs/ui-dashboards.md`, `requirements.md` ni `design.md`, ni nada de `../asclepio-api/`. La feature sigue `in_progress`: la etapa C (T10 a T14) y la revisión independiente están pendientes.

## Resultado

| Comprobación | Resultado |
| --- | --- |
| `./init.sh` completo | VERDE, FAIL 0, WARN 0 (lint, typecheck y pruebas); log en `../../local-analysis/ui02-verification/init-etapa-b.log` |
| `npm test` | 42 archivos y **654 pruebas** en verde (etapa A: 38 y 522; +4 archivos y +132 pruebas netas: 134 nuevas y 2 retiradas). La suite completa se ejecutó tras cada tarea y al cierre, siempre en verde |
| `npm run i18n:check` | Correcto (salida 0). La etapa B no añade claves: solo cambia el texto español de nueve claves de `features` |
| `npm run build` | Correcto (1368 módulos) |
| Lint y typecheck | Sin errores ni avisos |
| Mutaciones | 11 (T6), 14 (T7), 14 (T8) y 16 (T9) mutaciones válidas del código o del CSS; todas las detecta alguna prueba y el código se restauró idéntico (scripts fuera del repo) |
| Comprobación visual | Chromium con el arnés de la etapa A, los cuatro dashboards en claro y oscuro a 375, 768 y 1440 px y los estados por fila de `/reportes` con peticiones interceptadas: sin desbordamiento (`scrollWidth` = `clientWidth`) y con el aspecto de las capturas 01 a 04, 07 y 08 de la maqueta. La evidencia formal (T13) sigue pendiente |

## Commits (a petición expresa del usuario, a mitad de la sesión)

El usuario escribió en el chat «No olvides estar haciendo commits siguiendo los conventional commits de manera constante», lo que sustituye la regla inicial de «no hacer commit» (que venía del `leader`). Se creó la rama `feat/ui-02-web-dashboards` desde `main` (`7043fc1`), con Conventional Commits, `Refs: UI-02-web` y la atribución, sin `push`, sin `stash` y sin `reset`. Como el árbol de partida tenía sin confirmar la spec del `leader` y toda la etapa A, esas piezas se confirmaron primero por temas (los archivos que mezclaban etapa A con cambios de B se confirmaron en su estado de la etapa A, y se comprobó en un `worktree` temporal que ese árbol pasa la suite de la etapa A; su única falla allí, `clinicalSchemas.test.ts`, lee `../asclepio-api` y ese directorio no existe fuera del repo):

| Commit | Contenido |
| --- | --- |
| `1887307` `docs(ui-02): specify the role dashboards redesign` | brief, requisitos, diseño, tareas, nota viva y `feature_list.json` del `leader` |
| `684718f` `docs(ui-02): add the "before" evidence…` | T1 |
| `c748122` `feat(shared): add encounter counts, the refresh policy…` | T2 |
| `668f345` `feat(i18n): add the dashboard messages in five languages` | T3 |
| `41759d2` `feat(ui): add the dashboard stylesheet and the shared dashboard components` | T4 y T5 |
| `d5accac` `docs(ui-02): record the shared base stage (T1 to T5)` | nota de la etapa A |
| `3015f49` `fix(ui): keep the padding of the preregistration grid over the list reset` | corrección de la etapa A hallada en T6 |
| `d6c49f8` `feat(reception): rebuild the reception page as a dashboard` | T6 |
| `1d2c282` `feat(ui): let table cells carry an id` | `DataCell` con `id` (T7 y T8) |
| `2dc513e` `feat(triage): rebuild the nursing tray as a dashboard` | T7 |
| `a511d9b` `feat(queue): add the medicine dashboard` | T8 |
| `7b662e8` `feat(ui): size the loading skeleton of a table figure` | regla CSS de T9 |
| `fa1945b` `feat(reports): add the administration dashboard` | T9 |

Esta nota de cierre se confirma aparte (`docs(ui-02): record the stage B closing note`).

## Archivos

### Creados

- `src/features/reception/components/ReceptionDashboard.test.tsx`, `src/features/triage/components/TriageDashboard.test.tsx`, `src/features/queue/components/QueuePage.test.tsx` y `src/features/reports/components/ReportsPage.test.tsx`.
- `src/features/queue/components/QueuePage.tsx` y `routes.tsx` (`queueRoutes`); `src/features/reports/components/ReportsPage.tsx`, `SiteCountTable.tsx` y `routes.tsx` (`reportRoutes`).
- `src/test/scroll.ts` (`watchScrolling`: cuenta las llamadas a `window.scrollTo`, `Element.scrollTo` y `Element.scrollIntoView`; lo usa R37 en los cuatro dashboards).

### Tocados

- `src/features/reception/`: `components/ReceptionPage.tsx`, `PreRegistrationCard.tsx`, `RejectForm.tsx` y `hooks/usePendingPreRegistrations.ts` (`autoRefresh()`).
- `src/features/triage/components/TriageTrayPage.tsx`.
- `src/app/router/routes.tsx` (`'/cola'` y `'/reportes'` en `FEATURE_ROUTES`).
- `src/shared/ui/DataTable.tsx` (`DataCell` con `id` opcional) y `src/shared/ui/dashboard.css` (dos cambios: el restablecimiento de listas pasa a `:where(.dashboard) ul`, y la regla `.data-table td.num .skeleton`).
- `src/shared/lib/featureMessages.ts` (tres entradas) y `messages/features/es.json` (nueve claves).
- `specs/UI-02-web/tasks.md` (T6 a T9 en `[x]`).
- Pruebas existentes (tabla más abajo) y las de la etapa A que ganan una prueba: `src/shared/ui/dashboard.test.tsx` (+1) y `src/shared/ui/dashboardStyles.test.ts` (+2).

### Fuera del repo (`../../local-analysis/ui02-verification/`)

`capture-etapa-b.mjs` (captura un dashboard a varios anchos y temas y vuelca columnas, alturas y apilado), `states-admin.mjs` (estados por fila de `/reportes` con peticiones interceptadas), `dist-etapa-b/` (build «después» de esta etapa) e `init-etapa-b.log`. Reutilizables en T13 (`POST /__reset` antes de cada serie; compilar con `VITE_API_URL=http://127.0.0.1:3012 npm run build -- --outDir <carpeta fuera del repo> --emptyOutDir` y servir con `vite preview` en el puerto 5186).

## Trazabilidad R → `archivo::prueba` (solo lo hecho en la etapa B)

Abreviaturas: `rec` = `src/features/reception/components/ReceptionDashboard.test.tsx`; `enf` = `src/features/triage/components/TriageDashboard.test.tsx`; `med` = `src/features/queue/components/QueuePage.test.tsx`; `adm` = `src/features/reports/components/ReportsPage.test.tsx`; `css` = `src/shared/ui/dashboardStyles.test.ts`; `ui` = `src/shared/ui/dashboard.test.tsx`. Todas viven bajo `describe('UI-02-web …')`; los nombres se citan por su inicio.

| R | Pruebas |
| --- | --- |
| R2 | `rec::R3: encabezado con un h1 y su descripción…` y `rec::R11…`; `enf::R2: «Actualizar» es la única acción…`; `med::R2…`; `adm::R2…` |
| R3 | `rec::R3: encabezado con un h1…`; `enf::R3…`; `med::R3…` (con la franja); `adm::R3…` (con la franja) |
| R7 | `adm::R7: una petición por indicador y una por sede…` (la caché de los seis conteos guarda solo `{ count, capped }`); `rec::R9…` y `med::R15…` (una petición por indicador) |
| R8 | `rec::R8: con 100 atenciones en espera…`; `enf::R8: con offset %i y %i atenciones…` (5); `med::R8…`; `adm::R8: con 0, 99 y 100 atenciones…` |
| R9 | `rec::R9: «Preregistros pendientes» sale de la bandeja…` |
| R10 | `rec::R10: cada preregistro es un article…`; `rec::R10: un paciente sin documento omite «Documento»…` |
| R11 | `rec::R11: «Registro directo» es el único botón sólido…` |
| R12 | `rec::R12: confirmar envía { identityVerified: true }…`; `rec::R12: rechazar abre el formulario dentro de la tarjeta…`; `rec::R12: con %i el error de acción queda en contexto…` (409 y 404) |
| R13 | `enf::R13: la cifra sale de la propia bandeja, sin petición adicional, y sigue la sede` |
| R14 | `enf::R14: la tabla tiene Paciente, Sede y Llegada…`; `enf::R14: la sede y la página viven en la URL…`; `enf::R14: el pie lleva «Página N»…`; `enf::R14: «Anterior» y «Siguiente» se deshabilitan solo por los datos…`; `enf::R14: sin página anterior «Anterior» está deshabilitado y con 50 atenciones…` |
| R15 | `med::R15: tres indicadores, uno por estado…`; `med::R15: cada celda lleva el icono y el tono de su estado`; `adm::R15…` |
| R16 | `med::R16: pide las 8 atenciones más recientes sin filtros…`; `med::R16: la fila %s lleva una insignia…` (seis estados); `med::R16: cada fila muestra la sede y la llegada…`; `med::R16: el pie dice «Las 6 atenciones más recientes»…`; `med::R16: con %i filas el pie dice «%s»` (8 y 1) |
| R17 | `adm::R17: tabla simple con Sede y «En espera de triage»…`; `adm::R17: con %i sedes el pie dice «%s»…` (3 y 1) |
| R18 | `med::R18: nombra la funcionalidad de F-06…`; `adm::R18: nombra la funcionalidad de F-07…` |
| R19 | `rec::R19` (2); `enf::R19…`; `med::R19…`; `adm::R19: mientras cargan las sedes…` y `adm::R19: cada fila carga por separado…`; `css::R19: la cifra de una fila de la tabla de sedes tiene su propio esqueleto…` |
| R20 | `rec::R20…`; `enf::R20…`; `med::R20…`; `adm::R20: sin sedes muestra el vacío…` |
| R21 | `rec::R21: si falla la bandeja…`, `…el indicador de espera…`, `…si fallan las sedes…` y `…un refresco fallido…`; `enf::R21` (bandeja, sedes y refresco fallido); `med::R21` (indicador, lista y refresco fallido); `adm::R21` (indicador, sedes, fila y refresco fallido de una sede) |
| R22 | `rec::R22` (403 de la bandeja, del indicador y los dos intervalos); `enf::R22` (403 y su intervalo); `med::R22` (indicador, lista y los dos intervalos); `adm::R22` (indicador, sedes, fila y el intervalo de una sede) |
| R23 | `rec::R23: durante un refresco se conservan…`; `enf::R23…`; `med::R23…`; `adm::R23…` |
| R24 | `rec::R24: cada 30 s…` (bandeja e indicador, «Actualizar» repite ambos); `enf::R24…` (una petición por ciclo y por «Actualizar»); `med::R24…` (cuatro); `adm::R24…` (3 + S; las sedes no) |
| R25 | en los cuatro: `R25: ni el foco de la ventana ni la reconexión repiten…` y `R25: con la pestaña oculta no se repite ninguna petición` |
| R26 | `rec::R26…`; `enf::R26…` (documento solo si existe); `med::R26…` (nunca el documento); `adm::R26…` (ningún dato de pacientes) |
| R28 | `rec::R28…`; `enf::R28…`; `med::R28: %s ve el mismo dashboard…` (PHYSICIAN, NURSE y ADMIN); `adm::R28…` |
| R31 | `ui::R31: DataCell acepta un id para que el control de la fila lo use en aria-describedby` (junto a `aria-describedby` de `enf::R14` y `med::R16`) |
| R34 | `rec::R34`, `enf::R34`, `med::R34` y `adm::R34` (`--cells` = 2, 1, 3 y 3); `css::R34: el restablecimiento de listas no pisa el relleno…` |
| R37 | `rec::R37` (2: nodos, casilla y motivo escrito con una llegada nueva; «Actualizar» conserva el foco); `enf::R37` (2: enlace de captura enfocado con una llegada que reordena, y «Siguiente»); `med::R37…`; `adm::R37…` |
| R38 | `rec::R38`, `enf::R38`, `med::R38` y `adm::R38` |
| R40 | `rec::R40: los textos de la pantalla usan «preregistro»…` |
| R41 | `rec::R41…`; `enf::R41…`; `med::R41…` (la hora y la fecha de la llegada en Bogotá, con `04:30Z` que cruza la medianoche) |

Sin prueba todavía (llegan en la etapa C): R1, R27, R33 (guías) y R39, y las transversales de R2, R28, R29 (claves retiradas), R36 y R40 (T10 a T14).

## Pruebas existentes modificadas

Solo las que lista `design.md` («Pruebas existentes que cambian») para estas cuatro pantallas, más una prueba añadida a cada uno de dos archivos de la etapa A:

| Archivo | Cambio | Motivo |
| --- | --- | --- |
| `ReceptionPage.test.tsx` | handler de `GET /encounters` en `setup()`; `Preregistro` y `Expira` con `norm(formatDateTimeBogota(…))`; aviso sin punto añadido; textos de `R8`, `R12`, `R13` y `R16` y dos títulos de prueba en «preregistro» | D27, D28 y D29; el dashboard pide el indicador de espera |
| `FeatureLocalization.test.tsx` | texto español del conflicto de `R14` | D27 |
| `f02Transversal.test.tsx` | líneas 178 y 357; `R38`: la lista de `/atenciones` es la última petición de atenciones (y se comprueba que la primera es la del indicador) | D27, D28 y el indicador de recepción |
| `f02Routes.test.tsx` y `routes.test.tsx` | título `Recepción` (`PAGES[0]`, `HOME.RECEPTION.title` y `R5`) | D3 |
| `routes.test.tsx` | `R23: el marcador del inicio de %s…` se acota a ADMIN (T8) y se elimina (T9) | D13 |
| `f03Routes.test.tsx` | `R3: paginates by 50…` (`norm(formatTimeBogota(…))`) y `R21` (sin el `h2` «Espacio de enfermería»; la celda del paciente en lugar del `h3`, con los `columnheader`) | D15, D28 y D30 |

Sin cambio y en verde, las vigiladas por el sondeo de 30 s: `routes.test.tsx` `R14`, `privacy.test.tsx` `R24`, `ReceptionPage.test.tsx` `R9` y, en `f03Routes.test.tsx`, las dos `R3` del refresco y `R4`. Sin cambio también `featureMessages.test.ts`, `uiFoundation.test.tsx`, `AppShell.test.tsx`, `VoiceGuide.test.tsx` y las pruebas de las pantallas fuera de alcance.

## Desviaciones y decisiones (ninguna contradice la spec)

1. **T9, la prueba no se vio en rojo.** `ReportsPage.test.tsx` se escribió antes que el código, pero no se ejecutó antes de crear los archivos (el único fallo posible era el módulo ausente); se comprobó con 16 mutaciones. La prueba de la regla CSS de T9 sí se vio fallar antes de la regla.
2. **`DataCell` recibe un `id` opcional** (`shared/ui/DataTable.tsx`): el `aria-describedby` del enlace «Capturar información clínica» y de «Ver atención» apunta a la celda del nombre (sección de accesibilidad del diseño) y el componente de la etapa A no podía darle `id`. Cambio compatible, con su prueba.
3. **Corrección de la etapa A en `dashboard.css`:** `.dashboard ul` (clase y elemento) pisaba el relleno de `.prereg-grid` y las tarjetas de preregistro quedaban pegadas al borde del panel (distinto de la captura 01). El restablecimiento de listas pasa a `:where(.dashboard) ul`, con una prueba que falla con el selector anterior.
4. **Una regla CSS nueva** (`.data-table td.num .skeleton`, 3 rem por 1.25 rem) porque la cifra de una fila de sedes carga sola y el esqueleto de panel no cabe en una fila. El error y el «sin permiso» de una fila reutilizan `StatusBadge` (tono `error`) y el botón pequeño existentes, sin clases nuevas.
5. **Pie de la bandeja de enfermería siempre presente** (también cargando, vacía o con error), con «Anterior» y «Siguiente» deshabilitados solo por los datos: es lo que dice D19 («lista aún no cargada») y evita saltos de maquetación. En medicina y administración el pie solo existe con filas o sedes, como en la maqueta y en la matriz de estados.
6. **403 de las sedes en `/reportes`:** se pinta como el de los demás paneles (`PanelState forbidden`, «No tienes permiso para ver esta página.»); la matriz solo nombra «Sin permiso» para celdas y filas, y `GET /public/tenants` es público, así que no debería darse.
7. **R26 en `/cola` y `/reportes`:** la franja «pendiente» dice «…por nivel de triage y tiempo de espera…» como texto de lo que traerá, así que las pruebas no prohíben esas palabras: prohíben datos (cifras, niveles concretos como «Nivel 1» o «ESI 2», prioridades, controles, imágenes y gráficos).
8. **`items = tray.data ?? []` en recepción** se conserva como antes para el error huérfano de acción.

## Observaciones para quien revise (sin cambio de código)

- **Un `offset` fuera de rango en `/triage`** (URL editada a mano, o una lista que se encoge mientras se está en una página alta) muestra en la celda el `offset` (D6: `offset` más las recibidas) mientras el panel dice que no hay atenciones. Es lo que fija la spec.
- **Reintentar tras un primer fallo.** TanStack vuelve a `pending` una consulta que nunca tuvo datos, así que «Reintentar» de un panel, una celda o una fila cuyo primer pedido falló pasa por el estado de carga (el botón se sustituye y pierde el foco); con datos previos el error se mantiene mientras repite (comprobado con `QueryObserver`). Es coherente con R19 y R23 (que hablan de paneles «con datos»).
- **Filas de sedes con error a 375 px:** la insignia y el botón no se parten y el nombre de la sede envuelve en dos líneas; no hay desbordamiento.
- **Restos para la etapa C:** `PlaceholderPage` sigue importado como respaldo en `routes.tsx` (ya sin uso, T11); el campo `feature` de la constante `HOME` de `routes.test.tsx` quedó sin lector (T12); las claves `feature_reception_title`, `clinical_workspace`, `clinical_workflow_title`, `clinical_workflow_body` y `clinical_waiting_only` y las clases `.clinical-board`, `.clinical-tray`, `.pre-registration`, `.cards` y compañía siguen sin uso (T14); la cabecera del marco todavía repite la marca «Asclepio» en las capturas (T10); `guide_reception`, `clinical_guide_tray` y la guía de `/cola` y `/reportes` conservan su texto (T11).

---

# Etapa C1, marco, rutas y transversales (T10 a T12)

Fecha: 2026-10-29, America/Bogota. Rol `implementer`. Parte de `feat/ui-02-web-dashboards` en `194cba0` (etapas A y B verificadas por el `leader`; línea base: 42 archivos y 654 pruebas en verde). Esta sección se anota tarea a tarea; la nota de cierre (resultado de `./init.sh`, commits y observaciones) va al final. T13 (verificación visual) y T14 (limpieza y cierre) no son de esta sesión.

## T10, marco privado y marca única (hecha)

Prueba primero: las cinco pruebas de R39 sobre el marco privado se vieron fallar (`expected [ Array(2) ] to have a length of 1 but got 2`: la marca salía en la cabecera y en la barra lateral) antes de tocar el código. Las tres de las pantallas públicas (`/`, `/login`, `/estado`) son de conservación y pasaban antes y después, así que se comprobaron con mutaciones.

- **Código**: `routes.tsx` declara `handle: { privateFrame: true } satisfies FrameHandle` en la ruta del `AppShell`. `Layout.tsx` exporta `FrameHandle`, lee `useMatches()` y, si alguna coincidencia lo declara, no pinta el `Link` con `Brand` y suma la clase `layout--private` (las reglas CSS ya existían desde T4). Sin `handle`, `Layout` no cambia (`/`, `/login`, `/estado` y cualquier ruta pública).
- **Pruebas nuevas** (`src/app/router/dashboards.test.tsx`, bajo `describe('UI-02-web marco privado y marca única')`, 8): por cada rol, en su dashboard, `getAllByText('Asclepio')` tiene un solo elemento dentro de la región «Sesión», hay un solo logotipo (`img` de la marca) y también está en la barra lateral, no hay enlace «Asclepio», el `banner` tiene «Cambiar tema», el selector de idioma y «Preferencias» y no tiene la marca, y la raíz lleva `layout--private` (4); `/atenciones` y la vista «Sin permiso» muestran la marca una sola vez (1); `/`, `/login` y `/estado` conservan el enlace «Asclepio» a `/` dentro de `header.layout__header`, sin `layout--private` (3). La sección también crea los ayudantes del archivo para T11 y T12 (`DASHBOARDS`, `dashboardApi`) y un `afterEach` que limpia temporizadores, red simulada y sesión.
- **Mutaciones** (todas detectadas; los archivos se restauraron idénticos): la marca nunca se pinta (fallan las tres públicas), la marca siempre se pinta (fallan las cinco del marco privado), sin la clase `layout--private` (fallan las cuatro por rol) y la ruta del `AppShell` sin `handle` (fallan las cinco).
- **Búsquedas pedidas**: ninguna prueba monta `Layout` con `MemoryRouter` (`grep` de `MemoryRouter` en `src`: solo `FeatureLocalization.test.tsx`, que monta `ReceptionPage`, no `Layout`; `Layout` solo se importa en `routes.tsx`) y ningún componente de dashboard usa `useMatches`, `useNavigation` ni `useLoaderData`. `uiFoundation.test.tsx` `R1`, `AppShell.test.tsx`, `routes.test.tsx` y `privacy.test.tsx` siguen en verde sin cambios (4 archivos, 53 pruebas).
- **Suite completa**: 42 archivos y 662 pruebas en verde (+8); lint y typecheck sin errores.
- **Desviaciones**: ninguna respecto de la spec. Observación: el `handle` está en la ruta del `AppShell`, así que todas las pantallas privadas (también `/atenciones`, `/triage/:id` y `/recepcion/registro`) pierden la marca de la cabecera y conservan la de la barra lateral; es lo que dice UI-02.AC11 («el marco privado muestra la marca una sola vez») y lo cubre la prueba de `/atenciones`. El caso aceptado de `design.md` (mientras `RequireSession` muestra la carga o el error del perfil la cabecera ya no tiene marca) no se prueba: es transitorio y está documentado en D26.

## T11, rutas, guía de voz y retirada de `PlaceholderPage` (hecha)

Se hizo en dos pasos con su propio commit: primero la guía de voz (R33) y después las rutas y la retirada de `PlaceholderPage` (R1, R2, R28).

### Paso 1, guía de voz (hecho)

Prueba primero: las 16 pruebas de R33 se vieron fallar antes del código (`/cola` y `/reportes` narraban `guide_pending`: «Esta funcionalidad está pendiente…»; `guide_reception` y `clinical_guide_tray` no mencionaban indicadores ni la actualización automática y no nombraban «Actualizar»).

- **Código**: `Layout.tsx` añade las dos ramas de `guideKey` antes del respaldo (`/cola` → `guide_queue`, `/reportes` → `guide_reports`; NURSE y ADMIN en `/cola` oyen `guide_queue`). El texto de `guide_reception` (common) y de `clinical_guide_tray` (features) cambia en los cinco catálogos: en español, el de `design.md` tal cual; en inglés, portugués, francés y alemán, la traducción con la misma estructura (indicadores, «se actualiza sola», «Actualizar» consulta al instante) y las mismas frases de actualización que ya usan `guide_queue` y `guide_reports`. `VoiceGuide` no cambia. `npm run i18n:check` correcto.
- **Pruebas nuevas** (`dashboards.test.tsx`, bajo `describe('UI-02-web guía de voz de los dashboards')`, 16): en los cinco idiomas, las cuatro guías (`guide_reception`, `clinical_guide_tray`, `guide_queue`, `guide_reports`) no llevan parámetros ni cifras, nombran el botón «Actualizar» de su idioma y no son la de «pendiente», y las de recepción y enfermería mencionan sus indicadores (5); en español, el texto exacto de `design.md` de las dos que cambian (1); con la aplicación completa y un doble de `speechSynthesis` (como en F-03 R24), la narración de cada dashboard es exactamente la guía propia de su pantalla, sin cifras, sin datos de pacientes (nombre, documento, motivo, «Paciente ficticio») ni el texto de «pendiente», con «se actualiza sola» y «Actualizar» (6: RECEPTION en `/recepcion`, NURSE en `/triage`, PHYSICIAN, NURSE y ADMIN en `/cola` y ADMIN en `/reportes`), y las guías de `/cola` y `/reportes` se narran en el idioma elegido (4: en, pt, fr y de).
- **Mutaciones** (todas detectadas; `Layout.tsx` se restauró idéntico): `/reportes` cae en `guide_pending` (fallan 5), `/cola` usa la guía de reportes (fallan 7) y `/recepcion` usa la de enfermería (falla 1).
- **Terminología de las guías**: en portugués y francés las guías ya decían «pré-cadastros» y «pré-enregistrements» (la etiqueta de la pantalla dice «Pré-registros» y «Préinscriptions»); las frases nuevas siguen el vocabulario de su propia guía para no mezclarlo dentro del mismo texto, y no se unifica con la etiqueta (R40 pide conservar la terminología de los otros idiomas). Es una diferencia anterior a este slice.
- **Suite completa**: 42 archivos y 678 pruebas en verde (+16); lint, typecheck e `i18n:check` sin errores.

### Paso 2, rutas, h1 y retirada de `PlaceholderPage` (hecho)

Prueba primero: de las 40 pruebas nuevas solo se vio fallar la del retiro (`R1: PlaceholderPage ya no existe…`, que comprueba que el archivo no existe y que ningún código de `src` lo cita). Las otras 39 describen comportamiento que la etapa B ya entregó (aterrizaje por rol, `h1`, matriz de peticiones, rutas prohibidas), así que pasaban desde el principio y se comprobaron con 6 mutaciones, todas detectadas (el código se restauró idéntico): `/cola` sin pantalla (sin `queueRoutes`: fallan 11), `RequireRole` que deja pasar a todos (fallan 10), la matriz que deja a NURSE en `/recepcion` (falla 1; las demás pasan porque `ROUTE_CASES` se deriva de la propia matriz), `/cola` con el `h1` de `/reportes` (fallan 7), `/cola` que pide las sedes (fallan 3) y un segundo `h1` en `PageHeader` (fallan 25).

- **Código**: se elimina `src/shared/ui/PlaceholderPage.tsx` (no tenía prueba propia; la de `routes.test.tsx` se retiró en T9) y `routes.tsx` deja de importarlo: el respaldo `?? [PlaceholderPage]` pasa a `?? []`, solo por tipos, con el comentario de `FEATURE_ROUTES` actualizado (todas las rutas de la matriz tienen pantalla). Los campos `title` y `feature` de `RoleRoute` y la clase `.pending-badge` no se tocan (UI-02.AC1 congela la matriz; las clases se retiran en T14).
- **Pruebas nuevas** (`dashboards.test.tsx`, bajo `describe('UI-02-web rutas y permisos de los dashboards')`, 40): R1, cada rol entra por `/app` y por su ruta y aterriza en su dashboard, con la región «Indicadores» y su panel de trabajo (8); R1, PHYSICIAN, NURSE y ADMIN abren `/cola` y el `.dashboard` tiene exactamente el mismo texto con tres celdas (1); R2, un único `h1` con el texto de su entrada de la barra lateral, un `p` de descripción debajo y las acciones en el mismo `header` («Actualizar» y, solo en recepción, «Registro directo») (4); R1, toda ruta de `ROLE_ROUTES` tiene pantalla para cada rol que puede abrirla: la ruta no se redirige y su único `h1` es el texto de su entrada de navegación (10, derivadas de la matriz; con el respaldo `?? []` una ruta sin pantalla caería en `*`); R1, `PlaceholderPage` ya no existe (1); R28, una ruta prohibida muestra «Sin permiso» y el único dato pedido es `GET /me` (10, tabla explícita igual a la de `routes.test.tsx`); R28, matriz de peticiones por rol y dashboard, con un ciclo de 30 s con temporizadores falsos: el conjunto de lecturas es exacto (p. ej. `/cola` solo `GET /me` y `GET /encounters`, sin sedes), todas son `GET`, ninguna es de detalle ni de captura clínica y los preregistros solo los pide RECEPTION (6).
- **Prueba existente tocada** (`routes.test.tsx`): se quita el campo `feature` de la constante `HOME`, que no tenía lector desde que T9 eliminó `R23: el marcador del inicio de %s…` (limpieza que dejó anotada la etapa B para T12; encaja en «`routes.test.tsx` ya no cita marcadores»). No cambia ninguna aserción. Se conservan las dos `queryByText(/Esta funcionalidad llega en/)` de `R18` y `R19`, que siguen siendo ciertas para rutas prohibidas y para quien no ha iniciado sesión (la frase ya solo la pintan las franjas «pendiente» de `/cola` y `/reportes`).
- **Búsquedas**: `grep -rn PlaceholderPage src` solo encuentra la propia prueba de retiro; `grep -n -i "marcador\|feature\|placeholder" src/app/router/routes.test.tsx` no encuentra nada.
- **Suite completa**: 42 archivos y 718 pruebas en verde (+40); lint y typecheck sin errores.

## T12, transversales y auditoría de pruebas existentes (hecha)

Prueba primero, con una salvedad: las 24 pruebas nuevas describen comportamiento que la etapa B y T10 y T11 ya entregaron (privacidad, arquitectura, escritura), así que **no se pudieron ver en rojo**; se compensó con 22 mutaciones del código, de los catálogos o de los archivos generados, todas detectadas (los archivos se restauraron idénticos y `git status` solo mostró el archivo de pruebas). El texto de cada mutación está en la tabla de abajo.

- **Pruebas nuevas** (`dashboards.test.tsx`, 24, en tres bloques):
  - **R27**, `describe('UI-02-web privacidad de los dashboards')` (4, una por dashboard, con temporizadores falsos y consola, URL, `localStorage` y `sessionStorage` vigilados): RECEPTION carga, refresca con «Actualizar» y por un ciclo de 30 s, cambia de sede, rechaza un preregistro escribiendo un motivo y confirma una llegada; NURSE carga, refresca, cambia de sede y de página (`siteId` y `offset=50` en la URL con 120 atenciones); PHYSICIAN y ADMIN cargan y refrescan. Al terminar: la URL solo es la ruta del dashboard y, en `/triage`, solo `siteId` y `offset` (ni hash); ni la URL decodificada, ni la salida de la consola (`log`, `info`, `warn`, `error`, `debug` y `trace`, con `util.inspect`), ni lo guardado contienen los nombres, documentos, fechas de nacimiento (ISO y `dd/mm/aaaa`) y motivos (de consulta y de rechazo) de los datos de la prueba; `localStorage` solo tiene la clave de preferencias, con los valores por defecto, y `sessionStorage` solo la sesión, con `accessToken` y `expiresAt`. Cada escenario espera a que el dato personal esté en pantalla antes de operar, así que la ausencia en consola, URL y almacenamiento no es por no haberlo mostrado.
  - **R36**, `describe('UI-02-web arquitectura y contrato')` (3): `CONSUMED_CONTRACT` es `'0.4.0'` y `schema.d.ts` y `clinicalContract.generated.ts` conservan su huella SHA-256 (la de `main`: no se tocaron en esta rama); ningún archivo de `src` fuera de `shared/api`, sin contar pruebas, `src/test` ni `src/paraglide`, contiene `fetch(` ni `axios` (112 archivos revisados; la prueba comprueba que la búsqueda cubre `shared/api/client.ts` y las features `queue` y `reports`); ninguna feature importa de otra (se resuelve cada import relativo y se mira a qué carpeta cae, de modo que `../../reception/…` también cuenta, algo que la regla `no-restricted-imports` de ESLint, que solo mira la cadena `features/`, no ve) y las cuatro pantallas importan `useEncounters` o `useEncounterCount` desde `shared/hooks`.
  - **R40**, `describe('UI-02-web escritura en español de los dashboards')` (17): las nueve claves de «Escritura y horas» tienen el texto exacto de `design.md`; ningún texto de los dashboards (los 36 nuevos, las dos guías, las nueve y las 45 que `design.md` reutiliza) escribe «pre-registro» en español ni usa «·» en ninguno de los cinco idiomas; las etiquetas, los títulos de panel y los de franja empiezan con mayúscula; en, pt, fr y de conservan su terminología (`pre-registration`, `pré-registro`, `préinscription`, `voranmeldung`) en las nueve claves; el guion solo queda en las claves que `design.md` deja fuera (`feature_arrival_conflict`, `feature_origin_pr`, `feature_pr_reference`, `landing_description`, `landing_step1_title`, `landing_capability_mobile` y, hasta que T14 la retire, `feature_reception_title`, que la prueba tolera con una comprobación de subconjunto), y esas seis conservan su escritura; y cada dashboard, con la aplicación completa, no pinta «·» ni «pre-registro» en pantalla (4).
- **Mutaciones** (todas detectadas): R27 (6): `console.log` del nombre en `/triage`, un `q=Paciente ficticio 1` en la URL de `/triage`, `localStorage.setItem` con el nombre al confirmar, `sessionStorage.setItem` de las atenciones en `/cola`, `console.warn` del motivo del rechazo y `console.error` del documento en recepción. R36 (7): `fetch(` en `QueuePage`, un `import axios` comentado en `ReportsPage`, un import relativo `../../reception/…` en `QueuePage`, un import por `../../../features/triage/…` en `SiteCountTable`, `CONSUMED_CONTRACT` a `0.4.1` y un cambio manual en `schema.d.ts` y en `clinicalContract.generated.ts`. R40 (9): `feature_pr_label` con guion, `dash_stat_waiting` en minúscula, un «·» en `dash_queue_lead`, `preregistration` sin guion en inglés, «pre-registros» en `guide_reception`, `feature_origin_pr` sin guion, «pre-registro» en `common_retry`, un «·» en pantalla en `/cola` y un «·» en `dash_live` en alemán.
- **Auditorías pedidas** (comandos y salida resumida):
  - *Suite completa*: 42 archivos y 742 pruebas en verde (+24), tres ejecuciones seguidas del archivo transversal sin fallos; lint y typecheck sin errores.
  - *Pruebas existentes* (`git diff --stat --diff-filter=M 7043fc1 HEAD -- 'src/**/*.test.ts' 'src/**/*.test.tsx' src/test`): ocho archivos de prueba y `fakeApi.ts`, y cada hunk revisado coincide con «Pruebas existentes que cambian» de `design.md`: `f02Routes.test.tsx` (título `Recepción`), `f02Transversal.test.tsx` (líneas 178 y 357 y `R38`), `f03Routes.test.tsx` (`R3: paginates by 50…` y `R21`), `routes.test.tsx` (`HOME`, `R5` y la retirada de `R23`, más el campo `feature` de `HOME` en T11), `ReceptionPage.test.tsx`, `FeatureLocalization.test.tsx` (`R14`), `clinicalCaptureHooks.test.tsx` (solo el import) y `datetime.test.ts` (solo el bloque nuevo y la línea del import; sin una aserción de `formatBogota` ni de `formatCivilDate` cambiada). `fakeApi.ts` solo gana líneas (ninguna borrada). Ningún archivo de prueba se eliminó. Archivos creados en el slice: 12 de prueba y los ayudantes `src/test/scroll.ts` y `src/test/text.ts`.
  - *`manualRefresh`*: 0 coincidencias en `src`. *`focusManager` y `onlineManager`*: solo `f03Routes.test.tsx` (`R3: the tray does not refresh automatically on focus or reconnect` y el restablecimiento del `afterEach`, que siguen siendo ciertos porque R25 mantiene foco y reconexión en `false`) y las pruebas del propio slice (`encounterQueries.test.tsx` y los cuatro dashboards); ninguna otra prueba fija el refresco manual. *`useFakeTimers`*: las del slice, `routes.test.tsx` (`R14`), `privacy.test.tsx` (`R24` de expiración), `ReceptionPage.test.tsx` (`R9`) y las de autenticación (`LoginPage`, `SessionProvider` y `session.test.ts`, sin relación con los dashboards); las tres vigiladas por el sondeo siguen en verde sin cambios.
  - *`Pre-registro` y `pre-registro`*: en `messages/*/es.json` solo quedan `landing_description`, `landing_step1_title`, `landing_capability_mobile`, `feature_arrival_conflict`, `feature_pr_reference`, `feature_origin_pr` (fuera de alcance según `design.md`) y `feature_reception_title` (sin lector; la retira T14); en los otros cuatro idiomas no hay ningún «preregistro» sin guion. En `src` quedan: `roleMatrix.ts` (`title` de la matriz, que `design.md` conserva), `ArrivalForm.tsx` y `featureMessages.ts` (conflicto de llegada, fuera de alcance), comentarios de código y el README de `features/reception`, pruebas de pantallas fuera de alcance (`DirectRegistrationPage`, `EncounterListPage`, `EncounterDetailPage`, `FeatureLocalization` en inglés), datos de muestra de `problem.test.ts` (que `design.md` deja sin cambio) y los selectores `.pre-registration` de `index.css` (nombres de clase, que retira T14). La única cita restante que no estaba en la lista era el texto de muestra de una prueba de `Notice` del propio slice (`R12: Notice sin icono conserva exactamente su marcado`, en `dashboard.test.tsx`): pasa de «Pre-registro rechazado.» a «Preregistro rechazado.» (no cambia ninguna aserción de comportamiento; es la única prueba tocada en T12).
  - *`grep -rn "R[0-9]\+:" src` y el informe JSON de Vitest* (`--reporter=json`, fuera del repo): en los 12 archivos de prueba que creó el slice, las 339 pruebas cuelgan de un `describe('UI-02-web …')` (20 `describe` distintos, y uno más en `datetime.test.ts`) y todas empiezan por `R<n>:`; en `datetime.test.ts`, las 6 pruebas del bloque `describe('UI-02-web horas de los dashboards …')` cuelgan de él y las 7 previas (la de F-01 y las seis `R39:` de F-02-web, otra feature) siguen fuera, como deben. Ninguna prueba de los archivos del slice queda fuera de un `describe('UI-02-web …')`.
- **Observaciones para quien revise**: (1) el «`schema.d.ts` intacto» de R36 es una huella SHA-256 de los dos archivos generados; si un cambio de contrato los regenera a propósito, hay que actualizar las dos huellas junto con `CONSUMED_CONTRACT` en esa prueba. (2) La búsqueda de imports de R36 es textual (`from '…'`, `import('…')` e `import '…'`), así que también cuenta un import comentado; hoy no hay ninguno. (3) R27 prueba datos de la API simulada; el `data-testid`, el título del documento y el `state` del router no se miran.

---

# Etapa C1, nota de cierre (T10 a T12)

Fecha: 2026-10-29, America/Bogota. Rol `implementer`. T10, T11 y T12 hechas y marcadas `[x]` en `specs/UI-02-web/tasks.md`, en orden y con la prueba `R<n>:` escrita primero (ver la salvedad de T12: sus pruebas no pudieron verse en rojo y se comprobaron con mutaciones). **T13 y T14 no se han tocado** y siguen en `[ ]`. Contrato 0.4.0 sin cambios, `package.json` y `package-lock.json` intactos, sin `console`, sin TODOs, sin archivos temporales dentro del repo, sin imports entre features y sin procesos míos en marcha (los de `vite preview` y `preview-api.mjs` que aparecen en `pgrep` son de sesiones anteriores). No se tocó `feature_list.json`, `docs/ui-dashboards.md`, `requirements.md`, `design.md`, `schema.d.ts`, `clinicalContract.generated.ts` ni nada de `../asclepio-api/`. La feature sigue `in_progress`: faltan T13 (verificación visual con evidencia), T14 (limpieza y cierre) y la revisión independiente.

## Resultado

| Comprobación | Resultado |
| --- | --- |
| `./init.sh` completo (sin `--quick`) | VERDE, FAIL 0, WARN 0 (entorno, harness, estado, configuración, lint, typecheck y pruebas) |
| `npm test` | 42 archivos y **742 pruebas** en verde (etapa B: 42 y 654; +88 pruebas, todas en `dashboards.test.tsx`: T10 +8, T11 +56 y T12 +24). Tres ejecuciones completas seguidas sobre el árbol final sin fallos (informe JSON, `./init.sh` y `npm test`) y tres del archivo transversal |
| `npm run lint` y `npm run typecheck` | Salida 0, sin errores ni avisos |
| `npm run i18n:check` | Salida 0 (T11 cambia el texto de dos claves en los cinco idiomas y no añade ni retira claves) |
| `npm run build` | Salida 0 con `--outDir /tmp/ui02-c1-dist` (fuera del repo; 1367 módulos: uno menos que en la etapa B por `PlaceholderPage`) |
| Mutaciones | T10 4, T11 (guía) 3, T11 (rutas) 6 y T12 22 (R27 6, R36 7, R40 9): todas las detecta alguna prueba y el código se restauró idéntico (scripts fuera del repo, en `/tmp`) |
| Comprobación visual | No hecha, por alcance (es T13). En esta etapa solo se probó el DOM; las reglas CSS de `.layout--private` (T4) siguen sin verse en un navegador |

## Commits

En `feat/ui-02-web-dashboards`, Conventional Commits en inglés con `Refs: UI-02-web` y la atribución, sin `push`, sin `amend` y sin `stash` (un commit por paso, con la tarea marcada en el commit que la cierra):

| Commit | Contenido |
| --- | --- |
| `fa84ebd` `feat(ui): show the brand once in the private frame` | T10 |
| `4c7e862` `feat(ui): narrate a static guide on the queue and reports dashboards` | T11, paso 1: guía de voz y textos de las guías |
| `aa833fe` `refactor(router): retire PlaceholderPage now that every route has a screen` | T11, paso 2: rutas, `h1`, peticiones por rol y retiro de `PlaceholderPage` |
| `830824a` `test(ui): cover privacy, architecture and Spanish writing across the dashboards` | T12 |

Esta nota de cierre se confirma aparte (`docs(ui-02): record the stage C1 closing note`).

## Archivos

- **Eliminado**: `src/shared/ui/PlaceholderPage.tsx` (no tenía prueba propia).
- **Tocados (código)**: `src/shared/ui/Layout.tsx` (`FrameHandle`, `useMatches`, omisión del enlace de marca, clase `layout--private` y las dos ramas de `guideKey`), `src/app/router/routes.tsx` (`handle: { privateFrame: true }`, sin `PlaceholderPage` y con `?? []`), `messages/common/{es,en,pt,fr,de}.json` (`guide_reception`) y `messages/features/{es,en,pt,fr,de}.json` (`clinical_guide_tray`).
- **Tocados (pruebas)**: `src/app/router/dashboards.test.tsx` (de 304 a 1395 líneas y de 15 a 103 pruebas), `src/app/router/routes.test.tsx` (se quita el campo `feature` de `HOME`) y `src/shared/ui/dashboard.test.tsx` (el texto de muestra de una prueba de `Notice` pasa a «Preregistro rechazado.»). Ningún archivo creado.
- **Seguimiento**: `specs/UI-02-web/tasks.md` (T10 a T12 en `[x]`) y esta nota.

## Trazabilidad R → `archivo::prueba` (solo lo hecho en la etapa C1)

`router` = `src/app/router/dashboards.test.tsx`. Todas viven bajo un `describe('UI-02-web …')` y empiezan por `R<n>:`; los nombres se citan por su inicio.

| R | Pruebas |
| --- | --- |
| R1 | `router::R1: $role entra por $entry y aterriza en su dashboard…` (8); `router::R1: PHYSICIAN, NURSE y ADMIN abren /cola y ven exactamente el mismo dashboard`; `router::R1: la ruta $path de la matriz de roles tiene pantalla para $role…` (10); `router::R1: PlaceholderPage ya no existe…` |
| R2 | `router::R2: $role ve un único h1 «$title»…` (4) |
| R27 | `router::R27: $role en $path, tras cargar, refrescar a mano y por intervalo y operar, no deja nombres…` (4) |
| R28 | `router::R28: $role en $path ve «Sin permiso» y el dashboard no pide ningún dato` (10); `router::R28: $role en $path solo pide las lecturas que su rol puede usar…` (6) |
| R33 | `router::R33: las cuatro guías dicen que la pantalla se actualiza sola…` (5 idiomas); `router::R33: en español, la guía de recepción y la de enfermería llevan el texto de design.md`; `router::R33: $role oye $key en $path…` (6); `router::R33: la guía de /cola y la de /reportes se narran en el idioma elegido` (4) |
| R36 | `router::R36: la web consume el contrato 0.4.0…`; `router::R36: fetch y axios solo existen en shared/api…`; `router::R36: ninguna feature importa de otra feature…` |
| R39 | `router::R39: $role ve «Asclepio» una sola vez…` (4); `router::R39: el resto de pantallas del marco privado…`; `router::R39: %s conserva la cabecera con la marca…` (3) |
| R40 | `router::R40: las nueve claves…`; `router::R40: en español, ningún texto de los dashboards escribe «pre-registro»…`; `router::R40: el guion solo queda en los textos que design.md deja fuera…`; `router::R40: ningún texto de los dashboards usa «·»…` (5); `router::R40: las etiquetas, los títulos de panel y los de franja empiezan con mayúscula inicial`; `router::R40: %s conserva su terminología del preregistro…` (4); `router::R40: $role no pinta «·» ni «pre-registro» en pantalla` (4) |

Con esta etapa, R1, R2, R27, R28, R33, R36, R39 y R40 ya tienen su prueba transversal. T14 arma la tabla R1 a R41 completa.

## Pruebas existentes modificadas

Solo las de las etapas anteriores y estas dos, nuevas en C1: `routes.test.tsx` (quita el campo `feature` de `HOME`, que no tenía lector desde que T9 eliminó `R23`; no cambia ninguna aserción) y `dashboard.test.tsx` (texto de muestra de una prueba de `Notice` del propio slice; no cambia ninguna aserción de comportamiento). El resto de pruebas existentes (`uiFoundation`, `AppShell`, `privacy`, `VoiceGuide`, `featureMessages`, `f03Routes` R3 de refresco y R4, y las vigiladas por el sondeo `routes.test.tsx` R14, `privacy.test.tsx` R24 y `ReceptionPage.test.tsx` R9) siguen en verde sin tocarlas.

## Desviaciones y decisiones (ninguna contradice la spec)

1. **T11 en dos commits.** La guía de voz (R33) y el retiro de `PlaceholderPage` (R1, R2, R28) se hicieron y confirmaron por separado, cada uno con sus pruebas, para que ningún commit deje la suite en rojo; `tasks.md` marca T11 en el segundo.
2. **T12, pruebas sin rojo previo.** R27, R36 y R40 describen comportamiento que ya se cumplía, así que no podían fallar antes de escribir código (T12 no lleva código); se compensó con 22 mutaciones. Misma salvedad, más pequeña, para 39 de las 40 pruebas del paso 2 de T11 (solo falló la del retiro de `PlaceholderPage`), compensadas con 6 mutaciones.
3. **«`schema.d.ts` intacto» (R36)** es una huella SHA-256 de `schema.d.ts` y de `clinicalContract.generated.ts` (las de `main`: ninguno cambió en la rama), no una comparación con un `git diff`, que dependería del historial. Si un cambio de contrato los regenera a propósito, hay que actualizar las huellas en esa prueba junto con `CONSUMED_CONTRACT`.
4. **Imports entre features (R36)**: la prueba resuelve cada import relativo y mira a qué carpeta cae; la regla `no-restricted-imports` de ESLint (`**/features/*/**`) solo mira la cadena del especificador, así que no ve `../../reception/…` entre features. Ningún código lo hace hoy.
5. **R40 más amplia que la lista mínima**: además de las claves de las dos tablas pedidas, la prueba revisa las 45 que `design.md` reutiliza sin cambio (los dashboards las muestran) y los cinco idiomas para el «·».
6. **Terminología de las guías** en portugués y francés: siguen con «pré-cadastro» y «pré-enregistrement», como antes, y no se alinean con la etiqueta de la pantalla («Pré-registros», «Préinscriptions»); R40 pide conservar la terminología de los otros idiomas. Diferencia anterior a este slice.
7. **La cabecera del marco privado pierde la marca en todas las pantallas del `AppShell`** (también `/atenciones`, `/triage/:id` y `/recepcion/registro`), porque el `handle` está en la ruta del `AppShell`; es lo que dice UI-02.AC11 y lo cubre una prueba.

## Observaciones para quien revise y para las tareas que siguen

- **T13, a mirar en navegador**: la cabecera reducida (`.layout--private`: herramientas en una píldora a la derecha, sin hueco a la izquierda; a menos de 480 px el marco oculta el botón de tema, así que quedan el idioma y «Preferencias»), la marca única en la barra lateral y la marca conservada en `/`, `/login` y `/estado`. El caso aceptado de `design.md` (mientras `RequireSession` carga o falla el perfil la cabecera no tiene marca y tampoco hay barra lateral) es transitorio y no se prueba.
- **T14, lo que ya no tiene lector**: `grep` en `src` (sin pruebas) no encuentra `feature_reception_title`, `clinical_workspace`, `clinical_workflow_title`, `clinical_workflow_body` ni `clinical_waiting_only`; ningún componente usa ya `.pending-badge` (solo lo usaba `PlaceholderPage`, borrada en T11) ni `.cards`, `.clinical-board`, `.clinical-tray`, `.clinical-patient*`, `.clinical-empty*`, `.clinical-pagination`, `.clinical-summary*` ni `.pre-registration` (quedan solo los nombres de clase de `index.css`; los `id` `pre-registration-…` de `PreRegistrationCard` no son clases). Al retirar `feature_reception_title` conviene quitar su entrada de `HYPHEN_OUT_OF_SCOPE` en `dashboards.test.tsx` (la prueba la tolera con una comprobación de subconjunto y pasa igual). Los campos `title` y `feature` de `RoleRoute` siguen sin lector, por decisión de `design.md`.
- **`dashboards.test.tsx` es ya un archivo grande** (103 pruebas): lo que comparten las secciones (`DASHBOARDS`, `dashboardApi`, `settled`, `stubSpeech`, `appSources`, `merged` y `paramsOf`) está definido arriba de cada una; si T14 añade su sección R29 (claves retiradas), puede reutilizarlos.
- **Búsqueda de `Pre-registro`**: ver la auditoría de T12 (solo quedan los textos fuera de alcance de `design.md`, `feature_reception_title` y comentarios o pruebas de pantallas fuera de alcance).

---

# Etapa C2, verificación visual y cierre (T13 y T14)

Fecha: 2026-10-29, America/Bogota. Rol `implementer`. Parte de `feat/ui-02-web-dashboards` en `28baf45` (etapas A, B y C1 verificadas por el `leader`: 42 archivos y 742 pruebas en verde, `./init.sh` en verde). Esta sección se anota subpaso a subpaso y cada subpaso se confirma con su commit; si la sesión se corta, el `leader` retoma leyendo esta nota y `git log`. La nota de cierre (tabla R1 a R41, resultado de `./init.sh` y limitaciones) va al final.

Herramientas de verificación (fuera del repo, `../../local-analysis/ui02-verification/`): `ui02-preview-api.mjs` (API sintética, puerto 3012), `c2-lib.mjs` (arranque de Chromium, inicio de sesión por la interfaz, cambio de preferencias con el panel «Preferencias» de la propia aplicación) y un script por bloque (`c2-*.mjs`). Build de la rama a `dist-c2/` (`VITE_API_URL=http://127.0.0.1:3012 npm run build -- --outDir … --emptyOutDir`) y servido con `vite preview` en el puerto 5186.

## Paso 0, ajuste de T10 hallado por el `leader` (hecho)

- **Prueba primero**: `dashboardStyles.test.ts` (`R39: las reglas del marco privado…`) pasa a esperar `max-width: 80rem` y se vio fallar (`"max-width": "84rem"` recibido). Luego `dashboard.css`: `.layout--private .layout__header-inner` pasa de `84rem` a `80rem`. Commit `7faee41` (`fix(ui): align the private header tools with the content edge`).
- **Medición en Chromium** con el build de la rama (`c2-frame-edge.mjs`, los cuatro roles, sesión iniciada por la interfaz): el borde derecho de `.layout__tools` y el de `.shell` coinciden (diferencia 0) a 1280 px (1248), 1440 px (1360) y 1920 px (1600); `.dashboard` termina en la misma x. La herramienta más a la derecha ya no sobresale 32 px (antes: 1392 frente a 1360 a 1440 px).
