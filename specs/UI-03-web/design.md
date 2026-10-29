# UI-03-web — Diseño

## Resumen

Slice transversal de robustez sobre la web existente, sin pantallas nuevas ni cambios de contrato. Capas (según `docs/architecture.md`):

- `app/router/`: `errorElement` por ruta, rutas diferidas (`lazy`), título por pantalla en `handle`, vuelta a la ruta de origen, `canAccess` con `subpaths`.
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
- **Reconexión**: los dashboards de UI-02 desactivan `refetchOnReconnect` y lo prueban (`onlineManager.setOnline` en `QueuePage.test.tsx`, `ReportsPage.test.tsx`, `ReceptionDashboard.test.tsx`, `TriageDashboard.test.tsx`, `f03Routes.test.tsx`, `encounterQueries.test.tsx`). Ver PA-3.
- **Privacidad del almacenamiento**: `privacy.test.tsx` R10 (`sessionStorage` = solo `asclepio.session`) y R24 (vacío tras expirar) y UI-02-web R27. Ver PA-1.

## Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D1 | `useUnsavedChanges(isDirty)` en `shared/hooks` combina `useBlocker` (navegación interna) y `beforeunload` (recarga/cierre); se desactiva con una bandera durante el envío correcto y ante `session.clear('expired')`. | `window.confirm` en cada `onClick`, o `unstable_usePrompt`. | Cubre atrás/adelante y enlaces del menú en un solo punto; `usePrompt` es inestable y usa `confirm` nativo, no traducible ni con estilo propio. |
| D2 | Diálogo propio `ConfirmDialog` sobre `<dialog>` nativo con `showModal()` (foco atrapado y `Escape` del navegador), «Seguir editando» con foco inicial. | Librería de diálogos. | Sin dependencias nuevas (C3); `<dialog>` da semántica modal accesible. Foco inicial en la acción no destructiva. |
| D3 | `beforeunload` solo con `event.preventDefault()`: el navegador muestra su texto propio (no traducible). | Texto personalizado. | Los navegadores ignoran el texto propio; se documenta como limitación de plataforma. |
| D4 | Borrador con `useDraft(key)`: clave `asclepio.draft.<form>.<encounterId?>`, valor `{ userId, savedAt, values }`; se escribe solo al cierre forzado (suscripción a `session` con motivo `expired`), no en cada pulsación. Contenido sujeto a PA-1 (propuesta: solo captura clínica estructurada, sin texto libre ni identidad; `PatientForm` sin borrador). | Escribir en cada cambio; `localStorage`; IndexedDB. | Minimiza el tiempo que el dato vive en el navegador; `sessionStorage` muere con la pestaña; `localStorage` está reservado a preferencias (privacy R10/R24). |
| D5 | El borrador no se aplica solo: `DraftNotice` pide «Recuperar» o «Descartar». Validación de forma con el esquema Zod del formulario antes de ofrecerlo. | Rellenar automáticamente. | Evita que la enfermera envíe valores antiguos sin verlos. |
| D6 | Caducidad del borrador: constante `DRAFT_TTL_MS` cuyo valor fija PA-2. | Elegir un valor aquí. | Es una decisión de producto/privacidad; no se inventa. |
| D7 | `errorElement: <RouteError />` en la ruta del `Layout` (públicas) y en cada hija del `AppShell` (privadas), para que el marco y la navegación sigan montados. «Reintentar» = `navigate(0)`‑equivalente vía `useRevalidator`/re‑montaje por `key`; «Volver al inicio» = `HOME_BY_ROLE`. | Un único `ErrorBoundary` en la raíz. | En la raíz se perdería la barra lateral. |
| D8 | `RouteError` distingue: fallo de `import()` diferido (R14, mensaje «no se pudo cargar la pantalla», «Reintentar» recarga el documento si el fragmento ya no existe tras un despliegue) y error de render (R8). Nunca muestra `error.message` ni traza. | Mostrar el mensaje técnico. | Privacidad (RNF-05) y claridad. |
| D9 | Título: `handle.titleKey` en cada ruta; `useDocumentTitle` en `Layout` lee `useMatches()` y escribe `${t(titleKey)} | Asclepio`. `RouteAnnouncer` (región `aria-live="polite"` visualmente oculta, única) anuncia el título al cambiar `location.key`. | `useEffect` en cada página. | Un solo punto, cubre rutas diferidas y error; WCAG 2.4.2. No se mueve el foco (cada pantalla ya gestiona su `h1`). |
| D10 | Carga diferida con `lazy` de rutas de React Router en `FEATURE_ROUTES` (un fragmento por feature: `reception`, `triage` + atenciones, `queue`, `reports`); `HydrateFallback`/`RouteLoading` con `role="status"` dentro del `Outlet` del `AppShell`. | `React.lazy` + `Suspense` por componente. | La API `lazy` del router carga antes de renderizar y se integra con `errorElement` (R14); los guards (`RequireRole`) siguen en el fragmento inicial, así una ruta prohibida no descarga código. Si `manualChunks` hace falta para separar vendor (TanStack, RHF/Zod), se añade en `vite.config.ts` y se justifica en la medida. |
| D11 | Medida del build: `npm run build` antes (en el commit de partida) y después, registrando tamaño bruto y gzip de cada fragmento en `docs/ui-robustness-verification.md`. | Medir solo después. | R12 exige comparar. |
| D12 | Clasificador `classifyError(error | response)` en `shared/lib/errors.ts`: `TypeError` de `fetch` → `network`; 5xx → `server`; 401 → `session`; 403 → `forbidden`; resto → `problem` (sigue el mapeo actual de `problem.ts`). `PanelState`, `LoadError` y los errores de acción usan los textos `error_network` y `error_server`. | Tratar todo error como genérico. | R15 y R18 piden textos distintos; se reaprovecha la tubería existente. |
| D13 | Reconexión: `onlineManager` decide; el alcance (solo consultas en error; dashboards incluidos o no) lo fija PA-3. Mutaciones con `retry: 0` y `networkMode` que no las reenvía al reconectar (R17). | Reintentar todo, incluidas las mutaciones. | Reenviar una captura clínica podría duplicar mediciones (F-03.AC1: cada medición es una inserción). |
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

