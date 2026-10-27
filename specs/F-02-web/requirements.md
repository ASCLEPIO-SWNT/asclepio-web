# F-02-web — Confirmación de llegada y consulta de atención

Brief global: ../asclepio-api/docs/product/features/F-02.md (F-02.AC9 y AC7; comportamiento observable de AC1, AC2, AC3, AC4 y AC5)
Contrato: consume 0.4.0 (`GET /api/v1/public/tenants`, `GET|POST /api/v1/patients`, `GET /api/v1/pre-registrations`, `POST /api/v1/pre-registrations/{id}/confirm|reject`, `GET|POST /api/v1/encounters`, `GET /api/v1/encounters/{id}`, `POST /api/v1/encounters/{id}/cancel`; errores `application/problem+json`)
RNF aplicables: RNF-05, RNF-10, RNF-11, RNF-12, RNF-13, RNF-14
Decisiones humanas de partida: PA-F02-1 (datos mínimos y NN), PA-F02-2 (paso automático a `WAITING_TRIAGE`), PA-F02-3 (cancelan `RECEPTION` y `NURSE`, motivo 1–500 fuera de logs), PA-F02-6 (un pre-registro vigente y una atención activa por paciente), PA-F02-7 (rechazo solo `RECEPTION`, motivo 1–500), PA-F02-8 (sin sede por usuario; la web filtra por `siteId`), ADR 0008 (recepción confirma en la web; `arrival_at` = hora del servidor al confirmar). Matriz de roles por endpoint: `../asclepio-api/specs/F-02-api/design.md`.

Glosario de la spec:

- **Perfil**: la respuesta `StaffMeDto` de `GET /api/v1/me` de la sesión activa (F-01-web).
- **Sedes del tenant**: el arreglo `sites` del elemento de `GET /api/v1/public/tenants` cuyo `id` es igual al `tenantId` del perfil.
- **Roles de consulta**: `RECEPTION`, `NURSE`, `PHYSICIAN` y `ADMIN`. **Roles de cancelación**: `RECEPTION` y `NURSE`.
- **Estado terminal**: `CLOSED` o `CANCELLED`.
- **Motivo válido** (rechazo o cancelación): texto que, sin espacios iniciales ni finales, tiene de 1 a 500 caracteres; se envía sin esos espacios.
- **Hora mostrada**: el resultado de `formatBogota` (`src/shared/lib/datetime.ts`) sobre una hora ISO-8601 del servidor. **Fecha civil mostrada**: una fecha `YYYY-MM-DD` del contrato mostrada como `DD/MM/AAAA` sin convertirla de zona horaria.
- **Error de carga**: un contenedor con `role="alert"` con el mensaje de la vista y un botón "Reintentar" que repite la petición.
- **Error de acción**: un contenedor con `role="alert"` junto al control que lanzó la acción, con el mensaje en contexto del requisito para ese estado o, si no lo define: 403 → "No tienes permiso para realizar esta acción."; sin respuesta HTTP → "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."; cualquier otro → "No se pudo completar la acción. Inténtalo de nuevo.". El 401 lo trata F-01-web (R15).
- **Datos personales**: nombre, tipo y número de documento, fecha de nacimiento, edad estimada, sexo, texto del motivo de consulta y textos de motivo de rechazo o cancelación.
- **Etiquetas** (las pruebas buscan estos textos literales):
  - Tipo de documento: CC "Cédula de ciudadanía", TI "Tarjeta de identidad", CE "Cédula de extranjería", PA "Pasaporte", RC "Registro civil".
  - Sexo: M "Masculino", F "Femenino", X "Indeterminado / otro" (igual que F-01-mobile).
  - Estado de la atención: REGISTERED "Registrada", WAITING_TRIAGE "En espera de triage", TRIAGED "Clasificada", IN_CARE "En atención", CLOSED "Cerrada", CANCELLED "Cancelada".
  - Origen: PRE_REGISTRATION "Pre-registro (app)", DIRECT "Registro directo". Fuente del motivo: TYPED "Escrito", VOICE_ON_DEVICE "Dictado en el dispositivo".
  - Evento: ENCOUNTER_CREATED "Atención creada", STATUS_CHANGED "Cambio de estado", VITAL_SIGNS_RECORDED "Signos vitales registrados", SYMPTOM_FINDINGS_RECORDED "Hallazgos registrados"; tipo desconocido "Evento ({type})". Actor: STAFF su `fullName`, PATIENT "Paciente", SYSTEM "Sistema".
