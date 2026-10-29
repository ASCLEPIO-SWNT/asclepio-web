# UI-02-web — Verificación de los dashboards por rol

Fecha: 2026-10-28, America/Bogota. Brief: `docs/ui-dashboards.md` (UI-02.AC1 a AC12). Spec: `specs/UI-02-web/`. Referencia visual aprobada: la maqueta v2 (`../../local-analysis/ui02-maqueta/maqueta-dashboards.html` y sus capturas). Este documento lo abre la tarea T1 (capturas «antes» y línea base) y lo completa la tarea T13 (capturas «después», mediciones, accesibilidad, refresco automático y tabla R → prueba).

## Estado del documento

| Parte | Tarea | Estado |
| --- | --- | --- |
| Commit de partida, procedimiento, datos, 16 capturas «antes» y línea base de R35 | T1 | Hecho |
| Capturas «después» y adicionales, comparación con la maqueta, mediciones, idiomas, modos de color y contraste, teclado y movimiento | T13 | Hecho |
| Refresco automático con temporizadores reales y pestaña oculta, y tabla R → prueba | T13 | Pendiente |

## Commit de partida

- Repositorio `asclepio-web`, rama `main`, commit `7043fc1b913bf93ab7e63a5c4a596fd04a904b23` («chore(triage): close approved clinical capture delivery»). Contrato 0.4.0, sin cambios en esta feature.
- Las capturas «antes» se tomaron con `src/` idéntico a ese commit: `git status --short -- src` y `git diff --stat HEAD -- src` estaban vacíos antes de construir y al terminar de fotografiar. Lo único modificado o sin versionar en el árbol eran `feature_list.json`, `docs/ui-dashboards.md`, `progress/current/UI-02-web.md` y `specs/UI-02-web/`, que no entran en el build.
- Línea base de calidad con el árbol sin tocar: `./init.sh` en verde (FAIL 0, WARN 0) y `npx vitest run` con 399 pruebas en 30 archivos, todas en verde.
- Build fotografiado: `index-BaYIohqR.js` (679.63 kB) e `index-Dkp9U8JQ.css` (37.77 kB), con `VITE_API_URL=http://127.0.0.1:3012`.

## Procedimiento

1. **API sintética local**, fuera del repo, en `../../local-analysis/ui02-verification/ui02-preview-api.mjs`. Es una copia de `../../local-analysis/f03-preview-api.mjs` (que no se toca) con los mismos endpoints y el mismo comportamiento: lee las fixtures de `src/test/fakeApi.ts`, inicia sesión con `POST /api/v1/auth/login` y la contraseña sintética (el rol sale del prefijo del correo: `enfermera…` NURSE, `medico…` PHYSICIAN, `admin…` ADMIN y cualquier otro RECEPTION) y filtra `GET /api/v1/encounters` por `status`, `siteId`, `limit` y `offset`. No es NestJS ni PostgreSQL y no toca ninguna base de datos. Cambia tres cosas, todas de herramienta:
   - El puerto y el origen CORS salen del entorno. Se usaron el puerto 3012 y el origen `http://127.0.0.1:5186`, porque los puertos 3000, 3001, 3002, 5173 y 5176 ya estaban ocupados por servidores de sesiones anteriores, que no se tocaron.
   - Siembra más datos ficticios que las fixtures (que sirven un solo preregistro y una sola atención), con los mismos nombres y horas que la maqueta v2, para que la comparación «antes» y «después» sea entre listas con varias filas (tabla siguiente).
   - Dos controles de verificación: `POST /__reset` vuelve a la siembra y `POST /__arrive` añade una llegada en espera de triage en ese instante (la usará T13 para comprobar el refresco automático).
2. **Build** del árbol sin modificar, a una carpeta fuera del repo: `VITE_API_URL=http://127.0.0.1:3012 npm run build -- --outDir ../../local-analysis/ui02-verification/dist-antes --emptyOutDir` (corre `i18n:compile`, `tsc -b` y `vite build`; no cambia ningún archivo versionado).
3. **Servidor de vista previa**: `npx vite preview --host 127.0.0.1 --port 5186 --strictPort --outDir ../../local-analysis/ui02-verification/dist-antes`.
4. **Navegador**: Chromium 153.0.8010.12 de Playwright, sin interfaz y con `--no-sandbox`; configuración regional `es-CO`, zona horaria `America/Bogota`, esquema de color claro del sistema. El script es `../../local-analysis/ui02-verification/capture-dashboards.mjs` (`BASE`, `PHASE`, `OUT` y `METRICS` por entorno) y se reutiliza en T13 con `PHASE=despues`.
5. **Sesión y tema**: para cada rol y cada tema se abre una sesión nueva, se inicia sesión por la interfaz (campos «Correo» y «Contraseña», botón «Ingresar») y se espera la pantalla de inicio del rol. El modo oscuro se activa con el botón «Cambiar tema» de la propia aplicación a 1440 px; ese botón queda oculto por debajo de 480 px (regla vigente de `index.css`), así que para las capturas de 375 px el tema se fija antes y después se estrecha la ventana, y la preferencia persiste en el navegador.
6. **Captura**: JPG de página completa con calidad 80. Antes de cada captura se espera el `h1`, los datos (un `article` en recepción y un enlace a `/triage/…` en enfermería), la red inactiva, las fuentes cargadas, y el puntero se aparta de los controles y se esperan 400 ms. La ventana inicial es de 1440 por 900 px; para 375 px se usa 375 por 812 px. Las capturas se guardan con el nombre `ui02-<rol>-antes-<claro|oscuro>-<375|1440>.jpg` en `docs/ui-evidence/`.
7. **Medidas** de R35 con el tema claro, sin captura: `scrollWidth` y `clientWidth` del documento a 375, 768, 1024 y 1440 px.
8. Al terminar se detuvieron la API y el servidor de vista previa (puertos 3012 y 5186 libres). No quedó ningún proceso de esta verificación en marcha.

