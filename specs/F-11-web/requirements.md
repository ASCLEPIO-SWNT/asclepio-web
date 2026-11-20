# F-11-web — Respuestas de la entrevista y señales de alarma en la web del personal

Brief global: ../asclepio-api/docs/product/features/F-11.md (AC6, AC7)
Contrato: consume 0.11.0 (`symptomInterview` y `redFlags` en `EncounterDto` y `PendingPreRegistrationDto`; `hasRedFlags` en `QueueItemDto`)
RNF aplicables: RNF-13, RNF-17
Depende de: F-11-api (`done`).

## Requisitos
- **R1** (Por estado) Mientras la atención tenga `symptomInterview`, la captura clínica (`ClinicalCapturePage`) y el detalle de la atención deberán mostrar, debajo del motivo original, el bloque "Respuestas del paciente al asistente (no verificadas)". El bloque lista cada pregunta con su respuesta, o "No sabe / prefirió no responder", e indica el motor ("en el teléfono" o "en el servidor") y el motivo de fin. (→ F-11.AC6)
- **R2** (Por estado) Mientras `redFlags` no esté vacío, la captura clínica, el detalle, la bandeja de prerregistros pendientes y la sección "espera de triage" de la cola deberán mostrar la insignia "Señal de alarma referida por el paciente", con la lista de señales traducida. (→ F-11.AC7)
- **R3** (Ubicuo) La web deberá respetar el orden que envía el servidor en la bandeja y en la cola, sin reordenar en el cliente. (→ F-11.AC7)
- **R4** (Ubicuo) El bloque y la insignia deberán usar un estilo informativo que no se confunda con la sugerencia de IA de F-04 ni con una decisión, y conservar el mismo peso visual de "Validar" y "Corregir". (→ F-11.AC6) (RNF-17)
- **R5** (Ubicuo) Los textos nuevos deberán estar en los mensajes de Paraglide (es) y la insignia deberá tener una alternativa textual accesible. (→ F-11.AC6)
- **R6** (Por estado) Mientras la atención no tenga `symptomInterview`, la web deberá mostrar la vista actual sin cambios. (→ F-11.AC6)

## Preguntas abiertas
Ninguna propia.