- **Mensajes** (textos exactos):
  - Sedes: "No se pudieron cargar las sedes.". Bandeja: vacía "No hay pre-registros pendientes."; error "No se pudo cargar la bandeja.".
  - Confirmación: casilla "Verifiqué la identidad del paciente presente con su documento."; éxito "Llegada confirmada. Hora de llegada: {hora}."; 409 "Este pre-registro ya no está pendiente o el paciente ya tiene una atención activa."; 404 "Este pre-registro ya no existe.".
  - Rechazo: éxito "Pre-registro rechazado."; 409 "Este pre-registro ya no está pendiente."; 404 "Este pre-registro ya no existe.".
  - Motivo: "Escribe el motivo." / "El motivo admite como máximo 500 caracteres.".
  - Búsqueda y alta: "Elige el tipo de documento." / "Escribe el número de documento." / "El número de documento admite como máximo 64 caracteres." / "Escribe el nombre." / "El nombre admite como máximo 200 caracteres." / "Escribe la fecha de nacimiento." / "Indica la fecha de nacimiento o la edad estimada." / "La edad estimada debe ser un número entero entre 0 y 120." / "Elige el sexo."; sin resultados "No hay ningún paciente con ese documento."; 409 "Ya existe un paciente con ese documento."; 422 "La fecha de nacimiento no puede ser posterior a hoy.".
  - Registro de llegada: "Elige la sede." / "Escribe el motivo de consulta." / "El motivo de consulta admite como máximo 2000 caracteres."; éxito "Llegada registrada."; 409 "El paciente ya tiene un pre-registro pendiente o una atención activa. Revisa la bandeja."; 422 "La sede o el paciente ya no son válidos.".
  - Atenciones: vacía "No hay atenciones con estos filtros."; error de lista "No se pudieron cargar las atenciones."; error de detalle "No se pudo cargar la atención."; 404 "No se encontró la atención.".
  - Cancelación: éxito "Atención cancelada."; 409 "La atención ya está cerrada o cancelada.".
  - Sin permiso (403 en una vista): "No tienes permiso para ver esta página." (el de F-01-web).

## Requisitos

### Rutas y acceso

- **R1** (Ubicuo) El sistema deberá permitir `/recepcion` y `/recepcion/registro` solo al rol `RECEPTION`, y `/atenciones` y `/atenciones/:id` a los roles de consulta, y mostrar el enlace "Atenciones" en la navegación de los cuatro roles. (→ F-02.AC9, F-02.AC7)
- **R2** (No deseado) Si un usuario cuyo rol no está permitido en R1 navega a una de esas rutas, entonces el sistema deberá mostrar la vista "Sin permiso" de F-01-web sin pedir ningún endpoint de F-02. (→ F-02.AC9)
- **R3** (No deseado) Si una petición `GET` de una vista de F-02 responde 403, entonces el sistema deberá mostrar en un contenedor con `role="alert"` el mensaje de sin permiso, sin mostrar datos de esa petición. (→ F-02.AC9)

### Sedes

