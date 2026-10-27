# F-01-web — Login y rutas por rol (sdd: true)

- **Inicio:** 2026-10-26 · Dependencias: F-00-web done y F-01-api done (contrato **0.2.0** publicado en `../asclepio-api/openapi/`).
- **Fuentes:** `../asclepio-api/docs/product/features/F-01.md` (F-01.AC6; la web es solo para el personal: el paciente usa el móvil, ADR 0008), endpoints `POST /auth/login` y `GET /me` del contrato 0.2.0, RNF-10, RNF-12, RNF-13 y RNF-17.
- **Decisiones humanas ya tomadas:** JWT de 8 h sin refresh; 401 genérico; bloqueo tras 5 intentos; roles RECEPTION, NURSE, PHYSICIAN y ADMIN.

## Plan
1. spec_author → `specs/F-01-web/`.
2. ⏸ Aprobación humana.
3. implementer → reviewer → done.

## Estado
- 2026-10-26: spec escrita (R1–R24, T1–T13) → **spec_ready**. ⏸ 7 preguntas abiertas presentadas al humano.
- **2026-10-26: APROBADA por el humano en el chat** ("acepto las propuestas, aprobado"): PA-1…PA-7 con las propuestas del spec_author. El spec_author las registra antes de implementar.
- 2026-10-26: PA registradas, sin preguntas abiertas → **in_progress** (consume contrato 0.2.0). Se lanza el implementer.
