# UI-04-web — Pulido para la demo

Brief global: no hay brief propio de UI-04. El alcance son los hallazgos H1–H16 del recorrido manual del 2026-11-06 (`progress/current/UI-04-web.md`), para la demo del 2026-11-07. Cada requisito se traza a su hallazgo `H<n>` y al criterio global que protege: `../asclepio-api/docs/product/features/F-01.md` (F-01.AC6), `F-02.md` (F-02.AC1, AC2, AC5, AC7, AC9), `F-03.md` (F-03.AC5) y `docs/ui-dashboards.md` (UI-02.AC5, AC9, AC11, AC12).
Contrato: consume **0.4.0** (sin cambios, sin endpoints ni peticiones nuevas).
RNF aplicables: RNF-05, RNF-13, RNF-14.

Glosario de la spec:

- **Cierre voluntario**: el usuario pulsa «Cerrar sesión» (`logout()`, `session.clear('logout')`).
- **Cierre forzado**: `session.clear('expired')` por un 401 de la sesión vigente o por expiración (glosario de UI-03-web).
- **Ruta de origen**: `state.from` que `RequireSession` pasa a `/login` (UI-03-web R19, F-01-web R18).
- **Insignia de estado**: `StatusBadge` (`src/shared/ui/StatusBadge.tsx`) con el icono y el tono de `ENCOUNTER_STATUS_VIEW` (`src/shared/lib/encounterStatus.ts`) y el texto de `ENCOUNTER_STATUS_LABELS`, como en `/cola` (UI-02-web R16, R30).
- **Paginador de UI-02**: pie de `Panel` con «Página N» a la izquierda y «Anterior»/«Siguiente» como `button button--secondary button--sm` con chevrones, como en `/triage` (`TriageTrayPage.tsx`).
- Las pruebas de este slice viven bajo `describe('UI-04-web …')` y su nombre empieza por `R<n>:`.

## Requisitos

### Prioridad 1

- **R1** (Por evento) Cuando el usuario cierre sesión de forma voluntaria, el sistema deberá llevarlo a `/login` sin ruta de origen, de modo que el siguiente inicio de sesión, del mismo rol o de otro, abra el inicio de su rol (`HOME_BY_ROLE`), también si antes de iniciar sesión se pulsa «Atrás» hacia una ruta privada. (→ H1; F-01.AC6)
- **R2** (No deseado) Si la sesión termina por un cierre forzado o se abre una ruta privada sin sesión, entonces el sistema deberá conservar la vuelta a la ruta de origen con su `search` de UI-03-web R19 y F-01-web R18, sin cambios. (→ H1; F-01.AC6)
- **R3** (Ubicuo) El sistema deberá mostrar `/atenciones` a 375, 390, 768, 1024 y 1440 px de ancho sin desbordamiento horizontal (`scrollWidth` igual a `clientWidth` en el documento), con la tabla apilada como tarjetas cuando su panel mide menos de 40 rem, igual que las tablas de UI-02-web R34. (→ H2; F-02.AC9, UI-02.AC9; RNF-13)
- **R4** (Ubicuo) El sistema deberá presentar «Cancelar atención» y «Volver» del detalle de la atención como botones secundarios (`button button--secondary`) y separar el bloque de cancelación del título «Línea de tiempo» con un margen inferior de 1,5 rem, sin cambiar el comportamiento de F-02-web R34–R36. (→ H3; F-02.AC5)
- **R5** (Ubicuo) El sistema deberá mostrar cada evento de la línea de tiempo con la hora (la de F-02-web R32, sin cambio de formato), la etiqueta del evento con sus estados de `STATUS_CHANGED` y el actor en tres elementos separados, uno por línea, sin «·» ni ningún otro carácter como separador. (→ H4; F-02.AC7, UI-02.AC12)
- **R6** (Ubicuo) El sistema deberá mostrar el estado de la atención como insignia de estado en la lista `/atenciones`, en el detalle `/atenciones/:id` y en el contexto de la captura clínica `/triage/:id`. (→ H5; F-02.AC9, F-02.AC7)
- **R7** (Ubicuo) El sistema deberá mostrar `/atenciones` con un encabezado (`PageHeader`) con el `h1` «Atenciones» y una descripción de una línea, los filtros «Estado» y «Sede» debajo, y un panel de trabajo (`Panel`, con `h2`) cuya tabla (`DataTable`) tenga las columnas Paciente (el nombre y, debajo, el documento si existe), Sede, Llegada (la hora sin segundos y, debajo, la fecha, en `America/Bogota`), Estado (R6), Origen y «Ver atención» como botón secundario pequeño, y con el paginador de UI-02 en el pie, conservando las peticiones, el orden y las reglas de habilitación de F-02-web R28–R30. (→ H6; F-02.AC9, UI-02.AC12)
- **R8** (Ubicuo) El sistema deberá mostrar `/recepcion/registro` con un encabezado (`PageHeader`) con el `h1` «Registro directo», una descripción de una línea y el enlace «Volver a Recepción» a `/recepcion` como botón secundario, y deberá presentar «Registrar paciente NN» como botón secundario situado inmediatamente después del formulario de búsqueda y antes de su resultado, de modo que nunca quede entre el aviso de «sin resultados» y el formulario de alta, conservando el comportamiento de F-02-web R17–R27. (→ H7; F-02.AC9, F-02.AC1)
- **R9** (Ubicuo) El sistema deberá distribuir los campos del formulario de alta de paciente en dos columnas desde 640 px de ancho de ventana y en una por debajo (la misma regla de `.clinical-fields`), y deberá presentar «Tipo de documento» y «Número de documento» de solo lectura como texto, sin borde ni fondo de campo editable, conservando su etiqueta, su `readonly` y sus mensajes de error. (→ H7; F-02.AC2)
- **R10** (Ubicuo) El sistema deberá mostrar en la franja «pendiente» de `/cola` y `/reportes` el texto neutral «Esta funcionalidad aún no está disponible.» en los cinco idiomas, sin ningún código interno de feature, y ningún texto visible de la aplicación deberá contener un código con la forma `F-0<n>`. Enmienda UI-02-web R18 y UI-02.AC5 solo en la frase de la feature. (→ H8; UI-02.AC5)

