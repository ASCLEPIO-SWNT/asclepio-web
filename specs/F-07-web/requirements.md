# F-07-web — Tablero de reportes (ADMIN) y descarga del CSV

Brief global: `../asclepio-api/docs/product/features/F-07.md`. Este slice cubre **F-07.AC6**: la web muestra los indicadores y permite descargar el CSV. Los indicadores los calcula la API para **F-07.AC1–AC4**, y la web solo los muestra. La autorización es la de **F-07.AC5**. PA-F07-1..4 y la definición de cumplimiento están resueltas en el brief (humano, 2026-11-10) y esta spec no las reabre:

- tiempos por nivel con n, mediana y p90;
- tiempo de triage a atención de I y II, con la media (indicador de la Res. 256 de 2016);
- cumplimiento solo del nivel II (≤ 30 min desde la clasificación) y nivel I sin porcentaje;
- kappa de Cohen ponderado cuadrático más el acuerdo exacto;
- CSV en formato interno, que no es el de la Res. 373 ni el de SISPRO, y sin nombres ni documentos.

Comportamiento de la API: `../asclepio-api/specs/F-07-api/` (R1–R19; design D1–D8, en especial D3 y D6) y `../asclepio-api/docs/reports-csv.md`.

Contrato: consume **0.9.0**, sin cambios de versión: la web ya lo consume desde DT-02-web y `npm run api:types` no produce diff. Usa `GET /api/v1/reports/summary` (`ReportSummaryDto`) y `GET /api/v1/reports/encounters.csv` (`text/csv` con `Content-Disposition`), los dos solo para `ADMIN`.

RNF aplicables: RNF-05, RNF-10, RNF-12, RNF-13, RNF-14, RNF-17.

Depende de: F-05-web (`done`) y F-07-api (`done`, contrato 0.8.0, publicado en 0.9.0).

Requisitos previos que este slice sustituye o enmienda. `specs/UI-02-web/` y `specs/DT-02-web/` no se reescriben: este apartado, design «Pruebas existentes que cambian» y la enmienda de `docs/ui-dashboards.md` dejan constancia.

- **UI-02.AC4 (d)** y **UI-02-web R17**: se sustituyen en `/reportes`. Ya no hay indicadores por estado con `GET /encounters` ni el panel «Atenciones por sede»; en su lugar va el tablero de R1.
- **UI-02.AC5** y **UI-02-web R18**: `/reportes` deja de tener la franja «pendiente». Con F-06-web y este slice, ninguna pantalla la muestra. `/reportes` sí muestra cifras de reportes, porque son del servidor (F-07-api).
- **UI-02.AC3** y **UI-02-web R6, R7 y R8**: dejan de aplicarse a `/reportes`. Sus datos salen de `GET /reports/summary` y no de `GET /encounters`, así que no hay conteos «N+».
- **UI-02.AC7** y **UI-02-web R26**: en `/reportes` se muestran niveles de triage y la concordancia con la IA **solo como agregados** del periodo (R18). Siguen prohibidos los datos de pacientes y las sugerencias o decisiones de una atención concreta.
- **UI-02-web R24 y R28**: las peticiones de `/reportes` pasan a ser `GET /me`, `GET /public/tenants` y `GET /reports/summary` (R2). El CSV solo se pide al pulsar el botón (R24).
- **UI-02-web R33**: cambia el texto de `guide_reports` (R28).
- **UI-02-web R34**: la frase «salvo la tabla de sedes, que no se apila» queda sin objeto.
- **DT-02-web R2**: se retira. Prohibía `/api/v1/reports/*` hasta este slice. La sustituye R31.

Revisión de la cola pedida por el humano (2026-11-11), confirmada leyendo el código y los catálogos el 2026-11-11. Ya la hizo DT-02-web y no queda nada pendiente:

- `QueueWait.tsx` muestra «Clasificada hace {n} min» (`queue_since_triage`, con `minutesSinceTriage`) en las filas de «Clasificadas».
- El máximo dice «Máx. {n} min desde la clasificación» (`queue_max_minutes`).
- La alerta tiene el texto visible «Tiempo máximo superado» y el texto accesible «Tiempo máximo superado desde la clasificación» (`queue_overdue_a11y`), en los cinco idiomas.
- `guide_queue` dice que la espera se cuenta desde la llegada y el tiempo máximo, desde la clasificación.

