import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useRef } from 'react';
import { useI18n } from '../i18n';
import { usePreferences } from '../preferences/PreferencesProvider';
import {
  COLOR_MODES,
  DEFAULT_PREFERENCES,
  FONT_SCALES,
  type ColorMode,
  type Preferences,
  type ThemeMode,
} from '../preferences/storage';
import { VoiceGuide } from '../preferences/VoiceGuide';
import { LanguagePicker } from './LanguagePicker';

const MODE_KEYS: Record<ColorMode, string> = {
  none: 'common_color_none',
  'high-contrast': 'common_color_contrast',
  sepia: 'common_color_sepia',
  grayscale: 'common_color_grayscale',
  'colorblind-rg': 'common_color_alternative',
};

export function PreferencesPanel({
  guide,
  route,
}: {
  guide: string;
  route: string;
}) {
  const { locale, t, setLocale } = useI18n();
  const { preferences, updatePreferences } = usePreferences();
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const close = () => {
    if (details.current) details.current.open = false;
    summary.current?.focus();
  };

  return (
    <details
      className="preferences"
      ref={details}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}
    >
      <summary ref={summary} className="button button--secondary">
        <AdjustmentsHorizontalIcon aria-hidden="true" />
        <span>{t('common_preferences')}</span>
      </summary>
      <div
        className="preferences__panel"
        role="region"
        aria-label={t('common_preferences')}
      >
        <div className="preferences__heading">
          <div>
            <h2>{t('common_preferences')}</h2>
            <p className="muted">{t('common_settings_description')}</p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label={t('common_close')}
            onClick={close}
          >
            <XMarkIcon aria-hidden="true" />
          </button>
        </div>
        <LanguagePicker />
        <fieldset>
          <legend>{t('common_appearance')}</legend>
          <div className="field">
            <label htmlFor="ui-theme">{t('common_theme')}</label>
            <select
              id="ui-theme"
              value={preferences.theme}
              onChange={(event) =>
                updatePreferences({ theme: event.target.value as ThemeMode })
              }
            >
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <option key={theme} value={theme}>
                  {t(`common_${theme}`)}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('common_accessibility')}</legend>
          <div className="field">
            <label htmlFor="ui-color">{t('common_color_mode')}</label>
            <select
              id="ui-color"
              value={preferences.colorMode}
              onChange={(event) =>
                updatePreferences({
                  colorMode: event.target.value as ColorMode,
                })
              }
            >
              {COLOR_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(MODE_KEYS[mode])}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ui-scale">{t('common_text_size')}</label>
            <select
              id="ui-scale"
              value={preferences.fontScale}
              onChange={(event) =>
                updatePreferences({
                  fontScale: Number(
                    event.target.value,
                  ) as Preferences['fontScale'],
                })
              }
            >
              {FONT_SCALES.map((scale) => (
                <option key={scale} value={scale}>
                  {scale * 100}%
                </option>
              ))}
            </select>
          </div>
          <label className="check preferences__font">
            <input
              type="checkbox"
              checked={preferences.dyslexiaFont}
              onChange={(event) =>
                updatePreferences({ dyslexiaFont: event.target.checked })
              }
            />
            <span>
              {t('common_accessible_font')}
              <small>{t('common_accessible_font_hint')}</small>
            </span>
          </label>
        </fieldset>
        <fieldset>
          <legend>
            <SpeakerWaveIcon aria-hidden="true" />
            {t('common_voice')}
          </legend>
          <p className="muted">{t('common_voice_hint')}</p>
          <VoiceGuide text={guide} locale={locale} route={route} />
        </fieldset>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            setLocale(DEFAULT_PREFERENCES.locale);
            updatePreferences({ ...DEFAULT_PREFERENCES });
          }}
        >
          <ArrowPathIcon aria-hidden="true" />
          {t('common_reset_preferences')}
        </button>
      </div>
    </details>
  );
}