- **R4** (Por evento) Cuando se abra `/recepcion`, `/recepcion/registro` o `/atenciones`, el sistema deberá obtener las sedes del tenant con `GET /api/v1/public/tenants`, pedido como mucho una vez por sesión, y ofrecerlas por su `name` en los selectores de sede. (→ F-02.AC9)
- **R5** (No deseado) Si `GET /api/v1/public/tenants` falla o no contiene el `tenantId` del perfil, entonces el sistema deberá mostrar un error de carga con el mensaje de sedes, dejar deshabilitados los selectores de sede y seguir mostrando la bandeja y la lista de atenciones sin filtro de sede. (→ F-02.AC9)

### Bandeja de pre-registros

- **R6** (Por evento) Cuando se abra `/recepcion` o se cambie el selector de sede (opciones "Todas las sedes", seleccionada al abrir, y una por sede del tenant), el sistema deberá pedir `GET /api/v1/pre-registrations`, sin `siteId` para "Todas las sedes" y con el `id` de la sede elegida en otro caso. (→ F-02.AC9)
- **R7** (Ubicuo) El sistema deberá mostrar cada pre-registro de la bandeja, en el orden recibido, con el nombre, el tipo (etiqueta) y número de documento, la fecha civil de nacimiento y el sexo (etiqueta) del paciente, la sede, el motivo de consulta, la hora mostrada de `preRegisteredAt` (rotulada "Pre-registro") y de `expiresAt` (rotulada "Expira"), y "Identidad verificada" o "Identidad sin verificar" según `identityVerified`. (→ F-02.AC9, F-02.AC3)
- **R8** (Por estado) Mientras `GET /api/v1/pre-registrations` esté en curso por primera vez, el sistema deberá mostrar un indicador con `role="status"`; y si responde 200 con una lista vacía, el mensaje de bandeja vacía; y si falla, un error de carga con el mensaje de la bandeja. (→ F-02.AC9)
- **R9** (Por estado) Mientras `/recepcion` esté abierta y la pestaña del navegador esté visible, el sistema deberá repetir `GET /api/v1/pre-registrations` con el mismo filtro cada 30 s, y además al pulsar el botón "Actualizar". (→ F-02.AC9)

### Confirmación de llegada

- **R10** (Ubicuo) El sistema deberá mostrar en cada pre-registro de la bandeja la casilla de verificación de identidad, desmarcada al mostrarse, y el botón "Confirmar llegada", deshabilitado mientras esa casilla no esté marcada. (→ F-02.AC9)
- **R11** (Por evento) Cuando se pulse "Confirmar llegada" con la casilla marcada, el sistema deberá enviar `POST /api/v1/pre-registrations/{id}/confirm` con el cuerpo exacto `{ "identityVerified": true }`. (→ F-02.AC9, F-02.AC3)
- **R12** (Por evento) Cuando la confirmación responda 201, el sistema deberá mostrar en un contenedor con `role="status"` el mensaje de éxito de la confirmación con la hora mostrada de `arrivalAt` de la respuesta, un enlace "Ver atención" a `/atenciones/{id}` de la atención creada, y volver a pedir la bandeja. (→ F-02.AC9, F-02.AC3)
- **R13** (No deseado) Si la confirmación responde 409 o 404, entonces el sistema deberá mostrar un error de acción con el mensaje de confirmación de ese estado y volver a pedir la bandeja; y ante otro error, un error de acción. (→ F-02.AC9, F-02.AC5)

### Rechazo de un pre-registro

- **R14** (Por evento) Cuando se pulse "Rechazar" en un pre-registro, el sistema deberá mostrar en ese pre-registro un campo de texto con la etiqueta "Motivo del rechazo" y los botones "Confirmar rechazo" y "Volver" (que oculta el campo sin llamar a la API). (→ F-02.AC9)
- **R15** (No deseado) Si se pulsa "Confirmar rechazo" sin un motivo válido, entonces el sistema deberá no llamar a la API y mostrar junto al campo el mensaje de motivo que corresponda, con `aria-invalid="true"` y `aria-describedby` apuntando a ese mensaje. (→ F-02.AC9)
- **R16** (Por evento) Cuando se pulse "Confirmar rechazo" con un motivo válido, el sistema deberá enviar `POST /api/v1/pre-registrations/{id}/reject` con el cuerpo exacto `{ "reason": <motivo sin espacios iniciales ni finales> }`; si responde 200, mostrar en un contenedor con `role="status"` el mensaje de éxito del rechazo y volver a pedir la bandeja; si responde 409 o 404, mostrar un error de acción con el mensaje de rechazo de ese estado y volver a pedir la bandeja; y ante otro error, un error de acción. (→ F-02.AC9)