Ningún texto de la alerta ni del máximo dice «desde la llegada». Este slice no toca `features/queue`.

Glosario de la spec:

- **Resumen**: la respuesta de `GET /api/v1/reports/summary` (`ReportSummaryDto`).
- **Periodo**: el par de fechas civiles `from` y `to` (`YYYY-MM-DD`, ambas incluidas), que la API interpreta en `America/Bogota` (F-07-api R3). **Periodo aplicado**: el par, con la sede, de la última consulta que pidió el usuario o la carga por defecto. Puede no coincidir con lo que está escrito en el formulario sin aplicar.
- **Hoy en Bogotá**: la fecha civil `YYYY-MM-DD` del reloj del navegador en `America/Bogota`. Solo sirve para el periodo por defecto (R5). No es una hora legal y no se envía como hora.
- **Sin datos**: el texto que sustituye a cualquier valor `null` del resumen (R4).
- **Valor del servidor**: todo número del resumen. La web lo muestra con el formato del idioma y nunca lo calcula, suma, redondea de otra forma ni compara (R3).
- **Descarga**: el `GET /api/v1/reports/encounters.csv` que dispara «Descargar CSV» y que termina guardando el archivo en el equipo.
- Las pruebas de este slice viven bajo `describe('F-07-web …')` y su nombre empieza por `R<n>:`.

## Requisitos

### Ubicación y lectura

- **R1** (Ubicuo) El sistema deberá mostrar en `/reportes`, solo para ADMIN y sin cambiar la matriz de roles, la navegación ni la redirección de `/app`, el tablero de reportes con estas zonas, en este orden de documento y de foco:
  - el encabezado: el `h1` «Reportes», la descripción y «Actualizar»;
  - la región «Periodo», con «Desde», «Hasta», «Sede» y «Aplicar»;
  - la barra de resumen «Indicadores»;
  - los paneles «De la llegada al triage», «Triage I y II: de la clasificación a la atención», «Concordancia IA–enfermería» y «Uso de respaldo y safety guards»;
  - el panel «Exportar».

  No deberá mostrar la franja «pendiente», el panel «Atenciones por sede» ni los indicadores por estado de UI-02-web. La barra deberá tener tres celdas: «Atenciones» (`population.encounters`), «Con triage» (`population.triaged`) y «Cumplimiento Triage II» (`compliance.percent`, o «Sin datos»). (→ F-07.AC6) (decidido en PA-1)

- **R2** (Ubicuo) El sistema deberá obtener los indicadores con un único `GET /api/v1/reports/summary` por carga o refresco. La petición deberá:
  - ir por el cliente HTTP central, con los tipos generados;
  - llevar `from` y `to` del periodo aplicado, y `siteId` solo si hay una sede elegida, sin ningún otro parámetro.

  Desde `/reportes` no deberá pedir `GET /api/v1/encounters` ni ningún otro endpoint de datos, salvo las sedes (que la web pide una vez por sesión) y la descarga de R24. (→ F-07.AC6, F-07.AC1) (RNF-14)

- **R3** (Ubicuo) El sistema deberá mostrar cada número del resumen tal como llega, con `Intl.NumberFormat` del idioma elegido y decimales fijos (minutos y porcentajes con exactamente 1 decimal, kappa con 3 y conteos enteros), y no deberá:
  - calcular, sumar ni promediar medianas, p90, medias, porcentajes, el kappa, totales ni el cumplimiento;
  - redondearlos a otra precisión;
  - deducir un porcentaje a partir de los conteos.

  (→ F-07.AC6) (RNF-10; decidido en PA-7)

- **R4** (No deseado) Si un valor del resumen llega `null` (mediana, p90, media, porcentaje o kappa), entonces el sistema deberá mostrar en su lugar el texto «Sin datos». Nunca deberá mostrar «0», «0 %», «—» ni dejar la celda vacía. Un conteo que llega `0` deberá mostrarse como `0`. (→ F-07.AC6)

### Periodo y sede

