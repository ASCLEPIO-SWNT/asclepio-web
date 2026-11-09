# impl UI-04-web — Pulido para la demo

Implementer, 2026-11-06/07. Rama `feat/ui-04-web-demo-polish`, **sin commits** (todo en el árbol de trabajo). Contrato 0.4.0 sin cambios (no aplica `openapi:export`: es la web).

## Estado de las tareas
- T1–T11 `[x]` en `specs/UI-04-web/tasks.md`.
- T12 `[ ]`: la parte automática está hecha (ver «Verificación»); **falta el recorrido manual en el navegador** (4 roles, 1440 y 390 px, claro y oscuro, `scrollWidth === clientWidth` en `/atenciones` a 375/390/768/1024/1440 px, contraste del logotipo en oscuro ≥ 3:1). Este agente no tiene navegador; no se tocaron los servidores de :3000 y :5173.

## Archivos tocados
Código:
- `src/app/router/RequireSession.tsx` (D1: sin `state.from` si `endReason === 'logout'`)
- `src/app/router/roleMatrix.ts` (D14: `routesFor` pone primero `HOME_BY_ROLE`)
- `src/app/router/AppShell.tsx` (D17: avatar con `initialOf`)
- `src/shared/lib/initials.ts` (nuevo, D17)
- `src/shared/ui/EncounterStatusBadge.tsx` (nuevo, D5)
- `src/shared/ui/Notice.tsx` (D16: `autoFocus` opcional; sin él, marcado idéntico)
- `src/shared/ui/PendingStrip.tsx` (D10: sin prop `feature`)
- `src/features/triage/components/EncounterListPage.tsx` (D2–D4: `DashboardPage` + `PageHeader` + toolbar + `Panel` + `DataTable` + paginador de UI-02)
- `src/features/triage/components/EncounterDetailPage.tsx`, `ClinicalCapturePage.tsx` (D5: insignia en el `dd` de estado)
- `src/features/triage/components/CancelEncounterForm.tsx` (D6)
- `src/features/triage/components/EncounterTimeline.tsx` (D7)
- `src/features/triage/components/VitalSignsForm.tsx` (D11 clase `clinical-select--letters`, D12 `status status--warn`, D16 `Notice autoFocus`)
- `src/features/triage/components/SymptomFindingsForm.tsx` (D16)
- `src/features/triage/components/ClinicalCaptureHistory.tsx` (D11: letra en `badge tone--neutral`)
- `src/features/reception/components/DirectRegistrationPage.tsx` (D8), `PatientForm.tsx` (D9: `div.form-grid`)
- `src/features/queue/components/QueuePage.tsx`, `src/features/reports/components/ReportsPage.tsx` (D10)
- `src/index.css`: `--brand-mark-bg` en `:root` y `:root[data-theme='dark']`, `.brand__mark` lo usa (D15); `.timeline time { display: block }`; `.cancel { margin: 1.5rem 0 }`; `.form-grid` en las dos reglas de `.clinical-fields`; `.field input[readonly]` transparente y sin padding lateral; `.field .clinical-select--letters`; `.clinical-finding > .button { justify-self: start }`.
- Catálogos (`messages/common/*.json`, `messages/features/*.json`, cinco idiomas): nuevas `feature_encounters_lead`, `feature_encounters_results`, `feature_registration_direct_lead`, `feature_reception_back`; `common_pending` sin `{feature}` con los textos de D10.

Documentación: `docs/ui-dashboards.md` (nota de enmienda en UI-02.AC5) y `specs/UI-02-web/requirements.md` (nota en R18), sin más cambios; `specs/UI-04-web/tasks.md` (casillas).

Pruebas nuevas: `src/app/router/logoutHome.test.tsx`, `src/app/router/pendingStrip.test.tsx`, `src/shared/lib/initials.test.ts`, `src/shared/ui/EncounterStatusBadge.test.tsx`, `src/shared/ui/demoPolishStyles.test.ts`, `src/features/triage/components/demoPolish.test.tsx`, `src/features/triage/components/captureDemoPolish.test.tsx`, `src/features/reception/components/demoPolish.test.tsx`, `src/test/ui04Transversal.test.ts`; casos añadidos en `roleMatrix.test.ts` y `AppShell.test.tsx`.

Pruebas existentes ajustadas (las de design.md): `AppShell.test.tsx` R21 (ADMIN), `dashboard.test.tsx` R18 y su ayudante, `QueuePage.test.tsx` R18 y `ReportsPage.test.tsx` R18 (texto y nombre), `EncounterListPage.test.tsx` R29, `f02Transversal.test.tsx` R39 (solo la tabla de `/atenciones`).

