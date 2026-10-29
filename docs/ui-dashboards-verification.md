# UI-02-web — Verificación de los dashboards por rol

Fecha: 2026-10-28, America/Bogota. Brief: `docs/ui-dashboards.md` (UI-02.AC1 a AC12). Spec: `specs/UI-02-web/`. Referencia visual aprobada: la maqueta v2 (`../../local-analysis/ui02-maqueta/maqueta-dashboards.html` y sus capturas). Este documento lo abre la tarea T1 (capturas «antes» y línea base) y lo completa la tarea T13 (capturas «después», mediciones, accesibilidad, refresco automático y tabla R → prueba).

## Estado del documento

| Parte | Tarea | Estado |
| --- | --- | --- |
| Commit de partida, procedimiento, datos, 16 capturas «antes» y línea base de R35 | T1 | Hecho |
| Capturas «después» y adicionales, comparación con la maqueta, mediciones, teclado, idiomas, modos de color, refresco automático y tabla R → prueba | T13 | Pendiente |

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

## Pendiente (T13)

Capturas «después» y adicionales de `design.md` («Verificación visual y entrega»), comparación con las capturas de la maqueta, mediciones a 375, 768, 1024 y 1440 px y a 200 % de texto, recorrido con teclado, cinco idiomas, modos de color, refresco automático con una llegada nueva entre dos ciclos de 30 s, marca única del marco y tabla R1 a R41 → prueba. Se registran aquí al completar T13.
