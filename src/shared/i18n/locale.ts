export const LOCALES = ['es', 'en', 'pt', 'fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
let currentLocale: Locale = 'es';

export const getCurrentLocale = () => currentLocale;
export const setCurrentLocale = (locale: Locale) => {
  currentLocale = locale;
};
export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
