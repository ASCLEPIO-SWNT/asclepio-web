# F-03-web — Diseño

## Resumen

Se sustituye el marcador `/triage` por bandeja de enfermería y captura en `/triage/:id`, se incorpora historial clínico solo lectura al detalle autorizado y se extienden idioma/estilos/guía vigentes. Todo el dominio vive en `features/triage`; `app` compone guards/rutas y `shared` aporta API, preferencias y presentación. No hay imports entre features. El plan está expresamente autorizado por el usuario; `docs/f03-brief.md` registra las decisiones antes del código.

## Decisiones

| # | Decisión | Alternativa descartada | Motivo |
|---|---|---|---|
| D1 | Reutilizar RHF/Zod, TanStack Query, cliente tipado y componentes actuales; copiar solo apariencia equivalente del legacy. | Trasladar TanStack Form, GraphQL, store o API anterior. | Conserva arquitectura y cobertura actual, con fidelidad a `develop`. |
| D2 | Dos formularios y mutations independientes; estado local por id de atención. | Un único envío de signos+hallazgos o borradores persistentes. | El contrato separa capturas; un éxito no debe borrar el otro borrador. |
| D3 | Bandeja `WAITING_TRIAGE` fija, sede/offset en URL, páginas de 50 y refresco manual. | KPIs, paginación inventada o polling. | Corresponde al alcance aprobado y al GET existente. |
| D4 | GET clínico propio, habilitado únicamente para NURSE/PHYSICIAN; captura solo NURSE en espera. | Añadir datos clínicos al DTO de detalle compartido por los cuatro roles. | Respeta minimización y matriz del contrato. |
| D5 | Reglas de la tabla siguiente en una definición cliente central derivada de OpenAPI 0.4.0 mediante extracción local mínima, regenerada junto a `api:types`; API sigue siendo autoridad. | Inventar escalas, umbrales o puntuación NEWS2 en el cliente. | Son reglas de producto provisionales publicadas; F-03 no clasifica ni recomienda. |
| D6 | Ningún POST se reintenta; se invalidan consultas tras éxito y conflicto, sin datos optimistas. | Reintentos automáticos o editar mediciones anteriores. | Evita duplicar inserciones y conserva estado servidor/eventos. |
| D7 | Claves traducibles en errores; valores del formulario y datos clínicos independientes del locale. | Remontar formularios por tema/idioma o traducir texto clínico. | Conserva borradores y privacidad. |
| D8 | Guía estática con generación de reproducción y reset al cambiar ruta/locale/texto. | Cancelar audio sin reiniciar estado React o reutilizar callbacks antiguos. | Evita que A→B→A restaure controles o fallos de una reproducción cancelada. |

### Reglas publicadas, sin modificaciones clínicas

Fuente: PA-F03-1/2 y OpenAPI 0.4.0. **PROVISIONAL — no validado clínicamente, revisar con asesor clínico**; los límites atrapan errores de digitación, no calculan un nivel.

| Campo | Dominio/unidad | Obligatorio | Rango inclusivo |
|---|---|---|---|
| `respiratoryRate` | entero, rpm | Sí | 4–80 |
| `oxygenSaturation` | entero, % | Sí | 50–100 |
| `supplementalOxygen` | booleano, elección sí/no explícita | Sí | No aplica |
| `systolicBp` | entero, mmHg | Sí | 40–300 |
| `heartRate` | entero, lpm | Sí | 20–300 |
| `consciousness` | A/C/V/P/U, elección explícita | Sí | No aplica |
| `temperatureC` | número con máximo 1 decimal, °C | Sí | 25.0–45.0 |
| `diastolicBp` | entero, mmHg | No | 20–200 |
| `glucoseMgDl` | entero, mg/dL | No | 20–600 |

Si hay diastólica, sistólica > diastólica. Vacío obligatorio no se convierte en 0; opcionales vacíos se omiten, nunca se convierten en 0 o `null` en el POST. No preseleccionar booleano ni conciencia. Los valores de cero no están en los rangos numéricos publicados; el booleano `false` sí es válido. Un error impide la toma completa. Hallazgos: `kind` enum publicado y `description.trim()` de 1–500, lote 1–20. No se modifica el motivo original.

## Interfaces y flujo

### Base clínica (propiedad foundation)

