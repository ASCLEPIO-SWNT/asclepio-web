# UI-02-web — Dashboards por rol

**Objetivo:** rediseñar las pantallas de inicio de RECEPTION, NURSE, PHYSICIAN y ADMIN (`/recepcion`, `/triage`, `/cola`, `/reportes`) como dashboards ordenados, con datos reales del contrato 0.4.0.

**Petición del usuario (2026-10-28):** «reescribe el diseño de las pantallas de dashboard para todos los roles porque esta muy simple, desordenado y feo».

**Brief local:** `docs/ui-dashboards.md` (UI-02.AC1–AC12). Alcance aprobado por el usuario el 2026-10-28 (ver «Aprobación humana»).

## Plan de la sesión

1. [x] `./init.sh` en verde (FAIL 0, WARN 0) antes de empezar.
2. [x] Diagnóstico de las pantallas actuales, del contrato 0.4.0 y de los roles por endpoint.
3. [x] Brief local y alta de la feature en `feature_list.json` (`pending`).
4. [x] `spec_author` escribió `specs/UI-02-web/` (36 requisitos, 13 tareas, 5 preguntas abiertas).
5. [x] PA-1 a PA-5 resueltas, maqueta v2 aprobada por el usuario («Listos, me gusta mucho ese estilo, implementalo») y spec v2 (41 requisitos) verificada por el `leader`.
6. [ ] `in_progress` (desde 2026-10-28): etapas A y B hechas y verificadas por el `leader`; falta la etapa C y después el `reviewer`; `done` solo con `./init.sh` en verde.

## Estado

`in_progress` desde 2026-10-28 (22:15, hora de Bogotá). Spec v2 verificada por el `leader`: 41 requisitos (R1–R41) con traza a UI-02.AC1–AC12, prueba prevista y tarea; 0 preguntas abiertas; 14 tareas en tres etapas. Partida: `main` en `7043fc1`, árbol limpio salvo los archivos de esta feature.

| Etapa | Tareas | Estado |
|---|---|---|
| A, base compartida | T1 a T5 | **hecha y verificada por el `leader`** (2026-10-29): `./init.sh` completo en verde, 522 pruebas, 36 claves nuevas por idioma, 16 capturas «antes»; la sesión del agente cortó por un error 400 de la API al final, con el trabajo y la nota ya escritos |
| B, los cuatro dashboards | T6 a T9 | **hecha y verificada por el `leader`** (2026-10-29): `./init.sh` completo en verde (FAIL 0, WARN 0), 654 pruebas en 42 archivos, `npm run build` e `i18n:check` con salida 0; con mi propio build y la API sintética, los cuatro dashboards a 375 y 1440 px en claro coinciden con la maqueta v2, sin desbordamiento ni errores de consola (la marca sigue repetida en el marco hasta T10) |
| C, marco, rutas, transversales y cierre | T10 a T14 | pendiente |

Revisión independiente (`reviewer`) al terminar la etapa C. Cada etapa deja una nota en `progress/impl_UI-02-web.md` que la siguiente lee primero.

## Respuestas del usuario a las preguntas abiertas (2026-10-28, por chat)

- **PA-1:** en las rutas de hoy (propuesta de la spec).
- **PA-2, PA-4, PA-5:** cifras reales + «Próximamente» en Medicina y Administración (propuesta de la spec).
- **PA-3:** **distinta de la propuesta.** El usuario eligió «Todo automático cada 30 s» para los cuatro dashboards, a pesar de que se le advirtió que revisa F-03-web D3 (bandeja manual), que la lista de enfermería cambia mientras se trabaja con ella y que sube la carga de peticiones. El brief (`docs/ui-dashboards.md`: AC4(b), AC6, relación con F-03 D3, S4) ya lo refleja.
- **Maqueta visual:** el usuario pidió verla **antes de aprobar** la spec.

## Revisión de la spec con las respuestas (2026-10-28)

- `spec_author` actualizó `specs/UI-02-web/`: 37 requisitos (R37 nuevo: el refresco automático conserva foco, filas, altura y desplazamiento), 0 preguntas abiertas (PA-1 a PA-5 en `[x]`), R7 y R26 precisados. Verificación mecánica del `leader`: R1–R37 con traza, prueba y tarea.
- **Refresco automático y pruebas existentes:** `grep` del `leader` en `src`: solo `ReceptionPage.test.tsx` usa temporizadores falsos. Las R3 y R4 de `f03Routes.test.tsx` comprueban el botón manual y la recuperación tras un error, y se conservan (foco y reconexión siguen en `false`); lo único que cambia de F-03 es el texto de R21 (`Accesos` en lugar de `Espacio de enfermería`). Quedan revisados F-03-web R3 y D3 (requisitos de texto, no pruebas).
- **Riesgo aceptado por el usuario al elegir el refresco automático:** en `/triage` la lista se reordena mientras se trabaja (orden `arrivalAt` descendente con `offset`) y sube la carga: `/reportes` hace 3 + S peticiones de hasta 100 atenciones cada 30 s.

