# UI-04-web — Diseño

## Resumen

Pulido de presentación y un defecto de navegación sobre pantallas existentes, sin pantallas, endpoints ni dependencias nuevas. Capas (según `docs/architecture.md`):

- `app/router/`: `RequireSession` (H1), `routesFor` en `roleMatrix.ts` (H12) y el avatar de `AppShell` (H15).
- `shared/ui/`: `EncounterStatusBadge` (envoltorio de `StatusBadge`, H5), `PendingStrip` sin la prop `feature` (H8), `Notice` con foco opcional (H14).
- `shared/lib/`: `initialOf(fullName)` (H15).
- `features/triage/`: `EncounterListPage` (H2, H5, H6), `EncounterDetailPage` y `CancelEncounterForm` (H3, H5), `EncounterTimeline` (H4), `ClinicalCapturePage` (H5), `VitalSignsForm` (H9, H10, H14), `SymptomFindingsForm` (H11, H14), `ClinicalCaptureHistory` (H9).
- `features/reception/`: `DirectRegistrationPage`, `PatientForm` (H7).
- `features/queue/`, `features/reports/`: dejan de pasar `feature` a `PendingStrip` (H8).
- CSS: `src/index.css` (timeline, `.cancel`, `.form-grid`, campos `readonly`, `.clinical-finding`, marca en tema oscuro). `src/shared/ui/dashboard.css` no cambia.
- Catálogos: `messages/common/*.json` y `messages/features/*.json` (cinco idiomas).

### Componentes y clases que se reutilizan (localizados en `src/`)

| Pieza | Ubicación | Uso en este slice |
|---|---|---|
| `StatusBadge` + `ENCOUNTER_STATUS_VIEW` + `ENCOUNTER_STATUS_LABELS` | `src/shared/ui/StatusBadge.tsx`, `src/shared/lib/encounterStatus.ts`, `src/shared/lib/labels.ts` | Insignia de estado (R6), como en `QueuePage.tsx:129` |
| `DashboardPage`, `PageHeader`, `Panel`, `DataTable`/`DataRow`/`DataCell` | `src/shared/ui/` | Estructura de `/atenciones` (R3, R7); `PageHeader` en `/recepcion/registro` (R8) |
| Paginador de UI-02 (`.pager`, `button button--secondary button--sm`, chevrones) | `src/features/triage/components/TriageTrayPage.tsx:200-233`, `dashboard.css` `.pager` | Pie de `/atenciones` (R7) |
| `formatTimeBogota`, `formatDateBogota` | `src/shared/lib/datetime.ts` | Llegada en `/atenciones` (R7) |
| `button--secondary` | `src/index.css:368` | R4, R8, R13 |
| `status status--warn` | `src/index.css:829-846` | Aviso PROVISIONAL (R12) |
| `Notice` | `src/shared/ui/Notice.tsx` | Aviso de éxito enfocable (R16) |
| `.clinical-fields` (dos columnas, una bajo 640 px) | `src/index.css:2349`, `:2402` | Rejilla del alta de paciente (R9) |
| `.toolbar` | `src/index.css` | Filtros de `/atenciones` (R7) |
| `PendingStrip` | `src/shared/ui/PendingStrip.tsx` | Texto neutral (R10) |
| Patrón de cabecera con «Volver» (`ArrowLeftIcon` + `button button--secondary`) | `ClinicalCapturePage.tsx:84-90` | «Volver a Recepción» (R8) |

### H1 — causa del defecto

`AppShell.onLogout` (`src/app/router/AppShell.tsx:29-33`) llama primero a `logout()` (`session.clear('logout')`, que emite de forma síncrona al almacén de sesión) y después a `navigate('/login', { replace: true })`. Al emitir, `useSyncExternalStore` vuelve a renderizar `RequireSession` (`src/app/router/RequireSession.tsx:13-22`) con `staff.status === 'none'` mientras la ubicación sigue siendo la ruta privada, y su `<Navigate to="/login" replace state={{ from: pathname + search }}>` gana a la navegación de `AppShell`. `LoginRoute` (`src/app/router/LoginRoute.tsx:21-28`) usa luego ese `from` para el siguiente usuario si `canAccess` lo permite. El mismo `from` aparece de forma determinista si, tras cerrar sesión, se pulsa «Atrás» hacia una ruta privada (la prueba `AppShell.test.tsx` R22 ya lo recorre, pero no comprueba el `state`). Ninguna prueba actual inicia sesión con otro usuario después de un cierre voluntario, por eso el defecto pasó.

