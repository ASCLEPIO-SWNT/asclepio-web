import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Lo que jsdom no calcula (geometría, consultas de contenedor, colores) se fija sobre la fuente del
 * CSS (D18): se lee `dashboard.css` como texto y se parte en reglas. La medida real a 375, 768,
 * 1024 y 1440 px es evidencia de navegador (T13, `docs/ui-dashboards-verification.md`).
 */
const css = readFileSync('src/shared/ui/dashboard.css', 'utf8');
const indexCss = readFileSync('src/index.css', 'utf8');
const mainSource = readFileSync('src/main.tsx', 'utf8');

interface Rule {
  /** Preludios de las reglas @ que la envuelven (`@container panel (min-width: 40rem)`). */
  at: string[];
  selector: string;
  decls: [property: string, value: string][];
}

const squash = (text: string) => text.trim().replace(/\s+/g, ' ');

function declsOf(body: string): Rule['decls'] {
  return body
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const colon = declaration.indexOf(':');
      return [
        declaration.slice(0, colon).trim(),
        squash(declaration.slice(colon + 1)),
      ];
    });
}

/** Parte un CSS plano (sin anidamiento nativo) en reglas, con sus reglas @ envolventes. */
function parse(source: string, at: string[] = []): Rule[] {
  const rules: Rule[] = [];
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf('{', index);
    if (open === -1) break;
    const prelude = squash(source.slice(index, open));
    let depth = 1;
    let end = open + 1;
    while (end < source.length && depth > 0) {
      if (source[end] === '{') depth += 1;
      else if (source[end] === '}') depth -= 1;
      end += 1;
    }
    const body = source.slice(open + 1, end - 1);
    if (/^@(media|container|supports|keyframes)/.test(prelude)) {
      rules.push(...parse(body, [...at, prelude]));
    } else {
      rules.push({ at, selector: prelude, decls: declsOf(body) });
    }
    index = end;
  }
  return rules;
}

const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = parse(clean);
const selectorsOf = (rule: Rule) =>
  rule.selector.split(',').map((selector) => squash(selector));

/** Reglas cuyo selector (de una lista) es exactamente `selector`, fuera o dentro de la regla @ dada. */
function rulesOf(selector: string, at: string | null = null) {
  return rules.filter(
    (rule) =>
      selectorsOf(rule).includes(selector) &&
      (at === null ? rule.at.length === 0 : rule.at.includes(at)),
  );
}
/** Valor de la última declaración de `property` en esas reglas. */
function valueOf(selector: string, property: string, at: string | null = null) {
  const values = rulesOf(selector, at).flatMap((rule) =>
    rule.decls.filter(([name]) => name === property).map(([, value]) => value),
  );
  return values.at(-1);
}
const allDecls = rules.flatMap((rule) =>
  rule.decls.map(([property, value]) => ({ rule, property, value })),
);
const where = (rule: Rule, property: string, value: string) =>
  `${rule.at.join(' ')} ${rule.selector} { ${property}: ${value} }`.trim();

const NAMED_COLORS =
  /\b(?:white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|gold|navy|teal|maroon|olive|lime|aqua|fuchsia|brown|cyan|magenta)\b/i;

