import type {
  ReportCountPercent,
  ReportSummary,
} from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { Panel } from '../../../shared/ui/Panel';
import { formatCount, formatPercent } from '../reportsView';
import { ReportTable } from './ReportTable';
import { ReportValue } from './ReportValue';

interface UsageRow {
  key: string;
  label: string;
  value: ReportCountPercent;
}

/** Una tabla pequeña de uso: conteo y porcentaje por fila, y el denominador en el pie. */
function UsageTable({
  id,
  caption,
  column,
  rows,
  total,
}: {
  id: string;
  caption: string;
  column: string;
  rows: UsageRow[];
  total: number;
}) {
  const { t, locale } = useI18n();
  return (
    <ReportTable id={id} caption={caption}>
      <thead>
        <tr>
          <th scope="col">
            <span className="visually-hidden">{caption}</span>
          </th>
          <th scope="col" className="num">
            {column}
          </th>
          <th scope="col" className="num">
            {t('reports_col_percent')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td className="num">
              <ReportValue text={formatCount(row.value.count, locale)} />
            </td>
            <td className="num">
              <ReportValue text={formatPercent(row.value.percent, locale)} />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>
            {t('reports_table_total', {
              count: formatCount(total, locale) ?? '',
            })}
          </td>
        </tr>
      </tfoot>
    </ReportTable>
  );
}

/**
 * «Uso de respaldo y safety guards» (F-07-web D6; R16): decisiones de enfermería, estado de las
 * sugerencias, proveedor y safety guards aplicados, cada uno con su denominador de la API.
 */
export function FallbackPanel({ summary }: { summary: ReportSummary }) {
  const { t } = useI18n();
  const { decisions, suggestions, providers, guards } = summary.fallback;
  return (
    <Panel id="reports-fallback" title={t('reports_fallback_title')}>
      <div className="report-tables">
        <UsageTable
          id="reports-decisions"
          caption={t('reports_decisions')}
          column={t('reports_col_count')}
          total={decisions.total}
          rows={[
            {
              key: 'validate',
              label: t('reports_action_validate'),
              value: decisions.VALIDATE,
            },
            {
              key: 'correct',
              label: t('reports_action_correct'),
              value: decisions.CORRECT,
            },
            {
              key: 'manual',
              label: t('reports_action_manual'),
              value: decisions.MANUAL,
            },
          ]}
        />
        <UsageTable
          id="reports-suggestions"
          caption={t('reports_suggestions')}
          column={t('reports_col_suggestions')}
          total={suggestions.total}
          rows={[
            { key: 'ok', label: t('reports_status_ok'), value: suggestions.OK },
            {
              key: 'invalid',
              label: t('reports_status_invalid'),
              value: suggestions.INVALID_OUTPUT,
            },
            {
              key: 'timeout',
              label: t('reports_status_timeout'),
              value: suggestions.TIMEOUT,
            },
            {
              key: 'failed',
              label: t('reports_status_failed'),
              value: suggestions.FAILED,
            },
          ]}
        />
        <UsageTable
          id="reports-providers"
          caption={t('reports_providers')}
          column={t('reports_col_suggestions')}
          total={providers.total}
          rows={[
            {
              key: 'groq',
              label: t('reports_provider_groq'),
              value: providers.GROQ,
            },
            {
              key: 'openrouter',
              label: t('reports_provider_openrouter'),
              value: providers.OPENROUTER,
            },
          ]}
        />
        <UsageTable
          id="reports-guards"
          caption={t('reports_guards')}
          column={t('reports_col_suggestions')}
          total={guards.total}
          rows={[
            {
              key: 'applied',
              label: t('reports_guards_applied'),
              value: { count: guards.applied, percent: guards.percent },
            },
          ]}
        />
      </div>
    </Panel>
  );
}
