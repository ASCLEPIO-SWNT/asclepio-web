# F-11-web — Informe del implementer

- **Rama:** `feature/F-11-web` (sin push).
- **Contrato consumido:** 0.11.0 (`consumes_contract` ya era "0.11.0"; `CONSUMED_CONTRACT` y `EXPECTED_CONTRACT` pasan de 0.9.0 a 0.11.0). `npm run api:types` no produce diff.
- **Tareas:** T1–T4 `[x]`. T5 queda `[ ]`: `npm test`, `npm run lint`, `npm run typecheck` y `./init.sh` en verde, pero **falta la verificación manual con la API local** (no estaba levantada en :3000 y levantarla escribe en `../asclepio-api/`). La hace el humano o el leader.

## Commits
| Commit | Qué |
|---|---|
| `19e9584` chore(api): consume contract 0.11.0 | T1 |
| `c5a72ac` feat(triage): show the patient's interview answers and red-flag badge | T2, T3 |
| `4c28bb9` test(queue): the tray and the queue keep the server order with red flags | T4 |
| `ddba682` test(i18n): type the contract snapshot read by the F-11 catalog test | T5 (lint) |

## Archivos tocados
**Contrato (T1)**
- `src/shared/api/schema.d.ts` (regenerado), `src/features/triage/clinicalContract.generated.ts` (solo cambia la cabecera; el cuerpo conserva la huella `7e5018…`).
- `scripts/extract-clinical-contract.mjs`: la guarda admite 0.11.0, con su comentario de revisión (0.11.0 no cambia las reglas de F-03 ni los límites de F-05).
- `src/shared/api/client.ts`: `CONSUMED_CONTRACT = '0.11.0'` y alias generados `SymptomInterview`, `InterviewTurn`, `InterviewDimension`, `InterviewEngine`, `InterviewEndedBy`, `RedFlag`.
- `src/test/contractBaseline.ts`: versión y huellas nuevas de `schema.d.ts` y del archivo clínico.
- `src/test/dt02Transversal.test.ts`, `src/test/f07Transversal.test.ts`: las pruebas de "contrato congelado" leen la versión de `EXPECTED_CONTRACT` en lugar de "0.9.0" escrito a mano; la de la guarda espera también 0.11.0 (y no 0.10.0).
- `src/test/fakeApi.ts`, `src/features/queue/testing/queueFixtures.ts`: `symptomInterview: null`, `redFlags: []` y `hasRedFlags: false` en los fixtures base; nuevos `symptomInterview` y `encounterWithInterview()`.

**Bloque e insignia (T2, T3)**
- `src/features/triage/components/SymptomInterviewBlock.tsx` (nuevo): `section` con encabezado (h3 en la captura, h2 en el detalle), nota "no es una valoración clínica ni una sugerencia de triage", lista ordenada de pregunta/respuesta con su aspecto, "No sabe / prefirió no responder" para `null`, motor y motivo de fin.
- `src/shared/ui/RedFlagBadge.tsx` (nuevo): `StatusBadge` tono `error` con `BellAlertIcon` decorativo y texto, más la lista traducida (`aria-label` "Señales referidas") cuando hay `flags`.
- `src/features/triage/components/ClinicalCapturePage.tsx`: insignia junto al motivo original y bloque justo debajo (`clinical-context`).
- `src/features/triage/components/EncounterDetailPage.tsx`: insignia en el `dd` del motivo y bloque después de los datos de la atención (todos los roles).
- `src/features/reception/components/PreRegistrationCard.tsx`: insignia con la lista en el dato "Motivo".
- `src/features/queue/components/QueueSection.tsx`: insignia (sin lista) en la celda del paciente, solo en `waiting` y si `hasRedFlags`.
- `src/shared/lib/labels.ts`: `RED_FLAG_LABELS`, `INTERVIEW_DIMENSION_LABELS`, `INTERVIEW_ENGINE_LABELS`, `INTERVIEW_ENDED_LABELS`.
- `messages/features/{es,en,pt,fr,de}.json`: 30 claves `interview_*` y `red_flag_*` en los cinco idiomas (el repo tiene cinco catálogos y `check-messages.mjs` exige las mismas claves en todos).
- `src/index.css`: sección F-11-web (`.interview-block*`, `.red-flags*`), solo tokens; bloque neutro (borde continuo, fondo de tarjeta, sin tono), distinto del aviso discontinuo de la sugerencia y de la tarjeta de triage.
- `src/shared/ui/dashboard.css`: `.red-flags .badge` se suma a la regla que deja envolver las insignias largas (la prueba de UI-02 prohíbe `.badge` en `index.css`).

**Pruebas nuevas:** ver la tabla.

## Desviaciones menores del design.md (para el reviewer)
1. `RedFlagBadge` vive en `src/shared/ui/` y no en `src/shared/components/` (esa carpeta no existe; `docs/architecture.md` pone los componentes visuales compartidos en `shared/ui`).
2. Los textos están en los cinco catálogos, no solo en `es`, porque el harness de i18n lo exige.
3. La cola solo trae `hasRedFlags` (sin lista de señales, contrato 0.11.0): en `waitingTriage` la insignia va sin lista. R2 pide "la lista de señales traducida"; en la cola no hay datos para ella.
4. El bloque añade una nota breve ("no es una valoración clínica ni una sugerencia de triage") para reforzar R4/RNF-17, y un texto para la entrevista sin preguntas (`turns: []`, p. ej. corte inmediato por señal de alarma).

