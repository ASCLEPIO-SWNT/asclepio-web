# UI-03-web — Diseño

## Resumen

Slice transversal de robustez sobre la web existente, sin pantallas nuevas ni cambios de contrato. Capas (según `docs/architecture.md`):

- `app/router/`: `errorElement` por ruta, rutas diferidas (`lazyFeatureRoutes`, D10), título por pantalla en `handle`, vuelta a la ruta de origen, `canAccess` con `subpaths`.
- `shared/ui/`: componentes nuevos `ConfirmDialog`, `RouteError`, `RouteLoading`, `DraftNotice`, `RouteAnnouncer` y una variante de error de red / servidor reutilizable por `PanelState` y `LoadError`.
- `shared/hooks/`: `useUnsavedChanges` (`useBlocker` + `beforeunload`), `useDraft` (borrador en `sessionStorage`, según PA-1), `useDocumentTitle`.
- `shared/lib/`: clasificación de errores (`network` | `server` | `session` | `forbidden` | `problem`) a partir de lo que ya devuelve `shared/api`.
- `shared/api/`: `session.restore()` al arrancar el módulo; listener de cierre forzado que dispara el guardado del borrador.
- `features/triage` y `features/reception`: conectar los formularios protegidos a los hooks; literales a catálogos; mensaje genérico del 422 NN; firma de `onCancelled`.
- Pruebas: regla anti‑literales, estabilización de la suite, `renderApp` movido a `src/test/`.

### Precondiciones ya resueltas en esta rama

El commit `595bb94` fija Node 22.23.4 (`.nvmrc`, `engines`, `init.sh` compara la versión completa) y finales de línea LF con `.gitattributes`. Eso eliminó 21 699 errores de lint por CRLF, el fallo de R36 (huella SHA-256) y cinco pruebas de hora dependientes de ICU. Este slice parte de ahí y no lo repite como requisito; los tiempos de espera intermitentes (R28) siguen ocurriendo con esa base.

### Estado actual verificado al escribir la spec

- **Ruta de origen**: `RequireSession.tsx:16` ya redirige a `/login` con `state.from = location.pathname` y `LoginRoute.tsx:23` vuelve a ella si `canAccess`. Pierde el `search` (p. ej. `siteId` y `offset` de `/triage`). R19 lo completa con `pathname + search` y añade la prueba del cierre forzado por 401 (hoy solo se prueba por navegación directa).
- **`useBlocker`**: requiere router de datos; la app usa `createBrowserRouter` (`AppRouter.tsx`) y las pruebas `createMemoryRouter` (`testApp.tsx`, `renderFeature.tsx`), así que es viable sin cambiar el montaje.
- **`session.restore()`** se llama en el inicializador de `useState` de `SessionProvider.tsx:16`.
- **`subpaths`** está declarado en `roleMatrix.ts:14` (con `/recepcion/registro`, `/triage/:id`, `/atenciones/:id`) pero `canAccess` acepta cualquier `ruta + '/'`.
- **Reconexión**: los dashboards de UI-02 desactivan `refetchOnReconnect` y lo prueban (`onlineManager.setOnline` en `QueuePage.test.tsx`, `ReportsPage.test.tsx`, `ReceptionDashboard.test.tsx`, `TriageDashboard.test.tsx`, `f03Routes.test.tsx`, `encounterQueries.test.tsx`). PA-3: se mantiene y se extiende a todas las consultas; esas pruebas no cambian.
- **Privacidad del almacenamiento**: `privacy.test.tsx` R10 (`sessionStorage` = solo `asclepio.session`) y R24 (vacío tras expirar) y UI-02-web R27. PA-1: única excepción, el borrador de signos vitales (R31).

### Decisiones del usuario (chat, 2026-10-29)

- PA-1: borrador solo de signos vitales; `SymptomFindingsForm` y `PatientForm` solo con aviso.
- PA-2: caducidad de 30 minutos.
- PA-3: sin reintento automático por reconexión en ninguna consulta; UI-02-web R25 intacto.
- PA-4: trazas a F-01, F-02 y F-03 aceptadas, sin brief adicional.

### Enmiendas tras la revisión (usuario, chat, 2026-10-30)