## Datos sintéticos

Todo es ficticio. El tenant «IPS Asclepio» (el de `me.tenantId` del personal sintético) tiene tres sedes: Sede Norte, Sede Sur y Sede Este; el tenant «Otra IPS», con «Sede Ajena», lo filtra la web. Los usuarios sintéticos son `recepcion@ips.example` (Rosa Recepción), `enfermera@ips.example` (Nora Enfermera), `medico@ips.example` (Mario Médico) y `admin@ips.example` (Ada Administradora).

**Preregistros pendientes** (los ve solo RECEPTION; las horas son las de Bogotá del 28/10/26):

| Paciente | Documento | Nacimiento | Sexo | Sede | Motivo de consulta | Preregistro | Expira | Identidad |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Laura Gómez Pérez | CC 1032456789 | 17/05/1990 | F | Norte | Dolor de cabeza desde ayer | 8:05 a. m. | 2:05 p. m. | Sin verificar |
| Ricardo Medina Soto | CC 80456789 | 02/11/1984 | M | Sur | Fiebre y tos desde hace dos días | 8:40 a. m. | 2:40 p. m. | Verificada |
| Marta Lucía Rojas | TI 1098765432 | 21/03/2010 | F | Norte | Dolor abdominal esta mañana | 9:10 a. m. | 3:10 p. m. | Sin verificar |

**Atenciones** (orden de llegada descendente, como las devuelve `GET /api/v1/encounters`; todas del 28/10/26):

| Paciente | Documento | Sede | Llegada | Estado |
| --- | --- | --- | --- | --- |
| Daniel Castro Mora | CC 1019876543 | Sur | 11:12 a. m. | En espera de triage |
| Paciente NN (34 años, M) | sin documento | Este | 11:05 a. m. | En espera de triage |
| Sofía Martínez Díaz | CC 52876543 | Norte | 10:48 a. m. | En espera de triage |
| Jorge Hernández Pardo | CE 874512 | Sur | 10:35 a. m. | En espera de triage |
| Camila Torres Vega | TI 1109876543 | Este | 10:21 a. m. | Cancelada |
| Andrés Ruiz Cano | CC 80123456 | Norte | 10:14 a. m. | En espera de triage |
| Paciente NN (60 años, F) | sin documento | Sur | 10:02 a. m. | En espera de triage |
| Mariana Quintero Salazar | CC 1015432109 | Norte | 9:30 a. m. | En espera de triage |
| Héctor Beltrán Gil | CC 79456123 | Norte | 9:12 a. m. | En espera de triage |

Con estos datos, el dashboard de enfermería «antes» lista las ocho atenciones en espera de triage (la novena está cancelada) y el de recepción, los tres preregistros. Los de medicina y administración «antes» son el marcador «Próximamente» sin datos, así que sus capturas no dependen de la API. Como el contrato 0.4.0 no publica endpoints de triage, atención ni cierre, ninguna atención sembrada pasa de «En espera de triage» o «Cancelada».

## Capturas «antes»

Se toman a 375 y 1440 px, en tema claro y oscuro, con el árbol de partida.

| Rol y ruta | Claro 375 | Claro 1440 | Oscuro 375 | Oscuro 1440 |
| --- | --- | --- | --- | --- |
| Recepción, `/recepcion` | [ver](ui-evidence/ui02-recepcion-antes-claro-375.jpg) | [ver](ui-evidence/ui02-recepcion-antes-claro-1440.jpg) | [ver](ui-evidence/ui02-recepcion-antes-oscuro-375.jpg) | [ver](ui-evidence/ui02-recepcion-antes-oscuro-1440.jpg) |
| Enfermería, `/triage` | [ver](ui-evidence/ui02-enfermeria-antes-claro-375.jpg) | [ver](ui-evidence/ui02-enfermeria-antes-claro-1440.jpg) | [ver](ui-evidence/ui02-enfermeria-antes-oscuro-375.jpg) | [ver](ui-evidence/ui02-enfermeria-antes-oscuro-1440.jpg) |
| Medicina, `/cola` | [ver](ui-evidence/ui02-medicina-antes-claro-375.jpg) | [ver](ui-evidence/ui02-medicina-antes-claro-1440.jpg) | [ver](ui-evidence/ui02-medicina-antes-oscuro-375.jpg) | [ver](ui-evidence/ui02-medicina-antes-oscuro-1440.jpg) |
| Administración, `/reportes` | [ver](ui-evidence/ui02-administracion-antes-claro-375.jpg) | [ver](ui-evidence/ui02-administracion-antes-claro-1440.jpg) | [ver](ui-evidence/ui02-administracion-antes-oscuro-375.jpg) | [ver](ui-evidence/ui02-administracion-antes-oscuro-1440.jpg) |

Lo que muestran, en relación con el diagnóstico del brief (D1 a D7):

