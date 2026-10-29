import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Regla anti‑literales de UI (UI-03-web R21, D15). Recorre `src/**\/*.tsx` sin pruebas con el
 * parser de TypeScript y falla ante:
 * - texto JSX con letras;
 * - `aria-label`, `aria-description`, `title`, `placeholder`, `alt` o `label` con una cadena literal
 *   con letras;
 * - una cadena con letras y un espacio que termina como frase (`.`, `!`, `?`, `…`, `:`), es decir,
 *   un mensaje escrito en el código en lugar de salir de `messages/`.
 */
const ACCESSIBLE_ATTRIBUTES = new Set([
  'aria-label',
  'aria-description',
  'title',
  'placeholder',
  'alt',
  'label',
]);
const LETTER = /\p{L}/u;
const SENTENCE = /\p{L}.*\s.*[.!?…:]$/u;

/** Excepciones justificadas (D15): `archivo|texto`. */
const EXCEPTIONS: Record<string, string> = {
  // La marca no se traduce (plan i18n: `title_suffix`).
  'src/app/PublicHome.tsx|Asclepio': 'marca',
  'src/features/auth/components/LoginPage.tsx|Asclepio': 'marca',
  'src/shared/ui/Layout.tsx|Asclepio': 'marca',
  'src/shared/ui/Brand.tsx|Asclepio': 'marca',
  // Nombre propio de la zona horaria en que se muestran las horas (C7): igual en los cinco idiomas.
  'src/features/status/StatusPage.tsx|(Bogotá)': 'nombre propio',
};

interface Finding {
  file: string;
  line: number;
  text: string;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory())
      return entry.name === 'paraglide' || entry.name === 'test'
        ? []
        : sourceFiles(path);
    return path.endsWith('.tsx') && !/\.test\.tsx$/.test(path) ? [path] : [];
  });
}

function findLiterals(file: string): Finding[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const findings: Finding[] = [];
  const report = (node: ts.Node, text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (Object.hasOwn(EXCEPTIONS, `${file}|${clean}`)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    findings.push({ file, line: line + 1, text: clean });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && LETTER.test(node.text)) {
      report(node, node.text);
    } else if (
      ts.isJsxAttribute(node) &&
      ACCESSIBLE_ATTRIBUTES.has(node.name.getText(source)) &&
      node.initializer
    ) {
      const init = node.initializer;
      const literal = ts.isStringLiteral(init)
        ? init
        : ts.isJsxExpression(init) &&
            init.expression &&
            ts.isStringLiteralLike(init.expression)
          ? init.expression
          : null;
      if (literal && LETTER.test(literal.text)) report(literal, literal.text);
    } else if (
      ts.isStringLiteralLike(node) &&
      !ts.isImportDeclaration(node.parent) &&
      SENTENCE.test(node.text.trim())
    ) {
      report(node, node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

describe('UI-03-web textos traducidos', () => {
  it('R21: ningún archivo .tsx de src/ fuera de las pruebas contiene un literal de UI', () => {
    const findings = sourceFiles('src').flatMap(findLiterals);
    expect(
      findings.map(({ file, line, text }) => `${file}:${line} ${text}`),
    ).toEqual([]);
  });

  it('R21: la regla detecta texto JSX, atributos accesibles y mensajes escritos en el código', () => {
    const probe = 'src/test/__probe__.tsx';
    const findings = [
      ['<p>Hola mundo</p>', 'Hola mundo'],
      ['<button aria-label="Cerrar" />', 'Cerrar'],
      ['<input placeholder={"Buscar"} />', 'Buscar'],
      [
        "const M = 'La atención ya está cerrada.';",
        'La atención ya está cerrada.',
      ],
    ].map(([code, text]) => {
      const source = ts.createSourceFile(
        probe,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      let found = '';
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node) && LETTER.test(node.text)) found = node.text;
        if (ts.isStringLiteralLike(node) && LETTER.test(node.text))
          found = node.text;
        ts.forEachChild(node, visit);
      };
      visit(source);
      return [found, text];
    });
    for (const [found, text] of findings) expect(found).toBe(text);
    // Las clases CSS, ids y rutas no son texto de UI.
    expect(SENTENCE.test('button button--secondary')).toBe(false);
    expect(SENTENCE.test('/recepcion/registro')).toBe(false);
  });
});