- A1: `lazyFeatureRoutes` en lugar del `lazy` de React Router (D10, R12).
- B1: los errores de acción usan `common_error_network` y `common_error_server` con «Reintentar» (D12, R15, R17, R18); `actionErrorMessage` (`src/shared/lib/problem.ts`) deja de devolver el texto de red de acción y el genérico de acción ante red caída y 5xx. Los demás errores de acción (422, 409, 403, 404) no cambian.

## Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D1 | `useUnsavedChanges(isDirty)` en `shared/hooks` combina `useBlocker` (navegación interna) y `beforeunload` (recarga/cierre); se desactiva con una bandera durante el envío correcto y ante `session.clear('expired')`. | `window.confirm` en cada `onClick`, o `unstable_usePrompt`. | Cubre atrás/adelante y enlaces del menú en un solo punto; `usePrompt` es inestable y usa `confirm` nativo, no traducible ni con estilo propio. |
| D2 | Diálogo propio `ConfirmDialog` sobre `<dialog>` nativo con `showModal()` (foco atrapado y `Escape` del navegador), «Seguir editando» con foco inicial. | Librería de diálogos. | Sin dependencias nuevas (C3); `<dialog>` da semántica modal accesible. Foco inicial en la acción no destructiva. |
| D3 | `beforeunload` solo con `event.preventDefault()`: el navegador muestra su texto propio (no traducible). | Texto personalizado. | Los navegadores ignoran el texto propio; se documenta como limitación de plataforma. |
| D4 | Borrador con `useDraft` solo en `VitalSignsForm`: clave `asclepio.draft.vitals.<encounterId>`, valor `{ userId, encounterId, savedAt, values }` donde `values` son únicamente los campos numéricos y enumerados de signos vitales (lista blanca explícita de campos de `CreateVitalSigns`; cualquier campo de texto libre se excluye aunque el contrato lo tenga); se escribe solo al cierre forzado (suscripción a `session` con motivo `expired`), no en cada pulsación. `SymptomFindingsForm` y `PatientForm` no usan `useDraft` (PA-1). | Escribir en cada cambio; `localStorage`; IndexedDB. | Minimiza el tiempo que el dato vive en el navegador; `sessionStorage` muere con la pestaña; `localStorage` está reservado a preferencias (privacy R10/R24). |
| D5 | El borrador no se aplica solo: `DraftNotice` pide «Recuperar» o «Descartar». Validación de forma con el esquema Zod del formulario antes de ofrecerlo. | Rellenar automáticamente. | Evita que la enfermera envíe valores antiguos sin verlos. |
| D6 | Caducidad del borrador: `DRAFT_TTL_MS = 30 * 60 * 1000`, contada desde `savedAt`; se comprueba al abrir la captura y al arrancar la app (se borran las claves caducadas). | Ligarla a la vida del token. | Decisión del usuario (PA-2). |
| D7 | `errorElement: <RouteError />` en la ruta del `Layout` (públicas) y en cada hija del `AppShell` (privadas), para que el marco y la navegación sigan montados. «Reintentar» = `navigate(0)`‑equivalente vía `useRevalidator`/re‑montaje por `key`; «Volver al inicio» = `HOME_BY_ROLE`. | Un único `ErrorBoundary` en la raíz. | En la raíz se perdería la barra lateral. |
| D8 | `RouteError` distingue: fallo de `import()` diferido (R14, mensaje «no se pudo cargar la pantalla», «Reintentar» recarga el documento si el fragmento ya no existe tras un despliegue) y error de render (R8). Nunca muestra `error.message` ni traza. | Mostrar el mensaje técnico. | Privacidad (RNF-05) y claridad. |
| D9 | Título: `handle.titleKey` en cada ruta; `useDocumentTitle` en `Layout` lee `useMatches()` y escribe `${t(titleKey)} | Asclepio`. `RouteAnnouncer` (región `aria-live="polite"` visualmente oculta, única) anuncia el título al cambiar `location.key`. | `useEffect` en cada página. | Un solo punto, cubre rutas diferidas y error; WCAG 2.4.2. No se mueve el foco (cada pantalla ya gestiona su `h1`). |
| D10 | Carga diferida con `lazyFeatureRoutes` (`src/app/router/lazyFeature.tsx`) en `FEATURE_ROUTES` (un fragmento por feature: `reception`, `triage` + atenciones, `queue`, `reports`): el `import()` de la feature se hace dentro del elemento hijo de `RequireRole`, solo cuando el guard permite la ruta; mientras carga, `RouteLoading` con `role="status"` dentro del `Outlet` del `AppShell`; un `import()` rechazado llega a `RouteError` (R14). Enmienda decidida por el usuario el 2026-10-30 (A1). | El `lazy` de rutas de React Router (spec original) y `React.lazy` + `Suspense` por componente. | El `lazy` del router se resuelve al casar la ruta, antes de que rendericen los guards, así que una ruta prohibida descargaría código; `lazyFeatureRoutes` lo evita (lo cubre `lazyRoutes.test.tsx` R12–R14). Medida registrada: 712,55 → 658,28 kB, con el aviso de 500 kB aún presente (condición alternativa de R12). Si `manualChunks` hace falta para separar vendor (TanStack, RHF/Zod), se añade en `vite.config.ts` y se justifica en la medida. |
| D11 | Medida del build: `npm run build` antes (en el commit de partida) y después, registrando tamaño bruto y gzip de cada fragmento en `docs/ui-robustness-verification.md`. | Medir solo después. | R12 exige comparar. |
| D12 | Clasificador `classifyError(error | response)` en `shared/lib/errors.ts`: `TypeError` de `fetch` → `network`; 5xx → `server`; 401 → `session`; 403 → `forbidden`; resto → `problem` (sigue el mapeo actual de `problem.ts`). `PanelState`, `LoadError` y los errores de acción usan los textos `common_error_network` y `common_error_server`; en las acciones con «Reintentar» que repite el envío solo al pulsarlo (B1, 2026-10-30). | Tratar todo error como genérico. | R15 y R18 piden textos distintos; se reaprovecha la tubería existente. |
| D13 | Sin reintento por reconexión: `refetchOnReconnect: false` como valor por defecto del `QueryClient` (ya lo tienen los dashboards); mutaciones con `retry: 0` y `networkMode: 'always'` para que fallen de inmediato y no queden en pausa hasta reconectar (R16, R17). La recuperación es siempre «Reintentar» o el intervalo de UI-02-web R24. | Reintentar al reconectar las consultas en error. | Decisión del usuario (PA-3), coherente con UI-02-web R25; reenviar una captura podría duplicar mediciones (F-03.AC1). |
| D14 | Ruta de origen: `state.from = pathname + search` en `RequireSession`; `LoginRoute` valida con `canAccess` sobre el `pathname` y conserva el `search`. No se guarda nada en almacenamiento (el `state` del historial basta). | Guardar la ruta en `sessionStorage`. | Privacidad R10/R24; el `search` solo lleva `siteId`/`offset`/filtros, sin datos personales. |
| D15 | Anti‑literales: prueba `src/test/noUiLiterals.test.ts` que recorre `src/**/*.tsx` (sin pruebas) con el parser de TypeScript (ya dependencia de desarrollo) y falla ante `JSXText` con letras o atributos `aria-label`, `title`, `placeholder`, `alt` con cadena literal, y ante cadenas con letras pasadas a `setError`/mensajes mostrados. Excepciones explícitas en un arreglo con motivo: la marca «Asclepio», nombres de idioma en su propia lengua del selector, códigos técnicos. | Regla ESLint (`react/jsx-no-literals`). | Exigiría `eslint-plugin-react` (dependencia nueva); la prueba usa `typescript`, ya instalado. |
| D16 | `canAccess(role, path)` acepta `route.path` exacto o un patrón de `subpaths` (`:id` = un segmento no vacío); se elimina la aceptación genérica de `ruta + '/'`. Se usa en vez de borrar `subpaths`. | Borrar `subpaths`. | Denegar por defecto (RNF-12, F-01.AC3) y la matriz ya los declara. |
| D17 | 422 del alta NN: si el error de campo es de edad estimada (o de un campo sin mensaje propio), se muestra el genérico existente de datos no válidos, no el de «fecha de nacimiento futura». | Texto nuevo específico. | Petición del reviewer de F-02; no introduce reglas clínicas. |
| D18 | `session.restore()` se llama una vez en la carga del módulo `shared/api/session.ts` (o en `main.tsx` antes de `createRoot`); `SessionProvider` lee con `useSyncExternalStore`. | Dejarlo en `useState`. | El render debe ser puro; `StrictMode` lo ejecuta dos veces. |
| D19 | Estabilidad de la suite (R28): primero diagnosticar con `vitest --reporter=verbose` y tiempos por prueba bajo `./init.sh`. Medidas permitidas: temporizadores falsos donde haya esperas reales, `findBy*` con condiciones precisas en lugar de bucles de sondeo, dividir pruebas que recorren muchos roles en `it.each`, `pool`/`maxWorkers` en `vitest.config` si la contención de CPU es la causa, y como último recurso `timeout` explícito **por prueba** con comentario de motivo. Prohibido: subir `testTimeout` global, borrar, `skip` o relajar aserciones. | Subir `testTimeout` global. | Pedido expreso del usuario: estabilidad sin debilitar. |
| D20 | Mover `src/app/router/testApp.tsx` a `src/test/testApp.tsx` y actualizar imports; prefijar `describe('F-01-web …')`/`describe('F-02-web …')` en `problem.test.ts`; `onCancelled: () => void`; borrar `EventActorType`. | — | Deuda de revisión de F-01/F-02. |
| D21 | Identidad visual: los componentes nuevos reutilizan clases y tokens de `index.css`/`dashboard.css` (`.notice`, `.button`, `PanelState`); el CSS nuevo va en `dashboard.css` o en un `robustness.css` importado tras él, sin colores literales. | Estilos nuevos. | R29: no cambiar el aspecto aprobado en UI-01/UI-02. |

