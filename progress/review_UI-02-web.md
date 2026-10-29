**Veredicto:** APROBADO

Sin motivos de rechazo. `./init.sh` completo en verde, 41 de 41 requisitos con prueba `R<n>:` que pasa, C1 a C8 cumplidos (salvo lo que cierra el `leader` tras este veredicto), y la verificación independiente en Chromium confirma lo que declara el implementador. Hay 12 observaciones no bloqueantes y 6 puntos «Para el usuario».

# Revisión independiente de UI-02-web (reviewer)

Rama `feat/ui-02-web-dashboards` frente a `main` (`7043fc1`), HEAD `c3408ce` (igual que `origin`); 42 commits, 130 archivos (92 nuevos, 36 modificados, 2 borrados). Fecha: 2026-10-29. Nada de lo que sigue se tomó de las notas del implementador sin comprobarlo: cada cifra sale de un comando o de una medición mía, y donde la nota y mi medición coinciden lo digo.

## 1. Comandos

| Comando | Resultado |
|---|---|
| `./init.sh` (completo, sin `--quick`) | VERDE: FAIL 0, WARN 0, exit 0 (lint, typecheck y tests en `[OK]`; 1 min 1 s) |
| `npm test` | exit 0: 42 archivos, 765 pruebas, 765 pasan |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run i18n:check` | exit 0 |
| `npm run api:types` | exit 0; `git status --short` después: solo este informe (sin diff en `schema.d.ts` ni en `clinicalContract.generated.ts`) |
| `npm run build -- --outDir /tmp/ui02-review-dist` | exit 0 (1362 módulos; JS 712.55 kB con gzip 207.87 kB, CSS 47.69 kB; aviso de chunk mayor de 500 kB; en `main` el JS medía 679.63 kB, es decir +33 kB sin dependencias nuevas). Segundo build con `VITE_API_URL=http://127.0.0.1:3012` para el navegador: exit 0. Borrado al terminar |
| `npx vitest run --reporter=json` | 765 de 765; 368 pruebas bajo `describe('UI-02-web …')` (13 archivos, 21 `describe`), todas pasan |
| `npx prettier --check` sobre los archivos de `src` cambiados | todos con el estilo de Prettier; `git diff --check main..HEAD` sin errores |
| `taskset -c 0-3 npx vitest run` | 765 de 765 en 41.5 s (la suite pasa también con 4 núcleos) |

Salida de las pruebas limpia: sin avisos de `act`, sin `console.error` ni advertencias de React en el registro.

## 2. CHECKPOINTS.md, casilla por casilla

### C1, el harness está completo
- [x] `AGENTS.md`, `CLAUDE.md`, `init.sh` (ejecutable), `feature_list.json`, `progress/current/` y `progress/history.md` existen (`init.sh`: `[OK] Archivos base presentes`, `[OK] init.sh ejecutable`).
- [x] `docs/architecture.md`, `docs/conventions.md`, `docs/specs.md` y `docs/verification.md` existen (`ls docs`).
- [x] `./init.sh` termina con exit 0.

### C2, el estado es coherente
- [x] Como mucho una feature `in_progress`: `init.sh` dice `feature_list.json coherente (done: 5, in_progress: 1, pending: 4)`; la única es `UI-02-web`.
- [x] Toda feature `done` tiene pruebas que pasan: F-00 a F-03 y UI-01 conservan sus pruebas y la suite completa pasa (765 de 765).
- [x] `progress/current/` contiene solo `.gitkeep` y `UI-02-web.md` (la feature activa).

### C3, el código respeta la arquitectura
- [x] `src/` sigue `docs/architecture.md`: resolví con un script cada import relativo de los 112 archivos de `src` y dibujé el grafo de capas; `queue` y `reports` son features nuevas, y lo compartido (`useEncounters`, `useEncounterCount`, `counts`, `indicator`, `refresh`, `encounterStatus` y los 12 componentes) vive en `shared/`.
- [x] Una feature no importa de otra: 0 violaciones en código de producción (el script cuenta también `../../reception/…`). Observación 11: dos imports relativos entre features que ya existían en `main`, solo en una prueba.
- [x] HTTP solo por `shared/api`: el único `fetch(` fuera de pruebas es `src/shared/api/client.ts:14`; ni `axios`, ni `XMLHttpRequest`, ni `WebSocket`.
- [x] Sin dependencias nuevas: `git diff main..HEAD --stat -- package.json package-lock.json` vacío.
- [x] Sin `console.log` ni TODOs sin contexto: `grep` de `console.`, `debugger`, `TODO`, `FIXME` sobre `src` sin pruebas devuelve vacío (la única coincidencia de «TODO» es la palabra «MÉTODO» de un comentario de `src/test/fakeApi.ts:123`). `eslint` (`no-console: error`) pasa.

### C4, la verificación es real
- [x] Pruebas Vitest y Testing Library por feature con código: `queue` (38), `reports` (29), `reception` (34 más la suite F-02), `triage` (31 más F-03), `shared` (componentes, hooks, lib y hoja de estilos) y `app/router` (109 transversales). Revisé `dashboards.test.tsx` completo y `dashboardStyles.test.ts` completo; el resto, por sondeo y por mutación (sección 10). Comprueban roles, nombres, texto, identidad de nodos, foco y peticiones.
- [x] El HTTP se simula en la frontera de red: `src/test/fakeApi.ts` sustituye `fetch` con `vi.stubGlobal('fetch', …)` y responde por «MÉTODO /ruta»; no hay ni un `vi.mock(` en `src`; los únicos dobles son `fetch`, `speechSynthesis`, `console` y `Intl.DateTimeFormat.prototype.format` (para simular otro motor de ICU).
- [x] `npm test` muestra 765 pruebas, todas en verde (cero `skip`, `only` ni `todo`; ninguna de las 269 pruebas revisadas por script carece de `expect`).