### Registro directo

- **R17** (Ubicuo) El sistema deberá mostrar en `/recepcion` un enlace "Registro directo" a `/recepcion/registro`, y en esta ruta un formulario de búsqueda con un selector "Tipo de documento" (las cinco etiquetas), un campo "Número de documento" y el botón "Buscar", y un botón "Registrar paciente NN". (→ F-02.AC9, F-02.AC1)
- **R18** (No deseado) Si se pulsa "Buscar" sin tipo de documento, o con un número que sin espacios iniciales ni finales está vacío o supera 64 caracteres, entonces el sistema deberá no llamar a la API y mostrar junto a cada campo inválido su mensaje, con `aria-invalid="true"` y `aria-describedby`. (→ F-02.AC1)
- **R19** (Por evento) Cuando se pulse "Buscar" con datos válidos, el sistema deberá pedir `GET /api/v1/patients` con `documentType` y `documentNumber` (sin espacios iniciales ni finales) en la query; si responde un paciente, mostrar sus datos y seleccionarlo; y si responde una lista vacía, mostrar el mensaje sin resultados y un botón "Crear paciente" que abre el formulario de alta con ese tipo y número de documento ya rellenos y no editables; y si falla, mostrar un error de acción. (→ F-02.AC1, F-02.AC9)
- **R20** (Ubicuo) El sistema deberá ofrecer el formulario de alta en dos modos: con documento (desde "Crear paciente"), con "Nombre completo" y "Fecha de nacimiento" obligatorios y "Sexo"; y NN (desde "Registrar paciente NN"), sin campos de documento, con "Nombre completo" opcional, una elección entre "Fecha de nacimiento" y "Edad estimada (años)" y "Sexo", en ambos casos con las tres etiquetas de sexo. (→ F-02.AC2, F-02.AC9)
- **R21** (No deseado) Si se envía el formulario de alta con el nombre vacío (modo con documento) o de más de 200 caracteres, sin fecha de nacimiento (modo con documento, o NN con "Fecha de nacimiento" elegida), sin ninguna de fecha o edad (NN), con una edad estimada que no es un entero entre 0 y 120 o sin sexo, entonces el sistema deberá no llamar a la API, mostrar junto a cada campo inválido su mensaje con `aria-invalid="true"` y `aria-describedby`, y mover el foco al primer campo inválido. (→ F-02.AC2)
- **R22** (Por evento) Cuando se envíe el formulario de alta válido, el sistema deberá enviar `POST /api/v1/patients` con solo `{ documentType, documentNumber, fullName, birthDate, sex }` en el modo con documento, o con solo `sex`, exactamente uno de `birthDate` o `estimatedAgeYears` y `fullName` si no está vacío en el modo NN; y si responde 201, seleccionar el paciente de la respuesta. (→ F-02.AC2)
- **R23** (No deseado) Si `POST /api/v1/patients` responde 409, entonces el sistema deberá mostrar un error de acción con el mensaje de alta 409; si responde 422, mostrar junto a "Fecha de nacimiento" el mensaje de alta 422; si responde 400 con `errors[]`, mostrar cada `message` junto al campo del formulario cuyo nombre coincide con `field`; y ante otro error, un error de acción; en todos los casos conservando lo escrito. (→ F-02.AC2)
- **R24** (Por estado) Mientras haya un paciente seleccionado en `/recepcion/registro`, el sistema deberá mostrar su resumen (nombre o "Paciente NN", documento si lo tiene, fecha civil de nacimiento o edad estimada, sexo) y un formulario con un selector "Sede" (preseleccionado si el tenant tiene una sola sede), un campo "Motivo de consulta" y el botón "Registrar llegada". (→ F-02.AC9, F-02.AC4)
- **R25** (No deseado) Si se pulsa "Registrar llegada" sin sede, o con un motivo de consulta que sin espacios iniciales ni finales está vacío o supera 2000 caracteres, entonces el sistema deberá no llamar a la API y mostrar junto a cada campo inválido su mensaje, con `aria-invalid="true"` y `aria-describedby`. (→ F-02.AC4)
- **R26** (Por evento) Cuando se pulse "Registrar llegada" con datos válidos, el sistema deberá enviar `POST /api/v1/encounters` con el cuerpo exacto `{ patientId, siteId, chiefComplaintText: <motivo sin espacios iniciales ni finales>, complaintSource: "TYPED" }`, y si responde 201, navegar a `/atenciones/{id}` de la atención creada mostrando allí, en un contenedor con `role="status"`, el mensaje de éxito del registro de llegada. (→ F-02.AC9, F-02.AC3, F-02.AC4)
- **R27** (No deseado) Si `POST /api/v1/encounters` responde 409 o 422, entonces el sistema deberá mostrar un error de acción con el mensaje de registro de llegada de ese estado, con un enlace a `/recepcion` en el caso 409; y ante otro error, un error de acción; en todos los casos conservando el paciente seleccionado y lo escrito. (→ F-02.AC9)