El motivo del cierre ya está en memoria: `session.getSnapshot().endReason` vale `'logout'` desde `logout()` hasta el siguiente intento de login (`LoginPage` llama a `session.dismissEndReason()` al enviar), y `'expired'` tras un cierre forzado. Tras una recarga vale `null` (un marcador o un enlace directo sin sesión).

## Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D1 | `RequireSession` omite `state.from` cuando `endReason === 'logout'`; con `'expired'`, `'patient'` o `null` lo conserva como hoy (R1, R2). `RequireSession` lee `endReason` con `useSession()` (`src/features/auth/useSession.ts`, ya importado por `useStaff`; `app/` puede depender de `features/`). `AppShell.onLogout` no cambia. | (a) Invertir el orden en `onLogout` (`navigate` antes de `logout()`): con la sesión viva, `LoginRoute` redirige al inicio del rol y crea otra carrera, y no cubre «Atrás». (b) Marcar el cierre voluntario en `sessionStorage`: rompe `privacy.test.tsx` R10. (c) Que `LoginRoute` ignore `from`: no distingue el cierre forzado (UI-03-web R19). | No depende del orden de los efectos, cubre «Atrás» y no toca almacenamiento ni el flujo de expiración. |
| D2 | `/atenciones` se monta con `DashboardPage` (`header` = `PageHeader` con `feature_encounters` y `feature_encounters_lead`; `summary` = el `.toolbar` actual con «Estado» y «Sede»; `main` = `Panel` con `h2` `feature_encounters_results`), sin `LiveNote` ni refresco automático (la lista no tiene intervalo hoy). Los estados de carga, vacío, error y 403 siguen siendo `LoadingState`, el párrafo vacío, `LoadError` y `ViewForbidden` dentro del cuerpo del panel. | Arreglar solo el desborde con CSS sobre `.table-wrap`. | El `Panel` tiene `container: panel / inline-size` (la tabla deja de imponer su ancho mínimo a la rejilla del marco, causa probable del `scrollWidth` 551) y `DataTable` se apila bajo 40 rem: resuelve H2 y H6 con piezas ya aprobadas. Conservar los componentes de estado mantiene las pruebas de F-02-web R30. |
| D3 | Columnas de `/atenciones`: Paciente (`cell-name` y `cell-sub` con el documento), Sede, Llegada (`DataCell kind="time"`: `formatTimeBogota` y debajo `formatDateBogota`), Estado (`EncounterStatusBadge`), Origen, acción (`Link` `button button--secondary button--sm` con `aria-describedby` al nombre). El documento deja de ser columna propia. | Mantener siete columnas con la fecha completa con segundos. | Menos columnas y la hora sin segundos (UI-02.AC12) evitan los saltos de línea de H6; F-02-web R29 exige los datos, no el orden ni el formato de segundos. |
| D4 | Pie de `/atenciones`: `clinical_page` («Página N») y `.pager` con `feature_previous`/`feature_next`, copiados de `TriageTrayPage`; reglas de `disabled` de F-02-web R30 sin cambio. | Ocultar el paginador con una sola página. | Pedido explícito de H6: igual que el de UI-02. |
| D5 | `EncounterStatusBadge({ status })` en `src/shared/ui/` compone `StatusBadge` + `ENCOUNTER_STATUS_VIEW` + `ENCOUNTER_STATUS_LABELS`; se usa en `/atenciones`, en el `dd` de estado del detalle y del contexto de captura. `QueuePage` puede seguir con `StatusBadge` directo (no se toca). | Repetir las tres piezas en cada pantalla. | Un único punto, sin lógica de dominio nueva (ya está en `shared/lib`). |
| D6 | H3: el botón que abre la cancelación y «Volver» pasan a `button button--secondary`; «Confirmar cancelación» sigue como botón principal del paso de confirmación. `.cancel` pasa de `margin: 1.5rem 0 0` a `margin: 1.5rem 0`. | Crear una variante `button--danger`. | No existe variante destructiva; crearla es estilo nuevo y no hace falta para la demo. |
| D7 | H4: cada `li` de la línea de tiempo es `<time>` (en bloque, `muted`) + `<p><strong>{evento}</strong> ({desde} → {hasta})</p>` + `<p className="muted">{actor}</p>`, usando la regla existente `.timeline li p`; se añade solo `display: block` a `.timeline time`. La hora sigue con `formatBogota` (con segundos, registro legal de F-02-web R32). | Cambiar el formato de hora del detalle. | El defecto es el separador, no la hora; las pruebas de F-02-web R32 y R39 del detalle no cambian. |
| D8 | H7: `DirectRegistrationPage` se envuelve en `.dashboard > .stack` con `PageHeader` (`feature_registration_direct`, `feature_registration_direct_lead`, acción `Link` `button button--secondary` con `ArrowLeftIcon` y `feature_reception_back` a `/recepcion`) y debajo la `section.card` actual (sin su `h1`, con `aria-label` = `feature_registration_direct`). «Registrar paciente NN» pasa a `button button--secondary` y se mueve justo después de `PatientSearch`. | Dejar el `h1` dentro de la tarjeta y añadir un párrafo. | `PageHeader` depende de las variables `--s*` de `.dashboard`; reutiliza el encabezado de los dashboards y de la captura. |
| D9 | H7: `PatientForm` envuelve sus campos en un `div.form-grid`; `.form-grid` se añade a la lista de selectores de las dos reglas de `.clinical-fields` (base y `@media (max-width: 639px)`), sin declaraciones nuevas. Los dos `input[readonly]` del documento llevan la regla `.field input[readonly]` cambiada a borde transparente, fondo transparente y `padding-inline: 0`, conservando `label`, `readonly` y `FieldMessage`. | Sustituirlos por un `dl`: cambia las pruebas de F-02-web que los buscan por etiqueta y pierde el sitio de los errores 400 por campo. | Mínimo cambio y sin tocar la lógica del formulario. |
| D10 | H8: `PendingStrip` pierde la prop `feature`; `common_pending` cambia de texto y pierde el parámetro `{feature}` en los cinco catálogos (misma clave, que sigue en `REUSED_KEYS` de `dashboards.test.tsx`). Textos: es «Esta funcionalidad aún no está disponible.», en «This feature is not available yet.», pt «Esta funcionalidade ainda não está disponível.», fr «Cette fonctionnalité n'est pas encore disponible.», de «Diese Funktion ist noch nicht verfügbar.». | Clave nueva y borrar la anterior. | Menos cambios; el parámetro desaparece igual en los cinco (`i18n:check`). |
| D11 | H9 (PA-1 opción b, 2026-11-06: solo letras). **Formulario:** se conserva el `select` nativo de `consciousness` en `VitalSignsForm` (mismo `id`, etiqueta, `option` con la letra como texto y como `value`, `register`, `aria-invalid` y `aria-describedby`) y solo se le añade la clase `clinical-select--letters`, con una regla nueva en `index.css`: `justify-self: start; width: auto; min-width: 6rem; font-weight: 600;`. **«Tomas registradas»:** en `ClinicalCaptureHistory`, el `dd` de `consciousness` envuelve la letra en `<span className="badge tone--neutral">` (clases existentes de `dashboard.css`, cargado globalmente en `main.tsx`); el resto de campos no cambia. Sin claves de catálogo nuevas. | Grupo de radios nativos estilizados como segmentos (`fieldset` + `legend` + cinco `input type="radio"`). | El grupo rompe pruebas aprobadas de F-03 y UI-03 que tratan el control como un `select` etiquetado: `user.selectOptions(getByLabelText(/Nivel de conciencia/), 'A')` en `f03Routes.test.tsx` (×2), `networkErrors.test.tsx`, `unsavedChanges.test.tsx` y `vitalsDraft.test.tsx`, y `toHaveValue('')` en `ClinicalCaptureForms.test.tsx` R7 (una `legend` no da nombre a un control con `getByLabelText`). Además obligaría a revisar el foco del primer error (F-03-web R8, `setFocus`) y la restauración del borrador (`setValue`, UI-03-web R5). El `select` con estilo cumple H9 sin tocar ninguna prueba ni la lógica. La insignia es neutra para no asociar un color a un nivel clínico. |
| D12 | H10: el `<p className="muted">` de `clinical_provisional` pasa a `<p className="status status--warn">`, sin `role`. | `role="alert"`. | Es un aviso estático: anunciarlo como alerta en cada montaje sería ruido. |
| D13 | H11: regla nueva `.clinical-finding > .button { justify-self: start; }`. | `button--sm`: solo existe dentro de `.dashboard`. | Una declaración; el botón ya es secundario. |
| D14 | H12: `routesFor(role)` devuelve la ruta de `HOME_BY_ROLE[role]` primero y el resto en el orden de `ROLE_ROUTES`. `canAccess` no cambia (usa `some`). | Reordenar `ROLE_ROUTES`. | Reordenar la matriz movería «Reportes» antes de «Cola priorizada» para NURSE/PHYSICIAN sin motivo y cambia el orden de `buildRoutes`. |
| D15 | H13: token `--brand-mark-bg` en `:root` (= `var(--card)`, el valor actual) y en `:root[data-theme='dark']` (= `var(--fg)`, casi blanco en todos los modos oscuros); la regla `.brand__mark` (`index.css:1433`) usa `background: var(--brand-mark-bg)`. Afecta igual a la marca de la cabecera pública en tema oscuro, que usa el mismo `Brand`. | Filtro CSS `invert()` sobre el PNG. | El logotipo es azul pizarra oscuro sobre transparente (`public/images/asclepio-mark.png`); una placa clara da contraste sin tocar la imagen ni el tema claro. |
| D16 | H14: `Notice` acepta `autoFocus?: boolean`; con él añade `tabIndex={-1}` y enfoca el nodo al montarse (`useRef` + `useEffect`). Sin la prop el marcado es idéntico (la prueba `dashboard.test.tsx` R12 «Notice sin icono conserva exactamente su marcado» no cambia). `VitalSignsForm` y `SymptomFindingsForm` pasan `autoFocus` a su `Notice` de éxito. | Enfocar el `h2` del formulario. | El foco cae en `body` porque el `fieldset` y el botón se deshabilitan durante el envío; el aviso es el resultado de la acción. |
| D17 | H15: `initialOf(fullName)` en `src/shared/lib/initials.ts`: primera palabra que no termina en «.», primera letra en mayúscula; si no hay ninguna, el primer carácter del nombre. `AppShell` lo usa en `.shell__avatar`. | Lista de títulos («Dr.», «Dra.», «Lic.»…). | No depende del idioma ni de una lista que mantener. |
| D18 | H16 fuera (ver `requirements.md`). | Cambiar `retry` en `QUERY_DEFAULTS`. | Cambia el comportamiento global aprobado en UI-02/UI-03. |

