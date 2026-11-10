import type { Ref } from 'react';
import { useI18n } from '../../../shared/i18n';
import { DECISION_LIMITS } from '../clinicalContract.generated';
import { romanLevel } from '../suggestionView';

const LEVELS = Array.from(
  {
    length: DECISION_LIMITS.level.maximum - DECISION_LIMITS.level.minimum + 1,
  },
  (_, i) => DECISION_LIMITS.level.minimum + i,
);

export interface LevelPickerProps {
  /** Prefijo de los `id` del grupo (nombre de los radios y del error). */
  id: string;
  value: number | null;
  onChange: (level: number) => void;
  onBlur?: () => void;
  /** Nivel sugerido en Corregir: deshabilitado y rotulado «{nivel} (sugerido)» (R5). */
  disabledLevel?: number | null;
  disabled?: boolean;
  /** Mensaje de error ya traducido, asociado al `fieldset` con `aria-describedby` (R6, R9). */
  error?: string;
  /** Recibe el foco ante un error (React Hook Form `setFocus`). */
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * Selector de nivel I–V (F-05-web D7): radios nativos dentro de un `fieldset` con `legend`. Las
 * flechas las da el navegador (R27). Ningún nivel viene elegido por defecto y no hay color ni
 * nombre por nivel.
 */
export function LevelPicker({
  id,
  value,
  onChange,
  onBlur,
  disabledLevel = null,
  disabled = false,
  error,
  inputRef,
}: LevelPickerProps) {
  const { t } = useI18n();
  const errorId = `${id}-error`;
  // El foco va a la opción elegida o, si no hay, a la primera habilitada.
  const focusTarget =
    value !== null && value !== disabledLevel
      ? value
      : LEVELS.find((level) => level !== disabledLevel);
  return (
    <fieldset
      className="level-picker"
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
    >
      <legend>{t('decision_level_legend')}</legend>
      <div className="level-picker__options">
        {LEVELS.map((level) => {
          const suggested = level === disabledLevel;
          return (
            <label key={level} className="level-picker__option">
              <input
                ref={level === focusTarget ? inputRef : undefined}
                type="radio"
                name={`${id}-level`}
                value={level}
                checked={value === level}
                disabled={suggested}
                aria-invalid={error ? true : undefined}
                onChange={() => onChange(level)}
                onBlur={onBlur}
              />
              {suggested ? (
                <span className="badge tone--neutral">
                  {t('decision_level_suggested', { level: romanLevel(level) })}
                </span>
              ) : (
                <span>{romanLevel(level)}</span>
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
