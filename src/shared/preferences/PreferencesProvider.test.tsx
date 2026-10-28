import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, useI18n } from '../i18n';
import { ThemeToggle } from '../ui/ThemeToggle';
import { PreferencesProvider, usePreferences } from './PreferencesProvider';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  readPreferences,
} from './storage';

function Controls() {
  const { preferences, updatePreferences } = usePreferences();
  const { locale, setLocale, t } = useI18n();
  return (
    <>
      <p>{t('common_preferences')}</p>
      <output data-testid="locale">{locale}</output>
      <input aria-label="Patient name" defaultValue="Lucía Müller" />
      <button onClick={() => setLocale('en')}>English</button>
      <button onClick={() => updatePreferences({ theme: 'dark' })}>Dark</button>
      <button onClick={() => updatePreferences({ theme: 'system' })}>
        System
      </button>
      <button
        onClick={() =>
          updatePreferences({
            colorMode: 'high-contrast',
            fontScale: 2,
            dyslexiaFont: true,
          })
        }
      >
        Accessible
      </button>
      <output data-testid="preferences">{JSON.stringify(preferences)}</output>
      <ThemeToggle />
    </>
  );
}

function mount() {
  return render(
    <PreferencesProvider>
      <I18nProvider>
        <Controls />
      </I18nProvider>
    </PreferencesProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('UI-01 preferences and language', () => {
  it('R9: defaults to Spanish, light, normal color, Axiforma and scale one and filters unknown fields', () => {
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        locale: 'xx',
        theme: 'neon',
        fontScale: 4,
        dyslexiaFont: 'true',
        patient: 'secret',
        accessToken: 'secret',
      }),
    );
    mount();
    expect(screen.getByTestId('locale')).toHaveTextContent('es');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it('R5: rehydrates German and updates generated messages and the document language to English', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ ...DEFAULT_PREFERENCES, locale: 'de' }),
    );
    mount();
    expect(screen.getByText('Einstellungen')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('de');
    fireEvent.click(screen.getByText('English'));
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('R6: changes locale and theme without losing fields or changing the URL', () => {
    mount();
    const input = screen.getByLabelText('Patient name');
    const url = location.href;
    fireEvent.change(input, { target: { value: 'José Moreau' } });
    fireEvent.click(screen.getByText('English'));
    fireEvent.click(screen.getByText('Dark'));
    expect(screen.getByLabelText('Patient name')).toBe(input);
    expect(input).toHaveValue('José Moreau');
    expect(location.href).toBe(url);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('R7: follows system theme changes and removes the listener', () => {
    let change: ((event: MediaQueryListEvent) => void) | undefined;
    const removeEventListener = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: (_: string, fn: typeof change) => {
          change = fn;
        },
        removeEventListener,
      })),
    );
    const view = mount();
    fireEvent.click(screen.getByText('System'));
    expect(document.documentElement.dataset.theme).toBe('light');
    act(() => change?.({ matches: true } as MediaQueryListEvent));
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar tema' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    view.unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });

  it('R8: applies accessible color, text size and the real local font', () => {
    mount();
    fireEvent.click(screen.getByText('Accessible'));
    expect(document.documentElement.dataset.colorMode).toBe('high-contrast');
    expect(
      document.documentElement.style.getPropertyValue('--font-scale'),
    ).toBe('2');
    expect(document.documentElement.dataset.dyslexiaFont).toBe('true');
  });

  it('R9: tolerates unreadable and unavailable storage and remains usable', () => {
    localStorage.setItem(PREFERENCES_KEY, '{invalid');
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mount();
    fireEvent.click(screen.getByText('English'));
    fireEvent.click(screen.getByText('Dark'));
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('R16: persists only visual preferences and language and never touches the auth session', () => {
    sessionStorage.setItem('session-proof', 'unchanged');
    mount();
    fireEvent.click(screen.getByText('Accessible'));
    expect(
      Object.keys(
        JSON.parse(localStorage.getItem(PREFERENCES_KEY)!) as object,
      ).sort(),
    ).toEqual(Object.keys(DEFAULT_PREFERENCES).sort());
    expect(sessionStorage.getItem('session-proof')).toBe('unchanged');
    sessionStorage.removeItem('session-proof');
  });
});
