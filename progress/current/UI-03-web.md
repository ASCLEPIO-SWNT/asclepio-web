# UI-03-web — Robustez de la web

- Rama: `feat/ui-03-web-robustness`. Contrato: consume 0.4.0, sin endpoints nuevos.
- Estado en `feature_list.json`: `pending` (no modificado por el spec_author).

## 2026-10-29 — Spec escrita (spec_author)

- `specs/UI-03-web/{requirements,design,tasks}.md`: 32 requisitos (R1–R32), 21 decisiones (D1–D21) y 17 tareas (T1–T17).
- **Lista para aprobación humana**, pero con 4 preguntas abiertas que la bloquean (`docs/specs.md` §4):
  - PA-1 Contenido del borrador en `sessionStorage` (choca con `privacy.test.tsx` R10/R24 y UI-02 R27; propuesta: solo captura clínica estructurada, sin texto libre ni identidad; `PatientForm` solo con aviso).
  - PA-2 Caducidad del borrador.
  - PA-3 Reintento al reconectar frente a UI-02-web R25.
  - PA-4 Trazas sin brief propio de UI-03 (aceptar F-01/F-02/F-03 o crear `docs/ui-robustness.md`).
- Hallazgo: la vuelta a la ruta de origen ya existe (`RequireSession` → `LoginRoute`) pero pierde el `search`; R19 lo completa.
- Siguiente paso (leader): resolver PA-1–PA-4 con el usuario, marcar `spec_ready` y pedir «aprobado».