- **R5** (Por evento) Cuando se abra `/reportes`, el sistema deberá proponer como periodo por defecto desde hoy en Bogotá − 6 días hasta hoy en Bogotá (siete fechas civiles con hoy incluido), con «Todas las sedes». Deberá mostrar esas fechas en «Desde» y «Hasta» y hacer la carga inicial con ellas. El cálculo deberá usar solo aritmética de fechas civiles en `America/Bogota`, sin horas ni desfases enviados a la API. (→ F-07.AC6, F-07.AC1) (decidido en PA-3)
- **R6** (Por evento) Cuando el usuario pulse «Aplicar» con «Desde» y «Hasta» válidos según R7, el sistema deberá:
  - fijar el periodo aplicado y hacer la carga inicial del resumen con él;
  - no mostrar, mientras carga, los indicadores del periodo o la sede anteriores.

  El periodo y la sede deberán vivir solo en memoria, fuera de la URL y del almacenamiento. Cambiar «Desde», «Hasta» o «Sede» sin pulsar «Aplicar» no deberá pedir nada. (→ F-07.AC6, F-07.AC1)

- **R7** (No deseado) Si al pulsar «Aplicar» «Desde» o «Hasta» están vacíos o no son una fecha `YYYY-MM-DD` válida, entonces el sistema deberá marcar el campo (`aria-invalid` y el mensaje asociado) y no deberá enviar ninguna petición. No deberá comprobar en el cliente el orden de las fechas ni la longitud del periodo: eso lo responde la API (R8). (→ F-07.AC1) (decidido en PA-6)
- **R8** (No deseado) Si `GET /reports/summary` responde 400 o 422, entonces el sistema deberá:
  - mostrar en lugar de la barra y los paneles el mensaje del periodo de PA-9, con los campos de `errors[]` (`from`, `to`) marcados en «Desde» y «Hasta», y sin «Reintentar»;
  - no repetir esa petición por intervalo hasta que se aplique otro periodo;
  - no repetir en pantalla los valores enviados más allá de lo que ya está en los campos.

  (→ F-07.AC1, F-07.AC6) (F-07-api R1, R2)

- **R9** (Ubicuo) El sistema deberá mostrar con cada resumen con éxito:
  - el periodo que devuelve la API (`period.from`, `period.to`), en `DD/MM/AAAA` y sin conversión de zona;
  - la sede (`period.siteId`), con su nombre de las sedes del tenant, o «Todas las sedes» con `null`;
  - la hora de cálculo (`generatedAt`), en `America/Bogota` y sin segundos.

  (→ F-07.AC6) (RNF-10)

- **R10** (No deseado) Si las sedes no se pueden cargar, entonces el sistema deberá mostrar el error del filtro con «Reintentar» bajo el control «Sede» y seguir permitiendo consultar todas las sedes. (→ F-07.AC1)

### Indicadores

- **R11** (Ubicuo) El sistema deberá mostrar en el panel «De la llegada al triage» una tabla con una fila por cada entrada de `timeToTriage.byLevel`, en el orden recibido y rotulada «Nivel {romano}», y una última fila «Total» con `timeToTriage.total`. Las columnas deberán ser «Atenciones» (`n`), «Mediana» y «P90», con los minutos de la API. (→ F-07.AC1, F-07.AC6) (PA-F07-3)
- **R12** (Ubicuo) El sistema deberá mostrar en el panel «Triage I y II: de la clasificación a la atención» una tabla con una fila por cada entrada de `timeToCare.byLevel` (niveles I y II), en el orden recibido. Las columnas deberán ser «Atenciones» (`n`), «Media», «Mediana» y «P90», en minutos. El panel deberá decir que el tiempo se cuenta desde la clasificación hasta la atención médica y que la media es el indicador de la Res. 256 de 2016. (→ F-07.AC1, F-07.AC6) (decisión del humano, 2026-11-10)
- **R13** (Ubicuo) El sistema deberá mostrar en ese mismo panel el cumplimiento del Triage II con los datos de `compliance`:
  - el porcentaje (`percent`, o «Sin datos»);
  - «{compliant} de {evaluable}» atenciones;
  - el máximo con el valor `maxMinutes` que manda la API, sin escribir 30 en el código;
  - las no evaluadas (`notEvaluated`).

  El nivel I deberá ir con el texto de PA-9 que dice que es atención inmediata y no tiene porcentaje. Ningún otro nivel deberá mostrar un porcentaje de cumplimiento. (→ F-07.AC1, F-07.AC6) (decisión del humano, 2026-11-10)

