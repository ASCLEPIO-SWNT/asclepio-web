# Revisión — UI-03-web (Robustez de la web)

- Rama: `feat/ui-03-web-robustness` (base `main` `dc280a9`, HEAD `0abe71e`). Contrato: 0.4.0 (solo lectura).
- Fecha: 2026-10-30. Reviewer independiente. `./init.sh` completo ejecutado **una vez** (a petición del leader, por tokens).

## Veredicto: **RECHAZADO**

Dos motivos bloqueantes, los dos pequeños: falta la prueba `R22:` del slice y hay requisitos aprobados (R12, R15, R17 y R18) que el código no cumple tal como están escritos. Hay que enmendar la spec, con el visto bueno del usuario, o cambiar el código. El resto es sólido. La suite está en verde, ninguna prueba previa se borró ni se debilitó, la enmienda de privacidad es correcta, no hay reintento al reconectar y la identidad visual se mantiene.

## Motivos de rechazo (accionables)

1. **R22 no tiene ninguna prueba del slice.** No hay ninguna prueba `R22:` bajo `describe('UI-03-web …')`. `grep "R22[: ]" src` solo devuelve pruebas de F-02, F-03 y UI-02. La tabla de `progress/impl_UI-03-web.md` y de `docs/ui-robustness-verification.md` atribuye R22 a `f03Routes.test.tsx` R22 y a `DirectRegistrationPage.test.tsx` R22, que son de otras features. **Acción (implementer):** añadir una prueba `R22:` bajo `UI-03-web …`. Debe comprobar que las claves nuevas (`common_error_*`, `common_route_*`, `common_unsaved_*`, `common_draft_*`) existen en los cinco catálogos con los mismos parámetros y que no hay ningún valor vacío ni igual al español en en/pt/fr/de, salvo los justificados.
2. **R12, R15, R17 y R18 no se cumplen literalmente y la spec no se ha enmendado.** **Acción (spec_author, con un «aprobado» del usuario):** enmendar `requirements.md` y `design.md`:
   - **R12 y D10:** el texto exige «`lazy` de rutas de React Router», pero el código usa `lazyFeatureRoutes` (`src/app/router/lazyFeature.tsx`). La desviación está justificada (ver más abajo), pero el requisito aprobado dice otra cosa.
   - **R15, R17 y R18 en los errores de acción (mutaciones):** `actionErrorMessage` (`src/shared/lib/problem.ts:107-117`) devuelve con un 5xx el genérico «No se pudo completar la acción…», no `common_error_server`. Con un error de red devuelve el texto de acción ya aprobado («No se pudo conectar con el servidor…»), no «No hay conexión con el servidor.». Además, el error de acción no tiene «Reintentar». R18 dice «Si una petición responde 5xx…» sin limitarse a consultas, y R17 dice «mostrar el error de R15». Hay dos salidas: enmendar R15, R17 y R18 para que los textos de red y servidor con «Reintentar» se apliquen a los errores de carga, y para que en las mutaciones valga el texto de acción de red ya aprobado y el genérico con un 5xx; o cambiar el código para que use `common_error_server` y `common_error_network` también en las acciones.
   - **«Pruebas existentes que cambian» (design.md:77-84):** falta añadir los cambios hechos fuera de la lista: `f03Routes.test.tsx` R5 (clic en «Salir sin guardar»), `ClinicalCaptureForms.test.tsx` R11 (`delay: null`; la lista nombraba `f03Routes` R3, que no cambió), el helper de `SessionProvider.test.tsx` (`session.restore()`), y `renderFeature.tsx` y `testApp.tsx` (`createQueryClient`, `preloadFeatures`).

Con 1 y 2 resueltos, un `./init.sh` en verde basta para volver a revisar. Solo hay que comprobar R22 y el texto enmendado.

## Juicio de las 8 desviaciones declaradas

