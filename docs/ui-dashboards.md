# UI-02-web — Brief local: dashboards por rol

## Procedencia y estado de aprobación

El usuario pidió el 2026-10-28 (America/Bogota): «reescribe el diseño de las pantallas de dashboard para todos los roles porque esta muy simple, desordenado y feo». Este documento traduce esa petición en criterios verificables **UI-02.ACn**, con el mismo papel que `docs/ui-migration.md` en UI-01 y `docs/f03-brief.md` en F-03. No amplía los briefs clínicos de la API.

**Estado: alcance aprobado por el usuario el 2026-10-28** con el mensaje «Listos, me gusta mucho ese estilo, implementalo», sobre la maqueta v2 (`../../local-analysis/ui02-maqueta/maqueta-dashboards.html`), que incluye la marca única en el marco privado, la ausencia del panel «Accesos» y «preregistro» sin guion. El `leader` lo anota con fecha en `progress/current/UI-02-web.md`.

## Qué se entiende por «dashboard»

La pantalla de inicio de cada rol (`HOME_BY_ROLE` en `src/app/router/roleMatrix.ts`):

| Rol | Ruta | Hoy | Feature dueña de la carpeta |
|---|---|---|---|
| `RECEPTION` | `/recepcion` | `ReceptionPage`: bandeja de pre-registros | `features/reception` |
| `NURSE` | `/triage` | `TriageTrayPage`: bandeja `WAITING_TRIAGE` | `features/triage` |
| `PHYSICIAN` | `/cola` | `PlaceholderPage` («Pendiente»); *sustituido por F-06-web (2026-11-10): `QueuePage`, la cola priorizada* | `features/queue` (F-06) |
| `ADMIN` | `/reportes` | `PlaceholderPage` («Pendiente») | `features/reports` (F-07) |

## Diagnóstico de las pantallas actuales

- **D1** Ninguna pantalla muestra cifras de un vistazo: hay que leer la lista para saber cuántas atenciones esperan.
- **D2** Los encabezados no siguen una estructura común: recepción pone el `h1` dentro de una tarjeta, enfermería usa un encabezado propio con descripción y botón, y medicina y administración repiten el marcador.
- **D3** Recepción: cada pre-registro es una definición de ocho filas con las acciones al final; «Confirmar llegada» y «Rechazar» usan el mismo botón sólido (`className="button"`), sin jerarquía entre acción principal y secundaria; «Registro directo» es un enlace subrayado suelto.
- **D4** Enfermería: una lista de líneas atenuadas sin jerarquía, un panel lateral con texto estático que no informa nada nuevo y mucho espacio vacío en escritorio.
- **D5** Medicina y administración: solo la tarjeta «Pendiente».
- **D6** Los estados vacío, cargando y error cambian de aspecto de una pantalla a otra.
- **D7** La marca «Asclepio» aparece dos veces en el marco privado: en la cabecera y en la barra lateral.

## Criterios de aceptación