- **R14** (Ubicuo) El sistema deberá mostrar en el panel «Concordancia IA–enfermería»:
  - los pares (`pairs`), el acuerdo exacto, el kappa ponderado, la subclasificación y la sobreclasificación, cada uno con su definición corta de PA-9 (subclasificación: la IA sugirió un nivel menos grave que el final; sobreclasificación: uno más grave);
  - la matriz 5×5 (`matrix[sugerido − 1][final − 1]`) como tabla, con las filas rotuladas por nivel sugerido por la IA y las columnas por nivel final de enfermería, y los conteos tal como llegan.

  (→ F-07.AC2, F-07.AC6) (PA-F07-2)

- **R15** (Ubicuo) El sistema deberá mostrar siempre junto al kappa ponderado, sin ningún umbral, el número de pares («{pairs} pares») y la nota fija «Con pocos pares el kappa es poco fiable.». Con `weightedKappa = null` deberá mostrar «Sin datos» (R4) junto con el número de pares y la nota. (→ F-07.AC2, F-07.AC6) (decidido en PA-4)
- **R16** (Ubicuo) El sistema deberá mostrar en el panel «Uso de respaldo y safety guards» cuatro tablas, con el conteo y el porcentaje de cada fila y el total del denominador:
  - decisiones de enfermería: «Validar», «Corregir» y «Triage manual», sobre `fallback.decisions.total`;
  - estado de las sugerencias: correcta, salida inválida, tiempo agotado y fallida, sobre `fallback.suggestions.total`;
  - proveedor: «Groq» y «OpenRouter (respaldo)», sobre `fallback.providers.total`;
  - safety guards aplicados: `fallback.guards.applied` y su porcentaje, sobre `fallback.guards.total`.

  (→ F-07.AC3, F-07.AC6)

- **R17** (Por estado) Mientras el resumen tenga `population.encounters = 0`, el sistema deberá mostrar el aviso de periodo sin atenciones de PA-9 encima de los paneles y seguir mostrando los paneles con los valores de la API (conteos en 0 y «Sin datos» en los `null`). (→ F-07.AC6)
- **R18** (Ubicuo) El sistema deberá mostrar en `/reportes` solo agregados del periodo, y deberá:
  - rotular el nivel sugerido siempre como «sugerido por la IA» y el final como «final (enfermería)», de modo que una sugerencia nunca parezca una decisión;
  - no mostrar ningún dato de pacientes, ninguna atención concreta ni ningún nombre del personal.

  (→ F-07.AC6) (RNF-17)

### Estados y refresco

- **R19** (Por estado) Mientras dure la carga inicial de un periodo, el sistema deberá mostrar un único estado de carga (`role="status"`) con «Cargando los indicadores…» y las celdas de la barra ocupadas (`aria-busy`), sin valores de otro periodo. (→ F-07.AC6)
- **R20** (Por estado) Mientras `/reportes` esté abierta, el sistema deberá repetir el resumen del periodo aplicado cada 30 s con la pestaña visible (sin repetirlo por foco de la ventana, por reconexión ni con la pestaña oculta), mostrar la nota «Se actualiza cada 30 s» y repetirlo al instante al pulsar «Actualizar». Durante un refresco deberá conservar los valores, el foco y la posición de desplazamiento, sin estado de carga, y «Actualizar» deberá llevar `aria-busy="true"` sin deshabilitarse. (→ F-07.AC6) (UI-02.AC6; decidido en PA-2)
- **R21** (No deseado) Si `GET /reports/summary` falla sin respuesta HTTP o con 5xx, entonces el sistema deberá:
  - en la carga inicial, mostrar el error traducido (`common_error_network` o `common_error_server`) con «Reintentar», sin barra ni paneles;
  - en un refresco, conservar los valores del último éxito con el aviso de refresco fallido de PA-9 y «Reintentar», y volver a pedir en el siguiente ciclo.

  (→ F-07.AC6)

