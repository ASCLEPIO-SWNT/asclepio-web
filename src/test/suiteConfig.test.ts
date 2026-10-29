import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = readFileSync('vite.config.ts', 'utf8');

describe('UI-03-web suite estable', () => {
  it('R28: la estabilidad no se consigue subiendo el tiempo de espera global de Vitest', () => {
    expect(config).not.toMatch(/testTimeout|hookTimeout/);
    // D19: la medida aplicada es limitar la contención de CPU.
    expect(config).toMatch(/maxWorkers:\s*'50%'/);
  });
});
