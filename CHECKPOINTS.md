# CHECKPOINTS — Evaluación del estado final (asclepio-web)

> El `reviewer` recorre cada casilla, marca `[x]` o `[ ]` con evidencia y rechaza el cierre si queda alguna vacía en los checkpoints que aplican.

## C1 — El harness está completo
- [ ] Existen `AGENTS.md`, `CLAUDE.md`, `init.sh` (ejecutable), `feature_list.json`, `progress/current/` y `progress/history.md`.
- [ ] Existen `docs/architecture.md`, `docs/conventions.md`, `docs/specs.md` y `docs/verification.md`.
- [ ] `./init.sh` termina con exit code 0.

## C2 — El estado es coherente
- [ ] Como mucho una feature `in_progress`.
- [ ] Toda feature `done` tiene pruebas asociadas que pasan.
- [ ] `progress/current/` contiene solo el archivo de la feature activa (o nada).

## C3 — El código respeta la arquitectura
- [ ] `src/` sigue `docs/architecture.md`: `app/`, `features/<feature>/` y `shared/`.
- [ ] Una feature no importa de otra feature; lo compartido vive en `shared/`.
- [ ] Las llamadas HTTP solo pasan por `shared/api` (cliente tipado desde OpenAPI); no hay `fetch` suelto en los componentes.
- [ ] No hay dependencias nuevas sin justificación en el `design.md`.
- [ ] No hay `console.log` de depuración ni TODOs sin contexto.

## C4 — La verificación es real
- [ ] Hay pruebas Vitest + Testing Library por feature con código, que prueban el comportamiento visible (roles y texto) y no detalles internos.
- [ ] El HTTP se simula en la frontera de red (handlers que siguen el contrato), no mockeando hooks internos.
- [ ] `npm test` muestra más de 0 pruebas, todas en verde.

## C5 — La sesión se cerró bien
- [ ] No hay archivos sin trackear sospechosos.
- [ ] `progress/history.md` tiene una entrada por la última sesión.
- [ ] La última feature trabajada tiene el estado correcto.

## C6 — Spec-Driven Development
- [ ] Toda feature `sdd: true` en `spec_ready`, `in_progress` o `done` tiene `specs/<id>/{requirements,design,tasks}.md`.
- [ ] `requirements.md` usa EARS estricto y cada `R<n>` está trazado a un `F-0X.ACn`.
- [ ] Toda feature `done` con `sdd: true` tiene todas sus tareas `[x]`.
- [ ] Cada `R<n>` está cubierto por al menos una prueba cuyo nombre empieza por `R<n>:`.

## C7 — Seguridad clínica y privacidad (UI)
- [ ] Ninguna pantalla presenta la sugerencia como nivel final; el nivel final solo aparece después de una decisión.
- [ ] "Corregir" tiene el mismo peso visual que "Validar": mismo tamaño y jerarquía de botón, sin que uno sea primario y el otro secundario.
- [ ] "Corregir" no se puede enviar sin nivel y motivo.
- [ ] Si no hay sugerencia válida, se ofrece el triage manual.
- [ ] No hay datos personales en `console`, `localStorage` ni en las URL (no hay documento en la query string).
- [ ] Las horas se muestran en `America/Bogota`.

## C8 — Contrato
- [ ] La feature declara `consumes_contract` y esa versión coincide con `info.version` (misma mayor) de `../asclepio-api/openapi/asclepio-api.v1.json`.
- [ ] Los tipos están regenerados (`npm run api:types` no produce diff).
- [ ] Los errores `problem+json` se muestran con un mensaje comprensible.
