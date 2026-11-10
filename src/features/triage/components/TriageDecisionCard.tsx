import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import type {
  ClinicalCapture,
  Encounter,
  TriageDecision,
} from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { TriageDecisionActions } from './TriageDecisionActions';
import { TriageDecisionView } from './TriageDecisionView';

export interface TriageDecisionCardProps {
  encounterId: string;
  encounter: Encounter;
  capture: ClinicalCapture;
  /** La atención está habilitada para capturar (`canCapture` de la página). */
  enabled: boolean;
  /** D5: la atención trae nivel final o esta visita recibió un 201. */
  decided: boolean;
  /** Consulta de la decisión (`useTriageDecision`), que vive en la página (D5). */
  decision: UseQueryResult<TriageDecision>;
  /** D9: el último envío respondió 409. */
  conflict: boolean;
  onConflict: () => void;
  /** Empieza un envío: la página olvida el 409 anterior (D9). */
  onSubmitStart: () => void;
  onUnavailable: (status: 403 | 404) => void;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Tarjeta «Triage de enfermería» (F-05-web D1): hermana del panel de sugerencia. Sin decidir
 * ofrece las acciones; decidida, muestra la decisión en solo lectura (R15–R17). Una atención sin
 * decidir que ya no está en espera no muestra nada (R18): la página ya avisa de que es de solo
 * lectura.
 */
export function TriageDecisionCard({
  encounterId,
  encounter,
  capture,
  enabled,
  decided,
  decision,
  conflict,
  onConflict,
  onSubmitStart,
  onUnavailable,
  onDirtyChange,
}: TriageDecisionCardProps) {
  const { t } = useI18n();
  // R14: tras un 201 de esta visita, el foco va a la decisión.
  const [justDecided, setJustDecided] = useState(false);
  if (!decided && encounter.status !== 'WAITING_TRIAGE') return null;
  return (
    <section className="card decision-card" aria-labelledby="decision-title">
      <h2 id="decision-title" className="clinical-card-heading">
        <ClipboardDocumentCheckIcon aria-hidden="true" />
        {t('decision_title')}
      </h2>
      {decided ? (
        <>
          {conflict && (
            <p className="status status--warn">
              {t('decision_already_decided')}
            </p>
          )}
          {decision.data !== undefined ? (
            <TriageDecisionView
              decision={decision.data}
              autoFocus={justDecided || conflict}
            />
          ) : decision.isError ? (
            <LoadError
              message={t('decision_load_error')}
              error={decision.error}
              retrying={decision.isFetching}
              onRetry={() => void decision.refetch()}
            />
          ) : (
            <LoadingState>{t('decision_loading')}</LoadingState>
          )}
        </>
      ) : (
        <TriageDecisionActions
          encounterId={encounterId}
          capture={capture}
          disabled={!enabled}
          onConflict={onConflict}
          onSubmitStart={onSubmitStart}
          onUnavailable={onUnavailable}
          onDirtyChange={onDirtyChange}
          onDecided={() => setJustDecided(true)}
        />
      )}
    </section>
  );
}
