import { readFile, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
const contract = JSON.parse(
  await readFile('../asclepio-api/openapi/asclepio-api.v1.json', 'utf8'),
);
if (contract.info.version !== '0.4.0')
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
const output =
  '// Generated from OpenAPI 0.4.0 by scripts/extract-clinical-contract.mjs. Do not edit.\n' +
  `export const VITAL_SIGN_CONTRACT = ${JSON.stringify(rules, null, 2)} as const;\n` +
  `export const CONSCIOUSNESS_LEVELS = ${JSON.stringify(schemas.ConsciousnessLevel.enum)} as const;\n` +
  `export const FINDING_KINDS = ${JSON.stringify(schemas.SymptomFindingKind.enum)} as const;\n` +
  `export const FINDING_LIMITS = ${JSON.stringify({ minItems: findings.minItems, maxItems: findings.maxItems, minLength: description.minLength, maxLength: description.maxLength })} as const;\n`;
const target = 'src/features/triage/clinicalContract.generated.ts';
await writeFile(
  target,
  await format(output, { filepath: target, singleQuote: true }),
);
