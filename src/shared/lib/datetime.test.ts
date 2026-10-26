import { describe, expect, it } from 'vitest';
import { formatBogota } from './datetime';

describe('formatBogota', () => {
  it('convierte UTC a America/Bogota (UTC-5)', () => {
    // 00:42 UTC del 27/10 = 7:42 p. m. del 26/10 en Bogotá (el caso de ejemplo).
    const s = formatBogota('2026-10-27T00:42:00.000Z');
    expect(s).toContain('26/10/26');
    expect(s).toMatch(/7:42:00/);
  });
});