- La marca «Asclepio» aparece dos veces en el marco privado, en la cabecera y en la barra lateral (D7).
- Recepción: el `h1` «Recepción — bandeja de pre-registros» va dentro de una tarjeta, «Registro directo» es un enlace subrayado suelto, cada preregistro es una lista de ocho filas (Nombre, Documento, Fecha de nacimiento, Sexo, Sede, Motivo de consulta, Pre-registro y Expira) y «Confirmar llegada» y «Rechazar» comparten el botón sólido (D3). No hay cifras de resumen (D1).
- Enfermería: lista de tarjetas con un botón sólido por atención y un panel lateral «Espacio de enfermería» con texto estático (D4); la hora lleva segundos («11:12:00 a. m.»).
- Medicina y administración: solo la tarjeta «Próximamente» con «Esta funcionalidad llega en F-06-web.» y «F-07-web.» (D5).

## Línea base de R35 («antes»)

`scrollWidth` y `clientWidth` del documento, tema claro, con el árbol de partida. En todos los casos son iguales: ningún dashboard actual desborda en horizontal. El Chromium sin interfaz de Playwright oculta las barras de desplazamiento, así que `clientWidth` coincide con el ancho de la ventana (las verificaciones de UI-01 y F-03 con el navegador integrado medían 15 px menos por la barra vertical).

| Ancho de ventana | Recepción | Enfermería | Medicina | Administración |
| --- | --- | --- | --- | --- |
| 375 px | 375 y 375 | 375 y 375 | 375 y 375 | 375 y 375 |
| 768 px | 768 y 768 | 768 y 768 | 768 y 768 | 768 y 768 |
| 1024 px | 1024 y 1024 | 1024 y 1024 | 1024 y 1024 | 1024 y 1024 |
| 1440 px | 1440 y 1440 | 1440 y 1440 | 1440 y 1440 | 1440 y 1440 |

(Cada celda es `clientWidth` y `scrollWidth`.) Sin avisos ni errores de consola del navegador en ninguna de las 16 capturas.

## Limitaciones

- La verificación es contra una API **sintética** local, no contra NestJS ni PostgreSQL; no demuestra integración con el backend real.
- T1 no prueba el zoom nativo del navegador ni la preferencia de movimiento reducido: no forman parte de las capturas «antes». T13 los trata según `design.md` («Verificación visual y entrega») y registra lo que no pueda automatizar.
- Las capturas de 375 px en tema oscuro se obtienen fijando el tema a 1440 px, porque el botón «Cambiar tema» queda oculto por debajo de 480 px; es el comportamiento vigente del marco y no un defecto de la captura.
- El conjunto de datos sembrado es más amplio que el de `f03-preview-api.mjs`; las capturas «después» de T13 deben tomarse con la misma siembra (`POST /__reset` antes de cada serie) para que la comparación sea entre los mismos datos.

## T13, verificación «después»

Fecha: 2026-10-29, America/Bogota. Árbol: rama `feat/ui-02-web-dashboards`; cada medición se hizo con un build del árbol en ese momento y, tras cada corrección, se repitió. Resultado en una línea: ningún dashboard desborda en horizontal (184 casos de estado, ancho y tamaño de texto), el contraste de los 7150 pares de texto medidos pasa en los cinco modos de color y los dos temas (con una corrección), el orden de teclado es el del DOM, los cinco idiomas caben, y el refresco automático conserva foco, desplazamiento, altura, filas y estado local con temporizadores reales de 30 s. Cada corrección salió con su prueba en rojo primero y su commit (tabla «Correcciones hechas durante T13»).

### Procedimiento de T13

1. **Build y servidores.** `VITE_API_URL=http://127.0.0.1:3012 npm run build -- --outDir ../../local-analysis/ui02-verification/dist-c2 --emptyOutDir`, servido con `npx vite preview --host 127.0.0.1 --port 5186 --strictPort --outDir …/dist-c2`; API sintética `ui02-preview-api.mjs` en el puerto 3012 con `POST /__reset` antes de cada serie (la misma siembra que las capturas «antes») y `POST /__arrive` para la llegada nueva del refresco.
2. **Navegador.** El mismo Chromium 153 de Playwright sin interfaz (`--no-sandbox`), `es-CO`, `America/Bogota`, sesión iniciada por la interfaz. El tema, el modo de color y el tamaño del texto se cambian con el panel «Preferencias» de la propia aplicación (`#ui-theme`, `#ui-color`, `#ui-scale`), no con atributos puestos a mano; después se suelta el foco para que el aro del resumen no salga en las capturas.
3. **Estados** (error, 403, vacío, 100+, carga lenta, sedes con error): peticiones interceptadas con Playwright.
4. **Scripts** (fuera del repo, `../../local-analysis/ui02-verification/`): `c2-lib.mjs`, `c2-capture-main.mjs` y `c2-capture-extra.mjs` (capturas), `c2-measure.mjs` (estructura por ancho), `c2-overflow-matrix.mjs` (desbordamiento), `c2-frame-edge.mjs` (marco y marca), `c2-langs.mjs` (idiomas), `c2-contrast.mjs` y `c2-hover.mjs` (contraste), `c2-keyboard.mjs` (teclado), `c2-motion.mjs` (movimiento), `c2-refresh.mjs` y `c2-hidden.mjs` (refresco) y `c2-rtable.py` (tabla R → prueba, sobre el informe JSON de Vitest).

### Capturas «después»

Mismos nombres, anchos y temas que las «antes» (JPEG de página completa, calidad 80, sin avisos ni errores de consola).