| # | Desviación | Juicio |
|---|---|---|
| 1 | `lazyFeatureRoutes` en lugar del `lazy` de React Router | **Aceptable técnicamente, necesita enmienda (R12 y D10).** El `lazy` del router se resuelve al casar la ruta, antes de que rendericen los guards. Por eso incumpliría la razón de ser de D10 (una ruta prohibida no descarga código). Lo cubren `lazyRoutes.test.tsx` R12, R13 y R14. La medida se registró: 712,55 → 658,28 kB; el aviso de 500 kB persiste, que es la condición alternativa de R12. |
| 2 | Los textos de red conservan el mensaje de cada pantalla | **Aceptable en errores de carga** (`LoadError` y `PanelState` añaden `common_error_network` o `common_error_server` sin tocar aserciones aprobadas). **Necesita enmienda en errores de acción** (motivo 2). |
| 3 | R5 de `f03Routes.test.tsx` adaptada | **Aceptable.** Solo se añade el clic en «Salir sin guardar» antes de las mismas aserciones; es lo que exige R1. Falta listarla en design.md (motivo 2). |
| 4 | `maxWorkers: '50%'`, `delay: null` y `preloadFeatures` (R28) | **Aceptable** dentro de D19. `maxWorkers` está permitido de forma explícita, `delay: null` solo cambia la mecánica de espera y no se tocó `testTimeout` (`suiteConfig.test.ts`). `preloadFeatures` es mecánica del arnés, equivalente a la caché del navegador, y la carga diferida real se prueba con cargadores propios en `lazyRoutes.test.tsx`. Hay que corregir la lista de design.md (motivo 2). |
| 5 | Interpretación de R24 | **Aceptable.** No existe una clave de «datos no válidos». Se usan los genéricos ya aprobados: `feature_field_review` junto al campo y `feature_action_error` sin `errors[]`. El 422 con fecha visible conserva el texto de fecha futura (F-02 R23 intacta). Opcional: aclarar D17. |
| 6 | Reutilizar claves i18n para los títulos | **Aceptable.** Menos claves, el mismo texto en los cinco idiomas, y lo cubre `documentTitle.test.tsx` R10. |
| 7 | En T15 el código se escribió antes que las pruebas | **Aceptable con anotación** (desviación de proceso, no de producto). Las pruebas de `vitalsDraft.test.tsx` son de comportamiento y fallarían sin el código. |
| 8 | Nombre del documento `docs/ui-robustness-verification.md` | **Aceptable.** Es el nombre que fijan tasks.md y design.md; el del leader no constaba en la spec. |

## Comprobaciones específicas pedidas

- **Pruebas previas no borradas ni debilitadas.** Comparé con `git diff dc280a9..HEAD` los `*.test.*` modificados: solo hay cambios de import (`./testApp` → `../../test/testApp`), nombres de `describe` en `problem.test.ts`, `delay: null` en f02Transversal R40 (×2) y en ClinicalCaptureForms R11, el clic de R5 en f03Routes y `session.restore()` en el helper de `SessionProvider.test.tsx`. En privacy, roleMatrix, ReceptionPage y DirectRegistrationPage no se elimina ninguna línea salvo imports. `testApp.tsx` se movió con el mismo contenido, más `routes`, `restore` y `preload`. No hay ningún `skip` ni `only`, y no se relajó ninguna aserción.
- **Enmienda de privacidad.** Solo existe la clave `asclepio.draft.vitals.<encounterId>` (`src/shared/lib/drafts.ts:6,28`). Tiene una lista blanca de 9 campos numéricos o enumerados (`VitalSignsForm.tsx` `VITAL_DRAFT_FIELDS`) y una validación de forma con `/^[0-9A-Za-z.-]{1,8}$/`, que impide el texto libre. Guarda `{userId, encounterId, savedAt, values}` sin identidad del paciente. Caduca a los 30 minutos (`DRAFT_TTL_MS`, y lo prueba `vitalsDraft.test.tsx` R6 con 29:59 y 30:01). Se borra al enviar, al descartar, al recuperar, con el logout voluntario (`logout.ts`) y al arrancar (`main.tsx` `purgeExpiredDrafts`). La nueva prueba de `privacy.test.tsx` R24 comprueba que la única clave es la del borrador, con `values = {respiratoryRate}`, y que no contiene el motivo de consulta ni el nombre. R10 y UI-02 R27 no cambian. `localStorage` solo guarda las preferencias, como antes.
- **Sin reintento automático al reconectar (UI-02 R25 intacto).** `QUERY_DEFAULTS` (`src/app/providers/queryClient.ts`) usa `refetchOnReconnect: false`, `networkMode: 'always'` y mutaciones con `retry: 0`. Lo prueban `queryClient.test.ts` R16 y R17 y `networkErrors.test.tsx` R16 (vista y dashboard: 0 peticiones al reconectar hasta «Reintentar»). Las pruebas de UI-02 con `onlineManager` no cambiaron.
- **La identidad visual de UI-01 y UI-02 no cambia.** `dashboard.css` solo añade `.confirm-dialog` y `.route-error`, con tokens y sin colores literales (lo comprueba `ui03Transversal` R29). `index.css` no cambia. `LoadError`, `PanelState` y `SummaryFilter` solo añaden una línea cuando reciben `error`. No hay dependencias nuevas: `package.json` solo añade `engines`.
- **Cinco idiomas.** Las 14 claves `common_*` nuevas están en es, en, pt, fr y de (`messages/common/*.json`). `npm run i18n:check` terminó sin errores. Pero falta la prueba R22 (motivo 1).

