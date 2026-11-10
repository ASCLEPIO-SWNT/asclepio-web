import { useEffect, useRef } from 'react';
import type {
  TriageDecision,
  TriageDecisionAction,
} from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { formatDateTimeBogota } from '../../../shared/lib/datetime';
import { romanLevel } from '../suggestionView';

const ACTION_KEYS: Record<TriageDecisionAction, string> = {
  VALIDATE: 'decision_action_validate',
  CORRECT: 'decision_action_correct',
  MANUAL: 'decision_action_manual',
};

/**
 * La decisión de triage en solo lectura (F-05-web D12), sin red ni controles. El motivo se
 * muestra literal, sin traducir (R16, R25).
 */
export function TriageDecisionView({
  decision,
  autoFocus = false,
}: {
  decision: TriageDecision;
  /** R14: recibe el foco al aparecer tras un envío. */
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div ref={ref} tabIndex={-1} className="decision-view">
      <dl className="details">
        <dt>{t('decision_final_level')}</dt>
        <dd>
          <span className="badge tone--neutral">
            {romanLevel(decision.level)}
          </span>
        </dd>
        <dt>{t('decision_action_label')}</dt>
        <dd>{t(ACTION_KEYS[decision.action])}</dd>
        {decision.suggestedLevel !== null && (
          <>
            <dt>{t('decision_suggested_level')}</dt>
            <dd>{romanLevel(decision.suggestedLevel)}</dd>
          </>
        )}
        {decision.reason !== null && (
          <>
            <dt>{t('decision_reason')}</dt>
            <dd className="decision-view__reason">{decision.reason}</dd>
          </>
        )}
      </dl>
      <p className="muted">
        {t('decision_recorded_meta', {
          name: decision.decidedBy.fullName ?? t('feature_staff'),
          time: formatDateTimeBogota(decision.decidedAt),
        })}
      </p>
    </div>
  );
}
