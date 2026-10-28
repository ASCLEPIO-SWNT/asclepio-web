import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../i18n';
import { usePreferences } from '../preferences/PreferencesProvider';

export function ThemeToggle() {
  const { t } = useI18n();
  const { resolvedTheme, updatePreferences } = usePreferences();
  const dark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={t('common_toggle_theme')}
      onClick={() => updatePreferences({ theme: dark ? 'light' : 'dark' })}
    >
      {dark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
    </button>
  );
}