## Impacto en contrato

Sin impacto en contrato. Consume 0.4.0; `npm run api:types` sin diff, sin peticiones nuevas.

## Impacto en datos

Sin impacto en datos (sin migraciones; la web no tiene base de datos). Sin cambios en `sessionStorage` ni `localStorage`: el motivo del cierre ya vive en memoria (D1).

## Plan i18n (cinco catálogos: es, en, pt, fr, de)

- Nuevas en `messages/features/*.json`: `feature_encounters_lead` (es «Consulta las atenciones por estado y sede.»), `feature_encounters_results` (es «Resultados»), `feature_registration_direct_lead` (es «Busca al paciente por documento, regístralo si no existe y registra su llegada.»), `feature_reception_back` (es «Volver a Recepción»). El `implementer` traduce en, pt, fr y de.
- Cambia en `messages/common/*.json`: `common_pending` (textos de D10, sin parámetro).
- H9 no añade claves (PA-1 opción b: solo letras).
- El aviso PROVISIONAL (`clinical_provisional`) no cambia en ningún idioma.

## Pruebas existentes que cambian

Solo cambia lo esperado por la presentación descrita; el resto de aserciones no cambia. Si otra prueba falla, el `implementer` para y lo anota (`docs/specs.md` §5).

- `src/app/router/AppShell.test.tsx`::`R21: $role ve su nombre, su rol en español, "Cerrar sesión" y solo sus enlaces` — caso ADMIN: `['Reportes', 'Cola priorizada', 'Atenciones']` (R14).
- `src/shared/ui/dashboard.test.tsx`::`R18: PendingStrip no tiene botones, enlaces ni formularios, y lleva la insignia y la frase de «pendiente»` — sin la prop `feature` y con «Esta funcionalidad aún no está disponible.»; y el ayudante que monta un `PendingStrip` con `feature="F-07"` (línea 81) pierde la prop (R10).
- `src/features/queue/components/QueuePage.test.tsx`::`R18: nombra la funcionalidad de F-06 y no tiene acciones, niveles, tiempos ni gráficos` — espera el texto neutral; el nombre de la prueba cambia a «muestra el texto neutral de pendiente…» (R10).
- `src/features/reports/components/ReportsPage.test.tsx`::`R18: nombra la funcionalidad de F-07 y no tiene acciones, cifras de reportes ni gráficos` — igual que la anterior (R10).
- `src/features/triage/components/EncounterListPage.test.tsx`::`R29: muestra cada atención en el orden recibido con llegada, paciente, documento, sede, estado, origen y enlace` — la llegada se compara con `formatTimeBogota` y `formatDateBogota` en lugar de `formatBogota` (R7).
- `src/app/router/f02Transversal.test.tsx`::`R39: bandeja, lista y detalle muestran las horas en America/Bogota y las fechas de nacimiento sin desplazarse` — solo la aserción de la tabla de `/atenciones` (línea 368): hora «11:30 p. m.» (con U+00A0) y fecha «27/10/26» en lugar de `27/10/26, 11:30:00`; la del detalle y la de la línea de tiempo no cambian (R7).
- `privacy.test.tsx`, `returnToOrigin.test.tsx` (UI-03-web R19), `EncounterDetailPage.test.tsx` R32 y `ClinicalCaptureForms.test.tsx` R7: **no cambian** y deben seguir en verde (R2, R5, R12).
- H9 (D11): **ninguna prueba existente cambia**. Las que usan el selector de conciencia (`f03Routes.test.tsx`, `networkErrors.test.tsx`, `unsavedChanges.test.tsx`, `vitalsDraft.test.tsx`, `ClinicalCaptureForms.test.tsx` R7) y las de `ClinicalCaptureHistory.test.tsx` deben seguir en verde sin tocarlas (R11).

