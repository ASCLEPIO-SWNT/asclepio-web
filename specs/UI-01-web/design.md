# UI-01-web — Diseño

## Resumen

Se reproduce la apariencia de `develop` anterior sobre F-01-web/F-02-web terminados: la precisión explícita del usuario («igualito») exige conservar la composición visual de landing, login y barra lateral, no diseñar una variante. La lógica de negocio sigue en sus features y la composición en `app`; `shared` contiene presentación, i18n y preferencias sin importar features ni app. Solo cambia `asclepio-web`. La aprobación del usuario del 2026-10-28 corresponde al alcance y decisiones recogidos en `docs/ui-migration.md`; no hay una nueva pregunta de producto.

## Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D1 | Reproducir composición, geometría, espaciado, tokens, logo, Axiforma e iconos de `develop` con CSS nativo, componentes semánticos y los mismos Heroicons; copiar los recursos utilizados. | Rediseñar la estética o importar toda la UI, Tailwind, shadcn y funciones anteriores. | Satisface la fidelidad visual pedida expresamente; cambia la implementación y contenido funcional sin cambiar la apariencia de referencia. |
| D2 | Paraglide con catálogos `es/en/pt/fr/de` y proveedor reactivo `useI18n` en `shared`; mensajes generados oficiales, configuración Vite y compilación integrada. | Traducir el DOM o duplicar árboles/rutas por idioma. | Los componentes consultan mensajes en render, conservan formularios y rutas sin prefijos. |
| D3 | Estado de locale/preferencias arriba de las rutas; no usar `key` dependiente de locale/tema ni recarga del navegador. | Remontar aplicación, providers de sesión o formularios al cambiar idioma. | Preserva campos, resultados y selecciones; permite actualizar mensajes ya visibles. |
| D4 | Preferencias locales tipadas y validadas, independientes de `sessionStorage`; valores base `es`, `light`, `none`, escala 1, fuente accesible desactivada. | Guardar perfil, token, pacientes o preferencias dentro de la sesión. | Evita mezclar datos personales con UI y conserva preferencias al cerrar sesión. |
| D5 | Modos `none/high-contrast/sepia/grayscale/colorblind-rg` y escalas heredadas 0.875/1/1.25/1.5/2; fuente accesible con archivo local y `@font-face`. | Ofrecer un interruptor que solo referencia una fuente ausente o filtros que deshabiliten controles. | Los controles deben producir cambios verificables; se mantiene disponible el panel para revertirlos. |
| D6 | Guía con `speechSynthesis`, mensajes estáticos propios por ruta, controles explícitos y cancelación al navegar/cambiar idioma. | Lectura de `textContent` del DOM o narración automática al cargar. | Excluye datos personales y exige una acción del usuario. |
| D7 | `/` es pública; `/app` usa `HomeRedirect` detrás del guard; `/login` mantiene su redirección cuando ya hay sesión. | Mantener la raíz exclusivamente como redirección privada. | Implementa la página pública autorizada; cambia solo ese caso de F-01-web R20. |
| D8 | Matriz de roles y hooks actuales como fuente de permisos/operaciones; etiquetas traducidas separadas de códigos del contrato. | Cambiar permisos, endpoints o sustituir RHF/Zod/TanStack Query. | Preserva los flujos ya terminados y su cobertura. |
| D9 | CSS grid/flex, barra lateral desde escritorio y menú plegable en ancho menor; estado con texto/icono, foco visible y movimiento reducido. | Una segunda navegación con permisos independientes o estados comunicados solo por color. | Mantiene una sola matriz y soporta modos accesibles y cinco idiomas. |

## Referencia visual y límites de adaptación

La referencia obligatoria es `legacy/asclepio-frontend` en el commit de `develop` registrado en `docs/ui-migration.md`. Landing, login y barra lateral mantienen distribución, proporciones, anchuras, separaciones, radios, bordes, sombras, colores, tipografía, iconografía y recursos visuales del anterior. La versión en CSS nativo conserva ese resultado visual. Recepción y atenciones usan esos mismos tratamientos para su contenido y operaciones actuales. Se ajustan textos, campos, enlaces, roles y funciones al nuevo alcance autorizado; no se añaden servicios antiguos para llenar el diseño. Las adaptaciones de idiomas, accesibilidad y responsive conservan esta referencia en las condiciones equivalentes.

La aceptación visual compara capturas de ambas aplicaciones en el mismo ancho, tema, idioma y escala, con ruta o componente equivalente, y registra cualquier diferencia funcional necesaria. Una sustitución estética por criterio del implementer no cumple R1.

## Módulos, interfaces y flujo

