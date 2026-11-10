import { readFile, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
const contract = JSON.parse(
  await readFile('../asclepio-api/openapi/asclepio-api.v1.json', 'utf8'),
);
// F-04-web D9: 0.5.0 y 0.6.0 no cambian las reglas clínicas de F-03 (revisado el 2026-11-09).
// F-05-web D11: 0.7.0 no cambia las reglas clínicas de F-03 (revisado el 2026-11-10).
if (!['0.4.0', '0.5.0', '0.6.0', '0.7.0'].includes(contract.info.version))
  throw new Error(
    'Review F-03 clinical rules before consuming another contract version.',
  );
const schemas = contract.components.schemas;
const vitals = schemas.CreateVitalSignsDto;
const rules = Object.fromEntries(
  Object.entries(vitals.properties).map(([field, schema]) => [
    field,
    {
      type: schema.type ?? 'enum',
      required: vitals.required.includes(field),
      ...(schema.minimum === undefined
        ? {}
        : { minimum: schema.minimum, maximum: schema.maximum }),
    },
  ]),
);
const findings = schemas.CreateSymptomFindingsDto.properties.items;
const description = schemas.SymptomFindingInputDto.properties.description;
// F-05-web D11: límites de la decisión de triage (CORRECT y MANUAL).
const correct = schemas.CorrectTriageDecisionRequest.properties;
const manual = schemas.ManualTriageDecisionRequest.properties;
if (
  correct.level.minimum !== manual.level.minimum ||
  correct.level.maximum !== manual.level.maximum
)
  throw new Error('CORRECT and MANUAL level limits differ.');
const decisionLimits = {
  level: { minimum: correct.level.minimum, maximum: correct.level.maximum },
  reasonMinLength: correct.reason.minLength,
  reasonMaxLength: correct.reason.maxLength,
};
const output =
  `// Generated from OpenAPI ${contract.info.version} by scripts/extract-clinical-contract.mjs. Do not edit.\n` +
  `export const VITAL_SIGN_CONTRACT = ${JSON.stringify(rules, null, 2)} as const;\n` +
  `export const CONSCIOUSNESS_LEVELS = ${JSON.stringify(schemas.ConsciousnessLevel.enum)} as const;\n` +
  `export const FINDING_KINDS = ${JSON.stringify(schemas.SymptomFindingKind.enum)} as const;\n` +
  `export const FINDING_LIMITS = ${JSON.stringify({ minItems: findings.minItems, maxItems: findings.maxItems, minLength: description.minLength, maxLength: description.maxLength })} as const;\n` +
  `export const DECISION_LIMITS = ${JSON.stringify(decisionLimits)} as const;\n`;
const target = 'src/features/triage/clinicalContract.generated.ts';
await writeFile(
  target,
  await format(output, { filepath: target, singleQuote: true }),
);
