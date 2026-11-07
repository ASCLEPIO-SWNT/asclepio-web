# UI-04-web — Pulido para la demo

- Objetivo: dejar presentable lo que ya funciona (F-01, F-02, F-03, UI-01–UI-03) para la demo del 2026-11-07. Sin funcionalidades nuevas, sin endpoints nuevos (contrato 0.4.0). F-04–F-07 siguen fuera: su API está `pending` (decisión del usuario, 2026-11-06).
- Origen: recorrido manual del leader (2026-11-06) con los cuatro roles contra la API local (`asclepio-dev-db`, usuarios `demo.*@dev.local`), escritorio 1440×900 y móvil 390×844, tema claro y oscuro.

## Plan de la sesión
1. spec_author: spec corta de UI-04-web a partir de los hallazgos H1–H16.
2. ⏸ Aprobación del usuario por chat.
3. implementer → reviewer → `done`.

## Hallazgos del recorrido (2026-11-06)

### Prioridad 1 — se ven en la demo
- **H1 (bug) Cerrar sesión hereda la ruta del usuario anterior.** `AppShell.onLogout` llama a `logout()` y después navega a `/login`; entre medias `RequireSession` redirige con `state.from` = ruta actual, y `LoginRoute` lleva al siguiente usuario a esa ruta si su rol puede verla. Reproducido: RECEPTION en `/atenciones` → logout → NURSE entra en `/atenciones` (no `/triage`); PHYSICIAN en `/cola` → logout → ADMIN entra en `/cola` (no `/reportes`). En un PC compartido, el siguiente usuario cae en la pantalla del anterior. Esperado: tras un cierre voluntario, el siguiente login va al inicio de su rol; la vuelta a la ruta de origen (UI-03 R19) solo aplica a la sesión expirada.
- **H2 (bug móvil) `/atenciones` desborda en horizontal a 390 px** (`scrollWidth` 551 en un viewport de 375). El resto de rutas comprobadas (detalle, `/cola`, `/reportes`) no desborda.
- **H3 Detalle de atención (`/atenciones/:id`): «Cancelar atención» tiene estilo de botón primario** (color de marca) siendo una acción destructiva, y está pegado al título «Línea de tiempo» (sin margen).
- **H4 Línea de tiempo con separadores rotos:** «6/11/26, 8:18:23 p. m. . Atención creada . Laura Gómez» (punto tras «p. m.» y « . » como separador). Necesita un formato limpio (hora, evento y autor separados visualmente).
- **H5 El estado de la atención es texto plano** en la lista `/atenciones`, en el detalle y en el contexto de la captura clínica, mientras los dashboards de UI-02 (`/cola`, `/triage`) ya usan una insignia de estado. Unificar con la insignia existente.
- **H6 Lista `/atenciones`:** sin subtítulo (las demás pantallas lo tienen); la fecha y «Ver atención» se parten en dos líneas en escritorio; la paginación usa botones primarios deshabilitados aunque haya una sola página, distinta del paginador de UI-02 («Página 1» + Anterior/Siguiente secundarios).
- **H7 Registro directo (`/recepcion/registro`):** sin subtítulo ni enlace para volver a Recepción; «Registrar paciente NN» con estilo primario igual que «Buscar» y, tras «Crear paciente», queda entre el aviso y el formulario de alta; el formulario de alta es una columna de campos a todo el ancho (~1000 px); tipo y número de documento de solo lectura parecen editables.
- **H8 Paneles «Próximamente» muestran códigos internos:** «Esta funcionalidad llega en F-06.» (`/cola`, NURSE y PHYSICIAN) y «… en F-07.» (`/reportes`). Texto neutral sin código, en cinco idiomas.

### Prioridad 2 — pulido
- **H9 Selector ACVPU muestra solo letras** («A, C, V, P, U») en la captura y en «Tomas registradas». Debe mostrar el significado de cada nivel. **Requisito clínico: el texto debe salir de `../asclepio-api/docs/` (glosario/briefs); si no está, pregunta abierta.**
- **H10 Aviso «PROVISIONAL — no validado clínicamente…»** de signos vitales es texto plano gris; darle estilo de aviso sin cambiar el texto.
- **H11 «Quitar elemento N»** es un botón a todo el ancho dentro de cada elemento de hallazgos; debe ser una acción secundaria compacta.
- **H12 Menú de ADMIN:** «Cola priorizada» aparece antes que su inicio «Reportes».
- **H13 Modo oscuro:** el logo de la barra lateral casi no se ve.
- **H14 Foco tras «Guardar toma»:** el foco cae en `body`; debería ir al mensaje de éxito.

### Prioridad 3 — opcional
- **H15 Avatar con la inicial del título:** «Dra. Camila Torres» → «D».
- **H16 (observación 4 del reviewer de UI-03)** en producción las consultas reintentan 3 veces con `networkMode: 'always'`, así que el error de red tarda unos segundos en aparecer.

### Verificado sin hallazgos
Landing (escritorio y móvil, sin desbordes), login y error de credenciales, bandeja de pre-registros y confirmación de llegada, registro directo con alta de paciente, captura de signos vitales, dashboards de NURSE/PHYSICIAN/ADMIN, modo oscuro del detalle. La barra lateral «cortada» en capturas de página completa es un artefacto de `position: sticky`, no un defecto.

## Estado
- 2026-11-06: hallazgos registrados; spec_author lanzado.
- 2026-11-06 (spec_author): spec escrita en `specs/UI-04-web/` con 19 requisitos (R1–R19) y 12 tareas. Cobertura: H1 → R1–R2 (causa: `RequireSession` fija `state.from` al re-renderizar tras `logout()`; arreglo: omitir `from` si `endReason === 'logout'`; prueba nueva `src/app/router/logoutHome.test.tsx`); H2/H6 → R3, R7 (`/atenciones` con `DashboardPage`, `PageHeader`, `Panel`, `DataTable` y el paginador de UI-02); H3 → R4; H4 → R5; H5 → R6 (`EncounterStatusBadge` sobre `StatusBadge`); H7 → R8–R9; H8 → R10 (enmienda UI-02-web R18 y UI-02.AC5 en la frase de la feature); H9 → R11, **bloqueado**; H10 → R12; H11 → R13; H12 → R14; H13 → R15; H14 → R16; H15 → R17; H16 queda fuera (política global de reintentos, no trivial). Transversales: R18 (cinco catálogos) y R19 (contrato 0.4.0, sin dependencias ni colores literales). Sin impacto en contrato ni en datos.
- Pregunta abierta (bloquea la aprobación): **PA-1** texto de cada nivel ACVPU (A, C, V, P, U) en cinco idiomas; `../asclepio-api/docs/` solo nombra la escala (PA-F03-1, NEWS2 RCP 2017, PROVISIONAL) sin definir los niveles. Opciones: (a) el usuario fija texto y fuente y se anota en el brief F-03 en una sesión de `asclepio-api`; (b) sacar H9 de UI-04 y tachar R11/T9.
