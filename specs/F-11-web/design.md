# F-11-web — Diseño

## Resumen

| Lugar | Qué aporta |
|---|---|
| `src/shared/api/schema.d.ts` | Se regenera con `npm run api:types` (0.11.0). |
| `src/features/triage/components/SymptomInterviewBlock.tsx` | El bloque de R1. Se usa en `ClinicalCapturePage.tsx` (después de `clinical-context__complaint`) y en `EncounterDetailPage.tsx`. |
| `src/shared/components/RedFlagBadge.tsx` | La insignia de R2. Se usa en la captura, el detalle, la bandeja de recepción y las filas `waitingTriage` de la cola. |
| `messages/es.json` | Textos, etiquetas de dimensión y de señal, y el motor. |

## Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D1 | El orden lo decide el servidor (R3). | Reordenar en el cliente. | Una sola regla, la de F-11-api R7–R8. |
| D2 | Estilo informativo neutro, con el rótulo "no verificadas". | El mismo estilo que la sugerencia de IA. | Lo dice el paciente, no la IA de triage, y no debe parecer una decisión (RNF-17). |

## Impacto en contrato
Consume 0.11.0 y regenera `schema.d.ts`. No cambian endpoints.

## Impacto en datos
Sin impacto en datos.

## Riesgos y pruebas
Vitest + Testing Library:
- con y sin entrevista;
- respuestas `null`;
- insignia en las cuatro vistas;
- orden igual al del servidor;
- accesibilidad (nombre accesible de la insignia).