- **R22** (No deseado) Si `GET /reports/summary` responde 403, entonces el sistema deberá mostrar «No tienes permiso para ver esta página.» sin «Reintentar» ni valores, y detener el intervalo. Si responde 401, deberá aplicar el cierre de sesión vigente. (→ F-07.AC5) (RNF-12)

### Descarga del CSV

- **R23** (Ubicuo) El sistema deberá mostrar en el panel «Exportar» el botón «Descargar CSV» y, junto a él, el aviso visible «Formato interno, no es el reporte oficial de la Res. 373 / SISPRO.», asociado al botón con `aria-describedby`. El aviso deberá verse en todos los anchos y no deberá depender del color. (→ F-07.AC4, F-07.AC6) (PA-F07-1)
- **R24** (Por evento) Cuando el usuario pulse «Descargar CSV», el sistema deberá:
  - hacer un único `GET /api/v1/reports/encounters.csv` con `from`, `to` y, si la hay, `siteId` del **periodo aplicado** (no de los campos sin aplicar), por el cliente HTTP central y con el token de la sesión;
  - guardar en el equipo el cuerpo recibido sin modificarlo, con el nombre de `Content-Disposition` si se puede leer y es un nombre `.csv` válido, o, si no, con `asclepio-atenciones-<from>_<to>.csv` (el nombre que documenta el contrato), con `from` y `to` del periodo aplicado.

  (→ F-07.AC4, F-07.AC6) (decidido en PA-5)

- **R25** (Por estado) Mientras haya una descarga en curso, el sistema deberá:
  - ignorar pulsaciones nuevas de «Descargar CSV» y marcarlo con `aria-busy="true"`;
  - mostrar un estado `role="status"` con «Preparando el CSV…»;
  - no reintentar automáticamente.

  El refresco del resumen no deberá cancelarla ni duplicarla. (→ F-07.AC6)

- **R26** (No deseado) Si la descarga falla, entonces el sistema deberá mostrar el error en el panel «Exportar», sin afectar a la barra ni a los otros paneles:
  - 403: «No tienes permiso para esta acción.», sin «Reintentar»;
  - 400 o 422: el mensaje del periodo de R8;
  - sin respuesta HTTP o 5xx: el error de acción traducido con «Reintentar», que repite la descarga del mismo periodo solo al pulsarlo;
  - 401: el cierre de sesión vigente.

  (→ F-07.AC5, F-07.AC6)

- **R27** (Ubicuo) El sistema deberá tratar el CSV solo como un archivo que se guarda, y no deberá:
  - leer, mostrar ni interpretar su contenido;
  - guardarlo en la caché de TanStack Query, el almacenamiento, la URL ni la consola;
  - conservar la URL temporal del archivo después de la descarga.

  (→ F-07.AC4) (RNF-05)

### Transversales

- **R28** (Ubicuo) El sistema deberá ofrecer todos los textos nuevos de `/reportes`, también los de ARIA, en español, inglés, portugués, francés y alemán. Los textos deberán cumplir estas condiciones:
  - claves con el prefijo `reports_` y los mismos parámetros en los cinco catálogos (`npm run i18n:check`);
  - el inglés distinto del español;
  - sin literales de UI nuevos (`noUiLiterals`) y sin códigos `F-0<n>`;
  - en español, los textos de PA-9.

  La guía `guide_reports` deberá pasar a describir el tablero. Seguirá siendo estática, sin cifras ni parámetros, y nombrará «Actualizar» y «se actualiza sola». (→ F-07.AC6) (decidido en PA-2 y PA-9)

- **R29** (Por evento) Cuando cambien el idioma, el tema o el ancho de la ventana (375, 768, 1024 y 1440 px, y zoom al 200 %), el sistema deberá mantener `/reportes` legible y operable con teclado. Deberá cumplir estas condiciones:
  - foco visible;
  - sin desbordamiento horizontal del documento;
  - el aviso del CSV visible;
  - cada tabla con `caption` o nombre accesible y encabezados de fila y columna (`th` con `scope`), también la matriz;
  - ningún valor que se transmita solo con color.

  (→ F-07.AC6) (RNF-13)