/** Clases nuevas de `design.md` («Clases CSS»): ninguna puede existir ya en `index.css`. */
const NEW_CLASSES = [
  'dashboard',
  'stack',
  'page-header',
  'page-actions',
  'summary',
  'summary--filter',
  'summary__list',
  'summary__cell',
  'summary__icon',
  'summary__label',
  'summary__value',
  'summary__plus',
  'summary__error',
  'summary__filter',
  'summary__cell--loading',
  'summary__cell--error',
  'panel',
  'panel__head',
  'panel__title',
  'panel__meta',
  'panel__body',
  'panel__foot',
  'live',
  'link-more',
  'badge',
  'data-table',
  'data-table--simple',
  'cell-main',
  'cell-name',
  'cell-sub',
  'cell-time',
  'cell-actions',
  'num',
  'prereg-grid',
  'prereg',
  'prereg__head',
  'prereg__title',
  'prereg__facts',
  'prereg__foot',
  'prereg__buttons',
  'fact--wide',
  'reject',
  'panel-state',
  'panel-state__icon',
  'panel-state__msg',
  'skeletons',
  'skeleton',
  'skeleton--value',
  'pager',
  'pending',
  'pending__icon',
  'pending__text',
  'pending__title',
  'pending__meta',
  'tone--accent',
  'tone--ok',
  'tone--warn',
  'tone--error',
  'tone--neutral',
  'button--sm',
  'layout--private',
];
const classPattern = (name: string) =>
  new RegExp(`\\.${name.replace(/[-_]/g, '\\$&')}(?![\\w-])`);

