import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { m } from '../../paraglide/messages.js';
import {
  PreferencesContext,
  PreferencesProvider,
  usePreferences,
} from '../preferences/PreferencesProvider';
import { getCurrentLocale, type Locale } from './locale';

type Inputs = Record<string, string | number>;
type Translator = (key: string, inputs?: Inputs) => string;
const messageFunctions = m as unknown as Record<
  string,
  (inputs: Inputs, options: { locale: Locale }) => string
>;

export function translate(locale: Locale, key: string, inputs: Inputs = {}) {
  return messageFunctions[key]?.(inputs, { locale }) ?? key;
}

/** Helpers outside React (schemas and domain labels) use the same current locale. */
export const t: Translator = (key, inputs) =>
  translate(getCurrentLocale(), key, inputs);

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
} | null>(null);

function I18nBridge({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences } = usePreferences();
  const locale = preferences.locale;
  const setLocale = useCallback(
    (next: Locale) => updatePreferences({ locale: next }),
    [updatePreferences],
  );
  const translator = useCallback<Translator>(
    (key, inputs) => translate(locale, key, inputs),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, setLocale, t: translator }),
    [locale, setLocale, translator],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const preferences = useContext(PreferencesContext);
  return preferences ? (
    <I18nBridge>{children}</I18nBridge>
  ) : (
    <PreferencesProvider>
      <I18nBridge>{children}</I18nBridge>
    </PreferencesProvider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  return context ?? { locale: getCurrentLocale(), setLocale: () => {}, t };
}
