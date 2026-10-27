# F-02-web — Confirmación de llegada y consulta de atención

## Objetivo
Bandeja de pre-registros de la sede y confirmación por RECEPTION (hora legal del servidor), rechazo, registro directo (incluido NN) y consulta de atenciones con su línea de tiempo (F-02.AC7, AC9; ADR 0008).

## Plan de la sesión
1. spec_author → `specs/F-02-web/` (consume contrato 0.4.0).
2. ⏸ Aprobación humana por chat.
3. implementer → reviewer → prueba manual del humano → cierre.

## Estado
- 2026-10-27: `./init.sh` en verde. Puerta de contrato OK (F-02-api done, snapshot 0.4.0). Lanzando spec_author.

## Bloqueos
Ninguno.
- 2026-10-27: spec_author entregó `specs/F-02-web/` (R1–R40, consume 0.4.0, 0 preguntas abiertas; cancelación incluida). Estado `spec_ready`. ⏸ Esperando aprobación humana.
- 2026-10-27: spec **aprobada** por el humano (AlejandroHenao2572) en el chat, con las 8 decisiones de UI propuestas. Estado `in_progress`, `consumes_contract: "0.4.0"`. Lanzando implementer.
