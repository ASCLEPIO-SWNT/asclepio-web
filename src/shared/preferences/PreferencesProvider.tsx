import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setCurrentLocale } from '../i18n/locale';
import {
  DEFAULT_PREFERENCES,
  persistPreferences,
  readPreferences,
  type Preferences,
} from './storage';

interface PreferencesContextValue {
  preferences: Preferences;
  resolvedTheme: 'light' | 'dark';
  updatePreferences: (patch: Partial<Preferences>) => void;
}
export const PreferencesContext = createContext<PreferencesContextValue | null>(
  null,
);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => {
    const initial = readPreferences();
    setCurrentLocale(initial.locale);
    return initial;
  });
  const media = useMemo(
    () =>
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : undefined,
    [],
  );
  const [systemDark, setSystemDark] = useState(() => media?.matches ?? false);
  const resolvedTheme =
    preferences.theme === 'system'
      ? systemDark
        ? 'dark'
        : 'light'
      : preferences.theme;
  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    if (patch.locale) setCurrentLocale(patch.locale);
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);

  useEffect(() => {
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    media?.addEventListener('change', onChange);
    return () => media?.removeEventListener('change', onChange);
  }, [media]);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = preferences.locale;
    html.dataset.theme = resolvedTheme;
    html.dataset.colorMode = preferences.colorMode;
    html.dataset.dyslexiaFont = String(preferences.dyslexiaFont);
    html.style.setProperty('--font-scale', String(preferences.fontScale));
    persistPreferences(preferences);
  }, [preferences, resolvedTheme]);

  const value = useMemo(
    () => ({ preferences, resolvedTheme, updatePreferences }),
    [preferences, resolvedTheme, updatePreferences],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  return (
    context ?? {
      preferences: DEFAULT_PREFERENCES,
      resolvedTheme: 'light' as const,
      updatePreferences: () => {},
    }
  );
}