| Rol y ruta | Claro 375 | Claro 1440 | Oscuro 375 | Oscuro 1440 |
| --- | --- | --- | --- | --- |
| Recepción, `/recepcion` | [ver](ui-evidence/ui02-recepcion-despues-claro-375.jpg) | [ver](ui-evidence/ui02-recepcion-despues-claro-1440.jpg) | [ver](ui-evidence/ui02-recepcion-despues-oscuro-375.jpg) | [ver](ui-evidence/ui02-recepcion-despues-oscuro-1440.jpg) |
| Enfermería, `/triage` | [ver](ui-evidence/ui02-enfermeria-despues-claro-375.jpg) | [ver](ui-evidence/ui02-enfermeria-despues-claro-1440.jpg) | [ver](ui-evidence/ui02-enfermeria-despues-oscuro-375.jpg) | [ver](ui-evidence/ui02-enfermeria-despues-oscuro-1440.jpg) |
| Medicina, `/cola` | [ver](ui-evidence/ui02-medicina-despues-claro-375.jpg) | [ver](ui-evidence/ui02-medicina-despues-claro-1440.jpg) | [ver](ui-evidence/ui02-medicina-despues-oscuro-375.jpg) | [ver](ui-evidence/ui02-medicina-despues-oscuro-1440.jpg) |
| Administración, `/reportes` | [ver](ui-evidence/ui02-administracion-despues-claro-375.jpg) | [ver](ui-evidence/ui02-administracion-despues-claro-1440.jpg) | [ver](ui-evidence/ui02-administracion-despues-oscuro-375.jpg) | [ver](ui-evidence/ui02-administracion-despues-oscuro-1440.jpg) |

### Capturas adicionales

Todas en tema claro y con la misma siembra; los estados salen de peticiones interceptadas.

| Captura | Qué muestra | Maqueta |
| --- | --- | --- |
| [`ui02-recepcion-768`](ui-evidence/ui02-recepcion-768.jpg) y [`ui02-enfermeria-768`](ui-evidence/ui02-enfermeria-768.jpg) | Recepción y enfermería a 768 px (dos columnas de celdas, tarjetas en dos columnas, tabla sin apilar) | 09 (recepción) |
| [`ui02-medicina-cien-mas-1440`](ui-evidence/ui02-medicina-cien-mas-1440.jpg) y [`ui02-administracion-cien-mas-1440`](ui-evidence/ui02-administracion-cien-mas-1440.jpg) | Cifras «100+» con «Al menos 100»; en administración, tres sedes con «100+», 403 y error | 10 |
| [`ui02-medicina-ceros-1440`](ui-evidence/ui02-medicina-ceros-1440.jpg) | Los tres conteos y la lista de atenciones recientes en 0 | sin equivalente |
| [`ui02-medicina-error-1440`](ui-evidence/ui02-medicina-error-1440.jpg) | Tres celdas con error («Reintentar: …») y el panel con error | 11 |
| [`ui02-recepcion-cargando-1440`](ui-evidence/ui02-recepcion-cargando-1440.jpg) | Esqueletos de las celdas y «Cargando la bandeja…» | 12 |
| [`ui02-recepcion-vacio-1440`](ui-evidence/ui02-recepcion-vacio-1440.jpg) | Estado vacío del panel con icono, mensaje, pista y enlace | 13 |
| [`ui02-medicina-grises-1440`](ui-evidence/ui02-medicina-grises-1440.jpg), [`ui02-recepcion-grises-1440`](ui-evidence/ui02-recepcion-grises-1440.jpg), [`ui02-enfermeria-grises-1440`](ui-evidence/ui02-enfermeria-grises-1440.jpg), [`ui02-administracion-grises-1440`](ui-evidence/ui02-administracion-grises-1440.jpg) | Modo de color «Escala de grises» | 14 (medicina) |
| [`ui02-medicina-seis-estados-grises-1440`](ui-evidence/ui02-medicina-seis-estados-grises-1440.jpg) | Los seis estados de atención a la vez en grises: cada uno se distingue por su icono y su texto | 14 |
| [`ui02-recepcion-contraste-1440`](ui-evidence/ui02-recepcion-contraste-1440.jpg) | Modo de color «Alto contraste» | sin equivalente |
| [`ui02-medicina-200-1440`](ui-evidence/ui02-medicina-200-1440.jpg) | Texto al 200 % a 1440 px (barra de resumen y tablas apiladas por el ancho del contenedor) | sin equivalente |

### Comparación con la maqueta v2

Cada captura «después» se miró junto a la de la maqueta aprobada: la estructura, el orden, las proporciones y los estados son los mismos. Las diferencias son las deliberadas de `design.md` (numeración de su tabla de desviaciones): **1** fecha y hora en las tarjetas de recepción («28/10/26, 8:05 a. m.»), **2** la franja dice «Esta funcionalidad llega en F-06.» o «F-07.» (la frase más larga ocupa dos líneas), **6** a 375 px el marco real oculta el botón de tema, **7** 375 px en lugar de 390 y **8** la píldora de herramientas termina en el borde del contenido. Además, lo que es del marco real y no de los dashboards: la cabecera y la barra lateral reales (la maqueta dibuja una réplica), el logotipo del producto y, a 768 px, el menú plegable con el perfil y «Cerrar sesión» en filas separadas.

