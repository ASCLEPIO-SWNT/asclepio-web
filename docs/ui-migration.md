# UI-01-web — Brief local y matriz de adaptación

## Procedencia y aprobación

El usuario aprobó expresamente el plan «Adaptar el frontend anterior a la nueva arquitectura de Asclepio» con el mensaje **«PLEASE IMPLEMENT THIS PLAN»**, el 2026-10-28 (America/Bogota). Este documento materializa sus decisiones de interfaz; no amplía los briefs clínicos de la API. La spec se escribe antes del código, con la aprobación de ese alcance ya registrada en `progress/history.md`. Durante la implementación el usuario precisó expresamente que el «front debe verse igual a el anterior», «igualito»: `develop` es la referencia de fidelidad visual, no una inspiración para un rediseño. Esta precisión está autorizada por ese mensaje y no requiere otra aprobación.

Referencias reproducibles:

| Fuente | Revisión | Uso |
|---|---|---|
| `Proyecto-ARSW/asclepio-frontend`, `develop` | `fdcfe340404c2f100dea1342b8475b2614428874` | Referencia visual de composición, geometría, espaciado, tokens, fuentes, iconos y preferencias |
| `Proyecto-ARSW/asclepio-frontend`, `origin/feat/tests` | Rama de consulta; registrar el commit consultado en el informe de implementación | Mejoras puntuales y pruebas reutilizables, sin fusionar el historial |
| `ASCLEPIO-SWNT/asclepio-web`, `main` | `6e42811739c64cd77dce40da58677017cf12e947` | Base funcional de autenticación y recepción |
| `ASCLEPIO-SWNT/asclepio-api`, `main` | `2f2672bbe7c2cf5c852e7295a90dd225389d27bc` | Documentación de producto y OpenAPI **0.4.0**, solo lectura |

## Criterios de aceptación autorizados

Estos criterios **UI-01.ACn** son el brief local aprobado para esta feature transversal. F-01.AC6 y F-02.AC7/AC9 respaldan la preservación funcional; no establecen los nuevos idiomas, preferencias ni la página pública. RNF-13 cubre escritorio/tablet. RNF-17 continúa siendo la salvaguarda de decisión humana para futuros bloques y no se usa como fuente ficticia de los modos accesibles.

- **UI-01.AC1** La página pública `/` presenta el nuevo flujo de triage, sus roles y el acceso del personal, reproduciendo la composición, geometría, espaciado, tokens de color, logo, fuentes Axiforma e iconos de la landing anterior de `develop`. Solo el contenido y las acciones se adaptan al producto nuevo; se excluyen cifras promocionales y funciones antiguas ajenas a su alcance.
- **UI-01.AC2** `/login` conserva la autenticación actual, `/app` dirige al inicio vigente del rol y el marco privado ofrece navegación permitida, usuario, rol y cierre de sesión. Login y barra lateral reproducen la composición, dimensiones, separación, tipografía, iconos y tratamientos de `develop`, con los campos y roles autorizados actuales. Recepción, registro directo, atenciones y detalle usan los mismos componentes y medidas visuales del anterior para sus operaciones actuales; no reciben una reinterpretación estética.
- **UI-01.AC3** Español, inglés, portugués, francés y alemán cubren el texto de interfaz de la entrega, validaciones, errores controlados y etiquetas accesibles; cambiar idioma no recarga, no añade prefijos a las rutas y no borra formularios. Los nombres y textos del paciente se conservan literalmente.
- **UI-01.AC4** Las preferencias ofrecen claro/oscuro/sistema, color normal/alto contraste/sepia/grises/alternativo, escala de texto y una fuente accesible realmente cargada. Persisten fuera de la sesión; los valores iniciales son español, claro, color normal, escala 1 y fuente Axiforma.
- **UI-01.AC5** La guía por voz requiere activación explícita, ofrece pausa/reanudación y repetición, y narra instrucciones estáticas de la ruta en el idioma seleccionado. No lee el DOM, datos personales ni texto clínico; su indisponibilidad no impide usar la aplicación.
- **UI-01.AC6** Se conservan las operaciones y validaciones de F-01-web y F-02-web: permisos, sesión, filtros, refresco, confirmación, rechazo, búsqueda/alta/NN, registro de llegada, paginación, cancelación y línea de tiempo, con estados de carga, vacío, error, conflicto y éxito.
- **UI-01.AC7** La entrega se puede usar a 375, 768, 1024 y 1440 px, con teclado, zoom al 200 %, temas claro/oscuro y movimiento reducido; los cinco idiomas no presentan claves ausentes ni contenido de controles cortado.
- **UI-01.AC8** Se mantienen el contrato 0.4.0, los tipos generados, cliente HTTP central, TanStack Query, React Hook Form/Zod, sesión en `sessionStorage` y horas legales del servidor mostradas en `America/Bogota`. La entrega supera lint, tipos, pruebas, build y verificaciones del repositorio, y registra evidencia visual y las limitaciones de integración.

