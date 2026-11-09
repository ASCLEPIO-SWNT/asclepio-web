import { describe, expect, it } from 'vitest';
import { initialOf } from './initials';

describe('UI-04-web inicial del avatar', () => {
  it('R17: salta las palabras que terminan en «.» (títulos como «Dra.»)', () => {
    expect(initialOf('Dra. Camila Torres')).toBe('C');
    expect(initialOf('Dr. Lic. mario Pérez')).toBe('M');
  });

  it('R17: sin título, la primera letra del nombre', () => {
    expect(initialOf('Laura Gómez')).toBe('L');
    expect(initialOf('  ana  ruiz ')).toBe('A');
  });

  it('R17: si todas las palabras terminan en «.», la primera letra del nombre', () => {
    expect(initialOf('Dr.')).toBe('D');
  });
});