## Checkpoints

### C1 — Harness
- [x] `AGENTS.md`, `CLAUDE.md`, `init.sh` (ejecutable), `feature_list.json`, `progress/current/` y `progress/history.md` existen (`ls`; init: «Archivos base presentes», «init.sh ejecutable»).
- [x] `docs/architecture.md`, `conventions.md`, `specs.md` y `verification.md` existen.
- [x] `./init.sh` terminó con exit 0: VERDE, FAIL 0, WARN 0 (lint, typecheck y tests en OK). Fue una sola ejecución; las tres seguidas de R28 constan en `docs/ui-robustness-verification.md:45`.

### C2 — Estado
- [x] Solo una feature está `in_progress` (UI-03-web). Init: «done: 6, in_progress: 1».
- [x] Las features `done` tienen pruebas que pasan (la suite completa está en verde).
- [x] `progress/current/` solo contiene `UI-03-web.md`.

### C3 — Arquitectura
- [x] `src/` sigue la estructura `app/`, `features/` y `shared/`. Las nuevas piezas comunes están en `shared/` (`ConfirmDialog`, `RouteError`, `drafts`, `errors`…).
- [x] Ninguna feature importa de otra (grep sin resultados), y `shared/` no importa de `features/` ni de `app/`.
- [x] No hay `fetch` suelto: solo `src/shared/api/client.ts:14`.
- [x] No hay dependencias nuevas.
- [x] No hay `console.log`, `debugger` ni TODOs. El único `console.error` es intencionado y solo registra el tipo de error (`src/shared/lib/routeErrors.ts:23-28`).

### C4 — Verificación
- [x] Las pruebas con Vitest y Testing Library comprueban comportamiento por roles y texto (`unsavedChanges`, `vitalsDraft`, `networkErrors`, `routeError`, `documentTitle`, `lazyRoutes` y `returnToOrigin`).
- [x] El HTTP se simula en la frontera de red con `fakeApi`; no se mockean hooks.
- [x] `npm test` pasa entero: el implementer registró 849 pruebas y init.sh da «tests OK».

### C5 — Cierre de sesión
- [x] No hay archivos sin trackear (`git status --porcelain` vacío, también tras `api:types`).
- [ ] `progress/history.md` aún no tiene una entrada de UI-03-web (la última es de UI-02-web). Le toca al leader al cerrar; no bloquea esta revisión.
- [x] El estado es correcto: `in_progress` mientras T17 está pendiente.

