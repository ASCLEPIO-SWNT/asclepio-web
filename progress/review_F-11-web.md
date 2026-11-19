# Revisión F-11-web — Respuestas de la entrevista y señales de alarma

- **Rama:** `feature/F-11-web` · `git diff origin/develop...HEAD` (5 commits: `35b3e61`, `19e9584`, `c5a72ac`, `4c28bb9`, `ddba682`).
- **Fecha:** 2026-11-19 · **Reviewer**

## Veredicto: APROBADO (pendiente solo T5 manual, que hace el humano)

El código, las pruebas y el contrato cumplen R1–R6 y C1–C8. No se marca `done` hasta que el humano haga la verificación manual de T5 contra la API local y la tarea quede `[x]`. Esa verificación se dejó al humano a propósito y no es motivo de rechazo.

## Comandos ejecutados
- `./init.sh` (completo): `FAIL: 0 · WARN: 0 · Estado: VERDE`, exit 0 (lint, typecheck y tests OK).
- `npx vitest run` sobre las 6 suites de F-11 (`SymptomInterviewBlock.test.tsx`, `triage/components/redFlags.test.tsx`, `reception/components/redFlags.test.tsx`, `queue/components/redFlags.test.tsx`, `shared/ui/RedFlagBadge.test.tsx`, `test/f11Transversal.test.ts`): 6 archivos, 42 pruebas en verde.
- `npm run api:types`: sin diff en `src/` (`git status --short` muestra solo `feature_list.json` y los dos archivos de progress).
- `grep` de `.sort`, `toSorted` y `localeCompare` en `src/features/{queue,reception}` (sin pruebas): ningún resultado.
- `grep` de `console.`, `localStorage`, `TODO`, `FIXME` y `debugger` en los archivos tocados: ninguno en el código de la aplicación.

## Foco pedido
- [x] **Bloque bajo el motivo en la captura:** `ClinicalCapturePage.tsx` va justo después del `div` del motivo (`clinical-context__complaint`) y antes de las acciones (h3).
- [x] **Bloque en el detalle:** `EncounterDetailPage.tsx` va después del `dl` de datos de la atención (donde está el motivo) y antes de «Paciente» (h2). Observación: va después del `dl` y no dentro del `dd` del motivo. Es razonable semánticamente.
- [x] **Contenido del bloque:** `SymptomInterviewBlock.tsx` muestra cada turno (dimensión, pregunta y respuesta), `null` como `interview_unknown` («No sabe / prefirió no responder»), el motor (`INTERVIEW_ENGINE_LABELS`) y el motivo de fin (`INTERVIEW_ENDED_LABELS`). Para `turns: []` muestra un texto propio. Pruebas: `R1:` ×12.
- [x] **R6, vista sin cambios sin entrevista:** el bloque solo se monta con `symptomInterview` truthy. Los fixtures base (`fakeApi.ts`, `queueFixtures.ts`) usan `null`, `[]` y `false`, y toda la suite anterior sigue verde. Pruebas: `R6:` ×5.
- [x] **Insignia en las cuatro vistas:**
  - captura (`ClinicalCapturePage.tsx`);
  - detalle (`EncounterDetailPage.tsx`, en el `dd` del motivo);
  - bandeja (`PreRegistrationCard.tsx`, en el dato «Motivo»);
  - cola (`QueueSection.tsx`, solo `section.id === 'waiting' && item.hasRedFlags`).

  Las señales se traducen con `RED_FLAG_LABELS`. La cola no muestra la lista porque `QueueItemDto` 0.11.0 solo trae `hasRedFlags`; lo comprobé con `jq` en el contrato. Es una desviación justificada por el contrato. Pruebas: `R2:` ×13.
- [x] **R3, sin reordenar:** no hay ordenación en el cliente. Las pruebas `R3:` (×4) cubren los dos órdenes posibles del servidor en la bandeja y en la cola.
- [x] **R4 / RNF-17:**
  - El bloque usa `.interview-block`, neutro: borde continuo y fondo `--card`, distinto del `card suggestion-panel` de la IA y de la tarjeta de triage.
  - Lleva la nota «No es una valoración clínica ni una sugerencia de triage». No tiene botones ni nivel.
  - La insignia usa `StatusBadge` tono `error` con icono y texto; los niveles de la cola usan `neutral`, así que no se confunde con un nivel.
  - La prueba `R4:` comprueba que «Validar» y «Corregir» tienen la misma clase `button button--secondary` con el bloque en pantalla.
- [x] **Accesibilidad:**
  - La insignia tiene texto visible («Señal de alarma referida por el paciente»), el icono es `aria-hidden` y la lista lleva `aria-label`.
  - En la cola, «Ver atención» cita la celda del paciente con `aria-describedby`, así que el nombre accesible incluye la insignia.
  - El bloque es una `section` con `aria-labelledby`.
  - Pruebas: `R5:` en `RedFlagBadge.test.tsx` y en `queue/redFlags.test.tsx`.
