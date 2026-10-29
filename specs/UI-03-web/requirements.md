# UI-03-web — Robustez de la web

Brief global: no hay brief propio de UI-03. Alcance aprobado por el usuario por chat el 2026-10-29 (siete bloques: cambios sin guardar, error boundary, título por pantalla, carga diferida, errores de red y de sesión, textos sin traducir y deuda de revisión). Las trazas apuntan a los criterios globales que cada requisito protege: `../asclepio-api/docs/product/features/F-01.md` (F-01.AC3, F-01.AC6), `F-02.md` (F-02.AC2, F-02.AC9) y `F-03.md` (F-03.AC5); ver PA-4.
Contrato: consume **0.4.0** (sin cambios, sin endpoints nuevos).
RNF aplicables: RNF-05, RNF-10, RNF-12, RNF-13, RNF-14, RNF-17 (se conserva como restricción: este slice no toca sugerencias ni decisiones).

Glosario de la spec:

- **Formularios protegidos**: `VitalSignsForm` y `SymptomFindingsForm` (captura de enfermería, `src/features/triage`) y `PatientForm` (alta de paciente, `src/features/reception`).
- **Cambios sin guardar**: un formulario protegido cuyo estado difiere de sus valores iniciales (`formState.isDirty` de React Hook Form) y que no se ha enviado con éxito desde el último cambio.
- **Borrador**: copia local de los valores de un formulario protegido, en `sessionStorage`, que nunca sale del navegador. Su contenido exacto depende de PA-1.
- **Cierre forzado de sesión**: `session.clear('expired')`, por un 401 de la sesión vigente (`src/shared/api/client.ts:17`, R15 de F-01-web) o por el temporizador de expiración.
- **Ruta de origen**: `pathname` más `search` de la ruta privada que estaba abierta al cerrarse la sesión.
- **Error de red**: la petición no obtiene respuesta HTTP (`TypeError` de `fetch`). **Error del servidor**: respuesta 5xx. **Sesión caducada**: cierre forzado de sesión.
- **Literal de UI**: texto visible o accesible (contenido JSX, `aria-label`, `title`, `placeholder`, `alt`, mensajes de error mostrados) escrito en el código en lugar de salir de `messages/`.
- Las pruebas de este slice viven bajo `describe('UI-03-web …')` y su nombre empieza por `R<n>:`.

## Requisitos

### Cambios sin guardar y borrador

- **R1** (Por evento) Cuando el usuario inicie una navegación dentro de la aplicación (enlace, menú lateral, botón atrás o adelante del navegador) mientras un formulario protegido tenga cambios sin guardar, el sistema deberá detener la navegación (`useBlocker`) y mostrar un diálogo modal traducido con las acciones «Salir sin guardar», que completa la navegación, y «Seguir editando», que la cancela y devuelve el foco al control que lo tenía. (→ F-03.AC5, F-02.AC9)
- **R2** (Por evento) Cuando el usuario recargue o cierre la pestaña mientras un formulario protegido tenga cambios sin guardar, el sistema deberá pedir la confirmación nativa del navegador mediante `beforeunload`, y deberá retirar ese manejador en cuanto el formulario deje de tener cambios sin guardar o se desmonte. (→ F-03.AC5, F-02.AC9)
- **R3** (No deseado) Si el formulario protegido no tiene cambios, se acaba de enviar con éxito o la navegación la provoca el propio envío correcto o un cierre forzado de sesión, entonces el sistema deberá navegar sin diálogo y sin `beforeunload`. (→ F-03.AC5, F-01.AC6)
- **R4** (Por evento) Cuando un cierre forzado de sesión ocurra mientras un formulario protegido tenga cambios sin guardar, el sistema deberá guardar un borrador en `sessionStorage` con el contenido que fije PA-1, asociado al usuario (id de `GET /me`), a la ruta y, en la captura, al id de la atención, y con su hora de creación en el reloj del navegador, sin enviarlo por red. (→ F-03.AC5, F-01.AC6) — bloqueado por PA-1
- **R5** (Por evento) Cuando el mismo usuario vuelva a abrir el formulario de la misma ruta (y de la misma atención) con un borrador vigente, el sistema deberá mostrar un aviso traducido con «Recuperar borrador», que rellena el formulario sin enviarlo, y «Descartar», que lo borra, sin rellenar nada antes de que el usuario elija. (→ F-03.AC5)
- **R6** (No deseado) Si un borrador superó la caducidad que fije PA-2, pertenece a otro usuario o a otra atención, o no supera la validación de forma del formulario, entonces el sistema deberá borrarlo sin mostrarlo. (→ F-01.AC6, F-03.AC5) — bloqueado por PA-2
- **R7** (Ubicuo) El sistema deberá borrar el borrador al enviar con éxito el formulario, al pulsar «Descartar», al cerrar sesión de forma voluntaria y al caducar, y no deberá escribir su contenido en la consola, la URL, `localStorage` ni ninguna petición. (→ F-01.AC6; RNF-05)