- **R30** (Ubicuo) El sistema deberá mantener el resumen solo en la caché de TanStack Query (memoria), fuera de `localStorage`, `sessionStorage`, la URL y la consola. (→ F-07.AC6) (RNF-05)
- **R31** (Ubicuo) El sistema deberá cumplir estas condiciones de contrato:
  - mantener `CONSUMED_CONTRACT = '0.9.0'` y `schema.d.ts` sin diff tras `npm run api:types`;
  - usar para el resumen solo alias de tipos generados (`Schemas['ReportSummaryDto']` y sus partes), sin tipos escritos a mano;
  - limitar las operaciones HTTP del código de aplicación a las de DT-02-web más `GET /api/v1/reports/summary` y `GET /api/v1/reports/encounters.csv`;
  - no añadir dependencias ni gráficos: los indicadores se muestran solo en tablas accesibles.

  (→ F-07.AC6) (RNF-14; decidido en PA-8)

- **R32** (No deseado) Si un usuario con un rol distinto de ADMIN abre `/reportes`, entonces el sistema deberá mostrar «No tienes permiso para ver esta página.» con el guard vigente y no deberá pedir `/api/v1/reports/*`. (→ F-07.AC5) (RNF-12)

> Trazabilidad: AC1 → R2, R5–R8, R10–R13 · AC2 → R14, R15 · AC3 → R16 · AC4 → R23, R24, R27 · AC5 → R22, R26, R32 · AC6 → R1–R31.

## Preguntas abiertas

Ninguna decide un umbral clínico. Los indicadores, sus definiciones, el umbral de 30 min del nivel II y el carácter interno del CSV los fijan el brief y F-07-api, y la web no los toca. Lo que sigue es de presentación, de flujo o técnico, y no está en las fuentes. Todas las cerró el humano por chat el 2026-11-13 con la opción (a) en cada una.

- [x] **PA-1** ¿Cómo se compone el tablero? Opciones:
  - **(a)** Como R1:
    - región «Periodo» propia, entre el encabezado y la barra, con «Desde», «Hasta», «Sede» y «Aplicar» en una fila que se apila en anchos estrechos;
    - barra «Indicadores» con tres celdas: «Atenciones» (`population.encounters`), «Con triage» (`population.triaged`) y «Cumplimiento Triage II» (`compliance.percent`, o «Sin datos»);
    - cuatro paneles a todo el ancho, uno debajo de otro, con tablas;
    - el panel «Exportar» al final.
  - (b) Un solo panel largo con las cuatro secciones como `h3`, y el periodo y la exportación en el encabezado.
  - (c) Pestañas (tiempos, concordancia, respaldo).

  → **Opción (a)** (humano, 2026-11-13). Sigue la estructura de UI-02-web (encabezado, barra y paneles con nombre) y da a cada panel su región para lectores de pantalla. El aviso del CSV queda pegado a su botón. Cubierto por R1.

- [x] **PA-2** ¿El resumen se refresca solo? Opciones:
  - **(a)** Sí, cada 30 s con la pestaña visible, además de «Actualizar», como UI-02.AC6 (decisión del usuario del 2026-10-28 para los cuatro dashboards), con `autoRefresh()` y la nota «Se actualiza cada 30 s».
  - (b) No: solo con «Aplicar» y «Actualizar». Enmienda UI-02.AC6 para `/reportes` y cambia las pruebas de UI-02-web R33 que piden «se actualiza sola» en `guide_reports`.

  → **Opción (a)** (humano, 2026-11-13). Mantiene una decisión expresa del usuario y las invariantes de las guías. Su coste es una consulta de agregados cada 30 s por administrador abierto, asumible con el volumen del MVP (F-07-api D2). Cubierto por R20 y R28.

- [x] **PA-3** ¿Qué son «los últimos 7 días en Bogotá» por defecto? Opciones:
  - **(a)** Desde hoy − 6 hasta hoy, siete fechas civiles con hoy incluido. Hoy en Bogotá sale del reloj del navegador convertido a `America/Bogota`.
  - (b) Desde hoy − 7 hasta ayer: siete días completos, sin el día en curso.
  - (c) Como (a), pero hoy sale de la hora del servidor (`GET /api/v1/health`, campo `time`), con una petición más.

  → **Opción (a)** (humano, 2026-11-13). Al entrar ya se ve la actividad del día. Es solo el valor inicial de un filtro: se ve en los campos y se puede cambiar, la API interpreta las fechas y la web no envía ninguna hora. Cubierto por R5.

