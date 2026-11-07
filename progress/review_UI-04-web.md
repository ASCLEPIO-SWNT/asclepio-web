# Revisión UI-04-web — Pulido para la demo

Reviewer, 2026-11-07. Rama `feat/ui-04-web-demo-polish`, cambios sin commitear sobre `HEAD` `5d759d9`. Spec aprobada el 2026-11-06 (PA-1 opción b). Contrato 0.4.0.

## Veredicto: **APROBADO**

La parte automática pasa entera: `./init.sh` en VERDE, 922 de 922 pruebas, R1–R19 trazados y en verde, `api:types` sin diff e `i18n:check` en verde. No hay ningún motivo de rechazo. Queda pendiente T12, el recorrido manual a 1440/390 px con los cuatro roles, `scrollWidth` de `/atenciones` (R3) y el contraste del logotipo ≥ 3:1 (R15). Lo hace el leader en paralelo y, según lo acordado, no es motivo de rechazo, pero UI-04-web no puede pasar a `done` hasta que T12 esté `[x]`.

## Comandos ejecutados
- `./init.sh` (completo): `FAIL: 0 · WARN: 0`, `Estado: VERDE` (lint, typecheck y tests OK; `feature_list.json` coherente: done 7, in_progress 1, pending 4).
- `npx vitest run --reporter=json`: 66 archivos, 922 pruebas, 922 en verde y 0 en rojo.
- `npm run api:types`: exit 0; después, `git status`/`git diff` de `src/shared/api` vacíos.
- `npm run i18n:check`: OK.
- `info.version` de `../asclepio-api/openapi/asclepio-api.v1.json` = `0.4.0`; `CONSUMED_CONTRACT = '0.4.0'` (`src/shared/api/client.ts:6`).

## Checkpoints

### C1 — El harness está completo
- [x] Existen `AGENTS.md`, `CLAUDE.md`, `init.sh` (ejecutable: `test -x`), `feature_list.json`, `progress/current/` y `progress/history.md`.
- [x] Existen `docs/architecture.md`, `docs/conventions.md`, `docs/specs.md` y `docs/verification.md`.
- [x] `./init.sh` termina en VERDE (exit 0).

### C2 — El estado es coherente
- [x] Solo una feature `in_progress`: UI-04-web. UI-03-web pasa a `done` (`feature_list.json`, diff del leader).
- [x] Toda feature `done` tiene pruebas que pasan (922/922).
- [x] `progress/current/` contiene solo `UI-04-web.md`.

### C3 — El código respeta la arquitectura
- [x] Capas `app/`, `features/` y `shared/` respetadas: `EncounterStatusBadge` e `initials` viven en `shared/`, y `RequireSession` (`app/`) importa `features/auth/useSession`, que D1 permite.
- [x] Ninguna feature importa de otra: grep de `../../(auth|queue|reception|reports|triage|landing)` sobre los archivos tocados de `src/features`, sin resultados.
- [x] No hay `fetch` suelto en componentes (grep `fetch(` sin resultados fuera de `refetch`). R19 «no hay operaciones HTTP nuevas» confirma las mismas 16 operaciones de antes (`src/test/ui04Transversal.test.ts:109`).
- [x] No hay dependencias nuevas (`ui04Transversal.test.ts:119`, en verde). Los iconos `ArrowLeftIcon` y los chevrones salen de `@heroicons/react`, que ya estaba.
- [x] No hay `console.*`, `TODO`, `FIXME`, `debugger` ni `.only(` en las líneas añadidas ni en los archivos nuevos. El `localStorage.clear()` de `captureDemoPolish.test.tsx:75` es limpieza de la prueba y tiene comentario.

### C4 — La verificación es real
- [x] Las pruebas de Vitest y Testing Library buscan por rol, etiqueta y texto (por ejemplo `demoPolish.test.tsx:181-209` y `logoutHome.test.tsx`). Las de CSS leen el texto de la hoja, con el patrón de `dashboardStyles.test.ts`.
- [x] El HTTP se simula en la frontera de red con `fakeApi` (`logoutHome.test.tsx:29`, `pendingStrip.test.tsx:39`, `captureDemoPolish.test.tsx:115,127`). No hay `vi.mock` de hooks internos; `vi.fn()` solo se usa para los callbacks que reciben los formularios como props.
- [x] `npm test` ejecuta 922 pruebas, todas en verde.

