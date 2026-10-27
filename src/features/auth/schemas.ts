import { z } from 'zod';

/** Formulario de login (design.md D10). Sin la política de 10 caracteres: eso es al crear contraseñas. */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { error: 'Escribe tu correo.' })
    .pipe(z.email({ error: 'Escribe un correo válido.' })),
  password: z.string().min(1, { error: 'Escribe tu contraseña.' }).max(128, {
    error: 'La contraseña no puede tener más de 128 caracteres.',
  }),
});

export type LoginForm = z.infer<typeof loginSchema>;