| Captura del producto | Maqueta | Diferencias |
| --- | --- | --- |
| `recepcion-despues-claro-1440` y `-oscuro-1440` | 01 y 05 | 1 y 8 |
| `enfermeria-despues-claro-1440` | 02 | 8 |
| `medicina-despues-claro-1440` y `-oscuro-1440` | 03 y 06 | 2 y 8 |
| `administracion-despues-claro-1440` | 04 | 2 y 8 |
| `recepcion-despues-claro-375` | 07 | 1, 6 y 7; las tarjetas son más anchas que a 390 px (el marco real tiene menos relleno) y «Rechazar» cabe junto a «Confirmar llegada» |
| `enfermeria-despues-claro-375` | 08 | 6 y 7; el pie envuelve igual |
| `recepcion-768` | 09 | 1 |
| `administracion-cien-mas-1440` y `medicina-cien-mas-1440` | 10 | 2 y 8 |
| `medicina-error-1440` | 11 | 2 y 8; las tres celdas con error y el panel con error, igual |
| `recepcion-cargando-1440` | 12 | 8; esqueletos y «Cargando la bandeja…», igual |
| `recepcion-vacio-1440` | 13 | 8; icono, mensaje, pista y enlace, igual; la cifra de espera sigue en 8 porque solo se interceptan los preregistros (la maqueta vacía todo) |
| `medicina-grises-1440` y `medicina-seis-estados-grises-1440` | 14 | 2 y 8; cada estado por su icono y su texto |
| Sin equivalente en la maqueta | | `*-oscuro-375`, `enfermeria-despues-oscuro-1440`, `administracion-despues-oscuro-1440`, `medicina-despues-*-375`, `administracion-despues-*-375`, `enfermeria-768`, grises de recepción, enfermería y administración, `recepcion-contraste-1440`, `medicina-ceros-1440` y `medicina-200-1440`: misma estructura que sus equivalentes, apiladas como en 07 y 08 |

### Mediciones

#### Sin desbordamiento horizontal (R35 y R32)

`scrollWidth` frente a `clientWidth` del documento y elementos visibles que sobrepasan la ventana, en los 23 estados de los cuatro dashboards (recepción: datos, vacío, error, 403, 100+, motivo de rechazo largo abierto y aviso de llegada; enfermería: datos, vacío, error, 403 y 50+; medicina: datos, seis estados, ceros, error, 403 y 100+; administración: datos, error, 403, sedes con 100+, 403 y error, y sedes con error), a 375, 768, 1024 y 1440 px, con el texto de la aplicación al 100 % y al 200 % (la propia preferencia «Tamaño de texto»).

| Momento | Casos medidos | Con desbordamiento |
| --- | --- | --- |
| Antes de las correcciones de T13 | 184 | 19, todos a 200 % de texto y a 375 o 1024 px |
| Después de ellas (commits `d4a88cd` y `7ff8c93`) | 184 | **0** (`scrollWidth` igual a `clientWidth` en todos, y sin elementos fuera de la ventana) |

Los 19 casos eran: la insignia «Identidad sin verificar» de la tarjeta de preregistro (348 px con `nowrap` en una tarjeta de 222 px; el documento llegaba a 462 y 1038 px), la insignia de estado de una tarjeta apilada (319 px en 310 px), y el encabezado «En espera de triage» de la tabla de sedes (309 px con `nowrap`, que empujaba la página hasta 99 px fuera de la ventana). Se corrigieron dejando envolver esas insignias y ese encabezado y, con un panel de menos de 15 rem (solo alcanzable a 200 % en un teléfono), pasando los datos de la tarjeta y las tarjetas apiladas a una columna.

**Reflow a 320 px** (WCAG 1.4.10; una ventana de 1280 px con zoom de 400 %): con el texto al 100 % no hay desbordamiento en ninguno de los 23 estados. Con el texto al 200 % a 320 px (una combinación más extrema que la que pide R35, que parte de 375 px) 17 de 23 estados sobrepasan entre 14 y 46 px: el botón «Siguiente» del paginador de enfermería (366 px), la insignia «Próximamente» de la franja de medicina y administración (334 px) y el aviso «Llegada confirmada» de recepción (337 px). No se corrige: está fuera de R35, y arreglarlo pide decidir el relleno de la franja y del aviso a 10 rem de ancho; se anota en «Limitaciones».

#### Estructura por ancho (R34 y R38), texto al 100 %

Medido con el tema claro y los datos de la siembra (`c2-measure.mjs`):

| Dashboard | 375 px | 768 px | 1024 px | 1440 px |
| --- | --- | --- | --- | --- |
| Barra de resumen | 1 columna (filtro a fila completa) | 2 columnas (filtro a fila completa) | 2 columnas | enfermería: celda y filtro de 19 rem; recepción: 3 columnas (dos celdas y el filtro de 19 rem) |
| Resumen de medicina y administración | 1 columna (1+1+1) | 2 columnas (2+1, la última a fila completa) | 2 columnas (2+1) | 3 columnas en una fila |
| Tarjetas de preregistro (recepción) | 1 columna | 2 columnas | 2 columnas | 2 columnas |
| Tablas con encabezado (enfermería, medicina) | apiladas como tarjetas (rejilla de dos columnas, etiquetas «Sede», «Llegada» y «Estado», acción a ancho completo, encabezado oculto) | tabla con encabezado visible | tabla | tabla |
| Tabla de sedes (administración) | tabla sin apilar | tabla | tabla | tabla |