- **UI-02.AC1** Cada rol aterriza, tras `/app`, en un dashboard rediseñado en su ruta actual: `/recepcion` (RECEPTION), `/triage` (NURSE), `/cola` (PHYSICIAN) y `/reportes` (ADMIN). Las rutas, la matriz de roles, los guards, la redirección de `/app` y la navegación lateral no cambian.
- **UI-02.AC2** Los cuatro dashboards comparten estructura y lenguaje visual: un encabezado de página (un único `h1`, una descripción de una línea y las acciones de la pantalla), una barra de resumen (los indicadores y, en recepción y enfermería, el filtro de sede), un panel de trabajo a todo el ancho y, en medicina y administración, una franja «pendiente». No hay columna lateral. Comparten una sola escala de espacios, de tipografía y de radios. Esa estructura se compone con componentes compartidos sin lógica de dominio, sobre los tokens, la fuente Axiforma y los iconos Heroicons actuales, sin dependencias nuevas.
- **UI-02.AC3** Toda cifra, lista y estado de un dashboard procede de endpoints publicados en el contrato 0.4.0, llamados con el cliente HTTP central. La web no simula ni estima datos, no calcula horas legales ni tiempos de espera y no envía horas; las horas recibidas se muestran en `America/Bogota`. Como `GET /encounters` no devuelve total, un conteo que llena la página pedida se muestra como «N+», nunca como cifra exacta.
- **UI-02.AC4** Contenido mínimo por rol, con datos reales:
  - (a) RECEPTION: indicadores de preregistros pendientes y de atenciones en espera de triage, con el filtro de sede en la barra de resumen; los preregistros pendientes en dos columnas, con confirmación (identidad verificada) y rechazo (motivo) con el comportamiento de F-02-web; «Registro directo» como acción principal del encabezado.
  - (b) NURSE: indicador de atenciones en espera de triage, con el filtro de sede en la barra de resumen; la espera como tabla con paginación y acceso a la captura clínica de cada atención, con el comportamiento de F-03-web salvo el refresco (UI-02.AC6).
  - (c) PHYSICIAN: indicadores de atenciones por estado y una tabla de atenciones recientes con enlace al detalle.
    - *Enmienda F-06-web (2026-11-10):* en `/cola` la tabla de atenciones recientes se sustituye por la cola priorizada (`GET /queue`); quedan el encabezado y la barra de resumen, con las cifras de la propia cola y el filtro «Sede». Ver `specs/F-06-web/` (PA-1).
  - (d) ADMIN: indicadores de atenciones por estado, la espera de triage por sede como tabla y enlace a «Atenciones».
- **UI-02.AC5** `/cola` y `/reportes` muestran, dentro del dashboard, una franja «pendiente» que nombra la feature que la llenará (F-06 y F-07, aún sin endpoints en 0.4.0). No presentan niveles de triage, tiempos de espera, umbrales, cifras de reportes ni gráficos simulados. Los tiempos máximos y la definición de espera siguen abiertos en los briefs (PA-F06-1, PA-F06-2) y no se inventan.
  - *Enmienda UI-04-web R10 (2026-11-06):* la frase de la franja ya no nombra la feature; dice el texto neutral «Esta funcionalidad aún no está disponible.» (cinco idiomas), sin códigos `F-0<n>` visibles. El resto del criterio no cambia.
  - *Enmienda F-06-web (2026-11-10):* `/cola` ya no tiene franja «pendiente»: F-06-web la sustituye por la cola real, que sí muestra niveles de triage, tiempos de espera y el tiempo máximo, según PA-F06-1 y PA-F06-2, ya cerradas (enmendadas por DT-02 el 2026-11-11: el tiempo máximo, la alerta y el orden de «Clasificadas» se cuentan desde la clasificación; ver `specs/DT-02-web/`). El criterio sigue vigente para `/reportes`.
