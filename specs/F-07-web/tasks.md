# F-07-web — Tareas

No hay migraciones: la web no tiene base. El contrato consumido sigue siendo **0.9.0**, sin cambio de versión (design D1).

Reglas para todas las tareas:

- Se ejecutan en este orden.
- En cada una, el `implementer` escribe **primero la prueba** `R<n>:` (bajo `describe('F-07-web …')`), comprueba que falla, escribe el código, ejecuta la suite completa y solo entonces marca `[x]`.
- Las pruebas existentes se ajustan solo en lo que lista `design.md` («Pruebas existentes que cambian»). Cada ajuste va en la tarea que lo provoca, para que la suite no quede en rojo entre tareas.
- Todo texto nuevo o cambiado entra en los cinco catálogos en la misma tarea que lo usa (R28).
- Prohibido escribir en `../asclepio-api/` y añadir dependencias.
- Rama `feature/F-07-web` desde `develop`. Commits con el pie `Refs: F-07-web` (docs/conventions.md). PR a `develop` sin fusionar.
- PA-1..PA-9 las cerró el humano el 2026-11-13 con la opción (a). T1 no empieza hasta que la spec esté aprobada.

- [x] **T1 — Contrato, alias y retirada de DT-02-web R2 (D1).**
  - Pruebas en `src/test/f07Transversal.test.ts`, con `R31:`:
    - `CONSUMED_CONTRACT === EXPECTED_CONTRACT === '0.9.0'` y las tres huellas sin cambios;
    - `npm run api:types` sin diff (la huella de `schema.d.ts`);
    - los alias de reportes de `client.ts` solo como `Schemas[...]` o `paths[...]`, sin `interface Report`;
    - ninguna dependencia nueva.
  - Añadir a `client.ts` los alias de design (tabla de capas), con el comentario `// F-07-web (contrato 0.9.0): reportes. Solo alias de tipos generados.`.
  - Retirar de `src/test/dt02Transversal.test.ts` el `describe('DT-02-web reportes fuera de alcance')` y su `MESSAGE`. Las demás pruebas de DT-02-web no cambian.
  - Añadir a `WEB_OPERATIONS`, en orden alfabético tras `GET /api/v1/queue`, `'GET /api/v1/reports/encounters.csv'` (comentada `// F-07-web T7`) y `'GET /api/v1/reports/summary'` (comentada `// F-07-web T3`).
  - (R31)
- [x] **T2 — Funciones puras de fecha, formato y nombre (D4, D5, D8).**
  - Pruebas en `src/shared/lib/datetime.f07.test.ts`:
    - `R5:` `bogotaToday` con `2026-11-11T04:59:59Z` → `2026-11-10` y `2026-11-11T05:00:00Z` → `2026-11-11`, también con la zona del proceso en `Asia/Tokyo`;
    - `R5:` `addCivilDays` en fin de mes, en fin de año y el 29 de febrero de 2028.
  - Pruebas en `src/features/reports/reportsView.test.ts`:
    - `R5:` `defaultPeriod('2026-11-11')` → `{ from: '2026-11-05', to: '2026-11-11', siteId: null }`;
    - `R3:` `formatMinutes(12.5)` → «12,5 min» (es) y «12.5 min» (en); `formatPercent(45)` → «45,0 %»; `formatKappa(0.812)` → «0,812»; `formatCount(3)` → «3»;
    - `R4:` todos los formateadores con `null` → `null`, nunca «0» ni «—»;
    - `R24:` `filenameFromDisposition` con `attachment; filename="asclepio-atenciones-2026-11-05_2026-11-11.csv"`, sin comillas y con `filename*=UTF-8''…`, y `null` con la cabecera ausente, con `../x.csv`, `a/b.csv` o `x.txt`; `csvFilename({ from, to })` con el patrón del contrato.
  - Después: implementar `bogotaToday` y `addCivilDays` en `src/shared/lib/datetime.ts`, y `reportsView.ts` (formateadores, `defaultPeriod`, `filenameFromDisposition` y `csvFilename`).
  - (R3, R4, R5, R24)
- [x] **T3 — Fixtures y consulta del resumen (D3, D12).**
  - Crear `src/features/reports/testing/reportFixtures.ts` con las fixtures de D12 y los _handlers_ `GET_SUMMARY` y `GET_CSV` (y, si hace falta, el ayudante `csv()` en `src/test/fakeApi.ts`).
  - Pruebas en `src/features/reports/hooks/reportHooks.test.tsx`:
    - `R2:` un único `GET /reports/summary` con `{ from, to }` y, con sede, `{ from, to, siteId }`, sin ningún otro parámetro;
    - `R6:` la clave cambia con el periodo y no hay `placeholderData`;
    - `R20:` 30 s con la pestaña visible, sin repetir por foco ni por reconexión (PA-2 a);
    - `R22:` un 403 detiene el intervalo;
    - `R8:` un 400 y un 422 también lo detienen.
  - Después: implementar `useReportSummary` y activar `GET /api/v1/reports/summary` en `WEB_OPERATIONS`. Ajustar `f06Transversal.test.ts` R30: `toHaveLength(23)` → `24`.
  - (R2, R6, R8, R20, R22)
