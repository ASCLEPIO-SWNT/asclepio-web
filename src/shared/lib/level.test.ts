import { describe, expect, it } from 'vitest';
import { romanLevel } from './level';

describe('F-06-web nivel en números romanos', () => {
  it('R4: los niveles 1–5 se escriben I–V', () => {
    expect([1, 2, 3, 4, 5].map(romanLevel)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
    ]);
  });
});