- **UI-02.AC6** Cada panel con datos resuelve por separado sus estados cargando, éxito, vacío y error (con «Reintentar»). El fallo o el 403 de una petición afecta solo a su panel, y durante un refresco se conserva el contenido anterior, el foco y la posición de desplazamiento, sin saltos de maquetación. Los cuatro dashboards se refrescan solos cada 30 s mientras la pestaña esté visible y ofrecen el botón «Actualizar» (decisión del usuario del 2026-10-28).
- **UI-02.AC7** Los dashboards no muestran sugerencias de IA ni niveles de triage. No muestran más datos personales que las pantallas actuales del mismo rol y, para PHYSICIAN y ADMIN, nunca el documento completo. No guardan datos de pacientes en URL, consola ni almacenamiento (salvo `siteId` y `offset`, que `/triage` ya conserva en la URL). No piden endpoints que el rol no puede usar: `GET /pre-registrations` es solo RECEPTION y `GET /encounters/{id}/clinical-capture` es solo NURSE y PHYSICIAN.
- **UI-02.AC8** Español, inglés, portugués, francés y alemán sin claves ausentes (`npm run i18n:check`). Tema claro y oscuro, modos de color (alto contraste, sepia, grises, alternativo) y escala de texto hasta 200 % sin pérdida de contenido. El estado de una atención o de un indicador nunca se transmite solo con color: lleva icono y texto. Encabezados y regiones con nombre, orden de foco lógico, uso completo por teclado y movimiento reducido. La guía de voz de `/cola` y `/reportes` narra instrucciones estáticas propias de su dashboard, en lugar del texto de «pendiente».
- **UI-02.AC9** Sin desbordamiento horizontal ni contenido cortado a 375, 768, 1024 y 1440 px: los indicadores se redistribuyen en columnas, los preregistros pasan de dos columnas a una y las tablas se apilan en tarjetas en pantallas estrechas.
- **UI-02.AC10** Sin cambios en el contrato 0.4.0, los tipos generados ni la API; `fetch` solo en `shared/api`; sin imports entre features (lo compartido va a `shared/`). La entrega supera lint, typecheck, pruebas `R<n>:` (las existentes se actualizan solo donde cambia el DOM presentacional), build e `i18n:check`, y deja evidencia visual antes y después de los cuatro dashboards, en claro y oscuro, a 375 y 1440 px, en `docs/ui-evidence/`, más la prueba contra la API sintética local o la limitación registrada.
- **UI-02.AC11** El marco privado muestra la marca «Asclepio» una sola vez, en la barra lateral, y la cabecera se reduce a las herramientas (tema, idioma y preferencias). El resto del marco y de sus pantallas no cambia, y las pantallas públicas y `/estado` conservan su cabecera con la marca.
- **UI-02.AC12** Los textos nuevos en español se escriben con «preregistro» sin guion, etiquetas con mayúscula inicial, sin el carácter «·» como separador y con las horas sin segundos (en las tablas, la hora y debajo la fecha). Los textos ya existentes que aparecen en los dashboards adoptan «preregistro» en español; los otros cuatro idiomas conservan su terminología.

## Relación con decisiones previas

- **F-03-web D3** («sin KPI ni contadores nuevos», refresco manual): se revisa en **dos puntos, por decisión expresa del usuario (2026-10-28)**: los indicadores ahora se permiten en `/triage`, y la bandeja se refresca sola cada 30 s con la pestaña visible, además de «Actualizar». La bandeja conserva sede y `offset` en la URL y páginas de 50. Las pruebas de F-03 que fijan el refresco manual cambian y la spec las lista.
- **UI-01.AC1/AC2** (fidelidad «igualito» a `develop`): para estos cuatro dashboards la petición del 2026-10-28 pide un rediseño. Se conservan tokens, fuente Axiforma, Heroicons, landing, login y el resto de pantallas tal como las dejó UI-01, y el marco privado salvo la marca de la cabecera (UI-02.AC11, aprobada por el usuario con la maqueta v2); cambian la composición y la jerarquía interna de las cuatro pantallas.
- **F-06 y F-07:** la cola priorizada y el tablero de reportes completos siguen siendo de F-06-web y F-07-web. Este dashboard deja su hueco y no los adelanta.
- **RNF-17** (la IA propone, el profesional decide) sigue vigente; estas pantallas no tienen IA.

## Datos disponibles en el contrato 0.4.0

| Dato | Endpoint | Roles | Nota |
|---|---|---|---|
| Perfil | `GET /me` | todos | |
| Sedes del tenant | `GET /public/tenants` (filtrado por `me.tenantId`) | público | ya expuesto por `useSites` |
| Atenciones | `GET /encounters?status&siteId&limit≤100&offset` | RECEPTION, NURSE, PHYSICIAN, ADMIN | orden `arrivalAt` descendente; **sin total** |
| Detalle de atención | `GET /encounters/{id}` | los cuatro | |
| Captura clínica | `GET /encounters/{id}/clinical-capture` | NURSE, PHYSICIAN | no se pide desde un dashboard (una petición por fila) |
| Pre-registros pendientes | `GET /pre-registrations?siteId` | **solo RECEPTION** | |

Sin dato en el contrato: nivel de triage, sugerencia de IA, decisión, cola, tiempo de espera calculado por el servidor e indicadores o reportes (F-04 a F-07 de la API, `pending`). En la práctica, con 0.4.0 una atención solo llega a `WAITING_TRIAGE` o `CANCELLED` (no hay endpoints de triage, `IN_CARE` ni `CLOSED`; PA-F02-4): varios indicadores valdrán 0. Eso es la verdad del sistema y no un defecto: el diseño debe verse correcto con ceros y con «100+».

