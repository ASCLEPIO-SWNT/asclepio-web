# UI-03-web — Robustez de la web

Brief global: no hay brief propio de UI-03. Alcance aprobado por el usuario por chat el 2026-10-29 (siete bloques: cambios sin guardar, error boundary, título por pantalla, carga diferida, errores de red y de sesión, textos sin traducir y deuda de revisión). Las trazas apuntan a los criterios globales que cada requisito protege: `../asclepio-api/docs/product/features/F-01.md` (F-01.AC3, F-01.AC6), `F-02.md` (F-02.AC2, F-02.AC9) y `F-03.md` (F-03.AC1, F-03.AC5); trazas aceptadas por el usuario (PA-4).
Contrato: consume **0.4.0** (sin cambios, sin endpoints nuevos).
RNF aplicables: RNF-05, RNF-10, RNF-12, RNF-13, RNF-14, RNF-17 (se conserva como restricción: este slice no toca sugerencias ni decisiones).

Glosario de la spec:

- **Formularios protegidos**: `VitalSignsForm` y `SymptomFindingsForm` (captura de enfermería, `src/features/triage`) y `PatientForm` (alta de paciente, `src/features/reception`).
- **Cambios sin guardar**: un formulario protegido cuyo estado difiere de sus valores iniciales (`formState.isDirty` de React Hook Form) y que no se ha enviado con éxito desde el último cambio.
- **Borrador**: copia local de los valores de un formulario protegido, en `sessionStorage`, que nunca sale del navegador. Solo existe para `VitalSignsForm` y solo contiene signos vitales (PA-1).
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
- **R4** (Por evento) Cuando un cierre forzado de sesión ocurra mientras `VitalSignsForm` tenga cambios sin guardar, el sistema deberá guardar en `sessionStorage`, bajo la clave `asclepio.draft.vitals.<encounterId>`, un borrador con solo los valores numéricos y estructurados de los signos vitales, el id del usuario (de `GET /me`), el id de la atención y su hora de creación en el reloj del navegador, sin texto libre, sin síntomas ni hallazgos, sin identidad del paciente y sin enviarlo por red; `SymptomFindingsForm` y `PatientForm` no deberán guardar borrador. (→ F-03.AC5, F-01.AC6)
- **R5** (Por evento) Cuando el mismo usuario vuelva a abrir la captura de la misma atención con un borrador vigente, el sistema deberá mostrar un aviso traducido con «Recuperar borrador», que rellena el formulario sin enviarlo, y «Descartar», que lo borra, sin rellenar nada antes de que el usuario elija. (→ F-03.AC5)
- **R6** (No deseado) Si un borrador tiene más de 30 minutos desde su creación, pertenece a otro usuario o a otra atención, o no supera la validación de forma del formulario, entonces el sistema deberá borrarlo sin mostrarlo. (→ F-01.AC6, F-03.AC5)
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
- **R16** (Por evento) Cuando el navegador recupere la conexión, el sistema deberá mantener el error de R15 hasta que el usuario pulse «Reintentar» (o, en los dashboards, hasta el siguiente intervalo de UI-02-web R24), sin repetir ninguna consulta ni mutación por la reconexión, conforme a UI-02-web R25. (→ F-01.AC6)
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
- **R31** (Ubicuo) El sistema deberá excluir los datos personales de la consola, la URL y `localStorage` en todos los flujos de este slice, y deberá dejar en `sessionStorage` solo `asclepio.session` y, como única excepción, claves `asclepio.draft.vitals.<encounterId>` con el contenido de R4 (sin nombre, documento, fecha de nacimiento, edad, sexo, motivo de consulta ni texto libre). Esta excepción enmienda, solo en eso, `privacy.test.tsx` R10 (tras un login sin cierre forzado sigue habiendo solo `asclepio.session`), `privacy.test.tsx` R24 (tras la expiración, `sessionStorage` queda vacío salvo, si había signos vitales sin guardar, esas claves de borrador) y UI-02-web R27 (los signos vitales del borrador no son datos personales de la lista del glosario y no contienen identidad). (→ F-01.AC6; RNF-05)
- **R32** (Ubicuo) El sistema deberá consumir el contrato 0.4.0 sin cambiar `schema.d.ts` ni los tipos generados y sin peticiones nuevas. (→ F-01.AC6; RNF-14)

## Preguntas abiertas

No queda ninguna pregunta abierta. Resueltas por el usuario por chat el 2026-10-29:

- [x] PA-1 ¿Qué guarda el borrador en `sessionStorage`? → Solo los signos vitales (valores numéricos y estructurados de `VitalSignsForm`), sin texto libre, sin síntomas ni hallazgos y sin identidad del paciente. `SymptomFindingsForm` y `PatientForm` solo tienen el aviso de cambios sin guardar. Enmienda mínima a `privacy.test.tsx` R10/R24 y UI-02-web R27 descrita en R31. Cubierto por R4, R5, R6, R7 y R31.
- [x] PA-2 ¿Cuánto dura un borrador? → 30 minutos desde su creación. Cubierto por R6.
- [x] PA-3 ¿Reintento al reconectar? → Ninguna consulta se repite sola al reconectar; el usuario pulsa «Reintentar». UI-02-web R25 se respeta sin cambios. Cubierto por R15 y R16.
- [x] PA-4 ¿Trazas sin brief propio? → Se aceptan las trazas a F-01, F-02 y F-03, sin documento adicional.