### C5, la sesión se cerró bien
- [x] No hay archivos sin seguir sospechosos: `git status --short` solo muestra este informe.
- [ ] `progress/history.md` tiene una entrada por la última sesión: lo cierra el `leader` tras el veredicto (hoy el archivo no está en el diff de la rama).
- [ ] La última feature trabajada tiene el estado correcto: lo cierra el `leader` tras el veredicto (hoy `in_progress`; pasa a `done` con este informe).

### C6, Spec-Driven Development
- [x] `specs/UI-02-web/{requirements,design,tasks}.md` existen (`init.sh` lo comprueba para `sdd: true` en `in_progress`).
- [x] `requirements.md` usa EARS y cada `R<n>` lleva traza: las 41 líneas `R1` a `R41` tienen un tipo EARS (`Ubicuo`, `Por estado`, `Por evento` o `No deseado`) y un `(→ UI-02.ACn)`; el script no encontró ninguna sin ellos.
- [x] Todas las tareas están `[x]`: T1 a T15 en `specs/UI-02-web/tasks.md`.
- [x] Cada `R<n>` está cubierto por una prueba `R<n>:` (sección 3: 41 de 41).

### C7, seguridad clínica y privacidad (UI)
- [x] Ninguna pantalla presenta la sugerencia como nivel final: los cuatro dashboards no tienen IA, niveles ni prioridades; las franjas «Próximamente» no llevan cifras, controles ni gráficos (`QueuePage.test.tsx:388-411` R18 y `:783-792` R26; `ReceptionDashboard.test.tsx:901-907` R26). El texto de la franja de `/cola` dice «cola priorizada por nivel de triage» como descripción de lo que traerá F-06, sin ningún dato.
- [x] «Corregir» con el mismo peso que «Validar»: no aplica en este slice (no se tocó ninguna pantalla de decisión; F-04 y F-05 están `pending`).
- [x] «Corregir» no se envía sin nivel y motivo: no aplica (F-05).
- [x] Sin sugerencia válida, triage manual: no aplica (F-04).
- [x] Sin datos personales en consola, `localStorage` ni URL: `grep` sin pruebas de `console.`, `localStorage` y `sessionStorage` (solo `session.ts`, `SessionProvider.tsx` y `preferences/storage.ts`, anteriores a la rama); `R27` (4 pruebas, una por dashboard, con consola, URL y almacenamiento vigilados) y mi medición en el navegador (sección 9): en la URL solo `siteId` y `offset` de `/triage`, `localStorage` con la clave `asclepio-ui-preferences` y `sessionStorage` con `asclepio.session` (`accessToken` y `expiresAt`), sin nombres ni documentos.
- [x] Las horas se muestran en `America/Bogota`: `src/shared/lib/datetime.ts:14-25` fija `timeZone`; con el navegador en `Asia/Tokyo` (desfase de 540 min) las tarjetas siguen mostrando `28/10/26, 8:05 a. m.`.

### C8, contrato
- [x] `consumes_contract` es `0.4.0` (`feature_list.json`, entrada `UI-02-web`) y `info.version` de `../asclepio-api/openapi/asclepio-api.v1.json` es `0.4.0`; `CONSUMED_CONTRACT = '0.4.0'` en `src/shared/api/client.ts:6`.
- [x] `npm run api:types` no produce diff, y `git diff main..HEAD --stat -- src/shared/api/schema.d.ts src/features/triage/clinicalContract.generated.ts` está vacío (ninguno de los dos archivos cambió respecto de `main`). El repositorio de la API no tiene cambios (`git -C ../asclepio-api status --short` vacío).
- [x] Los errores `problem+json` siguen con mensajes comprensibles: los paneles muestran «No se pudo cargar la bandeja.», «No se pudieron cargar las atenciones…» o «No tienes permiso para ver esta página.», y las acciones de recepción conservan los mensajes en contexto de `actionErrorMessage` (409, 404, 403, red y genérico: `ReceptionDashboard.test.tsx` R12, tres casos más la suite F-02 `ReceptionPage.test.tsx`).

## 3. Trazabilidad mecánica R1 a R41

Script propio sobre `/tmp/ui02-review-vitest.json` (borrado): para cada `R<n>` de 1 a 41, al menos una prueba cuyo título empieza por `R<n>:`, colgada de un `describe('UI-02-web …')`, con estado `passed`.

**Resultado: 41 de 41 con prueba que pasa; ninguna R sin prueba.** Las 368 pruebas bajo `UI-02-web` empiezan por `R<n>:` (ninguna suelta, ninguna con R mayor de 41) y pasan; las otras 389 pruebas `R<n>:` del repositorio son de F-01, F-02, F-03 y UI-01 y no cuentan. La tabla del implementador (`progress/impl_UI-02-web.md`, cierre de C2) coincide con mi conteo en 40 de 41 filas; en R41 dice 8 y yo cuento 15, porque T15 añadió 7 después de esa tabla (las filas de T15 están en la misma nota, líneas 664 y 665).

