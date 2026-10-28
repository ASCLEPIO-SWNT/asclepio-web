import { LanguageIcon } from '@heroicons/react/24/outline';
import { useId } from 'react';
import { LOCALES, useI18n, type Locale } from '../i18n';

const LANGUAGE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
};

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const id = useId();
  return (
    <div className={compact ? 'language-picker' : 'field'}>
      <label htmlFor={id} className={compact ? 'visually-hidden' : undefined}>
        {t('common_language')}
      </label>
      {compact && <LanguageIcon aria-hidden="true" />}
      <select
        id={id}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {LOCALES.map((language) => (
          <option key={language} value={language} lang={language}>
            {LANGUAGE_NAMES[language]}
          </option>
        ))}
      </select>
    </div>
  );
}