- [x] **T4 — Página, periodo y estados (D2, D9, D10, D11).**
  - Sustituir `ReportsPage.test.tsx` por pruebas `F-07-web`, como dice `design.md`:
    - `R1:` orden de zonas (encabezado, «Periodo», «Indicadores» con 3 celdas y `--cells = 3`, los cuatro paneles y «Exportar»), un solo `h1`, «Actualizar» como única acción del encabezado, y sin franja «pendiente» ni «Atenciones por sede»;
    - `R2:` sin `GET /encounters`;
    - `R5:` con el reloj falso en `2026-11-11T15:00:00Z`, «Desde» = `2026-11-05`, «Hasta» = `2026-11-11` y la primera petición con esas fechas;
    - `R6:` cambiar campos sin «Aplicar» no pide nada; «Aplicar» con otra fecha y otra sede pide una vez, sin valores del periodo anterior mientras carga (`deferred`), y nada en la URL;
    - `R7:` «Desde» vacío y una fecha imposible, con `aria-invalid`, el mensaje y ninguna petición; `from > to` sí se envía;
    - `R8:` un 422 con `errors[{ field: 'to' }]` y un 400 muestran el mensaje del periodo, marcan el campo, sin «Reintentar» ni paneles, y sin repetir a los 30 s;
    - `R9:` «Del 05/11/2026 al 11/11/2026», el nombre de la sede de `period.siteId` o «Todas las sedes», y `generatedAt` en Bogotá sin segundos;
    - `R10:` error de sedes con «Reintentar» y la consulta de todas las sedes;
    - `R19:` un solo `role="status"` con «Cargando los indicadores…» y celdas `aria-busy`;
    - `R20:` «Se actualiza cada 30 s»; durante el refresco, valores y foco conservados, sin carga, y «Actualizar» con `aria-busy` sin deshabilitarse;
    - `R21:` error inicial con «Reintentar» y refresco fallido con los datos anteriores y el aviso con la hora;
    - `R22:` el 403 sin «Reintentar».
  - Después:
    - reescribir `ReportsPage.tsx` y crear `PeriodForm.tsx`;
    - añadir `display` a `SummaryCell`, con una prueba nueva en `dashboard.test.tsx`;
    - eliminar `SiteCountTable.tsx`;
    - añadir las claves de encabezado, periodo, barra y generales a los cinco catálogos.
  - Ajustar `pendingStrip.test.tsx` y los _handlers_ de las pruebas de router que abren `/reportes`, como dice `design.md`.
  - (R1, R2, R5, R6, R7, R8, R9, R10, R19, R20, R21, R22)
- [x] **T5 — Tiempos y cumplimiento (D5, D6).**
  - Pruebas en `ReportsPage.test.tsx`:
    - `R11:` tabla «De la llegada al triage» con las filas «Nivel I»…«Nivel V» en el orden recibido (con `byLevelUnordered`) y «Total», columnas «Atenciones», «Mediana» y «P90», «12,5 min», y «Sin datos» en el nivel con `n = 0`;
    - `R12:` tabla de I y II con «Media», la nota «desde la clasificación hasta la atención médica» y la Res. 256 de 2016;
    - `R13:` «66,7 %», «2 de 3 atenciones», «Sin evaluar…: 1», el máximo con `maxMinutes` (con `summaryMaxMinutes45`, «máx. 45 min» y ningún «30»), la nota del nivel I y ningún porcentaje en otros niveles;
    - `R3:` ningún valor distinto del de la fixture formateado;
    - `R4:` con `summaryEmpty`, «Sin datos» en cada `null` y «0» en cada conteo 0, sin «—» ni celdas vacías;
    - `R17:` el aviso de periodo vacío encima de los paneles, que siguen visibles.
  - Después: implementar `TimeToTriagePanel`, `CarePanel` y `ReportValue`, y sus claves.
  - (R3, R4, R11, R12, R13, R17)