| R | Pasan de total | Archivos |
|---|---|---|
| R1 | 20 de 20 | dashboards |
| R2 | 11 de 11 | dashboards, dashboard, dashboardStyles, QueuePage, ReportsPage, TriageDashboard |
| R3 | 10 de 10 | dashboard, dashboardStyles, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R4 | 6 de 6 | dashboardStyles |
| R5 | 4 de 4 | dashboard, dashboardStyles |
| R6 | 2 de 2 | encounterQueries, datetime |
| R7 | 6 de 6 | encounterQueries, ReportsPage |
| R8 | 18 de 18 | encounterQueries, dashboard, dashboardStyles, counts, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R9 | 1 de 1 | ReceptionDashboard |
| R10 | 5 de 5 | dashboardStyles, ReceptionDashboard |
| R11 | 1 de 1 | ReceptionDashboard |
| R12 | 6 de 6 | dashboard, ReceptionDashboard |
| R13 | 1 de 1 | TriageDashboard |
| R14 | 6 de 6 | encounterQueries, TriageDashboard |
| R15 | 4 de 4 | encounterStatus, QueuePage, ReportsPage |
| R16 | 12 de 12 | encounterQueries, QueuePage |
| R17 | 3 de 3 | ReportsPage |
| R18 | 4 de 4 | dashboard, dashboardStyles, QueuePage, ReportsPage |
| R19 | 11 de 11 | dashboard, dashboardStyles, indicator, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R20 | 8 de 8 | dashboard, indicator, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R21 | 20 de 20 | encounterQueries, dashboard, indicator, refresh, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R22 | 20 de 20 | encounterQueries, dashboard, indicator, refresh, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R23 | 5 de 5 | encounterQueries, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R24 | 7 de 7 | encounterQueries, refresh, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R25 | 12 de 12 | encounterQueries, refresh, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R26 | 4 de 4 | ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R27 | 4 de 4 | dashboards |
| R28 | 22 de 22 | dashboards, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R29 | 19 de 19 | dashboards |
| R30 | 11 de 11 | dashboard, dashboardStyles, encounterStatus |
| R31 | 7 de 7 | dashboard, dashboardStyles |
| R32 | 4 de 4 | dashboardStyles |
| R33 | 17 de 17 | dashboards |
| R34 | 13 de 13 | dashboard, dashboardStyles, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R35 | 1 de 1 | dashboardStyles |
| R36 | 5 de 5 | dashboards, encounterQueries |
| R37 | 8 de 8 | dashboard, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R38 | 7 de 7 | dashboards, dashboard, dashboardStyles, ReceptionDashboard, QueuePage, ReportsPage, TriageDashboard |
| R39 | 10 de 10 | dashboards, dashboard, dashboardStyles |
| R40 | 18 de 18 | dashboards, ReceptionDashboard |
| R41 | 15 de 15 | datetime, ReceptionDashboard, QueuePage, TriageDashboard |

R32, R34 y R35 (y parte de R10) se prueban sobre la fuente del CSS porque jsdom no calcula geometría; la prueba de R35 es una sola (`dashboardStyles.test.ts:577`). La geometría real la medí yo en el navegador (sección 9).

## 4. Tareas T1 a T15

Todas en `[x]` en `specs/UI-02-web/tasks.md`, y cada resultado está en disco.

| Tarea | Resultado comprobado |
|---|---|
| T1 | 16 capturas `ui02-<rol>-antes-<claro\|oscuro>-<375\|1440>.jpg`; `docs/ui-dashboards-verification.md` (420 líneas) con procedimiento, datos y commit de partida `7043fc1` |
| T2 | `src/shared/hooks/{useEncounters,useEncounterCount}.ts`, `src/shared/lib/{counts,indicator,encounterStatus,refresh}.ts`, tres formateadores en `datetime.ts`, `src/test/text.ts` y ayudantes de `fakeApi.ts`; `src/features/triage/hooks/useEncounters.ts` borrado; `grep` de `manualRefresh` y de la ruta antigua: vacío |
| T3 | 36 claves nuevas (11 en `common`, 25 en `features`); mi script: 111 claves de `common` y 252 de `features` en cada uno de los cinco idiomas, sin faltantes, sobrantes, parámetros distintos ni vacíos |
| T4 | `src/shared/ui/dashboard.css` (761 líneas) importado en `src/main.tsx` justo después de `index.css`; `dashboardStyles.test.ts` (36 pruebas) |
| T5 | Los 12 componentes de `shared/ui` más la prop `icon` de `Notice`; `dashboard.test.tsx` (39 pruebas) |
| T6 a T9 | `ReceptionPage.tsx` y `PreRegistrationCard.tsx`, `TriageTrayPage.tsx`, `features/queue` (`QueuePage.tsx`, `routes.tsx`) y `features/reports` (`ReportsPage.tsx`, `SiteCountTable.tsx`, `routes.tsx`), cada una con su archivo de pruebas |
| T10 | `handle: { privateFrame: true }` (`routes.tsx:45`), `useMatches` y `layout--private` (`Layout.tsx:22-24`, `:50`, `:57-61`) |
| T11 | Ramas de guía en `Layout.tsx:43-47`; `src/shared/ui/PlaceholderPage.tsx` borrado (`D` en el diff; ninguna referencia en `src`, `messages` ni pruebas salvo la que comprueba su ausencia) |
| T12 | R27, R36 y R40 en `dashboards.test.tsx` (líneas 1071-1145, 1165-1222 y 1347-1423) |
| T13 | 16 capturas `…despues…` y 15 adicionales (`grises` x4, `contraste`, `768` x2, `cien-mas` x2, `ceros`, `200`, `error`, `cargando`, `vacio`, `seis-estados-grises`): 47 archivos `ui02-*` en total, todos JPEG de 1440 o 375 o 768 px de ancho y entre 17 kB y 325 kB; documento de verificación con mediciones, idiomas, contraste, teclado, movimiento, refresco y tabla R a prueba (41 filas) |
| T14 | Las 5 claves retiradas ausentes de los 10 catálogos y de `src` (probado en `dashboards.test.tsx:295-314` y por mi script); `index.css` con 106 líneas borradas y ninguna añadida, y solo de `.cards`, `.pending-badge`, `.pre-registration` y `.clinical-board`, `-tray`, `-patient`, `-empty`, `-pagination` y `-summary` (`.arrival` y lo demás intactos); ninguna de esas clases sigue en `src` |
| T15 | `joinMeridiem` (`datetime.ts:34-36`) con `' $1. m.'` escrito como escape; búsqueda de bytes `C2 A0` y `E2 80 AF` en `src` y `messages`: ninguno; 7 pruebas nuevas de R41 |