### Error boundary por ruta

- **R8** (No deseado) Si el renderizado de una ruta lanza un error no controlado, entonces el sistema deberá mostrar, en el lugar del contenido de esa ruta y conservando el marco (en rutas privadas, la barra lateral, la navegación por rol y la cabecera con herramientas), un estado de error traducido con icono, título, mensaje, «Reintentar» (vuelve a montar la ruta) y «Volver al inicio» (`HOME_BY_ROLE` del rol en rutas privadas; `/` en las públicas). (→ F-01.AC6)
- **R9** (Ubicuo) El sistema deberá omitir en el estado de error de R8 la traza, el mensaje técnico del error y cualquier dato personal, y no deberá escribir datos personales en la consola al capturarlo. (→ F-01.AC6; RNF-05)

### Título de la pestaña

- **R10** (Ubicuo) El sistema deberá fijar `document.title` en cada pantalla como «{pantalla} | Asclepio» (el texto de su entrada de navegación o el nombre de la pantalla; solo «Asclepio» en `/`), traducido a español, inglés, portugués, francés y alemán, sin datos de pacientes, y deberá actualizarlo al cambiar de idioma. (→ F-01.AC6)
- **R11** (Por evento) Cuando cambie la ruta dentro de la aplicación, el sistema deberá anunciar el nuevo título en una región viva cortés (`aria-live="polite"`) única del marco, sin mover el foco a otro lugar que el que ya fija cada pantalla. (→ F-01.AC6)

### Carga diferida por rol

- **R12** (Ubicuo) El sistema deberá cargar de forma diferida (`lazy` de rutas de React Router) el código de cada feature privada (`reception`, `triage`, `queue`, `reports` y la consulta de atenciones), de modo que el fragmento inicial contenga solo el marco, las rutas públicas, el login y los guards, y que `npm run build` no emita el aviso de fragmento mayor de 500 kB; si tras la división algún fragmento sigue superándolo, el sistema deberá tener un fragmento inicial menor que el medido antes del cambio, con ambas medidas registradas. (→ F-01.AC6; RNF-13)
- **R13** (Por estado) Mientras se descarga el código de una ruta diferida, el sistema deberá mostrar dentro del marco un estado de carga con `role="status"` y texto traducido, sin desplazar la barra lateral ni la cabecera. (→ F-01.AC6)
- **R14** (No deseado) Si la descarga del código de una ruta diferida falla, entonces el sistema deberá mostrar el estado de error de R8 con un mensaje propio de «no se pudo cargar la pantalla» y un «Reintentar» que vuelve a pedir ese código. (→ F-01.AC6)

### Errores de red, de sesión y del servidor

