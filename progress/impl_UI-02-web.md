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
