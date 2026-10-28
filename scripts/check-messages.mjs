import { readFile } from 'node:fs/promises';

export async function checkMessages() {
  const locales = ['es', 'en', 'pt', 'fr', 'de'];
  const groups = ['common', 'features'];
  const catalogs = {};
  for (const locale of locales) {
    const catalog = {};
    for (const group of groups) {
      const path = `messages/${group}/${locale}.json`;
      const entries = JSON.parse(await readFile(path, 'utf8'));
      for (const [key, value] of Object.entries(entries)) {
        if (Object.hasOwn(catalog, key))
          throw new Error(`Duplicate message ${key} in ${path}`);
        if (typeof value !== 'string' || !value.trim())
          throw new Error(`Invalid message ${key} in ${path}`);
        catalog[key] = value;
      }
    }
    catalogs[locale] = catalog;
  }
  const expected = Object.keys(catalogs.es).sort().join('\n');
  for (const locale of locales) {
    if (Object.keys(catalogs[locale]).sort().join('\n') !== expected) {
      throw new Error(`Missing or extra translation keys in ${locale}`);
    }
    for (const key of Object.keys(catalogs.es)) {
      const variables = (text) =>
        [...text.matchAll(/\{(\w+)\}/g)]
          .map((match) => match[1])
          .sort()
          .join(',');
      if (variables(catalogs[locale][key]) !== variables(catalogs.es[key]))
        throw new Error(`Mismatched message parameters: ${locale}/${key}`);
    }
  }
  return catalogs;
}

await checkMessages();