- [x] **T6 — Concordancia y respaldo (D6).**
  - Pruebas en `ReportsPage.test.tsx`:
    - `R14:` pares, acuerdo, kappa con 3 decimales, sub y sobreclasificación con su definición, y la matriz como `table` con `caption`, 5 `th scope="row"` («Sugerido: Nivel I»…) y 5 `th scope="col"` («Final: Nivel I»…), y los conteos de `matrix[i][j]` en su celda;
    - `R15:` el aviso de fiabilidad según PA-4 (a), junto al kappa y con el número de pares; con `summaryOnePair`, «Sin datos» y el aviso;
    - `R16:` las cuatro tablas, con conteo, porcentaje y «Total: {n}», «OpenRouter (respaldo)» y los guards aplicados;
    - `R18:` los rótulos «sugerido por la IA» y «final (enfermería)», y ningún nombre, documento, iniciales ni id de atención en el texto de la página.
  - Después: implementar `ConcordancePanel` y `FallbackPanel`, y sus claves.
  - (R14, R15, R16, R18)
- [x] **T7 — Descarga del CSV (D7, D8).**
  - Pruebas en `ReportsPage.test.tsx`, simulando `URL.createObjectURL`, `URL.revokeObjectURL` y el `click` del enlace:
    - `R23:` «Descargar CSV» y el aviso «Formato interno, no es el reporte oficial de la Res. 373 / SISPRO.», visible y enlazado por `aria-describedby`;
    - `R24:` un clic hace un solo `GET /reports/encounters.csv` con el **periodo aplicado** aunque el formulario tenga otro sin aplicar, con `Authorization: Bearer …`; con `Content-Disposition` legible usa su nombre, y sin la cabecera usa `asclepio-atenciones-<from>_<to>.csv`; el `Blob` guardado es el recibido;
    - `R25:` con `deferred`, un segundo clic no hace otra petición, el botón lleva `aria-busy` y se ve «Preparando el CSV…»; un refresco del resumen durante la descarga no la cancela;
    - `R26:` un 403 da «No tienes permiso para esta acción.» sin «Reintentar»; un 422 da el mensaje del periodo; una caída de red o un 500 dan el error con «Reintentar», que repite una sola vez y solo al pulsarlo; la barra y los paneles no cambian;
    - `R27:` se llama a `revokeObjectURL`, ninguna consulta ni mutación de la caché guarda el `Blob` y el texto del CSV no aparece en el DOM.
  - Después:
    - implementar `src/shared/lib/download.ts`, `useCsvDownload` y `ExportPanel`, y sus claves;
    - activar `GET /api/v1/reports/encounters.csv` en `WEB_OPERATIONS`;
    - ajustar `f06Transversal.test.ts` R30: `24` → `25`, con el comentario de design.
  - (R23, R24, R25, R26, R27)
- [x] **T8 — Rol, idiomas, privacidad y responsive.**
  - Pruebas en `src/app/router/f07Routes.test.tsx`, con `renderApp`:
    - `R32:` RECEPTION, NURSE y PHYSICIAN en `/reportes` ven «Sin permiso» y no hacen ninguna petición `/api/v1/reports/*`;
    - `R28:` al cambiar a inglés con el tablero en pantalla, los títulos, el aviso del CSV y «Sin datos» salen traducidos, y los números usan el punto decimal;
    - `R30:` y `R27:` tras cargar, refrescar y descargar, no hay valores del resumen ni del CSV en la URL, el almacenamiento ni la consola.
  - Pruebas en `src/test/f07Transversal.test.ts`:
    - `R28:` las claves `reports_*` en los cinco idiomas, con los mismos parámetros, el inglés distinto del español, sin `F-0<n>` y sin nuevas claves `suggestion_`; `noUiLiterals` sin excepciones nuevas; `guide_reports` sin cifras ni parámetros, con «Actualizar» y «se actualiza sola», en el texto de PA-9 (es); las nueve claves retiradas, ausentes de los catálogos y del código;
    - `R29:` el bloque CSS `/* F-07-web */` sin colores literales ni estilos en línea;
    - `R30:` y `R27:` `features/reports` sin `localStorage`, `sessionStorage`, `useSearchParams`, `console.`, `useDraft` ni `fetch(`;
    - `R3:` en `features/reports` no hay aritmética sobre campos del resumen (`+`, `-`, `*` o `/` junto a `.percent`, `.median`, `.count` o `.n`) ni el literal `30` fuera de las pruebas.
  - Después:
    - cambiar `guide_reports` en `messages/common/*.json` y retirar las nueve claves del plan i18n;
    - ajustar `dashboards.test.tsx` como dice `design.md` (`NEW_MESSAGES` 27 → 18, `guide_reports`, `translate`, `LABEL_KEYS`, `DASHBOARDS`, `dashboardApi`, `ALLOWED_REQUESTS`, `PRIVACY_SCENARIOS` y la lista de R36);
    - añadir el bloque CSS `/* F-07-web */` (D11) y una prueba de componente de que cada tabla está dentro de `.report-table-wrap` con nombre accesible (R29).
  - (R3, R27, R28, R29, R30, R32)
