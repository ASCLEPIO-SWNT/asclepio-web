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
- **Pruebas nuevas** (`ReceptionDashboard.test.tsx`, 33, bajo `describe('UI-02-web dashboard de recepción')`): R3, R8, R9, R10 (2), R11, R12 (4), R19 (2), R20, R21 (4), R22 (4), R23, R24, R25 (2), R26, R28, R34, R37 (2), R38, R40 y R41. Helper nuevo `src/test/scroll.ts` (`watchScrolling`: cuenta las llamadas a `window.scrollTo`, `Element.scrollTo` y `Element.scrollIntoView`; lo reutilizan T7 a T9). Mutaciones comprobadas (12 de 13 detectadas; la 13.ª era un cambio de comportamiento que se revirtió, ver abajo): «Actualizar» sin repetir el conteo, confirmar sin invalidar, `key` por índice, foco y reconexión activos, `formatBogota`, punto añadido al aviso, conteo sin sede, 403 pintado como error, tono de identidad, «Registro directo» secundario y nota viva con `role`.
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