## Trazabilidad R<n> → prueba
| R | Archivo | Prueba |
|---|---|---|
| R1 | `src/features/triage/components/SymptomInterviewBlock.test.tsx` | `R1: la captura clínica muestra el bloque debajo del motivo original, con cada pregunta, su respuesta y «No sabe» para null` |
| R1 | ídem | `R1: el bloque indica el motor («En el teléfono») y el motivo de fin` |
| R1 | ídem | `R1: el detalle de la atención muestra el bloque para %s, con encabezado de nivel 2` (4 roles) |
| R1 | ídem | `R1: con el motor del servidor el bloque dice «En el servidor»` |
| R1 | ídem | `R1: el motivo de fin %s se muestra como «%s»` (4 valores) |
| R1 | ídem | `R1: una entrevista sin preguntas respondidas lo dice, sin una lista vacía` |
| R2 | `src/features/triage/components/redFlags.test.tsx` | `R2: la captura clínica muestra la insignia y las señales traducidas en el contexto de la atención` |
| R2 | ídem | `R2: el detalle de la atención muestra la insignia y las señales para %s` (4 roles) |
| R2 | ídem | `R2: con señales y sin entrevista (reglas del servidor sobre el motivo) la insignia se muestra igual` |
| R2 | ídem | `R2: con redFlags vacío no hay insignia en la captura ni en el detalle` |
| R2 | `src/features/reception/components/redFlags.test.tsx` | `R2: el prerregistro con señales muestra la insignia y la lista traducida dentro de su tarjeta` |
| R2 | ídem | `R2: el prerregistro sin señales no muestra la insignia` |
| R2 | `src/features/queue/components/redFlags.test.tsx` | `R2: en «En espera de triage» la fila con hasRedFlags muestra la insignia en la celda del paciente` |
| R2 | ídem | `R2: la insignia solo va en «En espera de triage», no en «Clasificadas» ni en «En atención»` |
| R2 | `src/shared/ui/RedFlagBadge.test.tsx` | `R2: muestra la insignia y la lista de señales traducida, en el orden recibido` |
| R2 | ídem | `R2: sin lista de señales (la cola solo trae hasRedFlags) muestra solo la insignia` |
| R3 | `src/features/reception/components/redFlags.test.tsx` | `R3: con señales primero (orden del servidor), la bandeja las muestra primero` |
| R3 | ídem | `R3: la web no reordena: si el servidor envía primero la que no tiene señales, se respeta` |
| R3 | `src/features/queue/components/redFlags.test.tsx` | `R3: con señales primero (orden del servidor), la fila con señales va primero aunque espere menos` |
| R3 | ídem | `R3: la web no reordena: si el servidor envía la fila con señales al final, se respeta` |
| R4 | `src/features/triage/components/SymptomInterviewBlock.test.tsx` | `R4: el bloque es informativo: sin botones, sin nivel, fuera del panel de IA y de la tarjeta de triage, y sin sus estilos` |
| R4 | ídem | `R4: con el bloque en pantalla, «Validar» y «Corregir» conservan el mismo peso visual` |
| R4 | `src/shared/ui/RedFlagBadge.test.tsx` | `R4: es una insignia informativa, sin botones ni nivel de triage` |
| R5 | `src/shared/ui/RedFlagBadge.test.tsx` | `R5: la insignia tiene alternativa textual: el texto es visible, el icono es decorativo y no depende del color` |
| R5 | ídem | `R5: los textos salen de los mensajes de Paraglide y cambian con el idioma` |
| R5 | `src/features/queue/components/redFlags.test.tsx` | `R5: la fila cita la insignia al describir «Ver atención» (alternativa textual en la fila)` |
| R5 | `src/test/f11Transversal.test.ts` | `R5: las claves nuevas existen en los cinco catálogos, con los mismos parámetros, sin vacíos y traducidas` |
| R5 | ídem | `R5: cada valor de las enumeraciones del contrato tiene su etiqueta en el catálogo` |
| R6 | `src/features/triage/components/SymptomInterviewBlock.test.tsx` | `R6: sin entrevista la captura clínica no muestra el bloque y el contexto es el de siempre` |
| R6 | ídem | `R6: sin entrevista el detalle no muestra el bloque para %s` (4 roles) |

R6 además: toda la suite anterior (fixtures con `symptomInterview: null`, `redFlags: []`, `hasRedFlags: false`) sigue en verde sin cambios de comportamiento.

## Resultados
- `npx vitest run`: **99 archivos, 1343 pruebas, todas en verde** (antes de F-11: 93 archivos, 1301).
- `npm run lint`: sin errores. `npm run typecheck`: sin errores. `npx prettier --check src messages`: OK.
- `npm run api:types`: sin diff.
- `./init.sh` (completo): `FAIL: 0 · WARN: 0 · Estado: VERDE` (lint, typecheck y tests OK).
- **Pendiente:** verificación manual en el navegador contra la API local (escritorio y ancho de tablet): prerregistro con entrevista y señal desde `../prereg.sh`/mobile, bandeja de recepción, captura clínica, detalle y `/cola`.