## Impacto en contrato

Sin impacto en contrato. Consume 0.4.0; no se regeneran tipos (`npm run api:types` sin diff) ni se añaden peticiones.

## Impacto en datos

Sin impacto en datos (sin migraciones; la web no tiene base de datos). Único cambio de almacenamiento del navegador: claves `asclepio.draft.vitals.<encounterId>` en `sessionStorage`, solo con signos vitales (PA-1), caducidad de 30 minutos (PA-2), nunca enviadas por red. Enmienda mínima (R31):

- `privacy.test.tsx` R10: sin cambio de aserción (tras un login normal sigue habiendo solo `asclepio.session`).
- `privacy.test.tsx` R24 (expiración): `sessionStorage` vacío **salvo** claves que casen con `^asclepio\.draft\.vitals\.[0-9a-f-]{36}$`, cuyo valor solo tenga `userId`, `encounterId`, `savedAt` y `values` con campos de la lista blanca de D4; la prueba existente (sin captura abierta) sigue esperando `[]`, y se añade un caso con signos vitales sin guardar.
- UI-02-web R27 y su prueba en `dashboards.test.tsx`: se admite esa misma clave; la aserción de que no hay nombres, documentos, fechas de nacimiento ni motivos se mantiene sobre todo `sessionStorage`.

