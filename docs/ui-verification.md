# UI-01-web — Evidencia de la primera entrega

Fecha: 2026-10-28. Rama: `codex/frontend-migration`. Referencias reproducibles y matriz de reutilización: `docs/ui-migration.md`.

## Alcance realizado

- Página pública del nuevo flujo de triage, login con la composición y el fondo SVG de develop, entrada `/app` y marco con navegación según rol.
- Bandeja de recepción, registro directo, búsqueda/alta de pacientes, NN, listado y detalle de atenciones, cancelación y línea de tiempo conservan los flujos existentes.
- Cinco idiomas, cambio reactivo sin modificar la ruta ni reiniciar formularios, 256 mensajes por idioma. Preferencias separadas de la sesión, temas/modos, escala y fuentes locales; guía de instrucciones estáticas con controles explícitos.
- Se copian recursos seleccionados, sin fusionar commits, añadir remotes antiguos ni trasladar Better Auth, GraphQL o módulos ajenos al producto actual.

## Verificación automatizada

El estado inicial pasó `./init.sh` y build antes de modificar código. La implementación completa y la revisión independiente pasan lint, typecheck, Vitest y `./init.sh` (FAIL 0, WARN 0). `npm run i18n:check` comprueba claves/variables equivalentes; `npm run api:types` no produce diferencias contra el contrato **0.4.0**. Build pasa; conserva el aviso de chunk JS superior a 500 kB (aprox. 622 kB minificado / 185 kB gzip).

La trazabilidad cubre R1–R16 en pruebas de fundación, preferencias, voz y features. Las pruebas previas de auth y F-02 se conservan; las expectativas ajustadas corresponden a la raíz pública `/`, la nueva entrada privada `/app`, la única clave permitida de preferencias y los errores desconocidos del backend presentados mediante fallback localizado.

## Navegador y datos de prueba

Se utiliza el navegador integrado y un preview compilado en `http://127.0.0.1:5173/`, con una API **sintética** local en el puerto 3001. Los fixtures proceden de `src/test/fakeApi.ts` y del contrato vigente; no se accede a la base de datos real. El script y los logs de verificación están fuera del repo, en `../../local-analysis/`.

Flujos comprobados:

- Confirmación deshabilitada hasta verificar identidad; cambio es→de→es conserva la verificación y los datos literales.
- Confirmación de llegada, enlace a detalle, hora legal recibida del servidor en Bogotá, línea de tiempo, cancelación motivada y estado cancelado.
- Rechazo sin motivo produce validación; rechazo con motivo resuelve la bandeja.
- Búsqueda de paciente documentado; registro NN con edad estimada y sexo conservados al cambiar es→pt, creación de paciente y llegada tras pt→en. El motivo clínico escrito permanece literal en el detalle.
- Los cinco idiomas conservan correo/contraseña y la ruta de login; el ingreso posterior funciona. Recuperación después de un error de conexión.
- Enfermería entra en `/triage`, con el marcador de funcionalidad pendiente; la ruta de recepción deniega ese rol. La matriz completa de roles está cubierta además por pruebas de rutas.
- Preferencias persisten tras recargar; restablecer retorna a es/claro/100%/Axiforma. Enter abre el panel; Escape lo cierra y devuelve el foco al control.

## Comparación visual

`develop` se renderizó localmente para comparar landing y login. El proxy de referencia sólo suprimió una cortina de carga del proyecto antiguo; no cambió el código legacy. Se recuperaron logo, Axiforma, fondo de login, retrato, tokens OKLCH, paneles de 32 px, composición del hero, chips, tarjeta de login y medidas de la barra lateral. El texto, los enlaces y los roles responden al producto actual.

El turquesa original se conserva con tinta oscura en acciones para mantener legibilidad (contraste calculado aproximado 4.685:1). La geometría de campos de login es de 32 px en escritorio y 44 px en móvil para operación táctil. Las capturas comparativas locales permanecen en `../../local-analysis/screenshots/`.


## Medidas finales y accesibilidad

Portada y recepción se midieron en 375, 768, 1024 y 1440 píxeles de viewport: `scrollWidth` coincide con el ancho útil del documento en todos los casos (360, 753, 1009 y 1425 px, respectivamente, por la barra de desplazamiento). Los cinco idiomas de la portada se comprobaron a 375 px sin desbordamiento. Con la preferencia de texto al 200 % (fuente raíz 32 px), portada y recepción también mantienen `clientWidth = scrollWidth = 360 px`.

Se comprobó además el reflujo en **720 píxeles CSS**, equivalente geométricamente al espacio de un escritorio de 1440 px con zoom al 200 %: portada, recepción y listado de atenciones caben sin desbordamiento de página. Esta equivalencia es una inferencia sobre la capacidad de reflujo; **el control nativo de zoom del navegador no está expuesto por la herramienta y queda pendiente de comprobación manual**. La escala de texto al 200 % sí se activó y midió directamente. No se confunde densidad de píxeles con zoom.