- **Tarjetas de preregistro**: en las filas de dos tarjetas (768 px en adelante) las alturas son iguales y los botones quedan alineados abajo, con 17 px entre los botones y el borde inferior de la tarjeta (33 px con el texto al 200 %); a una columna, también.
- **Nota «Se actualiza cada 30 s»**: está en la cabecera del panel de los cuatro dashboards, con un punto de 8 por 8 px (16 por 16 con texto al 200 %), decorativo y sin rol ni región viva; a la derecha del título en la misma fila cuando cabe (768 px en adelante) y, si no cabe, en su propia línea bajo el título, alineada a la derecha.
- **Un solo `h1`** por pantalla en los 32 casos (cuatro roles, cuatro anchos, texto al 100 % y al 200 %).
- **Texto al 200 %**: a todos los anchos la barra de resumen y las tarjetas de preregistro pasan a una columna y las tablas con encabezado se apilan solas (el panel mide de 9.7 a 24.8 rem, menos de 40 rem), porque las consultas de contenedor usan `rem`; la tabla de sedes no se apila y no desborda.
- **Fila de «100+»**: con las tres sedes en «100+», 403 y error, las filas miden 58.7, 58.7 y 64.5 px (la del error lleva el botón «Reintentar: …»).

#### Marco privado y marca (R39)

`c2-frame-edge.mjs`, sesión iniciada por la interfaz en los cuatro roles:

| Ventana | Borde derecho de las herramientas | Borde derecho de `.shell` y de `.dashboard` | Diferencia |
| --- | --- | --- | --- |
| 1280 px | 1248 | 1248 | 0 |
| 1440 px | 1360 | 1360 | 0 |
| 1920 px | 1600 | 1600 | 0 |

(Antes del ajuste de 84 a 80 rem, commit `7faee41`, la herramienta más a la derecha sobresalía 32 px: 1392 frente a 1360 a 1440 px.) En el marco privado hay **un solo texto «Asclepio» visible** (la barra lateral) y ningún enlace de marca en la cabecera, en los cuatro roles y a los tres anchos. En `/`, `/login` y `/estado` la cabecera conserva el enlace «Asclepio» (nombre accesible «Asclepio», sin `layout--private`).

### Cinco idiomas

Español, inglés, portugués, francés y alemán, en los cuatro dashboards a 375 y 1440 px (40 casos, `c2-langs.mjs`, idioma elegido con el selector de la cabecera): el atributo `lang` del documento y el `h1` cambian («Recepción», «Reception», «Recepção», «Accueil», «Empfang»; «Cola priorizada», «Priority queue», «Fila priorizada», «File prioritaire», «Priorisierte Warteschlange»; «Reportes», «Reports», «Relatórios», «Rapports», «Berichte»), sin desbordamiento horizontal, sin palabras cortadas por la mitad y sin insignias ni botones con el texto en dos líneas. La comprobación encontró una regresión de la primera corrección de 200 % (la insignia «Wartet auf Triage» se partía en dos líneas en una tarjeta apilada a 375 px) y se resolvió en `7ff8c93`.

### Modos de color y contraste (R30 y R32)

**Método** (`c2-contrast.mjs`): se recorre todo el texto visible de `main .dashboard` en los cinco modos de color de «Preferencias» (ninguno, alto contraste, sepia, escala de grises y alternativo) y los dos temas, en 21 estados (recepción: datos, vacío, error, 403, 100+, motivo de rechazo abierto y aviso de llegada; enfermería: datos, vacío, error y 403; medicina: los seis estados de atención, ceros, error, 403 y 100+; administración: datos, error, 403, sedes con 100+, 403 y error, y sedes con error; el mensaje del commit `4a4b806` dice 24 por una cuenta equivocada). Los colores computados (`oklch`, `color-mix`, `color(srgb)`) se convierten a sRGB con un canvas de 1 por 1 y los fondos semitransparentes se componen sobre el del contenedor. El mínimo es 4.5:1, o 3:1 para texto grande (24 px o más, o 18.66 px en negrita). **7150 pares medidos; 0 por debajo del mínimo** una vez corregida una insignia; los 138 pares de controles deshabilitados («Confirmar llegada» sin la casilla marcada) quedan exentos de WCAG 1.4.3. El peor caso de cada componente:

