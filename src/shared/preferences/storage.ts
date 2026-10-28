import { isLocale, type Locale } from '../i18n/locale';

export const PREFERENCES_KEY = 'asclepio-ui-preferences';
export const FONT_SCALES = [0.875, 1, 1.25, 1.5, 2] as const;
export const COLOR_MODES = [
  'none',
  'high-contrast',
  'sepia',
  'grayscale',
  'colorblind-rg',
] as const;
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorMode = (typeof COLOR_MODES)[number];
export interface Preferences {
  locale: Locale;
  theme: ThemeMode;
  colorMode: ColorMode;
  fontScale: (typeof FONT_SCALES)[number];
  dyslexiaFont: boolean;
}
export const DEFAULT_PREFERENCES: Preferences = {
  locale: 'es',
  theme: 'light',
  colorMode: 'none',
  fontScale: 1,
  dyslexiaFont: false,
};

export function readPreferences(): Preferences {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) ?? 'null',
    );
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return { ...DEFAULT_PREFERENCES };
    const value = parsed as Record<string, unknown>;
    return {
      locale: isLocale(value.locale) ? value.locale : 'es',
      theme:
        value.theme === 'light' ||
        value.theme === 'dark' ||
        value.theme === 'system'
          ? value.theme
          : 'light',
      colorMode: COLOR_MODES.includes(value.colorMode as ColorMode)
        ? (value.colorMode as ColorMode)
        : 'none',
      fontScale: FONT_SCALES.includes(
        value.fontScale as Preferences['fontScale'],
      )
        ? (value.fontScale as Preferences['fontScale'])
        : 1,
      dyslexiaFont: value.dyslexiaFont === true,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function persistPreferences(value: Preferences) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
  } catch {
    // Storage can be blocked; preferences still work for this visit.
  }
}