## Plan i18n (claves nuevas, cinco catálogos)

`common`: `unsaved_title`, `unsaved_body`, `unsaved_leave`, `unsaved_stay`, `draft_found`, `draft_restore`, `draft_discard`, `route_error_title`, `route_error_body`, `route_chunk_error_body`, `route_retry`, `route_home`, `route_loading`, `title_suffix` (no se traduce «Asclepio»), `title_<pantalla>` solo donde no haya ya clave de navegación reutilizable, `error_network`, `error_server`. `features`: `encounter_cancel_closed` (literal de `CancelEncounterForm.tsx:17`) y las que salgan de la búsqueda de literales (T9). El `implementer` traduce en, pt, fr y de con los parámetros intactos.

## Pruebas existentes que cambian

- `privacy.test.tsx` R24 y la prueba de UI-02-web R27: solo la excepción de «Impacto en datos»; R10 sin cambios.
- Pruebas de UI-02 con `onlineManager.setOnline`: sin cambios (PA-3).
- `routes.test.tsx`/pruebas de `canAccess`: añadir casos de subrutas no declaradas (denegadas); los casos permitidos no cambian.
- Imports de `renderApp` (todas las pruebas de `src/app/router/`).
- `problem.test.ts`: solo los nombres de `describe`.
- `f02Transversal.test.tsx` R40 (×2) y `ClinicalCaptureForms.test.tsx` R11: solo `delay: null` de `userEvent` (D19), con las mismas aserciones. `f03Routes.test.tsx` R3 no cambió.
- `f03Routes.test.tsx` R5 (ya adaptada): solo se añade el clic en «Salir sin guardar» antes de las mismas aserciones, como exige R1.
- Helper de `SessionProvider.test.tsx`: llama a `session.restore()` antes de montar (D18).
- `src/test/renderFeature.tsx` y `src/test/testApp.tsx`: `createQueryClient` (valores de D13) y `preloadFeatures` (mecánica del arnés para R28; la carga diferida real se prueba en `lazyRoutes.test.tsx`).
- Pruebas de F-02 (y de F-03) que afirmaban el texto de red de acción («No se pudo conectar con el servidor…») o el genérico de acción con un 5xx: pasan a `common_error_network` y `common_error_server` por B1. Solo cambia el texto esperado; el resto de aserciones no cambia:
  - `src/shared/lib/problem.test.ts`::`R27: sin respuesta HTTP da el mensaje de conexión` (espera la clave `common_error_network`); `R36: cualquier otro error da el mensaje genérico` (el caso 500 sale de la tabla y pasa a la prueba nueva `R36: un 5xx da la clave del texto del servidor (UI-03-web B1)`; 400 y 429 siguen con el genérico).
  - `src/features/reception/components/DirectRegistrationPage.test.tsx`::`R19: si la búsqueda falla muestra un error de acción` (casos 500 y red); `R23: ante otro error muestra un error de acción y conserva lo escrito` (casos 500 y red); `R27: ante %s muestra el error de acción sin enlace y conserva lo escrito` (caso 500).
  - `src/features/reception/components/ReceptionPage.test.tsx`::`R13: ante otro error muestra el error de acción` (casos red y 500; el 422 sigue con el genérico); `R16: con %i muestra …` (caso 500).
  - `src/features/triage/components/EncounterDetailPage.test.tsx`::`R36: ante otro error muestra un error de acción` (casos 500 y red).
  - `src/features/triage/components/ClinicalCaptureForms.test.tsx`::`R18: keeps drafts after network failure and permits only a manual new attempt` (texto de red).
  - Del propio slice: `DirectRegistrationPage.test.tsx`::`R20` (texto de red en inglés) y `networkErrors.test.tsx`::`R17` (texto de red y «Reintentar»).