describe('UI-02-web hoja de estilos del dashboard', () => {
  it('R4: el CSS nuevo no declara colores literales: solo tokens y color-mix en oklch', () => {
    expect(allDecls.length).toBeGreaterThan(100);
    for (const { rule, property, value } of allDecls) {
      const context = where(rule, property, value);
      expect(value, context).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(value, context).not.toMatch(
        /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/i,
      );
      expect(value, context).not.toMatch(NAMED_COLORS);
      const mixes = value.match(/color-mix\(/g) ?? [];
      const inOklch = value.match(/color-mix\(in oklch,/g) ?? [];
      expect(inOklch.length, context).toBe(mixes.length);
    }
    // Y sí usa la mezcla de tokens que pide el diseño (hover de filas, insignias, resumen).
    expect(css).toMatch(
      /color-mix\(in oklch, var\(--accent-soft\) 45%, transparent\)/,
    );
    expect(css).toMatch(/color-mix\(in oklch, currentColor 35%, transparent\)/);
  });

  it('R4: dashboard.css se importa en main.tsx justo después de index.css y no trae recursos ni dependencias', () => {
    const index = mainSource.indexOf("import './index.css';");
    const dashboard = mainSource.indexOf("import './shared/ui/dashboard.css';");
    expect(index).toBeGreaterThan(-1);
    expect(dashboard).toBeGreaterThan(index);
    // Nada entre los dos imports: «justo después».
    expect(
      mainSource
        .slice(index + "import './index.css';".length, dashboard)
        .trim(),
    ).toBe('');
    expect(clean).not.toMatch(/@import|url\(/);
  });

  it('R4: las variables que usa son tokens de index.css o variables locales del dashboard', () => {
    const customProperties = (declarations: Rule['decls']) =>
      new Set(
        declarations
          .map(([property]) => property)
          .filter((p) => p.startsWith('--')),
      );
    const defined = customProperties(
      parse(indexCss.replace(/\/\*[\s\S]*?\*\//g, '')).flatMap(
        (rule) => rule.decls,
      ),
    );
    const local = customProperties(
      allDecls.map(({ property, value }) => [property, value]),
    );
    expect([...local].sort()).toEqual(
      [
        '--r-item',
        '--r-surface',
        '--s1',
        '--s2',
        '--s3',
        '--s4',
        '--s5',
        '--s6',
        '--tone',
        '--tone-bg',
      ].sort(),
    );
    // `--cells` lo escribe `SummaryBar` en el atributo style (T5); el resto, index.css o este archivo.
    const known = new Set([...defined, ...local, '--cells']);
    const used = [...clean.matchAll(/var\((--[\w-]+)/g)].map(
      (match) => match[1],
    );
    expect(used.length).toBeGreaterThan(20);
    for (const name of used) expect(known.has(name), name).toBe(true);
    // Los tokens de color que nombra el diseño existen en index.css.
    for (const token of [
      '--bg',
      '--fg',
      '--muted',
      '--card',
      '--accent',
      '--accent-hover',
      '--accent-ink',
      '--accent-soft',
      '--border',
      '--ok',
      '--ok-bg',
      '--warn',
      '--warn-bg',
      '--error',
      '--error-bg',
      '--focus',
    ]) {
      expect(defined.has(token), token).toBe(true);
    }
  });

  it('R4: ninguna clase nueva existe ya en index.css y todas están declaradas en dashboard.css', () => {
    for (const name of NEW_CLASSES) {
      expect(classPattern(name).test(indexCss), `index.css .${name}`).toBe(
        false,
      );
      expect(classPattern(name).test(css), `dashboard.css .${name}`).toBe(true);
    }
    // Lo que ajusta una clase existente va bajo `.dashboard` y no edita index.css.
    for (const selector of [
      '.dashboard .button--soft',
      '.dashboard .button--soft:hover',
      '.dashboard .button--sm',
      '.dashboard .prereg .check',
      '.dashboard .panel__body > .status',
      '.dashboard .summary__filter .load-error',
    ]) {
      expect(rulesOf(selector).length, selector).toBeGreaterThan(0);
    }
  });

  it('R5: la cifra de resumen usa cifras proporcionales y solo las columnas de hora y de cifras, tabulares', () => {
    expect(valueOf('.summary__value', 'font-variant-numeric')).toBe(
      'proportional-nums',
    );
    const tabular = allDecls.filter(({ value }) =>
      value.includes('tabular-nums'),
    );
    expect(tabular.length).toBeGreaterThan(0);
    for (const { rule, property } of tabular) {
      expect(property).toBe('font-variant-numeric');
      for (const selector of selectorsOf(rule)) {
        expect(selector, where(rule, property, 'tabular-nums')).toMatch(
          /\.(?:cell-time|num)$/,
        );
      }
    }
    for (const rule of rules.filter((r) =>
      selectorsOf(r).includes('.summary__value'),
    )) {
      for (const [, value] of rule.decls)
        expect(value).not.toContain('tabular');
    }
  });

  it('R5: la cifra de resumen mide 2 rem semibold sin línea de ámbito y el «+» es decorativo y más pequeño', () => {
    expect(valueOf('.summary__value', 'font-size')).toBe('2rem');
    expect(valueOf('.summary__value', 'font-weight')).toBe('600');
    expect(valueOf('.summary__plus', 'font-size')).toBe('1.25rem');
    expect(valueOf('.summary__plus', 'color')).toBe('var(--muted)');
    expect(valueOf('.summary__label', 'font-size')).toBe('0.8125rem');
    expect(valueOf('.summary__icon', 'width')).toBe('2.5rem');
    expect(valueOf('.summary__icon', 'background')).toBe('var(--tone-bg)');
    expect(valueOf('.summary__icon', 'color')).toBe('var(--tone)');
  });

  it('R31: el pulso del esqueleto y el giro de «Actualizar» solo existen con prefers-reduced-motion: no-preference', () => {
    const motion = '@media (prefers-reduced-motion: no-preference)';
    const animated = rules.filter(
      (rule) =>
        rule.at.some((prelude) => prelude.startsWith('@keyframes')) ||
        rule.decls.some(
          ([property]) =>
            property.startsWith('animation') ||
            property.startsWith('transition'),
        ),
    );
    expect(animated.length).toBeGreaterThanOrEqual(3);
    for (const rule of animated) {
      expect(rule.at[0], `${rule.at.join(' ')} ${rule.selector}`).toBe(motion);
    }
    expect(css).toMatch(/@keyframes pulse/);
    expect(css).toMatch(/@keyframes spin/);
    // El giro solo afecta al botón «Actualizar» ocupado, no a las celdas que cargan.
    expect(
      rules.some(
        (rule) =>
          rule.at[0] === motion &&
          selectorsOf(rule).some((s) =>
            s.includes(".button[aria-busy='true'] svg"),
          ),
      ),
    ).toBe(true);
  });

  it('R31: el foco visible no se anula en el CSS nuevo', () => {
    for (const { rule, property, value } of allDecls) {
      if (property === 'outline') {
        expect(value, where(rule, property, value)).not.toMatch(
          /^(?:none|0)\b/,
        );
      }
    }
  });

  it('R32: solo unidades relativas: los px que quedan son bordes de 1 px y píldoras de 999 px, y ningún ancho es fijo', () => {
    for (const { rule, property, value } of allDecls) {
      for (const [px] of value.matchAll(/-?\d*\.?\d+px/g)) {
        expect(['1px', '999px'], where(rule, property, value)).toContain(px);
      }
      // Ningún ancho ni alto en px, salvo la caja de 1 px del `thead` oculto al apilar las tablas.
      if (
        /^(?:width|min-width|max-width|height|min-height|max-height)$/.test(
          property,
        ) &&
        /px/.test(value)
      ) {
        expect(value, where(rule, property, value)).toBe('1px');
        expect(rule.selector, where(rule, property, value)).toMatch(/thead$/);
      }
    }
    for (const rule of rules) {
      for (const prelude of rule.at) expect(prelude).not.toMatch(/\d+px/);
    }
  });

  it('R32: ningún contenedor de texto tiene altura fija ni recorta: solo min-height, y overflow hidden solo en .summary y en el thead oculto', () => {
    const decorative = /\.skeleton|__icon|\bsvg\b|::before|::after|thead$/;
    for (const { rule, property, value } of allDecls) {
      if (property === 'height' || property === 'max-height') {
        for (const selector of selectorsOf(rule)) {
          expect(selector, where(rule, property, value)).toMatch(decorative);
        }
      }
      if (/^overflow(?:-[xy])?$/.test(property) && /hidden|clip/.test(value)) {
        expect(
          selectorsOf(rule).every(
            (selector) => selector === '.summary' || /\bthead$/.test(selector),
          ),
          where(rule, property, value),
        ).toBe(true);
      }
    }
    expect(valueOf('.summary', 'overflow')).toBe('hidden');
    expect(valueOf('.summary__cell', 'min-height')).toBe('5.5rem');
    expect(valueOf('.panel-state', 'min-height')).toBe('10rem');
  });

  it('R34: dos contenedores, dashboard (30 y 56 rem) y panel (40 rem), con sus cortes', () => {
    expect(valueOf('.dashboard', 'container')).toBe('dashboard / inline-size');
    expect(valueOf('.panel', 'container')).toBe('panel / inline-size');
    const preludes = new Set(rules.flatMap((rule) => rule.at));
    for (const prelude of [
      '@container dashboard (max-width: 29.99rem)',
      '@container dashboard (min-width: 30rem)',
      '@container dashboard (min-width: 56rem)',
      '@container panel (min-width: 40rem)',
      '@container panel (max-width: 39.99rem)',
    ]) {
      expect(preludes.has(prelude), prelude).toBe(true);
    }
    // Las reglas @media por ventana solo sirven para el movimiento reducido (D1).
    for (const prelude of preludes) {
      if (prelude.startsWith('@media')) {
        expect(prelude).toBe('@media (prefers-reduced-motion: no-preference)');
      }
    }
  });

  it('R34: la barra de resumen es una superficie con celdas separadas por 1 px y columnas según --cells', () => {
    const wide = '@container dashboard (min-width: 56rem)';
    const medium = '@container dashboard (min-width: 30rem)';
    expect(valueOf('.summary', 'gap')).toBe('1px');
    expect(valueOf('.summary', 'background')).toBe('var(--border)');
    expect(valueOf('.summary', 'border-radius')).toBe('var(--r-surface)');
    expect(valueOf('.summary', 'grid-template-columns')).toBe('minmax(0, 1fr)');
    expect(valueOf('.summary__list', 'display')).toBe('contents');
    expect(valueOf('.summary', 'grid-template-columns', medium)).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
    expect(valueOf('.summary__filter', 'grid-column', medium)).toBe('1 / -1');
    expect(
      valueOf(
        '.summary__list > :last-child:nth-child(odd)',
        'grid-column',
        medium,
      ),
    ).toBe('1 / -1');
    expect(valueOf('.summary', 'grid-template-columns', wide)).toBe(
      'repeat(var(--cells, 2), minmax(0, 1fr))',
    );
    expect(valueOf('.summary--filter', 'grid-template-columns', wide)).toBe(
      'repeat(var(--cells, 2), minmax(0, 1fr)) minmax(15rem, 19rem)',
    );
    expect(valueOf('.summary__filter', 'grid-column', wide)).toBe('auto');
    expect(
      valueOf(
        '.summary__list > :last-child:nth-child(odd)',
        'grid-column',
        wide,
      ),
    ).toBe('auto');
  });

  it('R34: las acciones del encabezado ocupan todo el ancho por debajo de 30 rem', () => {
    const narrow = '@container dashboard (max-width: 29.99rem)';
    expect(valueOf('.page-actions', 'width', narrow)).toBe('100%');
    expect(valueOf('.page-actions .button', 'flex', narrow)).toBe('1 1 auto');
  });

  it('R34: los preregistros pasan de una a dos columnas del mismo alto y los botones quedan abajo', () => {
    const wide = '@container panel (min-width: 40rem)';
    expect(valueOf('.prereg-grid', 'grid-template-columns')).toBe(
      'minmax(0, 1fr)',
    );
    expect(valueOf('.prereg-grid', 'grid-template-columns', wide)).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
    expect(valueOf('.prereg-grid > li', 'display')).toBe('grid');
    expect(valueOf('.prereg', 'grid-template-rows')).toBe('auto auto 1fr');
    expect(valueOf('.prereg__foot', 'align-self')).toBe('end');
    expect(valueOf('.prereg__facts', 'grid-template-columns')).toBe(
      'minmax(0, 1.6fr) minmax(0, 1fr)',
    );
    expect(valueOf('.prereg__facts .fact--wide', 'grid-column')).toBe('1 / -1');
    expect(valueOf('.prereg__facts', 'border-block')).toBe(
      '1px solid var(--border)',
    );
    expect(valueOf('.dashboard .reject', 'border-top')).toBe(
      '1px dashed var(--border)',
    );
  });

  it('R34: las tablas con encabezado se apilan como tarjetas por debajo de 40 rem de panel y la de sedes no', () => {
    const narrow = '@container panel (max-width: 39.99rem)';
    const stacked = '.data-table:not(.data-table--simple)';
    expect(valueOf(`${stacked} thead`, 'clip-path', narrow)).toBe('inset(50%)');
    expect(valueOf(`${stacked} thead`, 'width', narrow)).toBe('1px');
    expect(valueOf(`${stacked} tr`, 'display', narrow)).toBe('grid');
    expect(valueOf(`${stacked} tr`, 'grid-template-columns', narrow)).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
    expect(valueOf(`${stacked} td`, 'display', narrow)).toBe('block');
    expect(valueOf(`${stacked} .cell-main`, 'grid-column', narrow)).toBe(
      '1 / -1',
    );
    expect(valueOf(`${stacked} .cell-actions`, 'grid-column', narrow)).toBe(
      '1 / -1',
    );
    expect(valueOf(`${stacked} .cell-actions .button`, 'width', narrow)).toBe(
      '100%',
    );
    // Las etiquetas salen del atributo data-label, con alternativa vacía para el lector de pantalla.
    const label = rulesOf(`${stacked} td[data-label]::before`, narrow).flatMap(
      (rule) => rule.decls.filter(([property]) => property === 'content'),
    );
    expect(label.map(([, value]) => value)).toEqual([
      'attr(data-label)',
      "attr(data-label) / ''",
    ]);
    // Toda regla de apilado depende de `:not(.data-table--simple)`: la tabla simple no cambia.
    for (const rule of rules.filter((r) => r.at.includes(narrow))) {
      for (const selector of selectorsOf(rule)) {
        expect(selector, rule.selector).toContain(stacked);
      }
    }
  });

  it('R35: columnas con minmax(0, …), contenedores con min-width: 0 y sin anchos fijos en px', () => {
    const grids = allDecls.filter(
      ({ property }) => property === 'grid-template-columns',
    );
    expect(grids.length).toBeGreaterThan(5);
    for (const { rule, property, value } of grids) {
      // Ninguna `fr` fuera de un minmax(0, …): sin ella la columna crece con su contenido.
      expect(
        value.replace(/minmax\([^)]*\)/g, ''),
        where(rule, property, value),
      ).not.toMatch(/fr/);
    }
    for (const selector of ['.dashboard', '.stack', '.panel']) {
      expect(valueOf(selector, 'min-width'), selector).toBe('0');
    }
    for (const selector of [
      '.summary__cell',
      '.summary__filter',
      '.prereg',
      '.prereg-grid > li',
      '.pending__text',
    ]) {
      expect(valueOf(selector, 'min-width'), selector).toBeDefined();
    }
    expect(valueOf('.stack', 'display')).toBe('grid');
    expect(valueOf('.stack', 'gap')).toBe('var(--s6)');
  });

  it('R38: la nota de actualización es texto con un punto decorativo del tono ok', () => {
    expect(valueOf('.live', 'font-size')).toBe('0.75rem');
    expect(valueOf('.live', 'color')).toBe('var(--muted)');
    expect(valueOf('.live::before', 'content')).toBe("''");
    expect(valueOf('.live::before', 'background')).toBe('var(--ok)');
    expect(valueOf('.live::before', 'border-radius')).toBe('50%');
  });

  it('R5: las tablas y las insignias siguen las medidas del diseño', () => {
    expect(valueOf('.data-table td', 'padding')).toBe('0.75rem 1rem');
    expect(valueOf('.data-table--simple td', 'padding-block')).toBe('0.875rem');
    expect(valueOf('.data-table th', 'white-space')).toBe('nowrap');
    expect(valueOf('.data-table tbody tr:hover', 'background')).toBe(
      'color-mix(in oklch, var(--accent-soft) 45%, transparent)',
    );
    expect(valueOf('.data-table td.num', 'font-size')).toBe('1.125rem');
    expect(valueOf('.badge', 'border-radius')).toBe('999px');
    expect(valueOf('.badge', 'color')).toBe('var(--tone)');
    expect(valueOf('.badge', 'background')).toBe('var(--tone-bg)');
    expect(valueOf('.badge', 'white-space')).toBe('nowrap');
    expect(valueOf('.badge', 'font-size')).toBe('0.75rem');
  });

  it('R30: cada tono semántico fija --tone y --tone-bg con los tokens existentes', () => {
    const tones: Record<string, [string, string]> = {
      accent: ['var(--accent)', 'var(--accent-soft)'],
      ok: ['var(--ok)', 'var(--ok-bg)'],
      warn: ['var(--warn)', 'var(--warn-bg)'],
      error: ['var(--error)', 'var(--error-bg)'],
      neutral: [
        'var(--muted)',
        'color-mix(in oklch, var(--muted) 12%, var(--card))',
      ],
    };
    for (const [tone, [color, background]] of Object.entries(tones)) {
      expect(valueOf(`.tone--${tone}`, '--tone'), tone).toBe(color);
      expect(valueOf(`.tone--${tone}`, '--tone-bg'), tone).toBe(background);
    }
  });

  it('R4: la escala única de espacios y de radios es local al dashboard y es la del diseño', () => {
    const scale = {
      '--s1': '0.25rem',
      '--s2': '0.5rem',
      '--s3': '0.75rem',
      '--s4': '1rem',
      '--s5': '1.25rem',
      '--s6': '1.5rem',
      '--r-surface': '1.25rem',
      '--r-item': '1rem',
    };
    for (const [name, value] of Object.entries(scale)) {
      expect(valueOf('.dashboard', name), name).toBe(value);
    }
    // No se añaden tokens globales: nada de esto cuelga de :root.
    expect(rulesOf(':root').length).toBe(0);
  });

  it('R2: el encabezado reserva el título (1.375 a 1.625 rem) y las acciones en una fila que envuelve', () => {
    expect(valueOf('.page-header h1', 'font-size')).toBe(
      'clamp(1.375rem, 1.1rem + 0.9vw, 1.625rem)',
    );
    expect(valueOf('.page-header', 'flex-wrap')).toBe('wrap');
    expect(valueOf('.page-header', 'justify-content')).toBe('space-between');
    expect(valueOf('.page-actions', 'flex-wrap')).toBe('wrap');
  });

  it('R31: el botón pequeño mide 2.25 rem y el suave se ajusta solo dentro de los dashboards', () => {
    expect(valueOf('.dashboard .button--sm', 'min-height')).toBe('2.25rem');
    expect(valueOf('.dashboard .button--sm', 'font-size')).toBe('0.8125rem');
    expect(valueOf('.dashboard .button--soft', 'color')).toBe(
      'var(--accent-hover)',
    );
    expect(valueOf('.dashboard .button--soft:hover', 'background')).toBe(
      'var(--accent)',
    );
    expect(valueOf('.dashboard .button--soft:hover', 'color')).toBe(
      'var(--accent-ink)',
    );
    // Ninguna regla toca `.button*` en general: todas cuelgan de una clase propia del dashboard.
    const own = NEW_CLASSES.filter((name) => name !== 'button--sm');
    for (const rule of rules) {
      for (const selector of selectorsOf(rule)) {
        if (/\.button/.test(selector)) {
          expect(
            own.some((name) => selector.startsWith(`.${name}`)),
            rule.selector,
          ).toBe(true);
        }
      }
    }
  });

  it('R3: la franja «pendiente» es discreta: borde discontinuo y el radio de las superficies', () => {
    expect(valueOf('.pending', 'border')).toBe('1px dashed var(--border)');
    expect(valueOf('.pending', 'border-radius')).toBe('var(--r-surface)');
    expect(valueOf('.pending__icon', 'width')).toBe('2.5rem');
  });

  it('R39: las reglas del marco privado dejan solo las herramientas, alineadas a la derecha', () => {
    const header = rulesOf('.layout--private .layout__header-inner');
    expect(header).toHaveLength(1);
    expect(Object.fromEntries(header[0].decls)).toEqual({
      'max-width': '84rem',
      padding: '0',
      border: '0',
      'border-radius': '0',
      background: 'transparent',
      'box-shadow': 'none',
      'backdrop-filter': 'none',
      'justify-content': 'flex-end',
    });
    const tools = rulesOf('.layout--private .layout__tools');
    expect(tools).toHaveLength(1);
    expect(Object.fromEntries(tools[0].decls)).toEqual({
      padding: '0.375rem',
      gap: '0.5rem',
      border: '1px solid color-mix(in oklch, var(--border) 60%, transparent)',
      'border-radius': '999px',
      background: 'color-mix(in oklch, var(--card) 90%, transparent)',
    });
    // Después de la regla del marco de trabajo que pisan (misma especificidad), no la editan.
    expect(indexCss).toMatch(/\.layout--workspace \.layout__header-inner \{/);
    expect(indexCss).not.toContain('layout--private');
  });

  it('R4: el CSS nuevo no usa el carácter «·» ni cadenas de texto de interfaz', () => {
    expect(css).not.toContain('·'); // también en los comentarios
    for (const { rule, property, value } of allDecls) {
      if (property === 'content') {
        expect(value, where(rule, property, value)).toMatch(
          /^(?:''|attr\(data-label\)(?: \/ '')?)$/,
        );
      }
    }
  });
});
