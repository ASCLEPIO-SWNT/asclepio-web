// Generated from OpenAPI 0.4.0 by scripts/extract-clinical-contract.mjs. Do not edit.
export const VITAL_SIGN_CONTRACT = {
  respiratoryRate: {
    type: 'integer',
    required: true,
    minimum: 4,
    maximum: 80,
  },
  oxygenSaturation: {
    type: 'integer',
    required: true,
    minimum: 50,
    maximum: 100,
  },
  supplementalOxygen: {
    type: 'boolean',
    required: true,
  },
  systolicBp: {
    type: 'integer',
    required: true,
    minimum: 40,
    maximum: 300,
  },
  heartRate: {
    type: 'integer',
    required: true,
    minimum: 20,
    maximum: 300,
  },
  consciousness: {
    type: 'enum',
    required: true,
  },
  temperatureC: {
    type: 'number',
    required: true,
    minimum: 25,
    maximum: 45,
  },
  diastolicBp: {
    type: 'integer',
    required: false,
    minimum: 20,
    maximum: 200,
  },
  glucoseMgDl: {
    type: 'integer',
    required: false,
    minimum: 20,
    maximum: 600,
  },
} as const;
export const CONSCIOUSNESS_LEVELS = ['A', 'C', 'V', 'P', 'U'] as const;
export const FINDING_KINDS = ['SYMPTOM', 'FINDING', 'COMPLAINT_NOTE'] as const;
export const FINDING_LIMITS = {
  minItems: 1,
  maxItems: 20,
  minLength: 1,
  maxLength: 500,
} as const;
