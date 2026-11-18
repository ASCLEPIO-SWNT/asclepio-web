import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useIsMutating } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useI18n } from '../../../shared/i18n';
import {
  actionErrorMessage,
  isRetryableActionMessage,
  problemOf,
  statusOf,
} from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { Notice } from '../../../shared/ui/Notice';
import { Panel } from '../../../shared/ui/Panel';
import { CSV_KEY, useCsvDownload } from '../hooks/useCsvDownload';
import type { ReportPeriod } from '../reportsView';
import { PERIOD_ERROR_KEYS } from './periodErrors';

const NOTICE_ID = 'reports-csv-notice';

/** Resultado de la última descarga: éxito o error de acción, con la repetición si procede. */
type Outcome =
  { kind: 'done' } | { kind: 'error'; key: string; retry: ReportPeriod | null };

/**
 * «Exportar» (F-07-web D7; R23–R27): «Descargar CSV» con el aviso de formato interno asociado,
 * siempre visible. La descarga usa el periodo aplicado, ignora pulsaciones mientras dura y su
 * error vive en este panel, sin tocar la barra ni los otros paneles.
 */
export function ExportPanel({ period }: { period: ReportPeriod }) {
  const { t } = useI18n();
  const download = useCsvDownload();
  const busy = useIsMutating({ mutationKey: CSV_KEY }) > 0;
  const inFlight = useRef(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const start = (target: ReportPeriod) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setOutcome(null);
    download.mutate(target, {
      onSuccess: () => setOutcome({ kind: 'done' }),
      onError: (cause) => {
        const problem = problemOf(cause);
        const status = statusOf(problem);
        // El 401 lo resuelve el cierre de sesión global del cliente HTTP.
        if (status === 401) return;
        const key = actionErrorMessage(problem, {
          ...PERIOD_ERROR_KEYS,
          403: 'reports_csv_forbidden',
        });
        setOutcome({
          kind: 'error',
          key: PERIOD_ERROR_KEYS[status ?? 0] ?? key,
          retry: isRetryableActionMessage(key) ? target : null,
        });
      },
      onSettled: () => {
        inFlight.current = false;
      },
    });
  };

  return (
    <Panel id="reports-export" title={t('reports_export_title')}>
      <div className="report-export">
        <div className="report-export__action">
          <button
            type="button"
            className="button"
            aria-describedby={NOTICE_ID}
            aria-busy={busy || undefined}
            onClick={() => start(period)}
          >
            <ArrowDownTrayIcon aria-hidden="true" />
            {t('reports_csv_download')}
          </button>
          <p id={NOTICE_ID} className="report-csv-notice">
            <InformationCircleIcon aria-hidden="true" />
            <span>{t('reports_csv_notice')}</span>
          </p>
        </div>
        {busy && <LoadingState>{t('reports_csv_preparing')}</LoadingState>}
        {outcome?.kind === 'done' && (
          <Notice icon={CheckCircleIcon}>{t('reports_csv_done')}</Notice>
        )}
        {outcome?.kind === 'error' && (
          <ActionError
            onRetry={
              outcome.retry
                ? () => {
                    const retry = outcome.retry;
                    if (retry) start(retry);
                  }
                : undefined
            }
          >
            {t(outcome.key)}
          </ActionError>
        )}
      </div>
    </Panel>
  );
}