## Riesgos y pruebas

- **Unitarias** (`shared/hooks`, `shared/lib`): `useUnsavedChanges` (bloquea con `isDirty`, no tras envío correcto ni cierre forzado; añade y retira `beforeunload`), `useDraft` (escritura solo en cierre forzado, solo campos de la lista blanca, clave por atención y usuario, caducidad a los 30 min con temporizadores falsos (29:59 vigente, 30:01 borrado), descarte, borrado al logout voluntario, sin escritura en consola), `classifyError`, `canAccess`, `useDocumentTitle`.
- **Integración** (`renderApp` con `fakeApi` en la frontera de red): navegar con cambios desde la captura y el alta → diálogo; 401 durante la captura → login con «sesión expirada» → login → vuelve a `/triage/{id}?…` → aviso de borrador → recuperar; ruta que lanza (componente de prueba inyectado vía `routes` de prueba) → `RouteError` dentro del marco; `lazy` que rechaza → R14; red caída → `error_network`, 5xx → `error_server`, reconexión sin ninguna petición nueva hasta «Reintentar»; mutación con red caída no se reenvía; `document.title` y región viva en los cinco idiomas; regla anti‑literales.
- **Build**: medida antes/después (R12) y comprobación del aviso en la salida de `vite build`.
- **Manual** (docs/verification.md): recorrido contra la API real local `http://localhost:3000` (contrato 0.4.0) con los cuatro roles: aviso de cambios, recarga, expiración forzada (token de vida corta o revocación) con borrador, error de ruta, caída del servidor y reconexión (detener y arrancar la API), títulos de pestaña, carga diferida en red lenta (DevTools), y capturas antes/después `docs/ui-evidence/ui03-*`.
- **Riesgos**: el borrador de signos vitales vive hasta 30 min en `sessionStorage` sin identidad (aceptado, PA-1/PA-2); `useBlocker` y `beforeunload` en pruebas con jsdom (se simulan con `dispatchEvent(new Event('beforeunload', { cancelable: true }))`); el fragmento de vendor puede seguir sobre 500 kB (R12 admite reducción medida); la división en fragmentos cambia tiempos de las pruebas de rutas (las pruebas esperan con `findBy*`).