- [x] **PA-4** ¿Cuándo se avisa de que el kappa es poco fiable? La API devuelve `null` con menos de 2 pares y expone `pairs` para que la web avise (F-07-api, riesgo 4), pero ninguna fuente fija qué son «pocos pares». Opciones:
  - **(a)** Siempre, sin umbral: junto al kappa, «{pairs} pares» y la nota fija «Con pocos pares el kappa es poco fiable.».
  - (b) Solo cuando `pairs` sea menor que un umbral N que fije el humano (por ejemplo, el que use dirección médica). La web no lo propone.
  - (c) Solo cuando `weightedKappa` sea `null`.

  → **Opción (a)** (humano, 2026-11-13), sin umbral. No inventa un número y da al lector lo que necesita para juzgar. Cubierto por R15.

- [x] **PA-5** ¿De dónde sale el nombre del archivo? La API envía `Content-Disposition: attachment; filename="asclepio-atenciones-<from>_<to>.csv"`, pero su CORS solo expone `Retry-After` (`../asclepio-api/src/app.setup.ts`: `exposedHeaders: ['Retry-After']`). Con la web en otro origen (5173 frente a 3000), el navegador **no deja leer** esa cabecera. Opciones:
  - **(a)** Leer `Content-Disposition` si se puede y su `filename` es un `.csv` sin rutas. Si no, usar el nombre que documenta el contrato con el periodo aplicado, `asclepio-atenciones-<from>_<to>.csv`. Aparte, se propone a la API un cambio menor en su repo (exponer `Content-Disposition`) que no bloquea este slice.
  - (b) Bloquear la descarga hasta que la API exponga la cabecera.
  - (c) Construir siempre el nombre en la web e ignorar la cabecera.

  → **Opción (a)** (humano, 2026-11-13). Funciona hoy, coincide con el nombre del servidor y, cuando la API exponga la cabecera, la usa sin cambiar la web. Cubierto por R24.

- [x] **PA-6** ¿Qué valida el formulario del periodo en el cliente? Opciones:
  - **(a)** Solo que «Desde» y «Hasta» sean fechas `YYYY-MM-DD` válidas (el campo nativo `type="date"` y Zod). El orden y el máximo de 366 días los valida la API, y la web muestra su 422 (R8).
  - (b) Además, Zod comprueba `from ≤ to` y 366 días como máximo, y el 422 queda solo como respaldo.

  → **Opción (a)** (humano, 2026-11-13). El límite de la API no se duplica, así que la web no se desalinea si cambia. El 422 se ve en la verificación manual con la interfaz. Cubierto por R7 y R8.

- [x] **PA-7** ¿Con qué formato se muestran los números? Opciones:
  - **(a)** Con `Intl.NumberFormat` del idioma elegido y decimales fijos: minutos y porcentajes con exactamente 1 decimal y kappa con 3 (los mismos que redondea la API, de modo que no se pierde ni se inventa precisión), y conteos enteros. Por ejemplo, en español: «12,5 min», «45,0 %», «0,812» y «3».
  - (b) El valor de la API sin formato y con punto decimal («12.5», «45»).

  → **Opción (a)** (humano, 2026-11-13). Es legible en los cinco idiomas y no cambia el valor. Cubierto por R3.

- [x] **PA-8** ¿Se añade algún gráfico? Opciones:
  - **(a)** No: solo tablas accesibles, como pide el slice y UI-02 (sin gráficos ni librerías).
  - (b) Barras horizontales hechas con CSS, sin dependencias, junto a las tablas de porcentajes (decorativas, `aria-hidden`, con la tabla como fuente accesible).

  → **Opción (a)** (humano, 2026-11-13). Las tablas ya dan todos los valores. Cubierto por R29 y R31.