### C5 — La sesión se cerró bien
- [x] No hay archivos sin trackear sospechosos. Los únicos son el informe del implementer y las 6 pruebas nuevas. `.playwright-mcp/` se añade a `.gitignore`.
- [x] `progress/history.md` tiene la entrada de la última sesión cerrada (UI-03-web → done, 2026-11-07). La de UI-04 se escribe al cerrarla.
- [x] UI-04-web sigue en `in_progress`, que es lo correcto mientras falte T12.

### C6 — Spec-Driven Development
- [x] `specs/UI-04-web/{requirements,design,tasks}.md` existen.
- [x] `requirements.md` usa EARS estricto (Ubicuo, Por evento, Por estado, No deseado), y cada `R<n>` se traza a su `H<n>` y a un `F-0X.ACn` o `UI-02.ACn`. PA-1 está cerrada como `[x]` con la opción b (`requirements.md:54`).
- [x] Tareas: T1–T11 `[x]`. T12 sigue `[ ]` a la espera del recorrido manual del leader, que se excluyó expresamente de esta revisión. Hay que marcarla antes de pasar a `done`.
- [x] Cada `R<n>` tiene al menos una prueba que empieza por `R<n>:` dentro de un `describe('UI-04-web …')`, y todas están en verde. Recuento del reporter JSON: R1×4, R2×2, R3×1, R4×2, R5×2, R6×8, R7×3, R8×2, R9×3, R10×12, R11×3, R12×6, R13×2, R14×4, R15×1, R16×3, R17×4, R18×3, R19×4. La tabla del informe del implementer (`progress/impl_UI-04-web.md:36-57`) coincide.

### C7 — Seguridad clínica y privacidad (UI)
- [x] Ninguna pantalla presenta una sugerencia como nivel final. El slice no toca sugerencias ni niveles: F-04 y F-05 siguen `pending`, y no hay «Validar» ni «Corregir» en `src`. La letra ACVPU de «Tomas registradas» va en `badge tone--neutral`, sin tono de gravedad (`ClinicalCaptureHistory.tsx`, R11). El aviso PROVISIONAL conserva su texto en los cinco idiomas (`captureDemoPolish.test.tsx:31-37,91-104`).
- [x] «Corregir» con el mismo peso que «Validar»: no aplica, no existe en este repo.
- [x] «Corregir» no se puede enviar sin nivel y motivo: no aplica.
- [x] Triage manual sin sugerencia válida: no aplica, el slice no lo cambia.
- [x] No hay datos personales en `console`, `localStorage` ni URL. D1 no escribe en ningún almacenamiento; el motivo del cierre vive en memoria (`session.ts:19,90`). El `aria-describedby` de «Ver atención» usa `encounter.id`, no datos del paciente. La ruta de origen sigue yendo en `state` y nunca en la query.
- [x] Las horas se muestran en `America/Bogota`: `/atenciones` usa `formatTimeBogota` y `formatDateBogota` (`src/shared/lib/datetime.ts:15-24,38-43`), y la línea de tiempo conserva `formatBogota`, con segundos (D7).

### C8 — Contrato
- [x] `consumes_contract: "0.4.0"` en `feature_list.json` coincide con `info.version` 0.4.0 de la API (misma versión mayor).
- [x] Los tipos están regenerados: `npm run api:types` no produce diff, y el SHA-256 de `schema.d.ts` está fijado en `ui04Transversal.test.ts:29,100`.
- [x] Los errores `problem+json` siguen mostrándose con `LoadError`, `ActionError` y `ViewForbidden`, sin cambios. En `/atenciones` solo pasan al cuerpo del `Panel` (`EncounterListPage.tsx`), y las pruebas de F-02-web R30 siguen en verde.