### Prioridad 2

- **R11** (Ubicuo) El sistema deberá mostrar, en el selector «Nivel de conciencia (ACVPU)» de la captura y en «Tomas registradas», junto a cada letra el significado de ese nivel con el texto que fije PA-1, en los cinco idiomas, sin cambiar el valor enviado a la API (`A`, `C`, `V`, `P`, `U`). **Bloqueado por PA-1.** (→ H9; F-03.AC5)
- **R12** (Ubicuo) El sistema deberá presentar el aviso «PROVISIONAL — no validado clínicamente, revisar con asesor clínico.» de la captura de signos vitales con el estilo de aviso de advertencia existente (`status status--warn`), sin `role="alert"` y sin cambiar su texto en ningún idioma. (→ H10; F-03.AC5)
- **R13** (Ubicuo) El sistema deberá presentar «Quitar elemento N» de cada elemento de hallazgos como botón secundario de ancho ajustado a su texto y alineado al inicio del elemento, sin ocupar todo el ancho. (→ H11; F-03.AC5)
- **R14** (Ubicuo) El sistema deberá ordenar la navegación lateral con el inicio del rol (`HOME_BY_ROLE`) en primer lugar y el resto en el orden de la matriz de roles, de modo que ADMIN vea «Reportes», «Cola priorizada», «Atenciones» y los demás roles conserven su orden actual. (→ H12; F-01.AC6)
- **R15** (Por estado) Mientras el tema sea oscuro, el sistema deberá mostrar el logotipo de la marca de la barra lateral sobre una placa de fondo claro definida con un token, con un contraste no textual de al menos 3:1 entre el trazo del logotipo y la placa (WCAG 1.4.11), sin cambiar el tema claro. (→ H13; UI-02.AC11)
- **R16** (Por evento) Cuando «Guardar toma» o «Guardar hallazgos» respondan con éxito, el sistema deberá mover el foco al aviso de éxito de ese formulario. (→ H14; F-03.AC5)

### Prioridad 3

- **R17** (Ubicuo) El sistema deberá mostrar en el avatar de la barra lateral la primera letra de la primera palabra del nombre que no termine en «.», o la primera letra del nombre si no hay ninguna, de modo que «Dra. Camila Torres» muestre «C». (→ H15; F-01.AC6)
- H16 (reintentos de consultas en producción) queda **fuera** de este slice: cambiar la política global de reintentos de TanStack Query altera el comportamiento de todas las consultas de UI-02 y UI-03 y exige decidir esa política; no es trivial el día antes de la demo. Queda anotado para un slice posterior.

### Transversales

- **R18** (Ubicuo) El sistema deberá ofrecer todos los textos nuevos o cambiados de este slice en español, inglés, portugués, francés y alemán con las mismas claves y parámetros en los cinco catálogos (`npm run i18n:check`), sin literales de UI nuevos (prueba `noUiLiterals` de UI-03-web R21). (→ F-01.AC6)
- **R19** (Ubicuo) El sistema deberá consumir el contrato 0.4.0 sin cambiar `schema.d.ts` ni hacer peticiones nuevas, sin dependencias nuevas, reutilizando los componentes de `shared/ui` y las clases y tokens existentes, y sin colores literales en el CSS que añada. (→ F-01.AC6; RNF-14)

## Preguntas abiertas

- [ ] PA-1 ¿Qué texto muestra cada nivel ACVPU (A, C, V, P, U) en los cinco idiomas? `../asclepio-api/docs/` no lo define: PA-F03-1 del brief F-03 solo dice «nivel de conciencia ACVPU (`consciousness`: A, C, V, P, U)», PROVISIONAL, basado en NEWS2 (Royal College of Physicians, 2017); el glosario, el RNF, `data-model.md` y el contrato tampoco dan el significado. Opciones: (a) el usuario fija el texto de cada nivel y su fuente, y se anota en el brief F-03 en una sesión de `asclepio-api`; (b) H9 sale de UI-04 y R11 se tacha. — bloquea R11
