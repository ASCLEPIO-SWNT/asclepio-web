/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  clinicalCaptureInput,
  vitalSignsSchema,
  symptomFindingsSchema,
} from './clinicalSchemas';
import { VITAL_SIGN_CONTRACT } from './clinicalContract.generated';

const valid = {
  respiratoryRate: '18',
  oxygenSaturation: '98',
  supplementalOxygen: 'false',
  systolicBp: '120',
  heartRate: '80',
  consciousness: 'A',
  temperatureC: '36.7',
  diastolicBp: '',
  glucoseMgDl: '',
};
const numeric = [
  'respiratoryRate',
  'oxygenSaturation',
  'systolicBp',
  'heartRate',
  'temperatureC',
  'diastolicBp',
  'glucoseMgDl',
] as const;

describe('F-03 clinical validation from contract', () => {
  it('R7: publishes the seven required and two optional signs from the published OpenAPI contract', () => {
    const contract = JSON.parse(
      readFileSync('../asclepio-api/openapi/asclepio-api.v1.json', 'utf8'),
    ) as {
      info: { version: string };
      components: {
        schemas: {
          CreateVitalSignsDto: {
            required: string[];
            properties: Record<
              string,
              { type?: string; minimum?: number; maximum?: number }
            >;
          };
        };
      };
    };
    const published = contract.components.schemas.CreateVitalSignsDto;
    expect(Object.keys(VITAL_SIGN_CONTRACT)).toEqual(
      Object.keys(published.properties),
    );
    for (const field of numeric) {
      expect(VITAL_SIGN_CONTRACT[field].minimum).toBe(
        published.properties[field].minimum,
      );
      expect(VITAL_SIGN_CONTRACT[field].maximum).toBe(
        published.properties[field].maximum,
      );
      expect(VITAL_SIGN_CONTRACT[field].required).toBe(
        published.required.includes(field),
      );
    }
    expect(
      Object.values(VITAL_SIGN_CONTRACT).filter((field) => field.required),
    ).toHaveLength(7);
  });

  it('R8: requires every published mandatory field without converting blank values to zero', () => {
    for (const [field, definition] of Object.entries(VITAL_SIGN_CONTRACT)) {
      if (!definition.required) continue;
      const result = vitalSignsSchema.safeParse({ ...valid, [field]: '' });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(
          result.error.issues.some((issue) => issue.path[0] === field),
        ).toBe(true);
    }
  });

  it.each(numeric)(
    'R8: enforces inclusive limits and integer/decimal shape for %s',
    (field) => {
      const rule = VITAL_SIGN_CONTRACT[field];
      for (const boundary of [rule.minimum, rule.maximum]) {
        expect(
          vitalSignsSchema.safeParse({
            ...valid,
            systolicBp: '300',
            [field]: String(boundary),
          }).success,
        ).toBe(true);
      }
      const step = field === 'temperatureC' ? 0.1 : 1;
      for (const value of [rule.minimum - step, rule.maximum + step])
        expect(
          vitalSignsSchema.safeParse({ ...valid, [field]: String(value) })
            .success,
        ).toBe(false);
      expect(
        vitalSignsSchema.safeParse({
          ...valid,
          [field]:
            field === 'temperatureC' ? '36.75' : String(rule.minimum + 0.5),
        }).success,
      ).toBe(false);
      expect(
        vitalSignsSchema.safeParse({ ...valid, [field]: 'not a number' })
          .success,
      ).toBe(false);
    },
  );

  it('R8: enforces consciousness, explicit oxygen choice and systolic greater than diastolic', () => {
    expect(
      vitalSignsSchema.safeParse({ ...valid, temperatureC: '36.7000000001' })
        .success,
    ).toBe(false);
    expect(
      vitalSignsSchema.safeParse({ ...valid, supplementalOxygen: '' }).success,
    ).toBe(false);
    expect(
      vitalSignsSchema.safeParse({ ...valid, consciousness: 'G' }).success,
    ).toBe(false);
    for (const value of ['120', '121']) {
      const result = vitalSignsSchema.safeParse({
        ...valid,
        diastolicBp: value,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
          expect.arrayContaining(['systolicBp', 'diastolicBp']),
        );
    }
  });

  it('R9: omits blank optional values and preserves false and numeric values', () => {
    expect(vitalSignsSchema.parse(valid)).toEqual({
      respiratoryRate: 18,
      oxygenSaturation: 98,
      supplementalOxygen: false,
      systolicBp: 120,
      heartRate: 80,
      consciousness: 'A',
      temperatureC: 36.7,
    });
    expect(
      vitalSignsSchema.parse({
        ...valid,
        diastolicBp: '75',
        glucoseMgDl: '100',
      }),
    ).toMatchObject({ diastolicBp: 75, glucoseMgDl: 100 });
  });

  it('R11: validates one to twenty findings, allowed kind, trimmed text and length', () => {
    const finding = { kind: 'SYMPTOM', description: '  Dolor José Müller  ' };
    expect(symptomFindingsSchema.parse({ items: [finding] })).toEqual({
      items: [{ kind: 'SYMPTOM', description: 'Dolor José Müller' }],
    });
    expect(
      symptomFindingsSchema.safeParse({
        items: Array.from({ length: 20 }, () => finding),
      }).success,
    ).toBe(true);
    expect(
      symptomFindingsSchema.safeParse({
        items: Array.from({ length: 21 }, () => finding),
      }).success,
    ).toBe(false);
    for (const items of [
      [],
      [{ ...finding, description: ' ' }],
      [{ ...finding, description: 'x'.repeat(501) }],
      [{ ...finding, kind: '' }],
    ])
      expect(symptomFindingsSchema.safeParse({ items }).success).toBe(false);
    expect(
      symptomFindingsSchema.safeParse({
        items: [{ ...finding, description: 'x'.repeat(500) }],
      }).success,
    ).toBe(true);
  });

  it('R12: permits complaint notes without producing a chief complaint mutation', () => {
    expect(
      symptomFindingsSchema.parse({
        items: [{ kind: 'COMPLAINT_NOTE', description: 'Nueva precisión' }],
        chiefComplaintText: 'forbidden',
      }),
    ).toEqual({
      items: [{ kind: 'COMPLAINT_NOTE', description: 'Nueva precisión' }],
    });
  });

  it('R20: form defaults have no selected choices, clinical values or legal metadata', () => {
    expect(
      Object.values(clinicalCaptureInput).every((value) => value === ''),
    ).toBe(true);
    const body = vitalSignsSchema.parse({
      ...valid,
      recordedAt: 'never',
      recordedBy: 'never',
      tenantId: 'never',
      encounterId: 'never',
    });
    expect(Object.keys(body)).toEqual([
      'respiratoryRate',
      'oxygenSaturation',
      'supplementalOxygen',
      'systolicBp',
      'heartRate',
      'consciousness',
      'temperatureC',
    ]);
  });
});
