import { describe, expect, it } from 'vitest';
import {
  arrivalSchema,
  nnPatientSchema,
  patientSearchSchema,
  patientWithDocumentSchema,
  reasonSchema,
  toCreatePatientBody,
} from './schemas';

const messages = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) =>
  Object.fromEntries(
    (result.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]),
  );

describe('esquemas de recepción', () => {
  it('R15: el motivo se recorta y admite de 1 a 500 caracteres', () => {
    expect(reasonSchema.parse({ reason: '  ok  ' })).toEqual({ reason: 'ok' });
    expect(reasonSchema.safeParse({ reason: 'a'.repeat(500) }).success).toBe(
      true,
    );
    expect(messages(reasonSchema.safeParse({ reason: '  ' }))).toEqual({
      reason: 'Escribe el motivo.',
    });
    expect(
      messages(reasonSchema.safeParse({ reason: 'a'.repeat(501) })),
    ).toEqual({
      reason: 'El motivo admite como máximo 500 caracteres.',
    });
  });

  it('R18: la búsqueda exige tipo y número de 1 a 64 caracteres recortado', () => {
    expect(
      patientSearchSchema.parse({ documentType: 'TI', documentNumber: ' 12 ' }),
    ).toEqual({ documentType: 'TI', documentNumber: '12' });
    expect(
      messages(
        patientSearchSchema.safeParse({
          documentType: 'XX',
          documentNumber: '',
        }),
      ),
    ).toEqual({
      documentType: 'Elige el tipo de documento.',
      documentNumber: 'Escribe el número de documento.',
    });
    expect(
      messages(
        patientSearchSchema.safeParse({
          documentType: 'CC',
          documentNumber: '1'.repeat(65),
        }),
      ),
    ).toEqual({
      documentNumber:
        'El número de documento admite como máximo 64 caracteres.',
    });
  });

  it('R21: el alta con documento exige nombre, fecha y sexo', () => {
    expect(
      messages(
        patientWithDocumentSchema.safeParse({
          documentType: 'CC',
          documentNumber: '1',
          fullName: ' ',
          birthDate: '',
          sex: '',
        }),
      ),
    ).toEqual({
      fullName: 'Escribe el nombre.',
      birthDate: 'Escribe la fecha de nacimiento.',
      sex: 'Elige el sexo.',
    });
  });

  it.each([
    [
      { ageMode: '' },
      { ageMode: 'Indica la fecha de nacimiento o la edad estimada.' },
    ],
    [
      { ageMode: 'birthDate', birthDate: '' },
      { birthDate: 'Escribe la fecha de nacimiento.' },
    ],
    [
      { ageMode: 'estimatedAge', estimatedAgeYears: '121' },
      {
        estimatedAgeYears:
          'La edad estimada debe ser un número entero entre 0 y 120.',
      },
    ],
    [
      { ageMode: 'estimatedAge', estimatedAgeYears: '2.5' },
      {
        estimatedAgeYears:
          'La edad estimada debe ser un número entero entre 0 y 120.',
      },
    ],
    [{ ageMode: 'estimatedAge', estimatedAgeYears: '0' }, {}],
    [{ ageMode: 'estimatedAge', estimatedAgeYears: '120' }, {}],
    [
      {
        fullName: 'n'.repeat(201),
        ageMode: 'estimatedAge',
        estimatedAgeYears: '3',
      },
      { fullName: 'El nombre admite como máximo 200 caracteres.' },
    ],
  ] as [Partial<Record<string, string>>, Record<string, string>][])(
    'R21: alta NN %o → %o',
    (partial, expected) => {
      const values: Record<string, string | undefined> = {
        fullName: '',
        ageMode: '',
        birthDate: '',
        estimatedAgeYears: '',
        sex: 'F',
        ...partial,
      };
      expect(messages(nnPatientSchema.safeParse(values))).toEqual(expected);
    },
  );

  it('R22: el cuerpo con documento lleva solo sus cinco campos', () => {
    expect(
      toCreatePatientBody({
        mode: 'document',
        values: {
          documentType: 'PA',
          documentNumber: 'X1',
          fullName: 'Ana',
          birthDate: '2000-02-29',
          sex: 'F',
        },
      }),
    ).toEqual({
      documentType: 'PA',
      documentNumber: 'X1',
      fullName: 'Ana',
      birthDate: '2000-02-29',
      sex: 'F',
    });
  });

  it('R22: el cuerpo NN lleva sex, exactamente uno de birthDate o estimatedAgeYears y fullName solo si no está vacío', () => {
    const base = {
      fullName: '  ',
      birthDate: '1990-01-01',
      estimatedAgeYears: '30',
      sex: 'X',
    };
    expect(
      toCreatePatientBody({
        mode: 'nn',
        values: { ...base, ageMode: 'birthDate' },
      }),
    ).toEqual({
      sex: 'X',
      birthDate: '1990-01-01',
    });
    expect(
      toCreatePatientBody({
        mode: 'nn',
        values: { ...base, fullName: ' Juan ', ageMode: 'estimatedAge' },
      }),
    ).toEqual({ sex: 'X', estimatedAgeYears: 30, fullName: 'Juan' });
  });

  it('R25: la llegada exige sede y un motivo de consulta de 1 a 2000 caracteres recortado', () => {
    expect(
      arrivalSchema.parse({ siteId: 's', chiefComplaintText: ' dolor ' }),
    ).toEqual({
      siteId: 's',
      chiefComplaintText: 'dolor',
    });
    expect(
      messages(
        arrivalSchema.safeParse({ siteId: '', chiefComplaintText: ' ' }),
      ),
    ).toEqual({
      siteId: 'Elige la sede.',
      chiefComplaintText: 'Escribe el motivo de consulta.',
    });
    expect(
      messages(
        arrivalSchema.safeParse({
          siteId: 's',
          chiefComplaintText: 'a'.repeat(2001),
        }),
      ),
    ).toEqual({
      chiefComplaintText:
        'El motivo de consulta admite como máximo 2000 caracteres.',
    });
  });
});
