import { z } from 'zod';
import type { CreatePatient, DocumentType, Sex } from '../../shared/api/client';
import { DOCUMENT_TYPES, SEXES } from '../../shared/lib/labels';

export {
  reasonSchema,
  type Reason,
  type ReasonForm,
} from '../../shared/lib/reason';

/** Un valor de `values` (los `<select>` empiezan en ''), con el mensaje de "elige". */
function oneOf<T extends string>(values: readonly T[], message: string) {
  return z
    .string()
    .refine((v) => (values as readonly string[]).includes(v), {
      error: message,
    })
    .transform((v) => v as T);
}

const BIRTH_DATE_MESSAGE = 'Escribe la fecha de nacimiento.';
const AGE_MESSAGE = 'La edad estimada debe ser un número entero entre 0 y 120.';
const NAME_MAX_MESSAGE = 'El nombre admite como máximo 200 caracteres.';
const SEX_MESSAGE = 'Elige el sexo.';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const documentTypeField = oneOf<DocumentType>(
  DOCUMENT_TYPES,
  'Elige el tipo de documento.',
);
const documentNumberField = z
  .string()
  .trim()
  .min(1, { error: 'Escribe el número de documento.' })
  .max(64, {
    error: 'El número de documento admite como máximo 64 caracteres.',
  });

/** Búsqueda por documento (R18, R19). */
export const patientSearchSchema = z.object({
  documentType: documentTypeField,
  documentNumber: documentNumberField,
});
export type PatientSearchForm = z.input<typeof patientSearchSchema>;
export type PatientSearch = z.output<typeof patientSearchSchema>;

/** Alta con documento (R20, R21; PA-F02-1): nombre y fecha obligatorios. */
export const patientWithDocumentSchema = z.object({
  documentType: documentTypeField,
  documentNumber: documentNumberField,
  fullName: z
    .string()
    .trim()
    .min(1, { error: 'Escribe el nombre.' })
    .max(200, { error: NAME_MAX_MESSAGE }),
  birthDate: z.string().regex(ISO_DATE, { error: BIRTH_DATE_MESSAGE }),
  sex: oneOf<Sex>(SEXES, SEX_MESSAGE),
});
export type PatientWithDocumentForm = z.input<typeof patientWithDocumentSchema>;
export type PatientWithDocument = z.output<typeof patientWithDocumentSchema>;

/**
 * Alta NN (R20, R21; PA-F02-1): nombre opcional y exactamente una de fecha de nacimiento
 * o edad estimada. Todo se valida en un solo paso para mostrar a la vez cada error.
 */
export const nnPatientSchema = z
  .object({
    fullName: z.string(),
    ageMode: z.string(),
    birthDate: z.string(),
    estimatedAgeYears: z.string(),
    sex: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.fullName.trim().length > 200) {
      ctx.addIssue({
        code: 'custom',
        path: ['fullName'],
        message: NAME_MAX_MESSAGE,
      });
    }
    if (v.ageMode === 'birthDate') {
      if (!ISO_DATE.test(v.birthDate)) {
        ctx.addIssue({
          code: 'custom',
          path: ['birthDate'],
          message: BIRTH_DATE_MESSAGE,
        });
      }
    } else if (v.ageMode === 'estimatedAge') {
      const age = v.estimatedAgeYears.trim();
      if (!/^\d+$/.test(age) || Number(age) > 120) {
        ctx.addIssue({
          code: 'custom',
          path: ['estimatedAgeYears'],
          message: AGE_MESSAGE,
        });
      }
    } else {
      ctx.addIssue({
        code: 'custom',
        path: ['ageMode'],
        message: 'Indica la fecha de nacimiento o la edad estimada.',
      });
    }
    if (!(SEXES as readonly string[]).includes(v.sex)) {
      ctx.addIssue({ code: 'custom', path: ['sex'], message: SEX_MESSAGE });
    }
  });
export type NnPatientForm = z.input<typeof nnPatientSchema>;

export type PatientFormInput =
  | { mode: 'document'; values: PatientWithDocument }
  | { mode: 'nn'; values: NnPatientForm };

/** Cuerpo exacto de `POST /patients` por modo (R22). */
export function toCreatePatientBody(input: PatientFormInput): CreatePatient {
  if (input.mode === 'document') {
    const { documentType, documentNumber, fullName, birthDate, sex } =
      input.values;
    return { documentType, documentNumber, fullName, birthDate, sex };
  }
  const { fullName, ageMode, birthDate, estimatedAgeYears, sex } = input.values;
  const body: CreatePatient = { sex: sex as Sex };
  if (ageMode === 'birthDate') body.birthDate = birthDate;
  else body.estimatedAgeYears = Number(estimatedAgeYears.trim());
  const name = fullName.trim();
  if (name) body.fullName = name;
  return body;
}

/** Registro de la llegada (R25, R26). */
export const arrivalSchema = z.object({
  siteId: z
    .string({ error: 'Elige la sede.' })
    .min(1, { error: 'Elige la sede.' }),
  chiefComplaintText: z
    .string()
    .trim()
    .min(1, { error: 'Escribe el motivo de consulta.' })
    .max(2000, {
      error: 'El motivo de consulta admite como máximo 2000 caracteres.',
    }),
});
export type ArrivalForm = z.input<typeof arrivalSchema>;
export type Arrival = z.output<typeof arrivalSchema>;