**Capturas abiertas (cuatro, una por rol, mezclando tema y ancho):** `ui02-recepcion-despues-oscuro-375.jpg` (375x2456), `ui02-enfermeria-despues-claro-1440.jpg` (1440x1045), `ui02-medicina-despues-oscuro-1440.jpg` (1440x1147) y `ui02-administracion-despues-claro-375.jpg` (375x1444). Ninguna está vacía ni rota; se parecen a lo que describen el documento y los wireframes de `design.md`: marca una sola vez en la barra lateral, herramientas a la derecha, barra de resumen con indicadores y filtro, panel con la nota «Se actualiza cada 30 s», tarjetas de preregistro en una columna a 375 px, tabla de 8 filas con botones suaves en enfermería, insignias con icono y texto en medicina, tabla de sedes con «3 sedes» y franja «Próximamente» en administración. Las comparé además con mis propias capturas del build de la rama (recepción a 1440 px y enfermería a 375 px).

## 5. Seguridad clínica, privacidad y peticiones por rol (C7, punto 6 de la lista)

Búsquedas activas sobre `src` sin contar pruebas ni `src/test`:

| Búsqueda | Resultado |
|---|---|
| `console.*` | ninguno |
| `localStorage`, `sessionStorage` | solo `src/shared/api/session.ts` (sesión), `src/features/auth/SessionProvider.tsx` (comentario) y `src/shared/preferences/storage.ts` (preferencias): código anterior a la rama |
| Datos personales en URL o clave de caché | ninguno: en la URL solo `siteId` y `offset` de `/triage` (`TriageTrayPage.tsx:121`, enlace de captura) e ids de atención en `/atenciones/{id}`; las claves de caché son `['encounters', { status, siteId, offset, limit }]`, `['encounters', 'count', { status, siteId }]`, `['reception', 'pre-registrations', siteId]` y `['sites']` |
| `useEncounterCount` | `src/shared/hooks/useEncounterCount.ts:23-40`: `queryFn` devuelve solo `countOf(items.length, 0, COUNT_LIMIT)`, es decir `{ count, capped }`; la prueba `R7: la caché del conteo guarda solo { count, capped }` lo fija (mutación M12 detectada) |
| Cálculo de horas o esperas en el cliente | ninguno: `new Date(` solo dentro de los formateadores de `datetime.ts` y en código anterior (`PublicHome`, `session.ts`, `SessionProvider.tsx`); los dashboards no usan `useEffect` ni temporizadores propios |
| Detalle de atención o captura clínica desde un dashboard | ninguno (R28, abajo) |
| `dangerouslySetInnerHTML`, `innerHTML`, `eval` | ninguno |

**Matriz de peticiones por rol, medida en el navegador** (peticiones de datos tras cargar; ninguna a `/encounters/{id}` ni a `clinical-capture`; `GET /pre-registrations` solo con RECEPTION):

| Rol y ruta | Peticiones |
|---|---|
| RECEPTION `/recepcion` | `/me`, `/public/tenants`, `/pre-registrations`, 1 `/encounters?limit=100&status=WAITING_TRIAGE` |
| NURSE `/triage` | `/me`, `/public/tenants`, 1 `/encounters?limit=50&offset=0&status=WAITING_TRIAGE` |
| PHYSICIAN `/cola` | `/me`, 4 `/encounters` (tres con `limit=100&status=` `WAITING_TRIAGE`, `TRIAGED`, `IN_CARE`, y `limit=8&offset=0`) |
| ADMIN `/reportes` | `/me`, `/public/tenants`, 6 `/encounters` (los tres conteos y uno por sede con `status=WAITING_TRIAGE&siteId=`) |

Coincide con el presupuesto de `design.md` y con `dashboards.test.tsx:697-708` (R28, que además repite un ciclo de 30 s y exige que el conjunto de peticiones no crezca) y `:843-859` (las 9 rutas prohibidas piden solo `/me`).

## 6. Arquitectura (C3, punto 7)

- Imports: grafo de capas por script (aristas `app`, `features/<f>`, `shared`, `test`, `paraglide`); `shared` no importa de `features` ni de `app`; ninguna feature importa de otra ni de `app`. Las únicas filas `features/reception -> features/auth` y `features/reception -> features/triage` son las dos importaciones de `FeatureLocalization.test.tsx:20-21` (observación 11), idénticas en `main`.
- `fetch(`: solo `src/shared/api/client.ts:14`.
- `package.json` y `package-lock.json`: sin cambios.
- `TODO`, `FIXME`, `debugger`, `console.log`: ninguno. Archivos temporales o sin seguir: ninguno (`git status --short` solo muestra este informe; `dist/` en la raíz es anterior, está ignorado y no es de esta revisión).
- Commits: los 42 son Conventional Commits, con `Refs: UI-02-web` en el cuerpo, un solo autor y la línea `Co-Authored-By`; la rama está publicada y en sintonía con `origin`.

## 7. Coherencia spec y código (punto 8)

