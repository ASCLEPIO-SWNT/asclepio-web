import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * UI-04-web: lo que jsdom no calcula (márgenes, rejillas, colores) se fija sobre la fuente de
 * `index.css`, como en `dashboardStyles.test.ts` (D18 de UI-02-web). La medida real en el
 * navegador va en `progress/impl_UI-04-web.md`.
 */
const source = readFileSync('src/index.css', 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

interface Rule {
  at: string[];
  selector: string;
  decls: [property: string, value: string][];
}

const squash = (text: string) => text.trim().replace(/\s+/g, ' ');

function parse(css: string, at: string[] = []): Rule[] {
  const rules: Rule[] = [];
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf('{', index);
    if (open === -1) break;
    const prelude = squash(css.slice(index, open));
    let depth = 1;
    let end = open + 1;
    while (end < css.length && depth > 0) {
      if (css[end] === '{') depth += 1;
      else if (css[end] === '}') depth -= 1;
      end += 1;
    }
    const body = css.slice(open + 1, end - 1);
    if (/^@(media|container|supports|keyframes)/.test(prelude)) {
      rules.push(...parse(body, [...at, prelude]));
    } else {
      rules.push({
        at,
        selector: prelude,
        decls: body
          .split(';')
          .map((d) => d.trim())
          .filter(Boolean)
          .map((d) => {
            const colon = d.indexOf(':');
            return [d.slice(0, colon).trim(), squash(d.slice(colon + 1))];
          }),
      });
    }
    index = end;
  }
  return rules;
}

const rules = parse(source);
const selectorsOf = (rule: Rule) =>
  rule.selector.split(',').map((s) => squash(s));

/** Reglas con ese selector, fuera de toda regla @ o dentro de la regla @ dada. */
function rulesOf(selector: string, at: string | null = null) {
  return rules.filter(
    (rule) =>
      selectorsOf(rule).includes(selector) &&
      (at === null ? rule.at.length === 0 : rule.at.includes(at)),
  );
}
function valueOf(selector: string, property: string, at: string | null = null) {
  return rulesOf(selector, at)
    .flatMap((rule) =>
      rule.decls.filter(([name]) => name === property).map(([, v]) => v),
    )
    .at(-1);
}

/** Sin colores literales en las declaraciones de las reglas de este slice (R19). */
function expectNoLiteralColors(selector: string, at: string | null = null) {
  const found = rulesOf(selector, at);
  expect(found.length, selector).toBeGreaterThan(0);
  for (const rule of found)
    for (const [property, value] of rule.decls) {
      const context = `${selector} { ${property}: ${value} }`;
      expect(value, context).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(value, context).not.toMatch(
        /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/i,
      );
      expect(value, context).not.toMatch(
        /\b(?:white|black|red|green|blue|yellow|gray|grey)\b/i,
      );
    }
}

describe('UI-04-web hoja de estilos', () => {
  it('R4: el bloque de cancelación se separa del título «Línea de tiempo» con 1,5 rem de margen inferior', () => {
    expect(valueOf('.cancel', 'margin')).toBe('1.5rem 0');
  });

  it('R9: .form-grid comparte las dos reglas de .clinical-fields (dos columnas; una bajo 640 px)', () => {
    const base = rulesOf('.clinical-fields');
    expect(base.some((rule) => selectorsOf(rule).includes('.form-grid'))).toBe(
      true,
    );
    expect(valueOf('.form-grid', 'grid-template-columns')).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
    const narrow = '@media (max-width: 639px)';
    expect(
      rulesOf('.clinical-fields', narrow).some((rule) =>
        selectorsOf(rule).includes('.form-grid'),
      ),
    ).toBe(true);
    expect(valueOf('.form-grid', 'grid-template-columns', narrow)).toBe(
      'minmax(0, 1fr)',
    );
  });

  it('R9: los campos de solo lectura se ven como texto, sin borde ni fondo', () => {
    expect(valueOf('.field input[readonly]', 'border-color')).toBe(
      'transparent',
    );
    expect(valueOf('.field input[readonly]', 'background')).toBe('transparent');
    expect(valueOf('.field input[readonly]', 'padding-inline')).toBe('0');
    expectNoLiteralColors('.field input[readonly]');
    // Después del hover y del aria-invalid: gana por orden con la misma especificidad.
    const order = (selector: string) =>
      rules.findIndex((rule) => selectorsOf(rule).includes(selector));
    expect(order('.field input[readonly]')).toBeGreaterThan(
      order('.field input:hover'),
    );
  });

  it('R13: «Quitar elemento N» se ajusta a su texto y se alinea al inicio del elemento', () => {
    expect(valueOf('.clinical-finding > .button', 'justify-self')).toBe(
      'start',
    );
    expectNoLiteralColors('.clinical-finding > .button');
  });

  it('R11: el selector de letras ACVPU se ajusta a su contenido, al inicio del campo y en seminegrita', () => {
    expect(valueOf('.field .clinical-select--letters', 'justify-self')).toBe(
      'start',
    );
    expect(valueOf('.field .clinical-select--letters', 'width')).toBe('auto');
    expect(valueOf('.field .clinical-select--letters', 'min-width')).toBe(
      '6rem',
    );
    expect(valueOf('.field .clinical-select--letters', 'font-weight')).toBe(
      '600',
    );
    expectNoLiteralColors('.field .clinical-select--letters');
  });

  it('R15: la placa del logotipo sale del token --brand-mark-bg: la tarjeta en claro y el primer plano (claro) en oscuro', () => {
    expect(valueOf(':root', '--brand-mark-bg')).toBe('var(--card)');
    expect(valueOf(":root[data-theme='dark']", '--brand-mark-bg')).toBe(
      'var(--fg)',
    );
    const marks = rulesOf('.brand__mark');
    const backgrounds = marks.flatMap((rule) =>
      rule.decls.filter(([name]) => name === 'background').map(([, v]) => v),
    );
    expect(backgrounds.length).toBeGreaterThan(0);
    for (const background of backgrounds)
      expect(background).toBe('var(--brand-mark-bg)');
    // Ninguna otra regla redefine la placa (ni los modos de color): sigue al token.
    const defs = rules.filter((rule) =>
      rule.decls.some(([name]) => name === '--brand-mark-bg'),
    );
    expect(defs.map((rule) => rule.selector).sort()).toEqual([
      ':root',
      ":root[data-theme='dark']",
    ]);
    expectNoLiteralColors('.brand__mark');
  });

  it('R19: ninguna regla tocada por el slice declara colores literales', () => {
    for (const selector of [
      '.timeline time',
      '.cancel',
      '.form-grid',
      '.field input[readonly]',
      '.field .clinical-select--letters',
      '.clinical-finding > .button',
      '.brand__mark',
    ])
      expectNoLiteralColors(selector);
    expectNoLiteralColors('.form-grid', '@media (max-width: 639px)');
    const tokens = rules
      .flatMap((rule) => rule.decls)
      .filter(([name]) => name === '--brand-mark-bg');
    for (const [, value] of tokens) expect(value).toMatch(/^var\(--\w+\)$/);
  });

  it('R5: la hora de cada evento de la línea de tiempo va en su propia línea', () => {
    expect(valueOf('.timeline time', 'display')).toBe('block');
    expectNoLiteralColors('.timeline time');
  });
});
