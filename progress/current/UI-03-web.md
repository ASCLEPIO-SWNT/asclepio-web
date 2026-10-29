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

## Aprobación
- 2026-10-29: el usuario aprobó la spec por chat («pues implementalo»), con PA-1 a PA-4 resueltas. UI-03-web → in_progress.

## 2026-10-29 — Implementación (implementer)

- T1: build «antes» en `0bd94f7`: un único JS de 712,55 kB (207,87 kB gzip), CSS 47,69 kB (10,12 kB gzip), con aviso de >500 kB. `./init.sh` «antes»: ROJO (2 «Test timed out»). Capturas «antes»: **pendientes para el leader/usuario** (sin navegador ni credenciales en la sesión del implementer).
- T2: causa de los timeouts = contención de CPU (15 workers en 16 núcleos). `maxWorkers: '50%'` + `delay: null` de user-event en R40 (x2) y R11 de captura. Tres `./init.sh` seguidos en verde.
