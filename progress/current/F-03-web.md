# F-03-web — Captura clínica

Estado: preparación de spec. Contrato consumido: 0.4.0.

## Autorización

El usuario aprobó expresamente por chat el plan completo «F-03-web: dashboard de enfermería y captura clínica» mediante «PLEASE IMPLEMENT THIS PLAN», el 2026-10-28 (America/Bogota). Los requisitos, diseño y tareas materializan ese mismo alcance antes del código; no se solicita de nuevo la autorización ya dada.

## Punto de partida

- Rama: codex/clinical-capture desde main c94aae5727da8c0e23da0fd78856aee083957963; origin/main confirmado sin avances adicionales.
- API main 2f2672bbe7c2cf5c852e7295a90dd225389d27bc; F-03-api done, OpenAPI 0.4.0.
- ./init.sh inicial: VERDE, FAIL 0, WARN 0.
- API real sin .env local; integración real condicionada a configuración del equipo. No modificar API, móvil, base compartida ni repositorios legacy.

## Ejecución

1. spec_author escribe specs/F-03-web/ conforme al plan aprobado.
2. Implementer ejecuta tareas y pruebas; reviewer independiente verifica C1–C8.
3. QA visual y funcional con red sintética conforme al contrato, registro de limitaciones reales.
4. Publicar resultado verificado en main de ASCLEPIO-SWNT/asclepio-web sin force push.

## Spec materializada y aprobación

Specs/F-03-web con R1–R24 y T1–T6 revisadas por leader: 0 preguntas abiertas; coinciden con el plan completo aprobado expresamente por el usuario en el mensaje actual. Estado spec_ready registrado antes del código. La aprobación por chat ya está recibida mediante PLEASE IMPLEMENT THIS PLAN; se mantiene esa autorización sin pedirla de nuevo.

Estado: in_progress. T1 foundation; T2 y T3 independientes tras T1; T4 UI; T5 integración; T6 QA/reviewer.

## Verificación final previa al cierre

T1–T5 completas; QA visual y funcional final registrada en docs/f03-verification.md. ./init.sh final VERDE, FAIL0/WARN0. Reporte JSON:399/399 pruebas,0fallidas/pendientes. Sin avances nuevos en origin/main tras fetch previo a entrega; sigue en c94aae5. Revisión independiente pendiente de firma del informe C1–C8; T6 se cierra con ese resultado. API real/zoom nativo/emulación de movimiento pendientes documentados expresamente.
