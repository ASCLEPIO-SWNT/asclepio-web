import {
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { ReportSummary } from '../../../shared/api/client';
import { useSites } from '../../../shared/hooks/useSites';
import { useI18n } from '../../../shared/i18n';
import {
  bogotaToday,
  formatCivilDate,
  formatDateTimeBogota,
} from '../../../shared/lib/datetime';
import { errorClassKey } from '../../../shared/lib/errors';
import type { IndicatorState } from '../../../shared/lib/indicator';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { DASHBOARD_REFRESH_MS } from '../../../shared/lib/refresh';
import { DashboardPage } from '../../../shared/ui/DashboardPage';
import { LiveNote } from '../../../shared/ui/LiveNote';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { PanelState } from '../../../shared/ui/PanelState';
import { RefreshButton } from '../../../shared/ui/RefreshButton';
import { SummaryBar } from '../../../shared/ui/SummaryBar';
import { SummaryCell } from '../../../shared/ui/SummaryCell';
import { SUMMARY_KEY, useReportSummary } from '../hooks/useReportSummary';
import {
  defaultPeriod,
  formatCount,
  formatPercent,
  type ReportPeriod,
} from '../reportsView';
import { CarePanel } from './CarePanel';
import { ConcordancePanel } from './ConcordancePanel';
import { ExportPanel } from './ExportPanel';
import { FallbackPanel } from './FallbackPanel';
import { PERIOD_ERROR_KEYS } from './periodErrors';
import { PeriodForm } from './PeriodForm';
import { ReportValue } from './ReportValue';
import { TimeToTriagePanel } from './TimeToTriagePanel';

const PERIOD_ERROR_ID = 'reports-period-error';

/** Un panel con un único estado (carga, error o sin permiso) en lugar de los indicadores (D9). */
function StatePanel({ children }: { children: ReactNode }) {
  return (
    <div className="panel">
      <div className="panel__body">{children}</div>
    </div>
  );
}

/**
 * Error del periodo (R8): un aviso sin «Reintentar», porque repetir el mismo periodo no cambia
 * nada. Su mensaje es la descripción de los campos rechazados.
 */
function PeriodError({ message }: { message: string }) {
  return (
    <div className="panel-state" role="alert">
      <span className="panel-state__icon tone--error">
        <ExclamationTriangleIcon aria-hidden="true" />
      </span>
      <p id={PERIOD_ERROR_ID} className="panel-state__msg">
        {message}
      </p>
    </div>
  );
}

/**
 * `/reportes`: tablero de reportes de F-07 (F-07-web D2, D9). Encabezado con «Actualizar», región
 * «Periodo», barra «Indicadores» y los paneles de tiempos, cumplimiento, concordancia y respaldo,
 * todos de un único `GET /reports/summary` del periodo aplicado, y «Exportar» con el CSV. La web
 * no calcula ningún indicador: muestra los del servidor con el formato del idioma.
 */
export function ReportsPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  // R5, D4: el periodo por defecto se calcula una sola vez, al montar.
  const [applied, setApplied] = useState<ReportPeriod>(() =>
    defaultPeriod(bogotaToday()),
  );
  const sites = useSites();
  const summary = useReportSummary(applied);
  const fetching = useIsFetching({ queryKey: SUMMARY_KEY }) > 0;

  const status = summary.isError ? statusOf(problemOf(summary.error)) : null;
  const forbidden = status === 403;
  const periodErrorKey =
    status === null ? undefined : PERIOD_ERROR_KEYS[status];
  const data: ReportSummary | undefined =
    forbidden || periodErrorKey ? undefined : summary.data;
  const problem = problemOf(summary.error);
  const invalid =
    periodErrorKey && problem.kind === 'other'
      ? problem.fieldErrors
          .map((error) => error.field)
          .filter((field): field is 'from' | 'to' =>
            ['from', 'to'].includes(field),
          )
      : [];

  const cellState: IndicatorState = forbidden
    ? 'forbidden'
    : data
      ? 'ready'
      : summary.isError
        ? 'error'
        : 'loading';
  // Un periodo inválido no se repite: sus celdas no ofrecen «Reintentar» (R8).
  const retryCell = periodErrorKey ? undefined : () => void summary.refetch();

  let main: ReactNode;
  if (forbidden) {
    main = (
      <StatePanel>
        <PanelState kind="forbidden" message={t('common_forbidden')} />
      </StatePanel>
    );
  } else if (periodErrorKey) {
    main = (
      <StatePanel>
        <PeriodError message={t(periodErrorKey)} />
      </StatePanel>
    );
  } else if (data) {
    main = (
      <>
        <p className="report-meta">
          <span>
            {t('reports_period_range', {
              from: formatCivilDate(data.period.from),
              to: formatCivilDate(data.period.to),
            })}
          </span>
          <span>{siteName(data.period.siteId)}</span>
          <time dateTime={data.generatedAt}>
            {t('reports_generated_at', {
              datetime: formatDateTimeBogota(data.generatedAt),
            })}
          </time>
          <LiveNote seconds={DASHBOARD_REFRESH_MS / 1000} />
        </p>
        {/* D9, R21: un refresco fallido conserva el último éxito con un aviso. */}
        {summary.isError && (
          <div className="status status--warn report-notice">
            <span>
              {t('reports_refresh_failed', {
                datetime: formatDateTimeBogota(data.generatedAt),
              })}
            </span>
            <button
              type="button"
              className="button button--secondary button--sm"
              aria-busy={summary.isFetching || undefined}
              onClick={() => void summary.refetch()}
            >
              {t('common_retry')}
            </button>
          </div>
        )}
        {data.population.encounters === 0 && (
          <div className="status report-notice report-notice--empty">
            <InformationCircleIcon aria-hidden="true" />
            <span>{t('reports_empty')}</span>
          </div>
        )}
        <TimeToTriagePanel summary={data} />
        <CarePanel summary={data} />
        <ConcordancePanel summary={data} />
        <FallbackPanel summary={data} />
      </>
    );
  } else if (summary.isError) {
    main = (
      <StatePanel>
        <PanelState
          kind="error"
          message={t(errorClassKey(summary.error) ?? 'common_error_server')}
          retrying={summary.isFetching}
          onRetry={() => void summary.refetch()}
        />
      </StatePanel>
    );
  } else {
    main = (
      <StatePanel>
        <PanelState kind="loading" message={t('reports_loading')} />
      </StatePanel>
    );
  }

  function siteName(siteId: string | null): string | null {
    if (siteId === null) return t('feature_sites_all');
    return sites.data?.find((site) => site.id === siteId)?.name ?? null;
  }

  return (
    <DashboardPage
      header={
        <>
          <PageHeader
            title={t('common_nav_reportes')}
            description={t('reports_lead')}
            actions={
              <RefreshButton
                onRefresh={() =>
                  void queryClient.invalidateQueries({ queryKey: SUMMARY_KEY })
                }
                busy={fetching}
              />
            }
          />
          <PeriodForm
            applied={applied}
            onApply={setApplied}
            invalid={invalid}
            describedBy={PERIOD_ERROR_ID}
          />
        </>
      }
      summary={
        <SummaryBar>
          <SummaryCell
            label={t('reports_stat_encounters')}
            icon={UsersIcon}
            tone="neutral"
            state={cellState}
            display={
              data && (
                <ReportValue
                  text={formatCount(data.population.encounters, locale)}
                />
              )
            }
            onRetry={retryCell}
          />
          <SummaryCell
            label={t('reports_stat_triaged')}
            icon={ClipboardDocumentCheckIcon}
            tone="accent"
            state={cellState}
            display={
              data && (
                <ReportValue
                  text={formatCount(data.population.triaged, locale)}
                />
              )
            }
            onRetry={retryCell}
          />
          <SummaryCell
            label={t('reports_stat_compliance')}
            icon={ChartBarIcon}
            tone="ok"
            state={cellState}
            display={
              data && (
                <ReportValue
                  text={formatPercent(data.compliance.percent, locale)}
                />
              )
            }
            onRetry={retryCell}
          />
        </SummaryBar>
      }
      main={
        <>
          {main}
          <ExportPanel period={applied} />
        </>
      }
    />
  );
}