| Componente | Normal claro | Alto contraste claro | Sepia claro | Grises claro | Alternativo claro | Normal oscuro | Alto contraste oscuro | Sepia oscuro | Grises oscuro | Alternativo oscuro |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Botón suave (`.button--soft`) | 6.18 | 15.02 | 8.10 | 13.71 | 9.12 | 7.23 | 15.91 | 8.54 | 10.37 | 8.15 |
| Insignia neutral (Registrada, Cerrada, Próximamente) | 4.65 | 13.32 | 5.29 | 5.82 | 4.65 | 7.78 | 17.57 | 5.48 | 6.39 | 7.78 |
| Insignia accent (Clasificada) | 6.18 | 15.02 | 8.10 | 13.71 | 9.12 | 7.23 | 15.91 | 8.54 | 10.37 | 8.15 |
| Insignia ok (En atención, Identidad verificada) | 5.44 | 8.70 | 5.44 | 10.89 | 7.15 | 6.74 | 17.59 | 6.74 | 9.80 | 7.80 |
| Insignia warn (En espera de triage, Identidad sin verificar) | 5.77 | 8.87 | 5.77 | 8.39 | 7.19 | 6.98 | 19.83 | 6.98 | 8.37 | 8.81 |
| Insignia error (Cancelada, No se pudo cargar, Sin permiso) | 5.92 | 10.01 | 5.92 | 13.71 | 7.07 | 6.99 | 12.98 | 6.99 | 11.37 | 8.03 |
| Texto de error de una celda | 6.56 | 10.01 | 6.20 | 15.91 | 7.92 | 10.29 | 12.98 | 7.47 | 14.35 | 12.03 |
| Etiqueta de indicador, nota viva, subtítulos y rótulos (`muted`) | 5.30 | 17.58 | 5.73 | 6.42 | 5.30 | 9.63 | 18.10 | 6.90 | 8.06 | 9.63 |
| Encabezados de tabla (`th`) | 5.37 | 17.58 | 5.94 | 6.65 | 5.37 | 9.91 | 18.10 | 7.64 | 8.93 | 9.91 |
| Descripción del encabezado de página | 5.30 | 10.01 | 5.73 | 6.42 | 5.30 | 6.99 | 12.98 | 6.99 | 9.46 | 8.03 |
| Enlace de pie «Ver todas las atenciones» | 5.03 | 13.30 | 6.91 | 10.21 | 7.44 | 8.76 | 19.83 | 8.42 | 10.57 | 10.77 |
| Botón sólido (Registro directo, Confirmar llegada) | 4.69 | 13.30 | 7.31 | 10.21 | 7.44 | 9.83 | 19.83 | 9.83 | 11.71 | 8.61 |
| Botón secundario (Actualizar, Ver atención, Rechazar) | 12.21 | 21.00 | 10.43 | 15.33 | 12.21 | 15.73 | 21.00 | 10.20 | 13.17 | 15.73 |
| Cifra de indicador y título (texto grande, mínimo 3:1) | 11.82 | 21.00 | 9.46 | 14.06 | 11.82 | 15.73 | 21.00 | 10.20 | 13.17 | 15.73 |
| Todo el texto de los dashboards (mínimo global) | 4.65 | 8.70 | 5.29 | 5.82 | 4.65 | 6.74 | 12.98 | 5.48 | 6.39 | 7.78 |