- **Fundación:** proveedor de idioma y mensajes en `shared/i18n`; preferencias y guía genéricas en `shared`; controles visuales en `shared/ui`. Su composición se añade una sola vez en `app/providers`, por encima del router. Las funciones genéricas son utilizables desde features sin dependencias inversas.
- **Traducciones:** catálogos con las mismas claves y mensajes parametrizados para conteos/espera. El cambio actualiza `document.documentElement.lang` y la suscripción React. Errores controlados y etiquetas de enums se traducen por código/clave; los valores API, nombres, documentos, motivo clínico y motivos libres permanecen literales. Las traducciones no cambian las reglas Zod, cuerpos ni códigos del backend.
- **Formularios:** conservar instancias y valores RHF; resolver mensajes de validación en el idioma activo sin resetear. Para un error ya visible, traducir su clave/código al renderizar o regenerar únicamente los mensajes, sin envíos ni validaciones de negocio adicionales. Errores API desconocidos usan el mensaje genérico localizado existente para ese contexto, sin traducir automáticamente texto libre.
- **Preferencias:** el proveedor expone valores y actualizadores. Valida idioma, tema, modo y escala al leer; captura fallos de lectura/escritura y mantiene estado en memoria. La sesión sigue bajo su clave y funciones actuales. `system` escucha `matchMedia` con limpieza del listener. Las clases/tokens se aplican al documento; el panel de preferencias sigue operable en modos con filtros.
- **Voz:** el control genérico recibe el texto estático localizado de la ruta; no obtiene pacientes ni refs al contenido clínico. `start/replay`, `pause/resume` y cancelación operan sobre la narración actual. El idioma del utterance corresponde al locale; se usa voz disponible compatible o la selección nativa del navegador. La capacidad se comprueba antes de habilitar acciones. Activar la guía no autoriza arrancar automáticamente en sesiones futuras: la reproducción necesita una acción actual del usuario.
- **Composición:** conservar la composición de landing, login y barra lateral del anterior y trasladarla a página pública en `app` o feature pública aislada; `app/router` arma el marco privado. Conservar enlaces y guards actuales y agregar la entrada `/app`. Marcadores de triage, cola y reportes se localizan y mantienen pendientes, sin simular operaciones nuevas.
- **Características:** auth, reception y consulta de triage sustituyen presentación/textos, no queries ni payloads. Utilidades de etiquetas, fechas y errores compartidas se localizan sin imports entre features. No introducir fetch/axios fuera de `shared/api`.

### Propiedad para implementación coordinada

| Responsable | Archivos/área propios | Dependencia |
|---|---|---|
| Fundación | Configuración de i18n/dependencias, catálogos `messages/common/{es,en,pt,fr,de}.json`, `shared/i18n`, preferencias/voz, `shared/ui`, `app`, CSS global, assets y sus pruebas. | Publica primero la API de mensajes/proveedores antes de la integración de features. |
| Adaptación de features | `features/auth`, `features/reception`, `features/triage` (consulta), catálogos `messages/features/{es,en,pt,fr,de}.json`, `shared/lib` de etiquetas/mensajes/fechas y sus pruebas. | Usa las interfaces publicadas; no edita catálogos comunes ni providers de fundación. Mantiene sus catálogos de feature en los cinco idiomas. |
| Líder/revisor | Estado/progreso, verificación integrada y review. | Integra ramas de trabajo en el mismo checkout, coordina cambios compartidos y conserva el alcance aprobado. |

Fundación publica primero `useI18n`, acceso a mensajes generados y comandos de compilación. La entrada de Paraglide combina los catálogos comunes y de feature mediante la configuración oficial de recursos si admite varios patrones; si no los admite, un paso de build determinista fusiona ambos grupos en recursos generados, detecta claves duplicadas/ausentes y ejecuta el compilador. Los recursos fusionados son generados, no se editan a mano. Esta diferencia interna de configuración no cambia la interfaz de consumo acordada. El orden de tareas establece esa dependencia de interfaz; no permite escrituras simultáneas sobre los mismos archivos.

## Impacto en contrato

**Sin impacto en contrato.** Consume **0.4.0 → 0.4.0**. No añade endpoints, requests, responses ni errores. Conserva login/perfil, sedes públicas, pacientes, pre-registros, confirmación/rechazo, atenciones/detalle/cancelación del snapshot. Los endpoints de captura clínica de 0.4.0 no se implementan en esta entrega. `npm run api:types` debe resultar sin cambios semánticos respecto al contrato declarado; no se escribe manualmente `schema.d.ts` ni en la API.

Las interfaces nuevas son solo de UI: locale, preferencias, mensajes y controles de guía. `/` queda pública y se añade `/app`; el resto de URLs/roles permanece compatible. La traducción de etiquetas no altera valores enviados al contrato.

## Impacto en datos

**Sin impacto en datos.** No hay migraciones, tablas, columnas, índices ni grants nuevos. La única persistencia añadida son preferencias/idioma del navegador, sin autenticación ni pacientes. Auth conserva únicamente token/expiración en `sessionStorage` y perfil en memoria. Las horas legales siguen viniendo del servidor; la presentación conserva la zona `America/Bogota` y fechas civiles sin desplazamientos de zona. No se cambian reglas de inmutabilidad, auditoría ni tenancy.

## Riesgos y pruebas

- Pruebas Vitest/Testing Library `R<n>:` junto al módulo: defaults/almacenamiento inválido o bloqueado; reactividad de idioma con formulario escrito; equivalencia de claves en cinco catálogos; preferencia de sistema y limpieza; guía soportada/no soportada con doble de `speechSynthesis`, cancelación y exclusión de texto clínico.
- Mantener y ejecutar la cobertura F-01/F-02: sesión vencida/401, 403, conflicto/404/422, red, identidad, rechazo, búsqueda/alta/NN, paginación y cancelación. Probar roles y `/app`, raíz pública y login con/sin sesión; comprobar payloads, refresco y zona horaria fijos.
- Revisión visual en navegador a 375/768/1024/1440 px, zoom 200 %, cinco idiomas, temas, modos de color, teclado y movimiento reducido. Verificar carga real de Axiforma/fuente accesible, títulos, botones largos, formularios y menús. Capturas comparativas con `develop` bajo condiciones equivalentes y resultados se registran en progreso; comprueban fidelidad de composición, geometría, espaciado, tokens, fuentes, iconos y recursos además de legibilidad, no se presuponen por pasar jsdom.
- Ejecutar init, lint, typecheck, Vitest, generación de tipos y build. Probar flujo completo con API local y datos sintéticos si la configuración del responsable de backend está disponible; de lo contrario registrar exactamente esa limitación y la prueba con API sintética conforme al contrato.
