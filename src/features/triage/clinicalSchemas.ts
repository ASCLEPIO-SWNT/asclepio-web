import { z } from 'zod';
import {
  CONSCIOUSNESS_LEVELS,
  FINDING_KINDS,
  FINDING_LIMITS,
  VITAL_SIGN_CONTRACT,
} from './clinicalContract.generated';

export const clinicalCaptureInput = {
  respiratoryRate: '',
  oxygenSaturation: '',
  supplementalOxygen: '',
  systolicBp: '',
  heartRate: '',
  consciousness: '',
  temperatureC: '',
  diastolicBp: '',
  glucoseMgDl: '',
};
export type VitalField = keyof typeof VITAL_SIGN_CONTRACT;
export const VITAL_UNITS: Record<VitalField, string> = {
  respiratoryRate: 'rpm',
  oxygenSaturation: '%',
  supplementalOxygen: '',
  systolicBp: 'mmHg',
  heartRate: 'lpm',
  consciousness: '',
  temperatureC: '°C',
  diastolicBp: 'mmHg',
  glucoseMgDl: 'mg/dL',
};
export const VITAL_FIELDS = Object.keys(VITAL_SIGN_CONTRACT) as VitalField[];
type NumericField = Exclude<VitalField, 'supplementalOxygen' | 'consciousness'>;

function numeric(field: NumericField) {
  const rule = VITAL_SIGN_CONTRACT[field];
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (!text) {
        if (!rule.required) return undefined;
        ctx.addIssue({ code: 'custom', message: 'clinical_required' });
        return z.NEVER;
      }
      const value = Number(text);
      if (!Number.isFinite(value)) {
        ctx.addIssue({ code: 'custom', message: 'clinical_number' });
        return z.NEVER;
      }
      if (rule.type === 'integer' && !Number.isInteger(value))
        ctx.addIssue({ code: 'custom', message: 'clinical_integer' });
      // Published temperature precision and systolic coherence are explicit contract decisions.
      if (field === 'temperatureC' && value !== Math.round(value * 10) / 10)
        ctx.addIssue({
          code: 'custom',
          message: 'clinical_temperature_precision',
        });
      if (value < rule.minimum || value > rule.maximum)
        ctx.addIssue({ code: 'custom', message: `clinical_range:${field}` });
      return value;
    });
}

const requiredNumeric = (field: NumericField) =>
  numeric(field).pipe(z.number({ error: 'clinical_required' }));

export const vitalSignsSchema = z
  .object({
    respiratoryRate: requiredNumeric('respiratoryRate'),
    oxygenSaturation: requiredNumeric('oxygenSaturation'),
    supplementalOxygen: z
      .string()
      .refine((value) => value === 'true' || value === 'false', {
        error: 'clinical_required',
      })
      .transform((value) => value === 'true'),
    systolicBp: requiredNumeric('systolicBp'),
    heartRate: requiredNumeric('heartRate'),
    consciousness: z
      .string()
      .refine(
        (value) => (CONSCIOUSNESS_LEVELS as readonly string[]).includes(value),
        { error: 'clinical_required' },
      )
      .transform((value) => value as (typeof CONSCIOUSNESS_LEVELS)[number]),
    temperatureC: requiredNumeric('temperatureC'),
    diastolicBp: numeric('diastolicBp'),
    glucoseMgDl: numeric('glucoseMgDl'),
  })
  .superRefine((values, ctx) => {
    if (
      values.systolicBp !== undefined &&
      values.diastolicBp !== undefined &&
      values.systolicBp <= values.diastolicBp
    ) {
      for (const field of ['systolicBp', 'diastolicBp'])
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'clinical_pressure_order',
        });
    }
  })
  .transform(({ diastolicBp, glucoseMgDl, ...required }) => ({
    ...required,
    ...(diastolicBp === undefined ? {} : { diastolicBp }),
    ...(glucoseMgDl === undefined ? {} : { glucoseMgDl }),
  }));

export const symptomFindingsSchema = z.object({
  items: z
    .array(
      z.object({
        kind: z
          .string()
          .refine(
            (value) => (FINDING_KINDS as readonly string[]).includes(value),
            { error: 'clinical_kind_choose' },
          )
          .transform((value) => value as (typeof FINDING_KINDS)[number]),
        description: z
          .string()
          .trim()
          .min(FINDING_LIMITS.minLength, {
            error: 'clinical_description_required',
          })
          .max(FINDING_LIMITS.maxLength, { error: 'clinical_description_max' }),
      }),
    )
    .min(FINDING_LIMITS.minItems, { error: 'clinical_findings_min' })
    .max(FINDING_LIMITS.maxItems, { error: 'clinical_findings_max' }),
});
export type VitalSignsInput = z.input<typeof vitalSignsSchema>;
export type VitalSignsOutput = z.output<typeof vitalSignsSchema>;
export type SymptomFindingsInput = z.input<typeof symptomFindingsSchema>;
export type SymptomFindingsOutput = z.output<typeof symptomFindingsSchema>;
