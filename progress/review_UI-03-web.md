# Revisión — UI-03-web (Robustez de la web)

- Rama: `feat/ui-03-web-robustness` (base `main` `dc280a9`). Contrato: 0.4.0 (solo lectura).
- Primera revisión: HEAD `0abe71e`, RECHAZADO (2 motivos). Re-revisión: HEAD `f296b5c` (diff `0abe71e..f296b5c`: `fe01da6`, `42f16b5`, `f296b5c`).

## Veredicto (re-revisión, 2026-10-30): **APROBADO**

Los dos motivos están resueltos y no he encontrado regresiones en el diff. La feature puede pasar a `done` cuando se cierre T17. Faltan el recorrido manual y las capturas, que son un límite registrado y no un motivo de rechazo. También falta la entrada de `progress/history.md`, que escribe el leader al cerrar.

### Motivo 1 — prueba R22 del slice: resuelto
- `src/test/i18nKeys.test.ts` contiene `describe('UI-03-web textos nuevos en cinco idiomas')` › `R22: …`. Comprueba que las 14 claves `common_(error|route|unsaved|draft)_*` existen en es, en, pt, fr y de, que no están vacías, que tienen los mismos parámetros y que no coinciden con el español. Solo hay una excepción justificada: pt `common_draft_discard`, «Descartar», que se escribe igual en portugués.
- La trazabilidad de `impl_UI-03-web.md` y de `docs/ui-robustness-verification.md` ya está corregida.

### Motivo 2 — spec y código no coincidían: resuelto
- **A1 (R12, D10 y T12):** la spec enmendada describe `lazyFeatureRoutes` y el `import()` que se hace después de `RequireRole`. La enmienda registra la decisión del usuario del 2026-10-30 y coincide con el código.
- **B1 (R15, R17, R18 y D12):**
  - `actionErrorMessage` devuelve `common_error_network` cuando no hay red y `common_error_server` con un 5xx. El 5xx se comprueba antes de los mensajes por estado (`src/shared/lib/problem.ts:111-125`).
  - `clinicalFailure` hace lo mismo (`src/features/triage/clinicalForm.ts:66-69`).
  - `ActionError` solo muestra «Reintentar» cuando recibe `onRetry`, y el componente solo se lo pasa si `isRetryableActionMessage` lo permite.
  - «Reintentar» solo repite la acción al pulsarlo: `requestSubmit()` en los formularios y la última acción en `PreRegistrationCard`. No hay reintento automático; R16 y UI-02 R25 siguen intactos.
  - Las pruebas nuevas están en `networkErrors.test.tsx`: R18 (acción con 5xx) y dos de R15 (confirmar llegada y cancelar atención).
- **Pruebas de F-02 y F-03 ajustadas:** el diff de `DirectRegistrationPage`, `ReceptionPage`, `EncounterDetailPage`, `ClinicalCaptureForms` y `problem.test.ts` solo cambia el texto esperado: el de acción de red pasa a «No hay conexión con el servidor.» y el genérico con 500 pasa a «El servidor tuvo un problema…». En `problem.test.ts`, el caso 500 sale de la tabla de R36 y pasa a una prueba propia que verifica más, no menos. No se borra ni se relaja ninguna aserción. Todas están listadas en `design.md` («Pruebas existentes que cambian»), junto con los cambios que faltaban de la primera revisión: f03 R5, `delay: null`, `SessionProvider` y el arnés.
- **Comprobación:** ejecuté `vitest` sobre `i18nKeys`, `networkErrors` y `problem.test.ts`: 30/30 en verde. No volví a ejecutar `./init.sh`, porque el diff no tiene riesgo transversal y el implementer reporta VERDE sobre `f296b5c`.

### Login (F-01) con su propio texto de red: aceptable, no bloquea
`LoginPage` no usa `actionErrorMessage`; sigue mostrando `feature_network_error` (`src/features/auth/components/LoginPage.tsx:39-40`). B1 y la enmienda de `design.md` hablan de los «errores de acción» del glosario de F-02-web, que pasan por `actionErrorMessage`. El login es anterior (F-01), se usa sin sesión y su texto de red ya es propio, está traducido y no se confunde con el de servidor. Aun así, la nueva redacción de R15 menciona «envío de un formulario», y el login lo es. **Recomendación no bloqueante:** que el leader añada al cerrar una línea en `design.md` («B1 no cubre el login de F-01; conserva su texto de red») para que la exclusión quede escrita, o que lo alinee en una feature posterior.

### Observaciones nuevas (no bloqueantes)
- El «Reintentar» de los errores de acción usa `button button--secondary`, una clase ya existente (`src/index.css:368`). No afecta a «Corregir» ni a «Validar».

### Checkpoints que cambian respecto a la primera revisión
- C6: [x] Cada R1–R32 tiene una prueba `R<n>:` bajo `UI-03-web …`; R22 está en `src/test/i18nKeys.test.ts`.
- C8: [x] `problem+json`: con un 5xx, tanto las consultas como las acciones muestran `common_error_server`, sin `detail` ni `title` (`networkErrors` R18).
- C5: [ ] Sigue faltando la entrada de `progress/history.md` (le toca al leader al cerrar).
- Los demás checkpoints siguen como en la primera revisión (abajo).

---

# Primera revisión (HEAD `0abe71e`) — RECHAZADO

- `./init.sh` completo ejecutado **una vez** (a petición del leader, por tokens): VERDE, FAIL 0, WARN 0.