- Exportar aliases desde los esquemas generados: `CreateVitalSigns`, `VitalSigns`, `CreateSymptomFindings`, `SymptomFinding`, `ClinicalCapture` y enums derivados; `schema.d.ts` solo se regenera. Esquemas y reglas locales quedan en triage, no redefinen DTOs.
- En T1, `scripts/extract-clinical-contract.mjs` lee el snapshot 0.4.0 en desarrollo y genera `src/features/triage/clinicalContract.generated.ts`, artefacto pequeño y versionado con `type`, `required`, `minimum`, `maximum`, enums y límites publicados de filas/descripciones (`minItems/maxItems/minLength/maxLength`). `npm run api:types` encadena esa extracción junto con la generación de DTOs; no se edita el artefacto manualmente. El navegador importa solo ese resultado, nunca el snapshot completo de la API; el script no añade dependencias. La precisión de temperatura de un decimal y la coherencia sistólica > diastólica se implementan como reglas explícitas ya documentadas en el contrato/decisiones API, sin interpretar prosa automáticamente ni introducir criterios clínicos nuevos. Es el mecanismo técnico de la definición derivada de D5, sin cambiar requisitos ni tareas.
- `clinicalCaptureKey(id)`, `useClinicalCapture(id, enabled)` con clave `['triage','clinicalCapture',id]`; habilitación exige rol autorizado y contexto válido. Cache por id, sin `placeholderData` de otra atención; ante error no se renderiza caché anterior como historial vigente. `retry:false` y reintento de lectura explícito.
- `useRecordVitalSigns(id)` y `useRecordSymptomFindings(id)` retornan mutations tipadas con `retry:false`. En 201 invalidan `clinicalCaptureKey(id)`, `encounterKey(id)` y `ENCOUNTERS_KEY`; el detalle recupera eventos del servidor, sin crear eventos desde el cliente. En 409 invalidan las mismas claves y la UI suspende envíos hasta comprobar el estado actual; si la comprobación falla, no se reabre captura por datos obsoletos.
- Formularios `VitalSignsForm` y `SymptomFindingsForm`: props comunes `encounterId`, `disabled`, callback `onConflict` y callback opcional `onUnavailable?(status: 403 | 404): void`; RHF/Zod internos y mutation propia. Ante un POST 403/404, el formulario notifica `onUnavailable` al contenedor, que oculta contexto e historial anteriores y presenta respectivamente permiso denegado o atención no encontrada. Esta interfaz implementa R19 existente; no añade un requisito ni una pregunta de producto. Datos y avisos pertenecen a esa instancia; el padre remonta por id, no por idioma/tema. Un éxito resetea únicamente el formulario propio. No hay guard de abandono ni draft en storage.
- `ClinicalCaptureHistory` recibe el resultado clínico vigente y dibuja tomas/hallazgos append-only, responsable y hora Bogotá, sin acciones de edición; el contenedor presenta loading/error/empty. Se usa el orden contractual, sin invertirlo. La ausencia de ambos conjuntos se muestra como historial vacío.

### Composición (propiedad UI)

- Añadir rutas de triage a la composición existente y la subruta `:id` a la matriz NURSE. La bandeja usa el GET de atenciones actual con filtro fijo y política manual para esta vista, sin alterar las otras listas. Query params: `siteId` ausente = todas las sedes; `offset` ausente/inválido/no entero/negativo = 0. Cambiar sede reinicia offset; anterior resta 50 con mínimo 0 y siguiente suma 50, habilitado solo si llegan 50 elementos. Conservar filtro al volver desde captura mediante el enlace de bandeja. No agregar datos personales a URL.
- `/triage/:id` usa `useEncounter(id)` para paciente/sede/estado y la consulta clínica autorizada para historial/motivo, con dos formularios. La escritura solo se habilita tras contexto actual exitoso en espera; tras conflicto se vuelve a comprobar. No crear solicitudes clínicas si el guard o contexto impide el acceso. `key={id}` aísla borradores/avisos al navegar entre atenciones.
- `/atenciones/:id` conserva paciente, cancelación y línea de tiempo de F-02. Solo NURSE/PHYSICIAN monta el contenedor de lectura clínica; RECEPTION/ADMIN no monta el hook ni llama al endpoint. El enlace «Capturar» aparece solo a NURSE cuando el detalle actual está en espera. PHYSICIAN nunca ve formularios de edición.
- `400/422`: mapear campos conocidos, incluidos `items.<índice>.kind/description`, a RHF con `aria-invalid`/`aria-describedby` y foco. Errores conocidos se localizan; campos desconocidos mantienen alerta general localizada, sin mostrar valores clínicos en mensajes. `409` alerta/refresco; `401` usa cierre vigente; `403` permiso; `404` no encontrado; red/genérico conserva valores y exige acción explícita para un nuevo envío.
- Todos los mensajes nuevos quedan en `messages/features/{es,en,pt,fr,de}.json`; UI publica las claves acordadas antes de integrar formularios. Mantener los catálogos equivalentes y el proceso de compilación actual. No se traducen datos clínicos ni se cambia locale mediante recarga.
- Referencia de solo lectura: `NurseView` en `legacy/asclepio-frontend/app/features/triage/triage.page.tsx`, `VitalSignsForm` y `RoleDashboardShell` del `develop` registrado en UI-01. Conservar geometría, espaciado, tokens, Axiforma e iconos; adaptar únicamente contenido/acciones al nuevo producto, sin funciones IA ni KPI nuevos. CSS nativo con preferencias existentes, foco y movimiento reducido.
- Nuevas instrucciones estáticas para bandeja/captura/detalle clínico. `VoiceGuide` cancela al cambiar ruta/locale/texto, reinicia active/paused/failed e invalida callbacks anteriores; A→B→A siempre empieza inactivo/sin error. El texto nunca se obtiene del DOM, contexto paciente o formulario.