### Consulta de atenciones

- **R28** (Por evento) Cuando se abra `/atenciones` o se cambie uno de sus filtros ("Estado": "Todos los estados" y las seis etiquetas; "Sede": "Todas las sedes" y las sedes del tenant), el sistema deberá pedir `GET /api/v1/encounters` con `limit=50`, `offset=0` y solo los filtros elegidos (`status`, `siteId`). (→ F-02.AC9)
- **R29** (Ubicuo) El sistema deberá mostrar cada atención de la lista, en el orden recibido, con la hora mostrada de `arrivalAt` (rotulada "Llegada"), el nombre del paciente (o "Paciente NN" si `isNN` es true y no tiene nombre), su documento si lo tiene, la sede, la etiqueta del estado, la etiqueta del origen y un enlace a `/atenciones/{id}`. (→ F-02.AC9, F-02.AC3)
- **R30** (Por estado) Mientras `GET /api/v1/encounters` esté en curso, el sistema deberá mostrar un indicador con `role="status"`; si responde 200 sin elementos, el mensaje de lista vacía; si falla, un error de carga con el mensaje de lista; y deberá ofrecer "Anterior" (deshabilitado con `offset=0`) y "Siguiente" (deshabilitado si llegaron menos de 50 elementos), que repiten la petición con `offset` 50 menos o 50 más. (→ F-02.AC9)
- **R31** (Por evento) Cuando se abra `/atenciones/:id`, el sistema deberá pedir `GET /api/v1/encounters/{id}` y mostrar la etiqueta del estado, el origen, la sede, la hora mostrada de `arrivalAt` rotulada "Llegada (hora legal)", la hora mostrada de `preRegisteredAt` rotulada "Pre-registro (referencia)" solo si no es null, `registeredBy.fullName`, el motivo de consulta con la etiqueta de su fuente, los datos del paciente y, si el estado es `CANCELLED`, `cancellationReason` rotulado "Motivo de la cancelación". (→ F-02.AC7, F-02.AC3)
- **R32** (Ubicuo) El sistema deberá mostrar la línea de tiempo de la atención como una lista ordenada (`<ol>`) con un elemento por evento en el mismo orden en que los entrega la API, cada uno con la hora mostrada de `occurredAt`, la etiqueta del evento, para `STATUS_CHANGED` las etiquetas de `fromStatus` y `toStatus`, y la etiqueta del actor, sin mostrar `payload`. (→ F-02.AC7)
- **R33** (No deseado) Si `GET /api/v1/encounters/{id}` responde 404, entonces el sistema deberá mostrar el mensaje 404 de atenciones y un enlace a `/atenciones`; si está en curso, un indicador con `role="status"`; y si falla de otro modo, un error de carga con el mensaje de detalle. (→ F-02.AC7)