Sin impacto en datos (sin migraciones; la web no tiene base de datos). Único cambio de almacenamiento del navegador: claves `asclepio.draft.*` en `sessionStorage`, condicionadas a PA-1, con caducidad PA-2, nunca enviadas por red. Si PA-1 se aprueba, se enmiendan `privacy.test.tsx` R10 y R24 (solo para admitir la clave del borrador con el contenido aprobado) y la comprobación de UI-02-web R27; la enmienda se lista en «Pruebas existentes que cambian».

## Plan i18n (claves nuevas, cinco catálogos)

`common`: `unsaved_title`, `unsaved_body`, `unsaved_leave`, `unsaved_stay`, `draft_found`, `draft_restore`, `draft_discard`, `route_error_title`, `route_error_body`, `route_chunk_error_body`, `route_retry`, `route_home`, `route_loading`, `title_suffix` (no se traduce «Asclepio»), `title_<pantalla>` solo donde no haya ya clave de navegación reutilizable, `error_network`, `error_server`. `features`: `encounter_cancel_closed` (literal de `CancelEncounterForm.tsx:17`) y las que salgan de la búsqueda de literales (T9). El `implementer` traduce en, pt, fr y de con los parámetros intactos.

## Pruebas existentes que cambian

- `privacy.test.tsx` R10 y R24: solo si PA-1 aprueba borradores (admitir `asclepio.draft.*` con el contenido aprobado; el resto de aserciones intactas).
- Pruebas de UI-02 con `onlineManager.setOnline` (seis archivos citados arriba): solo si PA-3 elige (a).
- `routes.test.tsx`/pruebas de `canAccess`: añadir casos de subrutas no declaradas (denegadas); los casos permitidos no cambian.
- Imports de `renderApp` (todas las pruebas de `src/app/router/`).
- `problem.test.ts`: solo los nombres de `describe`.
- `f02Transversal.test.tsx` R40 y `f03Routes.test.tsx` R3: solo cambios de mecánica de espera (D19), con las mismas aserciones.

## Riesgos y pruebas

- **Unitarias** (`shared/hooks`, `shared/lib`): `useUnsavedChanges` (bloquea con `isDirty`, no tras envío correcto ni cierre forzado; añade y retira `beforeunload`), `useDraft` (escritura solo en cierre forzado, clave por usuario y atención, caducidad con temporizadores falsos, descarte, borrado al logout voluntario, sin escritura en consola), `classifyError`, `canAccess`, `useDocumentTitle`.
- **Integración** (`renderApp` con `fakeApi` en la frontera de red): navegar con cambios desde la captura y el alta → diálogo; 401 durante la captura → login con «sesión expirada» → login → vuelve a `/triage/{id}?…` → aviso de borrador → recuperar; ruta que lanza (componente de prueba inyectado vía `routes` de prueba) → `RouteError` dentro del marco; `lazy` que rechaza → R14; red caída → `error_network`, 5xx → `error_server`, reconexión según PA-3; mutación con red caída no se reenvía; `document.title` y región viva en los cinco idiomas; regla anti‑literales.
- **Build**: medida antes/después (R12) y comprobación del aviso en la salida de `vite build`.
- **Manual** (docs/verification.md): recorrido contra la API real local `http://localhost:3000` (contrato 0.4.0) con los cuatro roles: aviso de cambios, recarga, expiración forzada (token de vida corta o revocación) con borrador, error de ruta, caída del servidor y reconexión (detener y arrancar la API), títulos de pestaña, carga diferida en red lenta (DevTools), y capturas antes/después `docs/ui-evidence/ui03-*`.
- **Riesgos**: `useBlocker` y `beforeunload` en pruebas con jsdom (se simulan con `dispatchEvent(new Event('beforeunload', { cancelable: true }))`); el fragmento de vendor puede seguir sobre 500 kB (R12 admite reducción medida); la división en fragmentos cambia tiempos de las pruebas de rutas (las pruebas esperan con `findBy*`).
