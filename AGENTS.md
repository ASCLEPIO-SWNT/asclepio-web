# AGENTS.md — mapa de asclepio-web

Cliente web (React + TypeScript + Vite) de Asclepio para enfermería (captura, sugerencia, decisión), medicina (cola) y administración (reportes). *La IA propone, el profesional decide.* Lee solo lo que necesites en cada momento (divulgación progresiva).

## 1. Antes de empezar
1. Ejecuta `./init.sh`. **Si falla, para** y reporta.
2. Lee `feature_list.json` y los archivos de `progress/current/`.
3. Antes de escribir o revisar cualquier spec, lee `docs/specs.md`.

## 2. Archivos y carpetas

| Ruta | Qué contiene | Cuándo leerlo |
|---|---|---|
| `feature_list.json` | Slices de este repo, estados, dependencias y `consumes_contract` | Siempre, al empezar |
| `progress/current/<id>.md` | Estado vivo de la feature en curso | Siempre, al empezar |
| `progress/history.md` | Registro append-only de sesiones | Para contexto histórico |
| `specs/<id>/` | requirements, design y tasks del slice | Al especificar, implementar o revisar |
| `docs/specs.md` | Proceso SDD, EARS y la puerta de aprobación | Antes de cualquier spec |
| `docs/architecture.md` | Capas, carpetas y dependencias permitidas | Antes de diseñar o implementar |
| `docs/conventions.md` | Nombres, estados de UI, fechas, validación, commits | Antes de implementar |
| `docs/verification.md` | Cómo probar y la trazabilidad | Antes de implementar o revisar |
| `CHECKPOINTS.md` | C1–C8 | Al revisar o cerrar |
| `../asclepio-api/docs/product/` | Visión, glosario, RNF y **briefs F-0X** (solo lectura) | Al especificar |
| `../asclepio-api/docs/adr/`, `../asclepio-api/docs/roadmap.md` | Decisiones cerradas y backlog global (solo lectura) | Al planificar |
| `../asclepio-api/openapi/asclepio-api.v1.json` | **Contrato** (solo lectura) | Al consumir endpoints; `npm run api:types` |
| `.claude/agents/` | Roles | Según tu rol |

## 3. Reglas duras
- **Una feature por sesión.**
- **No se marca `done` sin pruebas en verde** (`./init.sh` completo).
- **No se salta la spec** cuando `sdd: true`.
- **No se salta la aprobación humana**, que se da **por chat**.
- Documenta en `progress/current/<id>.md` mientras trabajas.
- **No inventes requisitos clínicos.** Búscalos en `../asclepio-api/docs/` o pregunta.
- **El contrato va primero:** un slice no pasa a `in_progress` si `F-0X-api` no está `done` o si la versión de contrato que necesita no existe en el snapshot. Declara la versión en `consumes_contract`.
- **No escribas en `../asclepio-api/`** (hay un hook que lo bloquea).
- La sugerencia de IA **nunca** se presenta como decisión. "Validar" y "Corregir" tienen el mismo peso visual.

## 4. Flujo
```
pending → [spec_author] → spec_ready → ⏸ aprobación por chat → in_progress → [implementer → reviewer] → done
```
F-00 (`sdd: false`) salta la spec, pero no el reviewer.

## 5. Cierre de sesión
1. `./init.sh` en verde.
2. Actualiza el estado en `feature_list.json`.
3. Mueve el resumen de `progress/current/<id>.md` al final de `progress/history.md` y borra el archivo de la feature (y `impl_`/`review_`).
4. Sin archivos temporales, `console.log` de depuración ni TODOs sin contexto.

## 6. Si te bloqueas
Documenta el bloqueo en `progress/current/<id>.md` y **para**. No inventes workarounds; si falta algo en la API, anótalo para una sesión de `asclepio-api`.
