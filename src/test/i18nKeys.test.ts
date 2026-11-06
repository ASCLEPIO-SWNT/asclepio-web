import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const LOCALES = ['es', 'en', 'pt', 'fr', 'de'] as const;
/** Claves nuevas de este slice (plan i18n de design.md). */
const NEW_KEY = /^common_(error|route|unsaved|draft)_/;
/** Valores iguales al español que están justificados (misma palabra en ese idioma). */
const SAME_AS_SPANISH: Record<string, readonly string[]> = {
  pt: ['common_draft_discard'],
};

const catalog = (locale: string) =>
  JSON.parse(readFileSync(`messages/common/${locale}.json`, 'utf8')) as Record<
    string,
    string
  >;
const params = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('UI-03-web textos nuevos en cinco idiomas', () => {
  it('R22: las claves nuevas existen en los cinco catálogos, con los mismos parámetros, sin vacíos y traducidas', () => {
    const es = catalog('es');
    const keys = Object.keys(es).filter((key) => NEW_KEY.test(key));
    expect(keys.sort()).toEqual(
      [
        'common_error_network',
        'common_error_server',
        'common_route_error_title',
        'common_route_error_body',
        'common_route_chunk_error_body',
        'common_route_home',
        'common_route_loading',
        'common_unsaved_title',
        'common_unsaved_body',
        'common_unsaved_leave',
        'common_unsaved_stay',
        'common_draft_found',
        'common_draft_restore',
        'common_draft_discard',
      ].sort(),
    );
    for (const locale of LOCALES) {
      const messages = catalog(locale);
      for (const key of keys) {
        const value = messages[key];
        expect(value, `${locale}/${key}`).toBeTypeOf('string');
        expect(value.trim(), `${locale}/${key}`).not.toBe('');
        expect(params(value), `${locale}/${key}`).toEqual(params(es[key]));
        if (locale !== 'es' && !SAME_AS_SPANISH[locale]?.includes(key)) {
          expect(value, `${locale}/${key} sin traducir`).not.toBe(es[key]);
        }
      }
    }
  });
});