## Comprobaciones específicas
- **H1 / D1** (`src/app/router/RequireSession.tsx:12,18`): si `endReason === 'logout'`, `<Navigate to="/login" replace />` va sin `state`; con `'expired'` o `null` se conserva `from` con su `search`. Las pruebas cubren dos roles distintos, el mismo rol y «Atrás» (`logoutHome.test.tsx:59-117`), además de un 401 con `search` y una ruta privada abierta sin sesión (`:119-151`). `returnToOrigin.test.tsx` y `privacy.test.tsx` siguen en verde y sin cambios.
- **Desviación declarada (`f02Routes.test.tsx:154-157`)**: la acepto. La prueba F-02-web R4 esperaba que el nuevo login de RECEPTION cayera en `/atenciones`, es decir, el propio defecto H1, y R1 (aprobado) exige lo contrario. El ajuste es mínimo: espera `/recepcion` y conserva la aserción real de R4 (sedes pedidas otra vez, 2 llamadas). El implementer lo dejó anotado en `progress/current/UI-04-web.md:47`, como pide `docs/specs.md` §5. No hay requisito nuevo ni contradicción entre requisitos, solo una lista incompleta en `design.md` («Pruebas existentes que cambian»).
- **Pruebas existentes ajustadas**: coinciden con las que lista `design.md`, más la de f02Routes R4 ya comentada. Los nombres de QueuePage y ReportsPage R18 cambian como indica design.md.
- **CSS**: `.field` y `.clinical-finding` son `display: grid` (`index.css:642-646`, `:2365-2372`), así que `justify-self: start` funciona. `.field .clinical-select--letters` (0,2,0) gana a `.field select` (0,1,1). No añade colores literales: `--brand-mark-bg` usa `var(--card)` y `var(--fg)` (`index.css:40,76`, prueba R19 de `demoPolishStyles.test.ts`). El cambio de `.field input[readonly]` es global, pero solo afecta a los dos campos de documento de `PatientForm.tsx:193,211`, los únicos `readOnly` de la aplicación.
- **R10**: no queda ningún `F-0<n>` visible. Los valores `feature: 'F-0x-web'` de `roleMatrix.ts:22-52` no se pintan (grep de `.feature` sin usos en componentes). Las enmiendas están en `docs/ui-dashboards.md:41` y `specs/UI-02-web/requirements.md:47`, como pide T7.
- **Cambios de spec en el árbol de trabajo**: `requirements.md`, `design.md` y `tasks.md` difieren de `HEAD` solo en la reescritura de R11/D11/T9 a la opción b, en el cierre de PA-1 y en las casillas. Encaja con la aprobación registrada en `progress/current/UI-04-web.md:43-44`.

## Observaciones no bloqueantes
1. **Hueco residual de D1**: `endReason` vuelve a `null` en cuanto se envía el formulario de login (`LoginPage.tsx:91`). Si, tras un cierre voluntario, el siguiente usuario se equivoca de contraseña y después pulsa «Atrás» hacia una ruta privada del anterior, `RequireSession` vuelve a fijar `from`, y el login correcto lo lleva a esa ruta si su rol puede verla. Es un caso rebuscado y queda dentro del diseño aprobado (design.md, «vale `'logout'` … hasta el siguiente intento de login»). Conviene anotarlo para un slice posterior junto a H16.
2. Pedir al `spec_author`, al cerrar, que añada `f02Routes.test.tsx` R4 a «Pruebas existentes que cambian» de `design.md`, para que la spec refleje lo que se cambió.
3. `aria-describedby` de «Ver atención» apunta a `span.cell-name` y no a la celda, como sí hace `TriageTrayPage`. Es intencional (excluye el documento de la descripción) y está documentado en el informe (punto 2).
4. Riesgos que debe confirmar T12: la tipografía de `.dashboard` (`h2`/`p` sin margen) aplicada a la tarjeta del registro directo y al `h2` de `PatientForm`; `scrollWidth === clientWidth` en `/atenciones` a 375/390/768/1024/1440 px; contraste ≥ 3:1 de `--fg` frente al logotipo en tema oscuro.
5. Los archivos `A` del índice (`logoutHome.test.tsx`, `initials*`, `EncounterStatusBadge*`) están preparados sin commit. No afecta a la revisión.
