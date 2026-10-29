# UI-03-web — Robustez de la web

- Rama: `feat/ui-03-web-robustness`. Contrato: consume 0.4.0, sin endpoints nuevos.
- Estado en `feature_list.json`: `pending` (no modificado por el spec_author).

## 2026-10-29 — Spec escrita (spec_author)

- `specs/UI-03-web/{requirements,design,tasks}.md`: 32 requisitos (R1–R32), 21 decisiones (D1–D21) y 16 tareas activas (T1–T17; T8 tachada).
- Hallazgo: la vuelta a la ruta de origen ya existe (`RequireSession` → `LoginRoute`) pero pierde el `search`; R19 lo completa.

## 2026-10-29 — Preguntas abiertas resueltas por el usuario (chat)

- PA-1: borrador solo de signos vitales (valores numéricos/estructurados de `VitalSignsForm`), sin texto libre, síntomas ni identidad; `SymptomFindingsForm` y `PatientForm` solo con aviso. Enmienda mínima: `privacy.test.tsx` R24 y UI-02-web R27 admiten únicamente `asclepio.draft.vitals.<encounterId>`; R10 sin cambios (R31).
- PA-2: caducidad de 30 minutos (R6, D6).
- PA-3: ningún reintento automático al reconectar; UI-02-web R25 intacto. R16 reescrito como «no hay reintento por reconexión»; T8 eliminada y su prueba pasa a T7.
- PA-4: trazas a F-01/F-02/F-03 aceptadas, sin documento extra.

**Spec lista para aprobación humana, sin preguntas abiertas.** Siguiente paso (leader): marcar `spec_ready` y pedir «aprobado».