- **R15** (No deseado) Si una petición falla por error de red, entonces el sistema deberá mostrar en el lugar del error el texto traducido «No hay conexión con el servidor» con «Reintentar», distinto del de error del servidor. (→ F-01.AC6; RNF-14)
- **R16** (Por evento) Cuando el navegador recupere la conexión (`onlineManager` de TanStack Query), el sistema deberá repetir las consultas que estaban en error de red, con el alcance que fije PA-3. (→ F-01.AC6) — bloqueado por PA-3
- **R17** (No deseado) Si una mutación (envío de un formulario o una acción) falla por error de red, entonces el sistema deberá conservar los valores escritos, mostrar el error de R15 y no reenviarla de forma automática, ni al reconectar. (→ F-03.AC1, F-02.AC9)
- **R18** (No deseado) Si una petición responde 5xx, entonces el sistema deberá mostrar el texto traducido de error del servidor con «Reintentar», sin el `detail` ni el `title` del `problem+json` ni otros detalles técnicos. (→ F-01.AC6; RNF-14)
- **R19** (Por evento) Cuando un cierre forzado de sesión lleve al login, el sistema deberá mostrar «Tu sesión expiró. Vuelve a iniciar sesión.» y, tras un login correcto, abrir la ruta de origen (con su `search`) si el rol del usuario la permite, o el inicio de su rol si no la permite o es otro usuario sin acceso. (→ F-01.AC6, F-01.AC3)

### Textos traducidos

- **R20** (Ubicuo) El sistema deberá obtener todo literal de UI de los catálogos de `messages/` en los cinco idiomas, incluido el aviso de atención cerrada o cancelada de `CancelEncounterForm` (`src/features/triage/components/CancelEncounterForm.tsx:17`) y los demás literales que encuentre la búsqueda de `design.md`. (→ F-01.AC6)
- **R21** (Ubicuo) El sistema deberá incluir una comprobación automática, ejecutada por `npm test` o `npm run lint`, que falle si un archivo de `src/` fuera de las pruebas contiene un literal de UI nuevo, con la lista de excepciones justificadas de `design.md`. (→ F-01.AC6)
- **R22** (Ubicuo) El sistema deberá ofrecer todos los textos nuevos de este slice en español, inglés, portugués, francés y alemán con las mismas claves y parámetros en los cinco catálogos (`npm run i18n:check`). (→ F-01.AC6)

### Deuda de revisión

- **R23** (Ubicuo) El sistema deberá permitir el acceso a una subruta solo si figura en `subpaths` de su entrada de `roleMatrix.ts` (con los patrones `:id`), denegando por defecto cualquier otra subruta, y deberá conservar el acceso actual a `/recepcion/registro`, `/triage/:id` y `/atenciones/:id`. (→ F-01.AC3, F-01.AC6; RNF-12)
- **R24** (No deseado) Si el alta de un paciente NN con edad estimada recibe 422, entonces el sistema deberá mostrar el mensaje genérico de datos no válidos en lugar del de «fecha de nacimiento futura». (→ F-02.AC2)
- **R25** (Por evento) Cuando recepción elija una sede en `/recepcion`, el sistema deberá pedir y mostrar la bandeja de preregistros de esa sede según F-02-web R9, con una prueba del caso con sede elegida. (→ F-02.AC9)
- **R26** (Ubicuo) El sistema deberá restaurar la sesión de `sessionStorage` una sola vez al arrancar, fuera del render de `SessionProvider`, de modo que un render doble (`StrictMode`) no la lea dos veces. (→ F-01.AC6)
- **R27** (Ubicuo) El sistema deberá carecer de código sin uso señalado en la revisión: el alias `EventActorType` de `client.ts` y el parámetro `encounter` de `onCancelled`; deberá tener `renderApp` en `src/test/` y los `describe` de `problem.test.ts` prefijados con la feature (`F-01-web …`, `F-02-web …`). (→ F-01.AC6)
- **R28** (Ubicuo) El sistema deberá pasar la suite completa con `./init.sh` en Node 22.23.4 en tres ejecuciones seguidas sin fallos ni «Test timed out», incluidas `R40` de `f02Transversal.test.tsx` y `R3` de `f03Routes.test.tsx`, sin debilitar aserciones, sin borrar ni omitir pruebas y sin subir el tiempo de espera global de Vitest. (→ F-01.AC6)

