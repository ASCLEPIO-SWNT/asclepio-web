import { describe, expect, it } from 'vitest';
import { loginSchema } from './schemas';

const messages = (input: unknown) => {
  const result = loginSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('loginSchema', () => {
  it('R2: exige correo y contraseña', () => {
    expect(messages({ email: '', password: '' })).toEqual([
      'email: Escribe tu correo.',
      'password: Escribe tu contraseña.',
    ]);
  });

  it('R2: rechaza un correo sin formato de correo', () => {
    expect(messages({ email: 'enfermera', password: 'x' })).toEqual([
      'email: Escribe un correo válido.',
    ]);
  });

  it('R2: rechaza contraseñas de más de 128 caracteres y acepta 128', () => {
    expect(
      messages({ email: 'a@ips.example', password: 'x'.repeat(129) }),
    ).toEqual([
      'password: La contraseña no puede tener más de 128 caracteres.',
    ]);
    expect(
      messages({ email: 'a@ips.example', password: 'x'.repeat(128) }),
    ).toEqual([]);
  });

  it('R2: no aplica la política de 10 caracteres en el login (D10)', () => {
    expect(messages({ email: 'a@ips.example', password: 'corta' })).toEqual([]);
  });
});