- [x] **T9 — Documentación.**
  - `docs/ui-dashboards.md`:
    - en la tabla, la fila ADMIN pasa a «_sustituido por F-07-web (fecha de aprobación): `ReportsPage`, el tablero de reportes_»;
    - en UI-02.AC4 (d), una enmienda F-07-web: el tablero sustituye a los indicadores por estado y a la tabla por sede, con remisión a `specs/F-07-web/`;
    - en UI-02.AC5, una enmienda F-07-web: `/reportes` ya no tiene franja «pendiente» y muestra cifras de reportes calculadas por el servidor, de modo que el criterio ya no se aplica a ninguna pantalla;
    - en UI-02.AC3 y UI-02.AC7, una línea cada una: en `/reportes`, los datos salen de `GET /reports/summary` y se muestran niveles y concordancia con la IA solo como agregados, sin datos de pacientes.
  - `src/features/reports/README.md` describe el tablero y la descarga, y `routes.tsx` actualiza su comentario.
  - Anotar en `progress/current/F-07-web.md` dos propuestas para el humano: la de CORS para `asclepio-api` (exponer `Content-Disposition`, D8) y la limpieza posible de `PendingStrip` (D13).
  - (R1, R24)
- [x] **T10 — Verificación y cierre.**
  - Comprobaciones automáticas en verde: `./init.sh` (lint, typecheck y Vitest), `npm run i18n:check`, `npm run build` y `npm run api:types` sin diff.
  - Preparación:
    - arrancar la API local en `../asclepio-api` (rama `develop`, contrato 0.9.0) con `npm run start:dev`, solo leyendo ese repo, sin escribir en él;
    - crear datos sintéticos `DEV-…` (RNF-15) con `../prereg.sh`, recepción, `../triage.sh` (grave y leve) o el triage de la web como NURSE, con decisiones Validar, Corregir y manual, y algunas atenciones iniciadas y cerradas en `/cola` como PHYSICIAN, en al menos dos sedes;
    - iniciar sesión como ADMIN.
  - Verificación manual en el navegador, a 1440, 768 y 375 px, con tema claro y oscuro y zoom al 200 %:
    1. **Periodo con datos**: por defecto, los últimos 7 días con hoy incluido. Cada cifra coincide con la respuesta de `GET /reports/summary` en la pestaña Red, con el formato del idioma, y la web no muestra ningún valor que no esté en la respuesta. Se ven la hora de cálculo, el cumplimiento del Triage II con el máximo de la API, el nivel I sin porcentaje, la matriz y el respaldo.
    2. **Periodo vacío**: unas fechas pasadas sin atenciones (por ejemplo, de hace un año). Se ven el aviso de periodo vacío, «Sin datos» en cada `null` y 0 en los conteos, sin ningún «0 %» inventado.
    3. **Filtro de sede**: elegir una sede y «Aplicar». La petición lleva `siteId`, las cifras cambian y la sede consultada se nombra. Con «Todas las sedes», sin `siteId`.
    4. **Rango inválido**: «Desde» posterior a «Hasta» → 422 con el mensaje y los campos marcados. Un periodo de más de 366 días → 422. El 400 se comprueba aparte con una petición manual a la API (`curl` con `from=2026-13-01` y el token de ADMIN), porque la interfaz no deja enviar fechas mal formadas (R7). Ningún error repite la petición cada 30 s.
    5. **CSV**: «Descargar CSV» con el periodo con datos. El archivo `asclepio-atenciones-<from>_<to>.csv` se abre en LibreOffice Calc o Excel con la coma como separador y UTF-8: las cabeceras son las de `docs/reports-csv.md`, hay tantas filas como «Atenciones» de la barra, las horas van con `-05:00`, no hay nombres ni documentos, y una sede con nombre que empiece por `=` aparece con comilla y sin ejecutarse, si se creó. El aviso de formato interno se ve junto al botón en todos los anchos. Un doble clic descarga un solo archivo.
    6. **Refresco**: con PA-2 (a), cada 30 s llega un `GET /reports/summary` nuevo sin perder el foco. «Actualizar» lo repite al instante.
    7. **Idiomas**: en inglés, portugués, francés y alemán, los textos, la guía de voz y el formato numérico salen traducidos. En 375 px, la matriz se desplaza dentro de su caja y el documento no desborda.
    8. **Roles**: como NURSE, PHYSICIAN y RECEPTION, `/reportes` muestra «Sin permiso» y no hay peticiones a `/api/v1/reports`.
    9. **Cola**: en `/cola` como PHYSICIAN, la alerta, el máximo y «Clasificada hace N min» siguen como los dejó DT-02-web (este slice no la toca).
  - En todos los casos, comprobar en DevTools que no hay datos del resumen ni del CSV en el almacenamiento, la URL ni la consola.
  - Dejar la tabla R1–R32 → `archivo::prueba` y los resultados del recorrido en `progress/impl_F-07-web.md`.
  - (R1–R32)