## Motivos de rechazo (resueltos en la re-revisión)

1. **R22 no tenía ninguna prueba del slice.** No había ninguna prueba `R22:` bajo `describe('UI-03-web …')`; la tabla atribuía R22 a pruebas R22 de F-02 y F-03.
2. **El código no cumplía R12, R15, R17 y R18 tal como estaban aprobados, y la spec no se había enmendado.**
   - R12 y D10 exigían el `lazy` de React Router, y el código usa `lazyFeatureRoutes`.
   - En los errores de acción, un 5xx mostraba el genérico en lugar del texto de servidor, y un error de red mostraba otro texto de red sin «Reintentar».
   - Faltaban cambios en la lista «Pruebas existentes que cambian».

## Juicio de las 8 desviaciones declaradas

| # | Desviación | Juicio |
|---|---|---|
| 1 | `lazyFeatureRoutes` en lugar del `lazy` de React Router | Aceptable técnicamente, porque así una ruta prohibida no descarga código. Necesitaba enmienda (hecha: A1). |
| 2 | Los textos de red conservan el mensaje de cada pantalla | Aceptable en los errores de carga. En los errores de acción necesitaba enmienda (hecha: B1). |
| 3 | R5 de `f03Routes.test.tsx` adaptada | Aceptable: solo se añade un clic, como exige R1, y ahora consta en `design.md`. |
| 4 | `maxWorkers: '50%'`, `delay: null` y `preloadFeatures` | Aceptable dentro de D19, y ahora consta en `design.md`. |
| 5 | Interpretación de R24 | Aceptable: usa los genéricos existentes, y F-02 R23 sigue intacta. |
| 6 | Reutilizar claves i18n | Aceptable. |
| 7 | En T15 el código se escribió antes que las pruebas | Aceptable con anotación (desviación de proceso). |
| 8 | Nombre del documento | Aceptable (es el que fija la spec). |

## Comprobaciones específicas
- **Pruebas previas:** no se borró ninguna ni se relajó ninguna aserción. Solo cambian imports, nombres de `describe`, `delay: null`, el clic de R5 y `session.restore()` en el helper.
- **Privacidad:** solo existe la clave `asclepio.draft.vitals.<uuid>`. Guarda una lista blanca de 9 campos validados con una expresión regular (sin texto libre), además de `userId`, `encounterId` y `savedAt`, y caduca a los 30 minutos. Se borra al enviar, al descartar, al recuperar, al cerrar sesión y al arrancar. `privacy.test.tsx` tiene un caso R24 nuevo; R10 y UI-02 R27 no cambian.
- **Sin reintento al reconectar:** `refetchOnReconnect: false`, `networkMode: 'always'` y mutaciones con `retry: 0`. Lo prueban `queryClient.test.ts` y `networkErrors` R16.
- **Identidad visual:** solo se añade CSS con tokens (`.confirm-dialog`, `.route-error`). No hay dependencias nuevas.
- **Cinco idiomas:** las 14 claves están en los cinco catálogos e `i18n:check` pasa.

## Checkpoints (primera revisión)
- C1: [x] harness completo; [x] docs; [x] `./init.sh` con exit 0.
- C2: [x] solo una feature `in_progress`; [x] las features `done` pasan sus pruebas; [x] `progress/current/` solo tiene UI-03-web.
- C3: [x] estructura; [x] sin imports entre features; [x] `fetch` solo en `shared/api/client.ts:14`; [x] sin dependencias nuevas; [x] sin `console.log` ni TODOs (el único `console.error` es intencionado y solo registra el tipo, `routeErrors.ts:23-28`).
- C4: [x] pruebas de comportamiento; [x] `fakeApi` en la frontera de red; [x] suite en verde.
- C5: [x] sin archivos sin trackear; [ ] falta la entrada de `progress/history.md` (le toca al leader al cerrar); [x] estado `in_progress`.
- C6: [x] specs; [x] EARS con trazas; [x] T1–T16 `[x]` (T17 pendiente del recorrido manual); [ ] R22 sin prueba → resuelto en la re-revisión.
- C7: [x] sugerencia, nivel, «Corregir» y triage manual sin tocar; [x] sin datos personales en `console`, `localStorage` ni la URL; [x] horas de Bogotá sin cambios.
- C8: [x] 0.4.0 = `info.version`; [x] `api:types` sin diff; [~] texto de 5xx en las acciones → resuelto en la re-revisión.

## Observaciones no bloqueantes
1. T1 está en `[x]`, pero las capturas «antes» (`ui03-*`) no existen. Habrá que tomarlas sobre `0bd94f7`.
2. R30 solo se prueba con el diálogo; no hay prueba de teclado para R5, R8, R14, R15 y R18.
3. La prueba de R28 es estática. La evidencia real son las tres ejecuciones registradas.
4. En producción, las consultas conservan `retry` por defecto (3) con `networkMode: 'always'`, así que el error de red tarda unos segundos en aparecer. No es un reintento por reconexión.
5. La «validación de forma» del borrador es la lista blanca más la expresión regular, no el esquema Zod completo. Basta para R6.

## Límites (no son motivo de rechazo)
- El usuario aún tiene pendiente el recorrido manual con login de los cuatro roles contra `http://localhost:3000` y las capturas `ui03-*-{antes,despues}.jpg` (T17).
- `./init.sh` se ejecutó una vez, en la primera revisión. En la re-revisión solo ejecuté las pruebas afectadas por el diff. `npm run build` no se repitió.
