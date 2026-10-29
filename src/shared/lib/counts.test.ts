import { describe, expect, it } from 'vitest';
import { countOf } from './counts';

describe('UI-02-web conteos de atenciones', () => {
  it('R8: 99 atenciones son una cifra exacta y 100 llenan la página («al menos 100»)', () => {
    expect(countOf(99, 0, 100)).toEqual({ count: 99, capped: false });
    expect(countOf(100, 0, 100)).toEqual({ count: 100, capped: true });
  });

  it('R8: con menos atenciones que el límite la cifra es exacta, también 0', () => {
    expect(countOf(0, 0, 100)).toEqual({ count: 0, capped: false });
    expect(countOf(12, 0, 100)).toEqual({ count: 12, capped: false });
  });

  it('R8: la bandeja de enfermería suma el offset y se llena con 50', () => {
    expect(countOf(8, 0, 50)).toEqual({ count: 8, capped: false });
    expect(countOf(49, 0, 50)).toEqual({ count: 49, capped: false });
    expect(countOf(50, 0, 50)).toEqual({ count: 50, capped: true });
    expect(countOf(7, 100, 50)).toEqual({ count: 107, capped: false });
    expect(countOf(50, 100, 50)).toEqual({ count: 150, capped: true });
  });
});