## Trazabilidad R<n> → archivo::prueba
| R | Pruebas |
|---|---|
| R1 | `src/app/router/logoutHome.test.tsx`::`R1: RECEPTION cierra sesión en /atenciones y NURSE entra en su inicio /triage`; `::R1: PHYSICIAN cierra sesión en /cola y ADMIN entra en su inicio /reportes`; `::R1: el mismo rol que cierra sesión vuelve a entrar en su inicio, no en la ruta anterior`; `::R1: tras cerrar sesión, «Atrás» hacia una ruta privada no deja ruta de origen para el siguiente rol` |
| R2 | `src/app/router/logoutHome.test.tsx`::`R2: tras un 401 de la sesión vigente en /atenciones?…, el login del mismo rol vuelve a la ruta con su search`; `::R2: una ruta privada abierta sin sesión vuelve a esa ruta tras el login` (y `returnToOrigin.test.tsx` R19 sin cambios, en verde) |
| R3 | `src/features/triage/components/demoPolish.test.tsx`::`R3: la página va dentro de .dashboard y la tabla es una data-table apilable dentro de un panel` (el `scrollWidth` real queda para el recorrido manual) |
| R4 | `src/features/triage/components/demoPolish.test.tsx`::`R4: «Cancelar atención» y «Volver» son botones secundarios; «Confirmar cancelación» sigue siendo el principal`; `src/shared/ui/demoPolishStyles.test.ts`::`R4: el bloque de cancelación se separa del título «Línea de tiempo» con 1,5 rem de margen inferior` |
| R5 | `src/features/triage/components/demoPolish.test.tsx`::`R5: cada evento de la línea de tiempo tiene la hora, el evento con sus estados y el actor en tres elementos, sin «·»`; `src/shared/ui/demoPolishStyles.test.ts`::`R5: la hora de cada evento de la línea de tiempo va en su propia línea` |
| R6 | `src/shared/ui/EncounterStatusBadge.test.tsx`::`R6: %s se muestra con icono oculto, texto y el tono de ENCOUNTER_STATUS_VIEW` (×6); `src/features/triage/components/demoPolish.test.tsx`::`R6: el estado del detalle /atenciones/:id es una insignia de estado`, `::R6: el estado del contexto de la captura /triage/:id es una insignia de estado`; la lista, en R7 (columnas) |
| R7 | `src/features/triage/components/demoPolish.test.tsx`::`R7: encabezado con un h1 y su descripción, filtros debajo y panel con h2 «Resultados»`; `::R7: columnas Paciente (nombre y documento), Sede, Llegada (hora sin segundos y fecha), Estado (insignia), Origen y «Ver atención» secundario pequeño`; `::R7: el pie del panel tiene «Página 1» y el paginador de UI-02 con botones secundarios y sus reglas de habilitación` (+ F-02-web R28–R30 de `EncounterListPage.test.tsx`, en verde) |
| R8 | `src/features/reception/components/demoPolish.test.tsx`::`R8: encabezado con el h1 «Registro directo», su descripción y «Volver a Recepción» como botón secundario`; `::R8: «Registrar paciente NN» es secundario y va justo después de la búsqueda, antes del «sin resultados» y del alta` |
| R9 | `src/features/reception/components/demoPolish.test.tsx`::`R9: los campos del alta van en un div.form-grid y el documento de solo lectura conserva su etiqueta y readonly`; `src/shared/ui/demoPolishStyles.test.ts`::`R9: .form-grid comparte las dos reglas de .clinical-fields (dos columnas; una bajo 640 px)`, `::R9: los campos de solo lectura se ven como texto, sin borde ni fondo` |
| R10 | `src/app/router/pendingStrip.test.tsx`::`R10: %s ve en %s la franja con el texto neutral, sin código de feature` (×2); `::R10: en %s la franja dice el texto neutral, sin código de feature` (×5 idiomas); `::R10: ningún valor de los cinco catálogos contiene un código F-0<n>`; `::R10: el texto visible de $path ($role) no contiene un código F-0<n>` (×4 dashboards) |
| R11 | `src/features/triage/components/captureDemoPolish.test.tsx`::`R11: «Nivel de conciencia (ACVPU)» sigue siendo un select etiquetado con clinical-select--letters y solo las cinco letras`; `::R11: en «Tomas registradas» la letra va en una insignia neutra dentro de su dd`; `src/shared/ui/demoPolishStyles.test.ts`::`R11: el selector de letras ACVPU se ajusta a su contenido, al inicio del campo y en seminegrita` |
| R12 | `src/features/triage/components/captureDemoPolish.test.tsx`::`R12: el aviso PROVISIONAL usa el estilo de advertencia, sin role="alert" y con su texto actual`; `::R12: en %s el aviso PROVISIONAL conserva su texto y lleva el estilo de advertencia` (×5) |
| R13 | `src/features/triage/components/captureDemoPolish.test.tsx`::`R13: «Quitar elemento N» sigue siendo un botón secundario dentro de su elemento`; `src/shared/ui/demoPolishStyles.test.ts`::`R13: «Quitar elemento N» se ajusta a su texto y se alinea al inicio del elemento` |
| R14 | `src/app/router/roleMatrix.test.ts`::`R14: routesFor(%s) pone primero el inicio del rol y el resto en el orden de la matriz` (×4); `AppShell.test.tsx` R21 (ADMIN ajustado) |
| R15 | `src/shared/ui/demoPolishStyles.test.ts`::`R15: la placa del logotipo sale del token --brand-mark-bg: la tarjeta en claro y el primer plano (claro) en oscuro` (contraste ≥ 3:1 pendiente de medir en el navegador) |
| R16 | `src/features/triage/components/captureDemoPolish.test.tsx`::`R16: tras un 201 de «Guardar toma», el aviso de éxito tiene el foco`; `::R16: tras un 201 de «Guardar hallazgos», el aviso de éxito tiene el foco`; `::R16: Notice con autoFocus recibe el foco al montarse con tabIndex -1; sin él, el marcado no cambia` (+ `dashboard.test.tsx` R12 sin cambios) |
| R17 | `src/shared/lib/initials.test.ts`::`R17: salta las palabras que terminan en «.» (títulos como «Dra.»)`, `::R17: sin título, la primera letra del nombre`, `::R17: si todas las palabras terminan en «.», la primera letra del nombre`; `src/app/router/AppShell.test.tsx`::`R17: «Dra. Camila Torres» muestra «C» en el avatar` |
| R18 | `src/test/ui04Transversal.test.ts`::`R18: npm run i18n:check pasa: mismas claves y parámetros en los cinco catálogos`, `::R18: las claves nuevas existen en los cinco idiomas, sin parámetros y traducidas`, `::R18: la regla anti-literales de UI no gana excepciones nuevas` (+ `noUiLiterals.test.ts` en verde) |
| R19 | `src/test/ui04Transversal.test.ts`::`R19: consume el contrato 0.4.0 con schema.d.ts intacto`, `::R19: no hay operaciones HTTP nuevas en el código`, `::R19: sin dependencias nuevas en package.json`; `src/shared/ui/demoPolishStyles.test.ts`::`R19: ninguna regla tocada por el slice declara colores literales` |