| Punto | Evidencia leída en el código |
|---|---|
| D26 | `routes.tsx:45` declara `handle: { privateFrame: true }` en la ruta del `AppShell`; `Layout.tsx:22-24` lee `useMatches()`, `:57-61` omite el enlace de marca y `:50` añade `layout--private`; la marca del marco es la de `AppShell.tsx:38-39` (`.shell__heading`). Conservada en `/`, `/login` y `/estado` (pruebas R39 y mi medición) |
| D28 | `datetime.ts:34-36` reescribe a ` ` el espacio previo a «a. m.» y «p. m.» y el interior (`/\s+([ap])\.\s+m\./g`), con escape y no con el carácter; `formatTimeBogota` (`:39`) y `formatDateTimeBogota` (`:49`) lo usan; `formatBogota` (`:8`), `formatCivilDate` (`:57`) y `formatDateBogota` (`:44`) no cambian. Prueba R41 con motor simulado (U+0020, U+00A0 y U+202F) |
| Refresco | `refresh.ts:12-23`: `refetchInterval` de 30 s que pasa a `false` con un 403 (`statusOf(problemOf(error)) === 403`) y sigue tras error de red, `refetchIntervalInBackground: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `retry: false`. Lo usan `useEncounters` (`refresh`), `useEncounterCount` y `usePendingPreRegistrations`. El error sustituye a los datos viejos: `indicator.ts:16-19` y las ramas `isError` antes de `items` en los cuatro paneles (R21) |
| R37 | `RefreshButton.tsx:18-22`: ni `disabled` ni `scrollTo`; `aria-busy`. «Anterior» y «Siguiente» se deshabilitan solo por datos (`TriageTrayPage.tsx:209`, `:222`). `key` = id en `ReceptionPage.tsx:119`, `TriageTrayPage.tsx:98`, `QueuePage.tsx:110` y `SiteCountTable.tsx:36`. `scrollTo`, `scrollIntoView` y `overflow-anchor`: ninguno en `src` (solo `.focus()` anteriores en `LoginPage.tsx:87` y `PreferencesPanel.tsx:42`) |
| Accesibilidad | un `h1` por pantalla (`PageHeader.tsx`, comprobado también en el navegador); tablas con `role="table"`, `row`, `columnheader`, `cell`, `scope="col"` y `aria-labelledby` al `h2` (`DataTable.tsx:31-97`); ningún `tabindex` en `src`; 16 iconos Heroicons en los archivos cambiados, todos con `aria-hidden` (script); `aria-live` solo aparece en un comentario (`LiveNote.tsx:5`); `PanelState` conserva `status` en carga y `alert` en error, `Notice` sigue en `status`; la nota de actualización es texto plano |
| `dashboard.css` | sin colores literales (`grep` y `R4`); `color-mix(in oklch, <token> …)` y `currentColor` solamente; los únicos `px` son bordes de 1 px, píldoras de 999 px y la caja de 1 px del `thead` oculto; consultas de contenedor (`:632-741`) con cortes en 30, 56, 40 y 15 rem; movimiento solo bajo `prefers-reduced-motion: no-preference` (`:744-761`); `overflow: hidden` solo en `.summary` y en el `thead` oculto |
| i18n y escritura | paridad completa en los cinco idiomas (T3); ningún «·» en textos de dashboards (único en el producto: `feature_api_ok` de `/estado`, fuera de alcance); el español de los dashboards no tiene «pre-registro» con guion y las seis claves con guion que quedan son las de pantallas fuera de alcance (`landing_*`, `feature_arrival_conflict`, `feature_origin_pr`, `feature_pr_reference`), como fija `design.md`; etiquetas con mayúscula inicial (22 claves comprobadas); horas sin segundos |
| Pruebas existentes tocadas | `git diff` de `f02Routes`, `f02Transversal`, `f03Routes`, `routes`, `ReceptionPage`, `FeatureLocalization` y `clinicalCaptureHooks`: solo lo que lista `design.md` («Pruebas existentes que cambian»): títulos, textos en español, el handler de `GET /encounters`, `norm(...)` en las horas, la ruta del import y la baja de la prueba de marcadores; ninguna aserción debilitada |

## 8. Verificación independiente en navegador (punto 9)

Chromium 153.0.8010.12 (Playwright), API sintética `ui02-preview-api.mjs` en 3012 y `vite preview` del build de la rama en 5186, `POST /__reset` antes de cada serie, usuarios y contraseña indicados. Escribí mis propios scripts (en `/tmp`, borrados), usando los de `local-analysis` solo como modelo. **Primera ejecución: 16 FAIL, todos defectos de mi script** (contó el `<title>Asclepio</title>` del documento como segunda marca y esperaba claves de `localStorage` con prefijo `asclepio.`, cuando la real es `asclepio-ui-preferences`); lo corregí y repetí: 0 fallos. No hay hallazgo de producto en eso.

**Un dashboard por rol a 375 y 1440 px (8 sesiones, 0 fallos):**
- `scrollWidth` igual a `clientWidth` en las 8 (375/375 y 1440/1440).
- Una sola marca «Asclepio»: un nodo de texto, dentro de la región «Sesión» de la barra lateral, ningún enlace con ese nombre, ningún logotipo en la cabecera, clase `layout--private`. En `/`, `/login` y `/estado`, a 375 y 1440 px, el enlace de marca sigue en la cabecera (`href="/"`), sin `layout--private`, sin desbordamiento y con la consola limpia.
- A 1440 px, el borde derecho de las herramientas queda en x = 1360.0 y el del panel y el de `.dashboard` también en 1360.0 (diferencia 0.0 px) en los cuatro roles.
- La nota «Se actualiza cada 30 s» está en `.panel__head`, sin `role` ni `aria-live`, con el punto `::before`; a 1440 px en la misma fila que el `h2`, a la derecha (termina a 21 px del borde del panel); a 375 px envuelve a su propia línea bajo el título, alineada a la derecha (el riesgo aceptado de `design.md`).
- Un solo `h1` con el nombre de navegación, panel con el nombre esperado, barra de resumen con 2, 1, 3 y 3 celdas (RECEPTION, NURSE, PHYSICIAN, ADMIN) y 1, 2 o 3 columnas según el ancho, franja «pendiente» solo en `/cola` y `/reportes`, horas con U+00A0 entre la hora y «a. m.» o «p. m.», consola sin errores ni avisos.
- Teclado (Tab desde el inicio, 40 paradas como máximo): el orden del contenido es encabezado, resumen, panel y franja en los cuatro; ningún `tabindex` positivo; todas las paradas con aro de foco visible; el aro del selector «Sede» (3 px con 4 px de separación) cabe dentro de la barra de resumen sin recortarse (holgura de 21 y 17 px).
- Zona horaria del navegador en `Asia/Tokyo`: las horas siguen en Bogotá.
- Texto al 100 % y al 200 % en 320, 375, 768, 1024 y 1440 px (4 roles, datos de la siembra): sin desbordamiento a 375, 768, 1024 y 1440 px con ambas escalas, ni a 320 px con el 100 %. A 320 px con el 200 %, NURSE desborda 46 px (paginador) y PHYSICIAN y ADMIN 14 px (insignia «Próximamente» de la franja): coincide con la limitación documentada (observación 1).
- Movimiento reducido emulado con Playwright: con `reduce`, el esqueleto y el icono de «Actualizar» ocupado tienen `animation-name: none`; con `no-preference`, `pulse` y `spin`.

**Refresco automático con temporizadores reales de 30 s** (una llegada con `POST /__arrive` entre dos ciclos, ventana de 1280x600 para poder desplazar la página):
- NURSE: foco en el enlace de captura de la fila 3, `scrollY` 223. El ciclo llegó 28.4 s después de la llegada. El mismo nodo conservó el foco en los 1864 fotogramas; las filas pasaron de 8 a 9 con la nueva arriba («Paciente Sintético 1») y las existentes siguen siendo los mismos nodos; `scrollY` constante (223) en todos los fotogramas; la altura de los paneles pasó de 718 a 788 px (una fila más, 70 px) sin bajar nunca de 718; cero fotogramas y cero nodos de carga o esqueleto; «Actualizar» nunca deshabilitado; el indicador pasó a 9.
- RECEPTION: el `textarea` del motivo de rechazo conservó el foco (mismo nodo, 0 fotogramas sin foco de 1845), la casilla de la tarjeta 1 siguió marcada y el texto «motivo a medio escribir» se conservó; `scrollY` 280 constante; altura 1114 constante; sin estado de carga. El indicador «En espera de triage» pasó de 8 a 9 por la llegada que creó el escenario de NURSE (misma API sintética, ejecutados en paralelo).
- R25 en navegador: `focus`, `visibilitychange`, `offline` y `online` no generan ninguna petición (0 nuevas). Pestaña oculta emulada con `document.visibilityState` durante 65 s en `/cola`: 0 peticiones nuevas (4 iniciales); al volver a verse, 0 inmediatas; el siguiente ciclo del intervalo llegó 24 s después.
- «Actualizar» con respuesta lenta de 1.2 s (Enter con el botón enfocado): a los 300 ms sigue enfocado, habilitado, con `aria-busy="true"` y sin esqueleto, y suma exactamente una petición.

## 9. Calidad de las pruebas (C4, punto 10)

**Mutaciones sobre una copia en `/tmp`** (nunca sobre el repositorio): 28 cambios deliberados al código de producción; **28 detectados**. M15 solo cayó con la suite de F-02 (`ReceptionPage.test.tsx`, `R10: … «Confirmar llegada» solo se habilita al marcarla`) porque en mi primera selección no la había incluido; las pruebas UI-02 de recepción no repiten ese caso.

| Mutación | Prueba que la detecta |
|---|---|
| M01 a M03: `refetchIntervalInBackground`, `refetchOnWindowFocus` y `refetchOnReconnect` en `true` | `refresh.test.ts` R25 |
| M04: el 403 ya no detiene el intervalo | `refresh.test.ts` R22 |
| M05: intervalo de 60 s | `refresh.test.ts` R24 y `QueuePage.test.tsx` R38 |
| M06: «Actualizar» deshabilitado mientras `busy` | `dashboard.test.tsx` R37 |
| M07 y M08: `key` aleatoria en filas y tarjetas | `TriageDashboard.test.tsx` R37 y `ReceptionDashboard.test.tsx` R12 |
| M09: «N+» sin el texto «Al menos» | `dashboard.test.tsx` R8 |
| M10 y M11: marca de la cabecera siempre, y sin `handle` | `dashboards.test.tsx` R39 |
| M12: la caché del conteo guarda las atenciones | `encounterQueries.test.tsx` R7 |
| M13: `joinMeridiem` devuelve el texto tal cual | `datetime.test.ts` R41 |
| M14: medicina muestra el documento | `QueuePage.test.tsx` R16 |
| M15: confirmar sin exigir la casilla | F-02 `ReceptionPage.test.tsx` R10 |
| M16: confirmar no repite el indicador | `ReceptionDashboard.test.tsx` R12 |
| M17 a M19: cifras tabulares, sin `--cells`, color literal | `dashboardStyles.test.ts` R5, R34 y R4 |
| M20: todas las filas de sedes piden la misma sede | `ReportsPage.test.tsx` R21 |
| M21 y M22: insignia sin icono, carga sin `role="status"` | `dashboard.test.tsx` R30 y R19 |
| M23: `useEncounters` sin refresco | `encounterQueries.test.tsx` R24 |
| M24: «Siguiente» deshabilitado por `isFetching` | `TriageDashboard.test.tsx` R14 |
| M25: guía de `/cola` con el texto de «pendiente» | `dashboards.test.tsx` R33 |
| M26: encabezado sin descripción | `dashboard.test.tsx` R2 |
| M27: el error ya no sustituye a los datos | `ReceptionDashboard.test.tsx` R21 |
| M28: una petición suelta a `/pre-registrations` desde `/triage` | `dashboards.test.tsx` R36 (por contener `fetch(`; la matriz R28 por sí sola no lo pillaría si usara el cliente central, pero lo cubre el caso de rutas con rol) |

**Veredicto sobre las pruebas:** prueban comportamiento visible (roles, nombres, texto, identidad del nodo enfocado, estado local, conteo exacto de peticiones, `scrollTo` espiado) y no detalles internos. `dashboards.test.tsx` no tiene aserciones triviales: cada prueba tiene al menos un `expect` y las comprobaciones `toBe(true)` son órdenes del DOM con `compareDocumentPosition`. `dashboardStyles.test.ts` fija declaraciones del CSS con un analizador propio (partido por reglas y por reglas `@`), lo que sirve como alarma de regresión pero no demuestra el renderizado; por eso la medición en navegador es la prueba real de R32, R34 y R35 (observación 4).

**Prueba de huella SHA-256 de R36** (`dashboards.test.tsx:1166-1178`): aceptable como observación, algo frágil. Fija los dos archivos generados, así que un cambio de contrato obliga a actualizar la huella junto con `CONSUMED_CONTRACT` (es su propósito y el comentario lo dice). Su fragilidad: cualquier regeneración con otra versión de `openapi-typescript`, otro formato o finales de línea distintos la rompe sin que cambie el contrato, y no compara contra el snapshot de la API (eso lo hace `npm run api:types` con `git diff`). La conservaría, pero ver observación 3.

**Sensibilidad a la carga:** dos suites completas en paralelo en esta máquina (14 hilos) fallan por tiempo agotado (5 s) o por `findBy` (1 s): 7 y 11 fallos en la rama y 3 y 7 en `main` (pruebas anteriores de F-02, F-03 y UI-01, no solo las nuevas). Una sola suite pasa (4 de 4 ejecuciones) y también con 4 núcleos. Es una debilidad anterior a la rama; las únicas pruebas nuevas que cayeron fueron tres casos de `R33 … idioma elegido (pt, fr, de)` (observación 2).

## 10. Limitaciones ya documentadas: verificación y juicio

| Limitación | Lo que comprobé | ¿Bloquea el cierre? |
|---|---|---|
| API sintética, no NestJS ni PostgreSQL | Verificada: es un script que sirve las fixtures de `fakeApi.ts`; mis pruebas fueron contra ella. Los endpoints usados son solo los ya publicados en 0.4.0 y sus tipos no cambiaron | No. Falta, como en UI-01 y F-03, una pasada contra la API real antes de producción |
| Un solo navegador (Chromium 153) | Verificada: yo también usé solo Chromium 153. El Firefox 153 de T15 fue solo para medir `Intl` | No. Recomiendo una pasada en Firefox y Safari antes de producción (consultas de contenedor, `:has()`, `text-wrap: balance`; los navegadores que no entiendan `text-wrap` lo ignoran sin romper) |
| Pestaña oculta emulada con `visibilityState` | Reproducida en navegador con temporizadores reales (65 s: 0 peticiones; reanuda a los 24 s) y la mutación M01 la detecta | No |
| Zoom nativo y movimiento reducido sin ventana con interfaz | El movimiento reducido sí se puede emular en Chromium sin interfaz y lo verifiqué (`animation-name: none`); el zoom nativo no, pero el equivalente por texto al 200 % y los anchos de 320 a 1440 px sí | No |
| 320 px con texto al 200 %: 17 de 23 estados desbordan | Confirmado con los datos de la siembra: 46 px en NURSE y 14 px en PHYSICIAN y ADMIN. R35 parte de 375 px y a 320 px con el 100 % no hay desbordamiento (WCAG 1.4.10) | No (observación 1; arreglo pequeño) |
| Una captura PNG de `/recepcion/registro` parpadea | No lo reproduje: es una pantalla fuera de alcance que esta rama no modifica | No |
| Traducciones en, pt, fr y de sin revisión de una persona hablante | Paridad de claves y parámetros comprobada por máquina; la calidad lingüística no se puede comprobar así | No bloquea (R29 pide claves y parámetros), pero va a «Para el usuario» |
| CSS añadido en C2 documentado en `design.md` (desviaciones 9 a 12) | Verificado en `design.md:43-46` y en la tabla de reglas de C2 (`:360-370`), cada una con su prueba | No |
| Refresco automático por decisión del usuario (revisa F-03-web D3 y R3) | Documentado en `design.md` D14 y «Revisado por PA-3», en el brief (S4) y en las notas; las especificaciones de F-03-web no se tocaron | No (observación 9) |

## 11. Observaciones no bloqueantes

1. **320 px con texto al 200 % desborda** (46 px en `/triage`, 14 px en `/cola` y `/reportes`). Causa: `.pager` sin `flex-wrap` (`src/shared/ui/dashboard.css:547-551`) y `.badge { white-space: nowrap }` (`:331`) dentro de `.pending__meta` (`:590-595`). Arreglo propuesto: `flex-wrap: wrap` en `.pager` y dejar envolver la insignia de la franja (`.pending .badge { max-width: 100%; white-space: normal }`), con su prueba en `dashboardStyles.test.ts` y una medición a 320 px.
2. **La suite es sensible a la carga** (`vite.config.ts:19-22` y `src/test/setup.ts` no configuran tiempos): con dos suites en paralelo caen pruebas anteriores a la rama y tres nuevas (`dashboards.test.tsx`, `R33 … idioma elegido`, que navegan entre rutas con el `findBy` de 1 s). Propuesta: `testTimeout` y `configure({ asyncUtilTimeout })` en `src/test/setup.ts` para que una máquina de integración con pocos núcleos no dé falsos rojos.
3. **Huella SHA-256 de R36** (`src/app/router/dashboards.test.tsx:1166-1178`): frágil ante regeneraciones sin cambio de contrato. Opción: además de la huella, comparar la versión mayor y menor de `CONSUMED_CONTRACT` con `info.version` del snapshot cuando exista `../asclepio-api/openapi`, y dejar la huella solo como alarma de edición manual.
4. **Las pruebas de R32, R34, R35 (y parte de R10) son de fuente de CSS**: demuestran lo que declara el archivo, no lo que pinta el navegador. Es lo que fijan D12 y D18, y mi medición lo confirma, pero conviene que cualquier cambio futuro de `dashboard.css` repita la medición de `scrollWidth` a 375, 768, 1024 y 1440 px.
5. **Texto con jerga**: `messages/features/es.json:249` dice «El tenant no tiene sedes registradas.» (`dashboards.test.tsx:186-190` lo fija). «Tenant» es término interno; sugiero «La institución no tiene sedes registradas.» o similar, en `design.md`, el catálogo y la prueba.
6. **Código sin lector**: `TRAY_REFRESH_MS` (`src/features/reception/hooks/usePendingPreRegistrations.ts:12`) solo se define; y `RoleRoute.title` y `RoleRoute.feature` (`src/app/router/roleMatrix.ts:7`, `:11`) no tienen lector, con el texto con guion de `:20` («Recepción — bandeja de pre-registros»). `design.md` lo documenta y deja la limpieza para después.
7. **README desactualizados**: `src/features/queue/README.md:1` y `src/features/reports/README.md:1` solo hablan de lo que traerán F-06 y F-07, y ya alojan los dashboards; `src/features/reception/README.md:1` aún dice «bandeja de pre-registros».
8. **Documentos de arquitectura y convenciones sin la excepción**: `docs/architecture.md` («Responsive»: media queries) y `docs/conventions.md` («Claves de TanStack Query con la feature primero») no mencionan las consultas de contenedor (D1) ni la clave de dominio primero `['encounters', …]` (`src/shared/hooks/useEncounters.ts:10`, D4), que `design.md` sí justifica.
9. **Texto literal de F-03-web**: `specs/F-03-web/design.md:13` (D3: «refresco manual», sin KPIs) y `specs/F-03-web/requirements.md:14` (R3) siguen diciendo lo contrario de lo que hace `/triage`. La revisión está en `design.md` de UI-02 (D14, «Revisado por PA-3»), en el brief y en las notas, pero no en la spec de F-03. Sugiero que el `leader` anote una línea «Revisado por UI-02-web» al cerrar.
10. **Indicador de enfermería con una página vacía**: `src/features/triage/components/TriageTrayPage.tsx:52-54` calcula `countOf(items.length, offset, PAGE_SIZE)`; con `offset` de 50 y la lista vacía (por ejemplo, si las atenciones bajaron mientras se estaba en la página 2) muestra «50» como cifra exacta aunque el total real es 50 o menos. Es un borde del diseño D6 (indicador derivado de la bandeja); bastaría tratar `offset > 0` con la página vacía como «al menos».
11. **Imports relativos entre features en una prueba que ya existía**: `src/features/reception/components/FeatureLocalization.test.tsx:20-21` (`../../auth/…` y `../../triage/…`). La regla de ESLint `**/features/*/**` no ve rutas relativas, y R36 recorre solo código de aplicación. Opcional: ampliar el patrón de `eslint.config.js` para que los cubra.
12. **`role="none"` en un `header`** (`src/shared/ui/PageHeader.tsx:20`) solo para que las herramientas de prueba no lo tomen por un segundo `banner`: en los navegadores un `header` dentro de `main` ya es genérico, así que no cambia nada para quien usa tecnologías de apoyo; se anota por si alguien se pregunta por qué está.

## 12. Para el usuario

1. **Traducciones** al inglés, portugués, francés y alemán: las escribió el implementador y nadie que hable esos idiomas las ha revisado. Antes de usarlas con personal que no lea español conviene una revisión.
2. **Riesgos aceptados al elegir el refresco automático cada 30 s**: la lista de enfermería se reordena mientras se trabaja con ella (D21); `/reportes` hace 3 más S peticiones por ciclo en cada pestaña abierta (con 3 sedes, 6 por ciclo); y, lo que quizá no se le comunicó, **un ciclo que falla sustituye los datos por el error** (R21, D20) y en recepción desmonta las tarjetas, de modo que la casilla marcada y el motivo de rechazo a medio escribir se pierden. Es la política de F-03 R4 y se mantuvo a propósito; la alternativa (conservar la lista con un aviso de «datos desactualizados») cambia la spec y es decisión suya.
3. **Cuatro retoques de aspecto respecto de la maqueta v2 aprobada** (`design.md:43-46`, desviaciones 9 a 12): reparto de líneas en textos cortos, texto de la insignia «Clasificada» algo más oscuro (6.18:1 en lugar de 4.39:1), «100+» sin alterar la altura de la fila e insignias que envuelven con texto al 200 %. No cambian estructura ni proporciones; están a la vista en `docs/ui-evidence/ui02-*-despues-*.jpg`.
4. **Otros navegadores**: solo se verificó Chromium 153. Antes de producción conviene una pasada en Firefox y Safari.
5. **320 px con texto al 200 %** (observación 1): arreglo de CSS pequeño; decida si se hace ahora o se deja anotado.
6. **Texto «tenant»** en el vacío de la tabla de sedes (observación 5).

## 13. Lo que cierra el leader tras este veredicto (no es motivo de rechazo)

Entrada de `progress/history.md`; borrar `progress/current/UI-02-web.md` y las notas `progress/impl_UI-02-web.md` y `progress/review_UI-02-web.md`; pasar `UI-02-web` a `done` en `feature_list.json` (con `./init.sh` completo en verde, ya comprobado hoy); opcionalmente la línea de F-03-web (observación 9). Las dos casillas de C5 que dependen de eso quedan `[ ]` con esa nota.

## 14. Estado al terminar

Servidores y navegadores detenidos: 3012 y 5186 libres; los `vite preview` de 5173 y 5176 y el bucle de `git push` del `leader` no se tocaron. Borrados `/tmp/ui02-review-*` (build, copias de `main` y de la rama para las mutaciones, scripts, registros, capturas y el JSON). `git status --short` solo muestra este informe. No edité código, specs, pruebas ni `feature_list.json`, y no hice commit ni push.