- [x] **PA-9** Textos en español. El `implementer` traduce en, pt, fr y de. Las claves van en el design, «Plan i18n». Propuesta:
  - **Encabezado:** descripción «Tiempos, cumplimiento, concordancia y uso del respaldo de las atenciones de un periodo.»
  - **Periodo:** región «Periodo»; campos «Desde» y «Hasta»; «Aplicar»; error de campo «Escribe una fecha válida.»; periodo consultado «Del {from} al {to}»; «Calculado por el servidor el {datetime}».
  - **Errores del periodo:**
    - 400: «Las fechas no son válidas. Revisa Desde y Hasta.»;
    - 422: «El periodo no es válido: Desde no puede ser posterior a Hasta y el periodo no puede superar 366 días.».
  - **Barra de resumen:** «Atenciones», «Con triage» y «Cumplimiento Triage II».
  - **Panel de llegada a triage:**
    - título «De la llegada al triage»;
    - columnas «Nivel», «Atenciones», «Mediana» y «P90»;
    - filas «Nivel {level}» y «Total»;
    - minutos «{value} min».
  - **Panel de Triage I y II:**
    - título «Triage I y II: de la clasificación a la atención»;
    - nota «Minutos desde la clasificación hasta la atención médica. La media es el indicador de la Res. 256 de 2016.»;
    - columnas «Nivel», «Atenciones», «Media», «Mediana» y «P90».
  - **Cumplimiento:**
    - «Cumplimiento Triage II (máx. {max} min)»;
    - «{compliant} de {evaluable} atenciones»;
    - «Sin evaluar (no llegaron a atención): {count}»;
    - «Nivel I: atención inmediata, sin porcentaje de cumplimiento.».
  - **Panel de concordancia:**
    - título «Concordancia IA–enfermería»;
    - «Pares»;
    - «Acuerdo exacto»;
    - «Kappa ponderado»;
    - «Subclasificación: la IA sugirió un nivel menos grave que el final»;
    - «Sobreclasificación: la IA sugirió un nivel más grave que el final»;
    - la nota de PA-4;
    - matriz con `caption` «Matriz de concordancia: filas, nivel sugerido por la IA; columnas, nivel final (enfermería)» y encabezados «Sugerido: Nivel {level}» y «Final: Nivel {level}».
  - **Panel de respaldo:**
    - título «Uso de respaldo y safety guards»;
    - tablas «Decisiones de enfermería» («Validar», «Corregir», «Triage manual»), «Estado de las sugerencias» («Correcta», «Salida inválida», «Tiempo agotado», «Fallida»), «Proveedor» («Groq», «OpenRouter (respaldo)») y «Safety guards» («Aplicados»);
    - columnas «Atenciones» o «Sugerencias», y «Porcentaje»;
    - pie de cada tabla «Total: {count}».
  - **Generales:** valor nulo «Sin datos»; periodo vacío «No hay atenciones en este periodo y sede.»; carga «Cargando los indicadores…»; refresco fallido «No se pudieron actualizar los indicadores. Se muestran los calculados el {datetime}.».
  - **Exportar:** título «Exportar»; «Descargar CSV»; aviso «Formato interno, no es el reporte oficial de la Res. 373 / SISPRO.»; en curso «Preparando el CSV…»; éxito «CSV descargado.».
  - **Guía `guide_reports`:** «Esta pantalla muestra los indicadores del periodo y la sede que elijas: el tiempo de la llegada al triage por nivel, el tiempo de la clasificación a la atención médica de los niveles I y II con el cumplimiento del nivel II, la concordancia entre la sugerencia de la IA y el nivel final de enfermería, y el uso del proveedor de respaldo y de los safety guards. Elige las fechas y la sede y pulsa Aplicar. La pantalla se actualiza sola de forma periódica; usa Actualizar para consultar al instante. Descargar CSV guarda un archivo en formato interno, que no es el reporte oficial. La pantalla no muestra datos de pacientes.» Va sin cifras, como exige UI-02-web R33.
  - **Reutilizados:** «Sin permiso» (`common_forbidden`, `FORBIDDEN_ACTION_MESSAGE`), `common_error_network`, `common_error_server`, `common_retry`, `feature_refresh`, `feature_site`, `feature_sites_all`, `feature_sites_error` y `dash_live`.

  Opciones: **(a)** estos textos; (b) los mismos con los cambios que indique el humano. → **Opción (a)** (humano, 2026-11-13). Dicen de dónde sale cada medida y no presentan la sugerencia como decisión. Cubierto por R8, R13–R17, R21, R23–R26 y R28.