## Matriz de adaptación

| Fuente anterior | Destino o uso actual | Dependencias y decisión |
|---|---|---|
| `public/favicon.png`, imágenes de login y médicos | `public/`, marca, página pública y login | Copiar solo recursos usados; sin URLs de las organizaciones anteriores |
| `app/fonts.css`, `public/fonts/Axiforma-*.woff2` | Fuentes locales y CSS compartido | Copiar únicamente pesos usados; declarar `@font-face` y comprobar carga |
| `app/app.css` | Tokens semánticos de color, espacio, superficies y estados | Reproducir valores y geometría visuales en CSS nativo; no trasladar Tailwind/shadcn |
| `app/features/home/home.page.tsx` | Presentación pública del flujo actual | Reproducir composición, medidas y recursos visuales; sustituir únicamente contenido y enlaces por los del producto actual |
| `app/components/medical/sidebar-nav.tsx` | Marco privado en `app/router` | Reproducir composición y medidas con elementos semánticos y los mismos Heroicons; fuente de permisos actual |
| `app/features/preferences/ui-preferences.ts` | Estado y persistencia en `shared` | Recuperar tema, modos y escalas; excluir bloques de dashboard anteriores |
| `app/features/preferences/voice-guide-button.tsx` | Control genérico de guía y mensajes por ruta | Adaptar `speechSynthesis`; texto estático y activación explícita; no reutilizar lectores del DOM |
| Mensajes Paraglide de cinco idiomas | Catálogos del producto nuevo y proveedor reactivo | Reutilizar términos pertinentes; completar textos nuevos, validación y ARIA |
| `origin/feat/tests` | Casos útiles para componentes y preferencias | Consultar sin merge/cherry-pick global; mantener Vitest/Testing Library actuales |
| Formularios y tarjetas anteriores | Patrones visuales sobre componentes actuales | Reproducir tratamientos y medidas visuales; mantener RHF/Zod, hooks de recepción y tipos del contrato actual |
| Better Auth, GraphQL, WebSocket, Prisma cliente | Sin traslado | Sustituidos por autenticación y REST vigentes; ninguna dependencia nueva para esas funciones |
| Citas, radiografías, Talk, mapas, modelos 3D y juegos | Fuera de esta entrega | No crear rutas, botones de acciones ni promesas funcionales para ellos |

## Límites y verificación

Solo se implementa `UI-01-web`; API, móvil y repositorios anteriores son referencia. F-03 de captura clínica, sugerencia, decisión, cola y reportes se trabajan después en sus propios slices; los marcadores actuales explican su estado pendiente y no simulan datos.

No hay cambios de endpoints, esquema de datos ni migraciones. La copia seleccionada de recursos no incorpora el historial Git anterior. La raíz pública reemplaza la redirección previa de F-01-web R20 únicamente para `/`; `/login` conserva su redirección con sesión y `/app` concentra la entrada privada. `localStorage` contendrá solo preferencias visuales/idioma: no cambia la prohibición de persistir autenticación o pacientes allí.

La implementación registra pruebas `R<n>:` y capturas comparativas de `develop` y la web actual bajo las mismas condiciones de ruta equivalente, ancho, tema, idioma y escala. Las comparaciones de landing, login y barra lateral comprueban composición, geometría, espaciado, colores, fuentes, iconos y recursos; las diferencias aceptadas corresponden al contenido, permisos y funciones del nuevo producto. No se acepta cambiar la estética por preferencia del implementer. El flujo integrado se prueba con datos sintéticos y cuentas/configuración local disponibles; si la API real no puede arrancar, se conserva la evidencia de pruebas contra respuestas sintéticas conformes al contrato y se declara pendiente esa validación real sin modificar API/base ni inventar credenciales.