## Maqueta visual (pedida por el usuario antes de aprobar)

- Archivo: `../../local-analysis/ui02-maqueta/maqueta-dashboards.html` (HTML autocontenido con Axiforma, logo e iconos Heroicons incrustados; datos ficticios) y 13 capturas en `capturas/`. **No se pudo publicar como artefacto:** la sesión usa `ANTHROPIC_API_KEY` y el artefacto exige un login de claude.ai.
- Verificada con Playwright y el Chromium local: cuatro roles en claro y oscuro, teléfono (390 px) y los estados vacío, «100+», error y carga, sin errores de consola ni desbordamiento horizontal; en escala de grises cada estado se distingue por icono y texto.
- **Refinamientos de la maqueta que la spec no tenía** (segunda revisión pedida al `spec_author`): disposición según el número de indicadores, indicador horizontal cuando es ancho, tarjeta de pre-registro en cuatro filas, filas de atención sin separadores y con botón pequeño, subcabecera del panel de enfermería y texto «Se actualiza cada 30 s» (clave `dash_live`, R38).

## Feedback del usuario sobre la maqueta v1 y maqueta v2 (2026-10-28)

- **Feedback literal:** «un poco desordenado, buscamos algo mucho más organizado, con excelentes bases de UI/UX. También las tildes y escritura está muy extraña. Tal vez los preregistros en recepción pueden estar en 2 columnas».
- **Tildes y escritura:** se reprodujo la maqueta v1 en Firefox 158 y en Chromium y las tildes se ven bien; el archivo v1 sí carecía de `doctype` y `charset` (corregido en v2). Fallos de escritura reales encontrados en v1: etiquetas de indicador en minúscula inicial («en espera de triage»), «pre-registro» con guion (el usuario escribe «preregistro»), el separador «·» que Axiforma dibuja como un punto sobre la línea base («Sede Sur · Llegada») y horas con segundos. v2 los corrige.
- **v2 (archivo `../../local-analysis/ui02-maqueta/maqueta-dashboards.html`; v1 archivada en `v1/`):** barra de resumen única (indicadores y filtro de sede), tablas alineadas con filas de acción suaves, preregistros en dos columnas a ancho completo, sin columna lateral ni panel «Accesos» (el menú ya enlaza), «Próximamente» como franja discreta, nota «Se actualiza cada 30 s» en la cabecera del panel, escala única de espacios, tipografía y radios, y filas que se apilan en tarjetas por debajo de 40 rem. Verificada en Chromium y Firefox, claro y oscuro, 390/768/1440 px y los cinco estados, sin errores de consola ni desbordamiento.
- **Propuestas fuera del alcance original que requieren el OK del usuario:** (a) marco privado con la marca una sola vez (en la barra lateral) y la cabecera reducida a las herramientas, lo que toca `AppShell` y `Layout` (UI-01.AC2, S3); (b) retirar el panel «Accesos» de recepción y enfermería (R11 y R14); (c) escribir «preregistro» sin guion en los textos nuevos (hoy la app usa «pre-registro» en F-02).
- **Qué cambia en la spec cuando el usuario apruebe esta dirección** (la spec actual, 38 requisitos, está alineada con la maqueta v1): barra de resumen en lugar de indicadores sueltos (R5, R9, R13, R34), sin «Accesos» (R11, R14), tablas y apilado en tarjetas (R14, R16, R17), enfermería sin insignia de estado por fila (todas son iguales), horas sin segundos con la fecha debajo, etiquetas con mayúscula inicial y «preregistro», y los cambios del marco si se aprueban.

## Aprobación humana

**2026-10-28, por chat:** «Listos, me gusta mucho ese estilo, implementalo». El `leader` la registra como el «aprobado» del alcance: la maqueta v2 (`../../local-analysis/ui02-maqueta/maqueta-dashboards.html`) con las tres propuestas fuera del pedido original (marca única en el marco, sin «Accesos», «preregistro» sin guion), tal como se describen en `docs/ui-dashboards.md` (AC1–AC12, S6). Se había avisado al usuario de que después de reescribir la spec se pediría un «aprobado»; el usuario respondió con la orden de implementar. Si la reescritura de la spec se aparta de la maqueta aprobada, se para y se pregunta.

**Orden de trabajo:** brief actualizado → `spec_author` reescribe la spec para la v2 → verificación del `leader` → `in_progress` → `implementer` por etapas (pruebas primero) → `reviewer` independiente → `done` solo con `./init.sh` completo en verde. Commits locales con Conventional Commits en la rama `feat/ui-02-web-dashboards` y sin push hasta que el usuario lo pida (ver «Hallazgos y bloqueos», «Rama y commits»).