### Responsabilidades y ejecución coordinada

| Paquete | Propiedad de archivos | Dependencia |
|---|---|---|
| Foundation T1 | `shared/api/client.ts` (aliases), script de extracción/artefacto clínico generado y enlace en `api:types`, nuevos schemas/reglas y hooks clínicos en triage, pruebas de esas áreas. | Publica las interfaces anteriores y claves i18n requeridas antes de T2/T3. |
| Foundation T2 | Formularios e historial clínico presentacional nuevos y sus pruebas. | Tras T1; no edita rutas, página existente de detalle, catálogos, voz ni CSS. |
| UI T3–T4 | Bandeja/captura nuevas, rutas/matriz, integración en detalle existente, catálogos, CSS, guía y sus pruebas. | Tras T1; T3 se puede realizar en paralelo a T2 con los contratos de componentes fijados. |
| Líder/revisor | Progreso, estado, verificación, revisión y publicación. | Integra después de T2–T4 y registra limitaciones. |

Los archivos no tienen escritores simultáneos. Foundation entrega claves/textos a UI, que es el único propietario de catálogos, estilos y voz. No se cambia API, móvil ni legacy.

## Impacto en contrato

**Sin impacto en contrato.** Consume **0.4.0 → 0.4.0**. Se usan `GET /api/v1/encounters` y `GET /api/v1/encounters/{id}` existentes, más los tres endpoints ya publicados: `POST /api/v1/encounters/{id}/vital-signs` → 201 `VitalSignsDto`; `POST /api/v1/encounters/{id}/symptom-findings` → 201 `SymptomFindingListDto`; `GET /api/v1/encounters/{id}/clinical-capture` → 200 `ClinicalCaptureDto`. Errores `application/problem+json`, sin requests/responses nuevos. Los cuerpos no llevan ids, tenant, actor ni horas legales. `npm run api:types` produce tipos del snapshot declarado sin editar la API ni tipos manuales.

## Impacto en datos

**Sin impacto en datos.** No hay migraciones, tablas, columnas ni permisos nuevos. Las inserciones y auditoría las realiza la API ya implementada. La web conserva el motivo y registros originales, muestra `recordedAt`/responsable del servidor y no calcula horas legales. Solo filtro de sede/offset va en URL; clínica queda en RAM/caché de sesión y nunca en almacenamiento persistente, logs o guía. Se mantiene limpieza de caché al cerrar sesión.

## Riesgos y pruebas

- Unitarias `R<n>:`: siete obligatorios, elecciones explícitas, límites inclusivos/fuera de cada rango, enteros/temperatura, coherencia, opcionales vacíos, false válido; filas 1/20/21, descripción vacía/trim/500/501 y tipos. Contrastar reglas con snapshot sin inventar rangos.
- Integración React con red sintética contractual: matriz completa de roles sin GET clínico para RECEPTION/ADMIN, estado fijo/URL/sede/páginas/refresco manual, atención A→B con borradores, ambos guardados independientes, exactitud de payloads y un solo POST, historial acumulado/fechas/responsables/eventos; loading/empty/error sin datos obsoletos; 400/422 indexados, 409 y bloqueo posterior, 401/403/404/red.
- UI/preferencias: es/en/pt/fr/de sin claves ausentes, cambios en formularios escritos, tema/sistema/modos/texto/fuente, teclado/zoom 200 % y anchos 375/768/1024/1440. Capturas comparativas con referencia equivalente de `develop`. Voz: no reproducción al entrar, cancelación y callbacks viejos, A→B→A desde activo y desde fallo, cambios de locale/texto y capacidad ausente.
- Ejecutar init, lint, tipos, pruebas, generación OpenAPI sin diff y build; reviewer independiente C1–C8. API real sin `.env`: no inventar secretos ni tocar DB; registrar prueba real pendiente y fixtures contractuales usados. Esa limitación fue aceptada en el plan y no impide entregar el slice verificado con fixtures.