### C6 — SDD
- [x] `specs/UI-03-web/{requirements,design,tasks}.md` existen.
- [x] Los requisitos están en EARS y trazados a F-01, F-02 y F-03 (PA-4).
- [x] No aplica todavía: la feature no está `done`. T1–T16 están en `[x]`; T17 sigue en `[ ]` por el recorrido manual y las capturas, que son un límite registrado (ver abajo).
- [ ] **Cada R tiene una prueba `R<n>:` del slice:** R1–R21 y R23–R32 la tienen bajo `UI-03-web …`; **R22 no** (motivo 1).

### C7 — Seguridad clínica y privacidad
- [x] Ni la sugerencia ni el nivel final se tocan en este slice (RNF-17 se conserva). El borrador no incluye niveles.
- [x] El peso entre «Corregir» y «Validar» no cambia. En el diálogo nuevo, las dos acciones usan la misma clase `button` (`ConfirmDialog.tsx`).
- [x] «Corregir» sin nivel ni motivo no cambia (fuera de alcance).
- [x] El triage manual no cambia.
- [x] No hay datos personales en `console`, `localStorage` ni la URL. R9 sustituye el registro de React y del router (`main.tsx`, `testApp.tsx`). `sessionStorage` solo tiene la sesión y el borrador permitido (`privacy.test.tsx` R24 nuevo, `vitalsDraft` R31, `ui03Transversal` R31). La vuelta al origen solo lleva el `search` existente, sin documento.
- [x] Las horas en America/Bogotá no cambian.

### C8 — Contrato
- [x] `consumes_contract: "0.4.0"` coincide con `info.version` 0.4.0 (`../asclepio-api/openapi/asclepio-api.v1.json:1269`).
- [x] `npm run api:types` no produce diff (`git status` vacío). `ui03Transversal` R32 compara el SHA-256 de `schema.d.ts`.
- [~] `problem+json` se muestra con un mensaje comprensible y sin `detail` ni `title` (`networkErrors` R18). Ver el motivo 2 sobre el texto de 5xx en las acciones.

## Observaciones no bloqueantes

1. **Tabla de trazabilidad contaminada.** La tabla R → prueba de `impl_UI-03-web.md` y de `docs/ui-robustness-verification.md` mezcla pruebas `R<n>:` de F-01, F-02, F-03 y UI-02 con las del slice (por ejemplo, R1 incluye `f03Routes` R1 y `roleMatrix` R1). Conviene filtrarla a `describe('UI-03-web …')`.
2. **T1 está en `[x]` pero las capturas «antes» no existen** (`docs/ui-evidence/` no tiene `ui03-*`). Conviene anotarlo en tasks.md. Las capturas tendrán que tomarse sobre `0bd94f7`.
3. **R30 tiene poca cobertura.** Solo se prueba el diálogo (foco inicial y Escape). No hay una prueba de teclado para el aviso de R5 ni para los estados de R8, R14, R15 y R18, aunque usan botones nativos.
4. **La prueba de R28 es estática** (solo mira `vite.config.ts`). La evidencia real son las tres ejecuciones registradas por el implementer; esta revisión hizo una, en verde.
5. **En producción las consultas conservan `retry` por defecto (3)** con `networkMode: 'always'`. Un error de red tarda unos segundos en aparecer por los reintentos con espera creciente. No es un reintento por reconexión (UI-02 R25 se cumple), pero conviene verlo en el recorrido manual con la API detenida.
6. **D6 y R6:** la «validación de forma» del borrador es la lista blanca más una expresión regular, no el esquema Zod completo. Basta para R6 tal como está escrito.

## Límites de esta revisión (no son motivo de rechazo)

- El usuario aún tiene pendiente el recorrido manual con login de RECEPTION, NURSE, PHYSICIAN y ADMIN contra `http://localhost:3000`, y las capturas `ui03-*-{antes,despues}.jpg` (T17).
- `./init.sh` se ejecutó una vez, no tres. `npm run build` no se repitió: la medida 712,55 → 658,28 kB es la que registró el implementer.