Enter abre las preferencias; Escape cierra y restaura el foco. Se verificaron los cinco modos de color en tema oscuro, el cambio de tema con formulario pendiente y el filtro de grises sobre el SVG del login. `document.fonts.check` confirmó la carga de Axiforma y OpenDyslexic al usarlas. Movimiento reducido se respeta mediante las reglas CSS correspondientes; la emulación nativa de esa preferencia no está expuesta por la herramienta, por lo que se verificó su definición y suprimido de animaciones en código.

En este sistema la API de síntesis está presente, pero la reproducción produce un error por falta de servicio/voz disponible. La interfaz muestra correctamente el aviso localizado de indisponibilidad y conserva el resto de controles. Pausa, continuación, repetición, cancelación y errores tardíos están cubiertos además por pruebas con el doble de síntesis.

Las mediciones finales están en `../../local-analysis/verification/browser-measurements.json`; los intentos históricos, incluidos defectos ya corregidos, se conservan separados en `browser-measurements-all.json` y no describen el estado final.

## Capturas comparativas incluidas

| Pantalla | Referencia develop | Implementación actual |
|---|---|---|
| Portada, 1440 px | [Anterior](ui-evidence/legacy-home.jpg) | [Actual](ui-evidence/current-home.jpg) |
| Login, 1440 px | [Anterior](ui-evidence/legacy-login.jpg) | [Actual](ui-evidence/current-login.jpg) |

El login actual puede mostrar la cuenta sintética de las pruebas mediante el autocompletado local. No son credenciales del equipo ni datos clínicos reales.

## Límites concretos

La API real no tiene la configuración local del equipo preparada en este workspace. La validación realizada contra respuestas sintéticas no demuestra conexión a PostgreSQL ni una integración de backend real. No se hicieron migraciones ni se modificaron API o mobile.

La captura clínica F-03, sugerencia/decisión de triage, cola y reportes siguen pendientes de sus propios slices. No se presentan sus marcadores como funciones implementadas.

La síntesis depende de las voces del navegador/sistema: las pruebas verifican activación, pausa, repetición, cancelación e indisponibilidad con un doble de la API; el audio/voz efectivamente instalado se comprueba en navegador según disponibilidad.

## Trazabilidad preservada


| R | Archivo y prueba por prefijo exacto |
|---|---|
| R1 | `src/app/router/uiFoundation.test.tsx::R1:` — marca original en público/login; complemento con comparación de capturas |
| R2 | `src/app/router/uiFoundation.test.tsx::R2:` — raíz pública y contenido de triage/decisión humana |
| R3 | `src/app/router/uiFoundation.test.tsx::R3:` — entrada `/app` con guard/inicio de rol; suites previas de rutas/auth |
| R4 | `src/app/router/uiFoundation.test.tsx::R4:` — navegación plegable y enlaces por rol |
| R5 | `src/shared/preferences/PreferencesProvider.test.tsx::R5:`, `FeatureLocalization.test.tsx::R5:`, `featureMessages.test.ts::R5:` |
| R6 | `PreferencesProvider.test.tsx::R6:`, `FeatureLocalization.test.tsx::R6:`, `featureMessages.test.ts::R6:` — cambios sin reset/ruta y datos literales |
| R7 | `PreferencesProvider.test.tsx::R7:` — listener sistema y toggle tras cambio OS |
| R8 | `PreferencesProvider.test.tsx::R8:` — modos, escala y fuente local |
| R9 | `PreferencesProvider.test.tsx::R9:` — valores base, datos inválidos y storage no disponible |
| R10 | `src/shared/preferences/VoiceGuide.test.tsx::R10:` — opt-in, pausa/reanudar/repetir/cancelar y eventos tardíos |
| R11 | `VoiceGuide.test.tsx::R11:` — indisponibilidad traducida sin bloqueo |
| R12 | `src/features/reception/components/FeatureLocalization.test.tsx::R12:` — NN y payload tras idioma; suites ReceptionPage/DirectRegistrationPage preservadas |
| R13 | `FeatureLocalization.test.tsx::R13:` — timeline localizado con personal literal/Bogotá; suites EncounterList/Detail preservadas |
| R14 | `FeatureLocalization.test.tsx::R14:` — conflicto ya visible traducido, identidad conservada; suites de HTTP/errores existentes |
| R15 | `src/app/router/uiFoundation.test.tsx::R15:` — teclado/foco/Escape; QA visual complementaria registrada en docs/ui-verification.md |
| R16 | `PreferencesProvider.test.tsx::R16:`, `FeatureLocalization.test.tsx::R16:` — preferencias sin auth/datos clínicos, sede/motivo/payload/horas conservados; privacy/f02Transversal existentes |

Las rutas abreviadas de los archivos repetidos son las de las filas anteriores: pruebas de preferencias en `src/shared/preferences/`, localización en `src/features/reception/components/` y mensajes en `src/shared/lib/`.


## Revisión independiente y cierre

**APROBADO**, sin defectos bloqueantes, tras revisar C1–C8, R1–R16, arquitectura, contrato, privacidad, pruebas y capturas. UI-01-web está `done` y T1–T9 verificadas. El registro de sesión está en `progress/history.md`; el informe completo local se conserva en `../../local-analysis/verification/reports/review_UI-01-web.md`. Los límites de API real y de controles nativos del navegador descritos arriba permanecen explícitos.