## Hallazgos y bloqueos

- **API:** `F-04` a `F-07` están `pending` y el contrato es 0.4.0: no hay cola, reportes, niveles de triage ni sugerencias. `/cola` y `/reportes` solo pueden mostrar datos de atenciones más un panel pendiente. Los dashboards completos de Medicina y Administración requieren una sesión de `asclepio-api` (F-05, F-06, F-07).
- **Contrato:** `GET /encounters` no devuelve total (`limit` ≤ 100): los conteos son exactos hasta llenar la página y «N+» después. `GET /pre-registrations` es solo RECEPTION.
- **Decisiones previas que esta feature revisa:** F-03-web D3 (sin indicadores en `/triage`) y la fidelidad «igualito» de UI-01 para estas cuatro pantallas.
- **Rama y commits:** `feat/ui-02-web-dashboards` (desde `main` en `7043fc1`), commits locales con Conventional Commits (cuerpo con `Refs: UI-02-web`), sin upstream y sin push. El `leader` había dicho «sin commits»; el agente de la etapa B los hizo citando un mensaje del usuario que el `leader` no vio («No olvides estar haciendo commits siguiendo los conventional commits de manera constante»). Se le informa al usuario en el próximo mensaje; el resto de commits sigue esa regla. Publicar (push o PR) solo si lo pide.
- **Revisión del leader de la spec (verificación mecánica OK: R1–R36 con traza, prueba y tarea; solo se tocó `specs/UI-02-web/`).** Dos precisiones para la próxima revisión del `spec_author`, junto con las respuestas a las PA: (1) R7 dice «por cada indicador de conteo» pero el indicador de `/triage` sale de la bandeja sin petición propia (R13, D6): acotar R7 a `/recepcion`, `/cola` y `/reportes`; (2) R26 dice «la pantalla actual del mismo rol», que para PHYSICIAN y ADMIN es un marcador sin datos: acotarlo a `/atenciones` para esos roles (y a la bandeja actual para RECEPTION y NURSE).
- **Evidencia visual:** hay navegadores de Playwright en `~/.cache/ms-playwright` y API sintética local en `../../local-analysis/` (`preview-api.mjs`, que lee `src/test/fakeApi.ts`); T1 y T12 son viables, pero el preview deberá ampliarse con los endpoints de conteo.
- **2026-10-29, `implementer` (T13), D28 y «p. m.»:** `design.md` D28 supone que `Intl` escribe un espacio duro en «2:05 p. m.» y por eso los formateadores devuelven la salida tal cual. En Chromium 153 (`es-CO`) escribe espacios normales (U+0020 en todos los huecos), así que «p. m.» puede partirse de la hora y hasta «p.» de «m.». En las tarjetas de recepción se resolvió con CSS (`text-wrap: balance` en `fact__time`, commits `d134d2a` y `0aa9e60`); el aviso de llegada confirmada y cualquier otro texto que use `formatDateTimeBogota` o `formatTimeBogota` siguen pudiendo partirse en un ancho estrecho. Arreglo de raíz (decisión del `leader` o del `spec_author`, porque enmienda D28): que los formateadores sustituyan el espacio que precede a «a. m.» o «p. m.» por U+00A0; las pruebas ya comparan con `\s` y `norm`, así que no cambian.
- **2026-10-29, `implementer` (T13), cerrado sin bloqueos; tres cosas para el `leader` y el `reviewer`:** (1) **contraste**: se midieron 7150 pares de texto en cinco modos de color y dos temas; el único fallo era la insignia «Clasificada» (4.39:1) y se resolvió en la propia insignia (`4a4b806`), sin tocar ningún token global, así que no hay hallazgo de contraste global. (2) **añadidos de CSS que no están en `design.md`** (todos con su prueba y solo en `dashboard.css`, `PreRegistrationCard.tsx` en un caso): la clase `fact__time` (D28), insignias y encabezado de sedes que envuelven, una columna con un panel de menos de 15 rem, la celda de estado de la tarjeta apilada a fila completa, `line-height: 1` en el «+» de «100+», `text-wrap: balance` en cuatro textos y `--accent-hover` para el texto de la insignia accent; conviene pasarlos a la tabla de CSS de `design.md` si el `spec_author` reabre el documento. (3) **320 px con texto al 200 %** desborda entre 14 y 46 px en 17 de 23 estados (botón «Siguiente» del paginador de enfermería, insignia «Próximamente» de la franja y aviso «Llegada confirmada»); queda fuera de R35 (parte de 375 px) y no se corrigió. Además, la «pestaña oculta» se emuló con `document.visibilityState` porque Chromium sin interfaz no puede ocultar una pestaña; el resto del refresco se midió con temporizadores reales de 30 s.
