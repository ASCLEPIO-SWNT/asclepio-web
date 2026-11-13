import { z } from 'zod';

/** Clave del mensaje de un campo de fecha vacío o inválido (R7); la vista la traduce. */
export const DATE_INVALID_KEY = 'reports_date_invalid';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` que además es una fecha real del calendario (no el 31 de abril). */
function isCivilDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const civilDate = z.string().refine(isCivilDate, { error: DATE_INVALID_KEY });

/**
 * Formulario del periodo (F-07-web D10; R7, PA-6 a): solo comprueba que «Desde» y «Hasta» sean
 * fechas `YYYY-MM-DD` reales. El orden y el máximo de 366 días los valida la API (R8). La sede
 * vacía es «Todas las sedes» (`null`).
 */
export const periodSchema = z.object({
  from: civilDate,
  to: civilDate,
  siteId: z.string().transform((value) => (value === '' ? null : value)),
});
export type PeriodForm = z.input<typeof periodSchema>;
export type PeriodValues = z.output<typeof periodSchema>;