## Referencia visual aprobada y guía de diseño

**Referencia aprobada:** la maqueta v2, `../../local-analysis/ui02-maqueta/maqueta-dashboards.html` (HTML autocontenido; 14 capturas en `capturas/`; la versión descartada está en `v1/`). Es el punto de partida del CSS y de los componentes: se adapta a `rem`, a los tokens y a consultas de contenedor, y cualquier desviación se documenta en `progress/impl_UI-02-web.md`. Dibuja el marco de la app solo como contexto; lo que se implementa son los dashboards y el cambio del AC11.

- **Barra de resumen única:** una superficie con celdas separadas por una línea fina; cada celda lleva chip con icono, etiqueta con mayúscula inicial, cifra en Axiforma semibold con cifras proporcionales y, donde aplica, el filtro de sede en la última celda. Sin línea de ámbito por indicador, sin sparklines ni deltas (el contrato no tiene series ni periodos).
- **Panel de trabajo a todo el ancho** con cabecera (título y la nota «Se actualiza cada 30 s»), cuerpo y pie opcional. Listas como tablas con columnas alineadas y `tabular-nums` solo en columnas; preregistros como tarjetas en dos columnas con los botones alineados abajo.
- **Poco color:** la acción repetida de cada fila de enfermería usa el estilo suave, y solo hay un botón sólido por zona de acción. Los estados llevan icono y texto y salen de los tokens semánticos existentes (`--ok`, `--warn`, `--error`, `--accent`). No se repite un estado en todas las filas de una lista ya filtrada por ese estado.
- **Escala única:** espacios de 0.25 a 1.5 rem, tipografía (título 1.375–1.625 rem, panel 1 rem, cuerpo 0.875 rem, apoyo 0.75–0.8125 rem) y dos radios (superficies 1.25 rem, elementos internos 1 rem).
- **Estados** vacíos, de error y de carga con icono, mensaje y acción; «Próximamente» como franja discreta.
- Sin gráficos de tendencia ni librerías de gráficos: el contrato no tiene series temporales.

## Fuera de alcance

- Marco privado (barra lateral, navegación y perfil; de la cabecera solo cambia lo del AC11), landing, login, preferencias, `/recepcion/registro`, `/atenciones`, `/atenciones/:id` y `/triage/:id`.
- Endpoints, contrato, API, móvil y migraciones.
- Cola priorizada, reportes, sugerencia de IA y decisión (F-04 a F-07).
- Gráficos de tendencia, librerías de gráficos o de UI, notificaciones, tiempo real por WebSockets y umbrales de espera.

## Supuestos y decisiones (respuestas del usuario del 2026-10-28)

- **S1** Confirmado por el usuario: el rediseño ocurre en las rutas actuales; no se crea una pantalla «Inicio» nueva por rol.
- **S2** Confirmado por el usuario: Medicina y Administración muestran datos reales limitados (atenciones por estado y por sede) más paneles «Próximamente» para F-06 y F-07, hasta que la API publique cola y reportes.
- **S3** El marco privado y el resto de pantallas quedan como están, salvo la marca única de la cabecera (AC11), que el usuario aprobó con la maqueta v2.
- **S4** **Decidido por el usuario, distinto de la propuesta del `leader`:** los cuatro dashboards se refrescan solos cada 30 s con la pestaña visible, además del botón «Actualizar». La propuesta era conservar el refresco manual de enfermería (F-03-web D3).
- **S5** Sin gráficos de tendencia ni dependencias nuevas.
- **S6** El usuario vio la maqueta v1 y pidió «algo mucho más organizado» (tablas, preregistros en dos columnas, mejor uso del espacio y revisar tildes y escritura). Tras la maqueta v2 respondió «Listos, me gusta mucho ese estilo, implementalo» (2026-10-28). El `leader` lo registra como aprobación del alcance de este brief, incluidas las tres propuestas de la v2 fuera del pedido original: marca única en el marco (AC11), sin panel «Accesos» y «preregistro» sin guion (AC12).