## Riesgos y pruebas

- **Integración** (`renderApp` + `fakeApi`, nuevas bajo `describe('UI-04-web …')`):
  - `src/app/router/logoutHome.test.tsx` reproduce H1 y falla antes de D1: RECEPTION en `/atenciones` → «Cerrar sesión» → login de NURSE → `/triage`; PHYSICIAN en `/cola` → «Cerrar sesión» → login de ADMIN → `/reportes`; tras cerrar sesión, `router.navigate(-1)` a una ruta privada y login de otro rol → su inicio (caso determinista). R2: el mismo archivo comprueba que, con un 401 de la sesión vigente en `/atenciones?…`, el login del mismo rol vuelve a la ruta con su `search`, y que una ruta privada abierta sin sesión vuelve tras el login.
  - `/atenciones`: estructura (un `h1`, descripción, filtros, región con `h2`, tabla `data-table` sin `--simple`, columnas de R7, insignia en la columna Estado, «Ver atención» con `button--secondary`, pie con «Página 1» y botones secundarios).
  - Detalle y captura: insignia en el `dd` de estado; clases de los botones de cancelación; estructura de la línea de tiempo sin «·».
  - Registro directo: `PageHeader`, enlace «Volver a Recepción», orden en el DOM (búsqueda → «Registrar paciente NN» → resultado → formulario), clases de los botones, `div.form-grid`.
  - Captura: el aviso PROVISIONAL con `status--warn` y texto idéntico; foco en el aviso de éxito tras guardar (R16); el selector de conciencia con `clinical-select--letters` y sus cinco letras, y la letra de «Tomas registradas» como `badge tone--neutral` (R11).
- **Unitarias**: `routesFor` (orden por rol), `initialOf`, `EncounterStatusBadge`.
- **CSS como texto** (patrón de `dashboardStyles.test.ts`): `.cancel` con margen inferior; `.timeline time` en bloque; `.form-grid` en las dos reglas de `.clinical-fields`; `.field input[readonly]` sin borde ni fondo; `.clinical-finding > .button` con `justify-self: start`; `--brand-mark-bg` en claro y oscuro y `.brand__mark` usándolo; sin colores literales fuera de las definiciones de tokens.
- **Manual** (no lo mide jsdom): `scrollWidth === clientWidth` en `/atenciones` a 375, 390, 768, 1024 y 1440 px; contraste del logotipo en tema oscuro ≥ 3:1; recorrido de los cuatro roles a 1440 px y 390 px, tema claro y oscuro.
- **Riesgos**: envolver `/atenciones` y `/recepcion/registro` en `.dashboard` aplica sus reglas tipográficas (`.dashboard h1/h2/p` sin margen); se revisa en el recorrido manual. La placa clara de D15 también cambia la marca pública en tema oscuro (mejora el mismo defecto).