## Verificación
- `npx vitest run`: **66 archivos, 922 pruebas, todas en verde.**
- `./init.sh` (completo): `lint` OK, `typecheck` OK, `tests` OK. **Exit 1 solo por la sección 3 (estado de `feature_list.json`)**: `[FAIL] UI-04-web: in_progress pero la dependencia UI-03-web está 'in_progress'` y `[FAIL] 2 features en in_progress (máximo 1)`. Ya fallaba así al empezar (baseline). UI-03-web sigue `in_progress` en `feature_list.json` aunque su revisión está aprobada y fusionada (PR #2); cerrarla es del leader: no toqué `feature_list.json`.
- `npm run i18n:check`: OK. `npm run build`: OK (solo el aviso habitual de tamaño de chunk). `npm run api:types`: sin diff en `schema.d.ts` ni en `clinicalContract.generated.ts`.

## Desviaciones y notas para el reviewer
1. **Prueba existente no listada en design.md:** `src/app/router/f02Routes.test.tsx`::`R4: las sedes se piden una sola vez por sesión… y otra vez tras un nuevo login` esperaba que, tras «Cerrar sesión» en `/atenciones`, el nuevo login de RECEPTION cayera en `/atenciones`, es decir, el defecto H1. Contradice R1. La ajusté lo mínimo: ahora espera `/recepcion` (la tarjeta del preregistro) y conserva su aserción real (sedes pedidas otra vez, 2 llamadas). Comentario en la prueba. Si el reviewer prefiere parar aquí, hay que revertir esa línea y anotarlo.
2. `EncounterListPage`: `aria-describedby` de «Ver atención» apunta al `span.cell-name` y no a la celda entera, para que la descripción sea solo el nombre sin el documento. `TriageTrayPage` lo pone en la celda, así que difiere un poco de ese patrón.
3. `/atenciones`: la carga y el vacío van envueltos en `div.panel-state` (una clase que ya existe) para que tengan relleno dentro del panel. `LoadingState`, el párrafo vacío, `LoadError` y `ViewForbidden` no cambian.
4. R11: la regla es `.field .clinical-select--letters` y no `.clinical-select--letters`, porque `.field select { width: 100% }` (0,1,1) le ganaba en especificidad. Las declaraciones son las de D11.
5. `DirectRegistrationPage`: `UnsavedChangesGuard` queda dentro de `.dashboard` pero fuera de `.stack`, para que su diálogo no ocupe una fila de la rejilla.
6. En el área de preparación aparecen `A` (añadidos al índice) para `logoutHome.test.tsx`, `initials.ts`/`.test.ts` y `EncounterStatusBadge.tsx`/`.test.tsx`. Yo no ejecuté `git add`; probablemente lo hizo un hook. No hice commit, stash, checkout ni reset.
7. Riesgos para el recorrido manual (design.md, «Riesgos»): la tipografía de `.dashboard` (`h2`/`p` sin margen) ahora se aplica a la tarjeta del registro directo y a `/atenciones`; el `.toolbar` conserva su margen de 1,5 rem dentro del `gap` de `.stack`.