### Transversales

- **R29** (Ubicuo) El sistema deberá construir el diálogo de R1, el aviso de R5, el estado de error de R8 y R14, el estado de carga de R13 y los avisos de R15 y R18 con componentes de `shared/ui` y los tokens, la fuente y los iconos Heroicons actuales, sin dependencias nuevas, sin colores literales y sin cambiar el aspecto de las pantallas aprobadas en UI-01 y UI-02. (→ F-01.AC6; RNF-13)
- **R30** (Ubicuo) El sistema deberá permitir operar con teclado el diálogo de R1 y los avisos de R5, R8, R14, R15 y R18, con el foco atrapado en el diálogo mientras está abierto, `Escape` como «Seguir editando» y nombres accesibles traducidos. (→ F-01.AC6; RNF-13)
- **R31** (Ubicuo) El sistema deberá excluir los datos personales de la consola, la URL y `localStorage` en todos los flujos de este slice, y deberá dejar en `sessionStorage` solo la sesión y, si PA-1 lo aprueba, los borradores con el contenido que esa respuesta fije. (→ F-01.AC6; RNF-05)
- **R32** (Ubicuo) El sistema deberá consumir el contrato 0.4.0 sin cambiar `schema.d.ts` ni los tipos generados y sin peticiones nuevas. (→ F-01.AC6; RNF-14)

## Preguntas abiertas

- [ ] PA-1 **¿Qué puede guardar el borrador en `sessionStorage`?** Hoy las reglas chocan: `privacy.test.tsx` R10 exige que tras el login `sessionStorage` tenga solo `asclepio.session`, `privacy.test.tsx` R24 exige `sessionStorage` vacío tras la expiración, UI-02-web R27 prohíbe datos de pacientes en el almacenamiento del navegador y RNF-05 trata el texto libre clínico como dato personal. Opciones: (a) **propuesta**: borrador solo de la captura clínica (`VitalSignsForm` y `SymptomFindingsForm`), sin identidad del paciente, con los valores numéricos y estructurados y **sin** campos de texto libre, asociado al id de la atención; `PatientForm` solo con el aviso de R1 y R2, sin borrador; R10 y R24 de `privacy.test.tsx` se enmiendan para admitir la clave del borrador; (b) igual que (a) pero incluyendo el texto libre clínico; (c) también `PatientForm` (nombre, documento, fecha de nacimiento: dato personal identificable); (d) sin borrador, solo el aviso. Requiere decisión de producto y privacidad — bloquea R4, R5, R6, R7 y R31.
- [ ] PA-2 **¿Cuánto dura un borrador?** No hay valor en los briefs y no se inventa. Propuesta para decidir: igual a la vida del token de sesión o un valor fijo que elija producto. Bloquea R6.
- [ ] PA-3 **Reintento al reconectar frente a UI-02-web R25.** UI-02-web R25 (decisión del usuario, PA-3 de UI-02) dice que los dashboards **no** repiten peticiones por reconexión. Opciones: (a) **propuesta**: al reconectar se repiten solo las consultas en error de red (en todas las pantallas, también los dashboards), lo que enmienda R25 en ese caso; las que tienen datos esperan su intervalo; (b) los dashboards siguen sin reintento por reconexión y el reintento aplica solo al resto de pantallas; (c) sin reintento automático, solo «Reintentar». Bloquea R16.
- [ ] PA-4 **Traza sin brief propio.** UI-03 no tiene brief ni criterios `UI-03.ACn`; los requisitos se trazan a F-01.AC3, F-01.AC6, F-02.AC2, F-02.AC9, F-03.AC1 y F-03.AC5. ¿Se aceptan estas trazas, o se crea antes `docs/ui-robustness.md` con criterios `UI-03.AC1…` (como `docs/ui-dashboards.md` en UI-02)? Bloquea la aprobación de la spec.
