import type { TriageSuggestion } from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { formatDateTimeBogota } from '../../../shared/lib/datetime';
import { factorLabel, romanLevel, suggestionMode } from '../suggestionView';

/**
 * Presentación de una sugerencia (F-04-web D1, D12, D13), sin red. Siempre es una propuesta: el
 * nivel va en una insignia neutra rotulada «sugerido» junto al aviso de propuesta (R10, R11). El
 * texto del modelo (`explanation`, `factors[].note`) se muestra literal, sin traducir.
 */
export function TriageSuggestionView({
  suggestion,
}: {
  suggestion: TriageSuggestion;
}) {
  const { t } = useI18n();
  const mode = suggestionMode(suggestion);
  return (
    <div className="suggestion-view">
      {mode === 'proposal' && <Proposal suggestion={suggestion} />}
      {/* D6, R16: en modo manual no se lee ningún campo de nivel, explicación ni factores. */}
      {mode === 'manual' && <ManualNotice />}
      <p className="muted">
        {t('suggestion_requested_meta', {
          time: formatDateTimeBogota(suggestion.createdAt),
          name: suggestion.requestedBy.fullName ?? t('feature_staff'),
        })}
      </p>
    </div>
  );
}

function Proposal({ suggestion }: { suggestion: TriageSuggestion }) {
  const { t } = useI18n();
  const factors = suggestion.factors ?? [];
  return (
    <>
      {suggestion.suggestedLevel !== null && (
        <p className="suggestion-view__level">
          <span>{t('suggestion_level_label')}</span>
          <span className="badge tone--neutral">
            {romanLevel(suggestion.suggestedLevel)}
          </span>
        </p>
      )}
      <p className="suggestion-view__notice">
        {t('suggestion_proposal_notice')}
      </p>
      {suggestion.guardApplied && <GuardNotice suggestion={suggestion} />}
      {suggestion.explanation !== null && (
        <section aria-labelledby="suggestion-explanation">
          <h3 id="suggestion-explanation">{t('suggestion_explanation')}</h3>
          <p className="suggestion-view__text">{suggestion.explanation}</p>
        </section>
      )}
      {factors.length > 0 && (
        <section>
          <h3 id="suggestion-factors">{t('suggestion_factors')}</h3>
          <ul
            className="suggestion-view__factors"
            aria-labelledby="suggestion-factors"
          >
            {factors.map((factor, index) => (
              <li key={`${factor.field}-${index}`}>
                <strong>{factorLabel(factor.field, t)}</strong>{' '}
                <span className="suggestion-view__text">{factor.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/**
 * D14 (PA-5 c): aviso estático de advertencia, sin `role="alert"` (UI-04-web D12). Solo usa datos
 * del contrato y el texto PROVISIONAL existente; no describe las reglas con texto clínico nuevo.
 */
function GuardNotice({ suggestion }: { suggestion: TriageSuggestion }) {
  const { t } = useI18n();
  return (
    <div className="status status--warn suggestion-view__guard">
      <h3>{t('suggestion_guard_title')}</h3>
      {suggestion.llmLevel !== null && (
        <p>
          {t('suggestion_guard_llm', {
            level: romanLevel(suggestion.llmLevel),
          })}
        </p>
      )}
      <ul>
        {suggestion.guardReasons.map((reason, index) => (
          <li key={`${reason.rule}-${index}`}>
            {t('suggestion_guard_reason', {
              rule: reason.rule,
              total: reason.trigger.news2Total,
              maxLevel: romanLevel(reason.maxLevel),
            })}
            {reason.trigger.field !== undefined &&
              reason.trigger.points !== undefined && (
                <>
                  {' '}
                  {t('suggestion_guard_reason_param', {
                    field: factorLabel(reason.trigger.field, t),
                    points: reason.trigger.points,
                  })}
                </>
              )}
          </li>
        ))}
      </ul>
      <p>{t('clinical_provisional')}</p>
    </div>
  );
}

/** Modo manual (R16): sin sugerencia válida, el triage de la atención será manual. */
export function ManualNotice() {
  const { t } = useI18n();
  return <p className="status status--warn">{t('suggestion_manual')}</p>;
}