### Cancelación de una atención

- **R34** (Por estado) Mientras el detalle de una atención esté abierto, el rol del perfil sea un rol de cancelación y el estado de la atención no sea terminal, el sistema deberá mostrar el botón "Cancelar atención", que muestra un campo "Motivo de la cancelación" con los botones "Confirmar cancelación" y "Volver"; y en cualquier otro caso no deberá mostrar el botón. (→ F-02.AC5)
- **R35** (No deseado) Si se pulsa "Confirmar cancelación" sin un motivo válido, entonces el sistema deberá no llamar a la API y mostrar junto al campo el mensaje de motivo que corresponda, con `aria-invalid="true"` y `aria-describedby`. (→ F-02.AC5)
- **R36** (Por evento) Cuando se pulse "Confirmar cancelación" con un motivo válido, el sistema deberá enviar `POST /api/v1/encounters/{id}/cancel` con el cuerpo exacto `{ "reason": <motivo sin espacios iniciales ni finales> }`; si responde 200, mostrar el detalle con la atención de la respuesta y, en un contenedor con `role="status"`, el mensaje de éxito de la cancelación; si responde 409, mostrar un error de acción con el mensaje de cancelación 409 y volver a pedir el detalle; si responde 404, aplicar R33; y ante otro error, un error de acción. (→ F-02.AC5, F-02.AC7)

### Transversales

- **R37** (Por estado) Mientras una petición de confirmar, rechazar, buscar paciente, crear paciente, registrar llegada o cancelar esté en curso, el sistema deberá mantener deshabilitado su botón de envío (y, en la bandeja, también "Confirmar llegada" y "Rechazar" de ese pre-registro), mostrar un indicador con `role="status"` e ignorar nuevos envíos. (→ F-02.AC9)
- **R38** (Ubicuo) El sistema deberá enviar en las peticiones de F-02 solo los cuerpos y parámetros de R6, R11, R16, R19, R22, R26, R28 y R36, sin ninguna hora (`arrivalAt`, `preRegisteredAt`, `expiresAt`, `resolvedAt`, `occurredAt`, `createdAt`, `updatedAt`) ni `tenantId`. (→ F-02.AC3)
- **R39** (Ubicuo) El sistema deberá mostrar toda hora de F-02 como hora mostrada (America/Bogota) y toda fecha de nacimiento como fecha civil mostrada. (→ F-02.AC3, F-02.AC7)
- **R40** (Ubicuo) El sistema deberá excluir los datos personales (incluidos los motivos de rechazo y de cancelación) de toda salida de `console` y de la URL (ruta, query string y hash), en la que solo puede aparecer el `id` de una atención. (→ F-02.AC9)

> Trazabilidad por criterio: AC1 → R17–R19 · AC2 → R20–R23 · AC3 → R7, R11, R12, R26, R29, R31, R38, R39 · AC4 → R24–R26 · AC5 → R13, R34–R36 · AC7 → R1, R31–R33, R36, R39 · AC9 → R1–R30, R37, R40.

## Preguntas abiertas

Ninguna. Las decisiones de producto que esta spec necesita están resueltas en PA-F02-1…9 y en ADR 0008; los valores no clínicos que fija la spec (textos, intervalo de 30 s de R9, página de 50) se justifican en `design.md` y se aprueban con ella.