**Una corrección** (`4a4b806`): la insignia «Clasificada» usaba `--accent` (#087c7a) sobre `--accent-soft` (#e2f3f1), 4.39:1 en el modo normal claro; ahora usa `--accent-hover`, el par del botón suave (6.18:1 y más en los demás modos). El icono del chip del resumen conserva `--tone` porque no es texto, y no se toca ningún token global.

**Al pasar el cursor** (`c2-hover.mjs`, diez combinaciones de modo y tema; razón de contraste en reposo y con el cursor encima, peor caso de las diez): botón suave 5.03 con el cursor (6.18 en reposo), botón secundario pequeño 7.67 (10.20), enlace de pie 7.09 (5.03) y botón sólido 5.33 (4.69), el secundario «Actualizar» 7.67 (10.20). Todos pasan 4.5:1.

**Escala de grises** (R30): en las capturas `*-grises-1440` y `medicina-seis-estados-grises-1440` cada estado de atención se distingue solo por su icono y su texto (los seis a la vez), y cada indicador por su icono y su etiqueta; ninguno depende del color.

### Teclado (R31)

`c2-keyboard.mjs`: se recarga cada escenario (el punto de partida de Tab queda al principio del documento) y se pulsa Tab hasta que el foco vuelve al navegador, anotando en cada parada el elemento, su zona (enlace de salto, cabecera, barra lateral o contenido), su posición y si tiene indicador de foco (contorno o sombra; en la barra de resumen se comprueba además que el aro no queda recortado por el `overflow: hidden`).

| Escenario | Paradas (total y en el contenido) | Orden de foco en el contenido | Resultado |
| --- | --- | --- | --- |
| Recepción, 1440 px | 16 y 9 | Actualizar, Registro directo, Sede, y por cada tarjeta la casilla y «Rechazar» | Sin trampa (vuelve al navegador); orden del DOM, una tarjeta completa antes de la siguiente |
| Recepción con el rechazo abierto | 7 y 7 | Motivo del rechazo, Confirmar rechazo, Volver y la tarjeta siguiente | Igual |
| Recepción, 375 px | 14 y 9 | El mismo orden, con el botón «Abrir navegación» en el marco | Igual |
| Enfermería, 1440 y 375 (apilada) | 18 y 3; 15 y 3 | Actualizar, Sede y los ocho enlaces «Capturar información clínica» | El orden apilado es el mismo que el de la tabla |
| Medicina, 1440 y 375 (apilada) | 17 y 3; 15 y 3 | Actualizar, ocho «Ver atención» y «Ver todas las atenciones» | Igual |
| Medicina con error | 12 y 5 | Actualizar, «Reintentar: En espera de triage», «Reintentar: Clasificadas», «Reintentar: En atención» y «Reintentar» | Nombres distintos para los botones repetidos |
| Administración, 1440 y 375 | 10 y 2; 7 y 2 | Actualizar y «Ver todas las atenciones» | Igual |
| Administración con una sede con error | 11 y 3 | Actualizar, «Reintentar: Sede Este» y «Ver todas las atenciones» | Nombre distinto para el botón de la sede |

En los 11 escenarios: ninguna parada sin indicador de foco, ningún aro recortado en la barra de resumen, ningún `tabindex` positivo y ninguna trampa. El orden va de arriba abajo: el marco (enlace «Saltar al contenido», herramientas de la cabecera, barra lateral) y luego el contenido. En recepción con dos columnas el script marca «fuera de orden visual» la pareja «Rechazar» de la tarjeta 1 → casilla de la tarjeta 2, porque la tarjeta 2 está a la derecha y a la misma altura que la 1; es el orden de lectura esperado de una rejilla de tarjetas (cada tarjeta completa antes de pasar a la siguiente) y no un defecto. Los controles repetidos de una fila («Ver atención», «Capturar información clínica», «Rechazar», la casilla) comparten nombre accesible dentro de un contenedor con nombre distinto (el `article` o la `row` del paciente), como en el diseño; los que no tienen contenedor propio («Reintentar») sí llevan nombre distinto.

### Movimiento (R31)

`c2-motion.mjs`, con la preferencia del sistema simulada por Playwright (`reducedMotion`) y una respuesta lenta de los preregistros para ver el esqueleto y el refresco:

| Preferencia | Esqueleto de carga | Icono de «Actualizar» ocupado | Animaciones activas en reposo |
| --- | --- | --- | --- |
| Sin preferencia (`no-preference`) | `pulse` de 1.4 s | `spin` de 0.7 s mientras refresca | solo el giro mientras el botón está ocupado |
| Movimiento reducido (`reduce`) | sin animación | sin animación | **0**; ninguna transición en ningún elemento del dashboard |

Las transiciones de 0.16 s de botones y campos son las de `index.css` (anteriores a esta feature) y desaparecen con la preferencia de movimiento reducido por la regla global.

### Correcciones hechas durante T13

Cada una con su prueba en rojo primero (`src/shared/ui/dashboardStyles.test.ts` y, donde cambia el marcado, la del componente) y su commit; ninguna toca pantallas fuera de los cuatro dashboards y la cabecera del marco privado.

| Commit | Qué | Prueba |
| --- | --- | --- |
| `7faee41` | La cabecera del marco privado mide 80 rem (antes 84) para alinear las herramientas con el contenido | `R39` |
| `4779c29` | `text-wrap: balance` en la descripción del encabezado, la casilla de identidad y el texto de la franja «pendiente» (palabra suelta en la segunda línea) | `R2`, `R10`, `R18` |
| `d134d2a` y `0aa9e60` | La hora y «p. m.» no se parten en «Preregistro» y «Expira» (clase `fact__time` en las dos fechas, no en todos los datos) | `R10` (CSS y componente) |
| `d9d0e06` | `line-height: 1` en el «+» de «100+»: la fila de la sede con 100+ mide lo mismo que las demás | `R8` |
| `d4a88cd` | Sin desbordamiento a 200 % de texto: insignias y encabezado de sedes que envuelven; una columna con un panel de menos de 15 rem | `R32` |
| `7ff8c93` | El estado de una tarjeta apilada ocupa la fila entera (regresión de la corrección anterior en alemán a 375 px) | `R34` |
| `4a4b806` | Contraste de la insignia «Clasificada»: el texto usa `--accent-hover` | `R30` |

### Revisión de diseño: lo anotado y no cambiado

Con la mirada de quien diseña (alineaciones, espacios, cortes de línea, cajas que sobran), también sobre lo que ya coincidía con la maqueta. Quedan, sin cambiar, lo que cambiaría el aspecto aprobado o es inherente al diseño:

- A 375 px la nota «Se actualiza cada 30 s» pasa a su propia línea bajo el título y queda alineada a la derecha (como en las capturas 07 y 08 de la maqueta); alinearla a la izquierda cuando envuelve quedaría más ordenado.
- A 375, 768 y 1024 px la rejilla de datos de la tarjeta (1.6fr y 1fr, aprobada) deja la columna derecha estrecha: «Fecha de nacimiento» envuelve su rótulo en dos líneas y «Expira» ocupa dos líneas mientras «Preregistro» ocupa una; a 375 px el documento ocupa tres líneas. Una columna única de datos por debajo de unos 20 rem de tarjeta sería más limpia.
- «Confirmar llegada» se ve apagado mientras la casilla no está marcada (control deshabilitado, regla de F-02-web, exento de WCAG 1.4.3).
- Con una tabla de ancho automático, las columnas se reparten según el contenido: un estado o un nombre más largo mueve las columnas unos píxeles al refrescar («Sede» a 657 px con los seis estados y a 665 px con dos); sin desbordamiento ni salto vertical. Fijarlas (`table-layout: fixed`) cambiaría el aspecto aprobado.
- Los tres huecos entre bloques son iguales (24 px) y los bordes izquierdos del título, la barra de resumen, el panel y la franja coinciden (x = 368 a 1440 px); no hay cajas que sobren.

### Limitaciones y comprobaciones de plataforma

- La verificación es contra una API sintética, no contra NestJS ni PostgreSQL.
- **Pestaña oculta**: emulada (ver arriba); el comportamiento real de ocultar una pestaña en un navegador con interfaz queda como comprobación manual, aunque la biblioteca solo lee `document.visibilityState`.
- **Zoom nativo del navegador**: equivale a reducir el ancho de la ventana en píxeles CSS (1280 px a 400 % son 320 px), y eso se midió (375 y 320 px al 100 %); el atajo del navegador en una ventana con interfaz no se probó.
- **320 px con el texto al 200 %**: ver «Reflow a 320 px»; fuera de R35.
- El Chromium sin interfaz oculta las barras de desplazamiento; con barra vertical el contenido mide 15 px menos y las reglas por contenedor no cambian de rango en ningún ancho medido.
- Safari y Firefox no se probaron (el proyecto ya exige navegadores con `oklch()`, `color-mix()` y `:has()`).
