import { z } from 'zod';

/**
 * "Motivo válido" de F-02-web (rechazo y cancelación, PA-F02-3 y PA-F02-7): de 1 a 500
 * caracteres sin espacios iniciales ni finales; la salida va ya recortada.
 */
export const reasonField = z
  .string()
  .trim()
  .min(1, { error: 'Escribe el motivo.' })
  .max(500, { error: 'El motivo admite como máximo 500 caracteres.' });

export const reasonSchema = z.object({ reason: reasonField });

export type ReasonForm = z.input<typeof reasonSchema>;
export type Reason = z.output<typeof reasonSchema>;
