import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('UI-03-web deuda de revisión', () => {
  it('R27: client.ts no declara el alias sin uso EventActorType', () => {
    expect(read('src/shared/api/client.ts')).not.toMatch(/EventActorType/);
  });

  it('R27: onCancelled de CancelEncounterForm no recibe la atención', () => {
    const source = read(
      'src/features/triage/components/CancelEncounterForm.tsx',
    );
    expect(source).toMatch(/onCancelled: \(\) => void/);
    expect(source).not.toMatch(/onCancelled\(\s*\w/);
  });

  it('R27: renderApp vive en src/test/ y no en app/router/', () => {
    expect(existsSync('src/test/testApp.tsx')).toBe(true);
    expect(existsSync('src/app/router/testApp.tsx')).toBe(false);
  });

  it('R27: los describe de problem.test.ts llevan el prefijo de la feature', () => {
    const titles = [
      ...read('src/shared/lib/problem.test.ts').matchAll(
        /describe\('([^']+)'/g,
      ),
    ].map((match) => match[1]);
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) expect(title).toMatch(/^F-0[12]-web /);
  });
});