- [x] **Mensajes completos:** 30 claves `interview_*` y `red_flag_*` en `messages/features/{es,en,pt,fr,de}.json` (30/30/30/30/30). Lo comprueba `f11Transversal.test.ts` (`R5:`), que también exige una etiqueta por cada valor de los enums del contrato.
- [x] **Contrato:**
  - `consumes_contract: "0.11.0"`, igual que `info.version` 0.11.0.
  - `CONSUMED_CONTRACT` y `EXPECTED_CONTRACT` = 0.11.0.
  - `schema.d.ts` está regenerado, sin diff, con la huella actualizada en `contractBaseline.ts`.
  - La guarda de `extract-clinical-contract.mjs` admite 0.11.0, con un comentario de revisión.
- [x] **Privacidad:**
  - No hay logs, `localStorage` ni datos en la URL.
  - Los fixtures de la entrevista son sintéticos (sin nombre ni documento).
  - `modelId` no se muestra.

## Checkpoints

### C1 — Harness
- [x] Archivos base presentes e `init.sh` ejecutable (`init.sh` §2 OK).
- [x] Docs presentes (`init.sh` §2 OK).
- [x] `./init.sh` termina con exit 0.

### C2 — Estado
- [x] Una sola feature `in_progress` (F-11-web; `init.sh` §3: done 13, in_progress 1).
- [x] Las features `done` tienen sus pruebas en verde (suite completa en verde).
- [x] `progress/current/` contiene solo `F-11-web.md` (además de `.gitkeep`).

### C3 — Arquitectura
- [x] Se respeta `app/`, `features/` y `shared/`. `RedFlagBadge` vive en `src/shared/ui/`, no en `shared/components` (esa carpeta no existe; `architecture.md` usa `shared/ui`). La desviación del design.md está justificada.
- [x] Ninguna feature importa de otra: el bloque está en `triage/` y lo usan las páginas de `triage/`; la insignia compartida está en `shared/ui`.
- [x] No hay HTTP nuevo; los tipos vienen de `shared/api/client.ts`.
- [x] No hay dependencias nuevas (los iconos son `@heroicons`, que ya estaban).
- [x] No hay `console.log` ni TODOs.

### C4 — Verificación
- [x] Las pruebas usan Testing Library por roles y texto (`getByRole('region')`, `getByRole('button')`, listas).
- [x] El HTTP se simula con `fakeApi.ts` en la frontera de red, con fixtures que siguen el contrato.
- [x] `npm test` en verde (init.sh); el implementer informa 1343 pruebas.

### C5 — Cierre de sesión
- [x] No hay archivos sin trackear sospechosos: solo `progress/current/F-11-web.md` y `progress/impl_F-11-web.md`, más el cambio de estado en `feature_list.json`.
- [ ] `progress/history.md` aún no tiene la entrada de F-11-web. Corresponde al cierre (leader), después de T5.
- [x] El estado es correcto para este punto (`in_progress`; no puede pasar a `done` hasta que T5 esté hecha).

### C6 — SDD
- [x] `specs/F-11-web/{requirements,design,tasks}.md` existen.
- [x] Los requisitos usan EARS y R1–R6 están trazados a F-11.AC6 y AC7.
- [ ] Tareas: T1–T4 `[x]`; T5 `[ ]` por la verificación manual que se dejó al humano. No bloquea esta revisión, pero sí bloquea `done`.
- [x] Cada R1–R6 tiene pruebas `R<n>:` que pasan (R1 ×12, R2 ×13, R3 ×4, R4 ×3, R5 ×5, R6 ×5).

### C7 — Seguridad clínica y privacidad
- [x] El bloque y la insignia no fijan ni proponen un nivel. Las señales no cambian el nivel sugerido (PA-F11-2).
- [x] «Validar» y «Corregir» tienen el mismo peso (prueba `R4:`).
- [x] Sin cambios en la validación de «Corregir»: el flujo de F-05 no se toca y la suite está en verde.
- [x] Sin cambios en el triage manual.
- [x] No hay datos personales en `console`, `localStorage` ni en las URL.
- [x] Sin horas nuevas que mostrar.

### C8 — Contrato
- [x] `consumes_contract` 0.11.0 coincide con `info.version` 0.11.0.
- [x] `npm run api:types` no produce diff.
- [x] Sin cambios en el manejo de `problem+json` (no hay endpoints nuevos).

## Pendiente para el humano (T5)
Verificación manual en el navegador contra la API local (escritorio y ancho de tablet), con un prerregistro con entrevista y señal de alarma (`../prereg.sh` o la app mobile):
1. En la bandeja de recepción: la insignia con su lista, y que la entrada con señales salga primero.
2. En la captura clínica: el bloque bajo el motivo, con «No sabe» para las respuestas `null`, el motor y el motivo de fin.
3. En el detalle de la atención: el bloque y la insignia.
4. En `/cola`, «En espera de triage»: la insignia y el orden del servidor.

Cuando esté hecha, marcar T5 `[x]` y añadir la entrada en `progress/history.md`.

## Observaciones (no bloquean)
1. En el detalle, el bloque va después del `dl` de datos de la atención y no justo bajo el `dd` del motivo. Si el humano lo quiere pegado al motivo, es un ajuste de maquetación.
2. Las desviaciones del design.md que declaró el implementer (insignia en `shared/ui`, cinco catálogos, cola sin lista) quedan aceptadas por las razones de arriba. Conviene reflejarlas en `design.md` al cerrar.
