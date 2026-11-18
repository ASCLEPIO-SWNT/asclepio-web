import type { ReportSummary } from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { romanLevel } from '../../../shared/lib/level';
import { Panel } from '../../../shared/ui/Panel';
import { formatCount, formatMinutes, triageRows } from '../reportsView';
import { ReportTable } from './ReportTable';
import { ReportValue } from './ReportValue';

/**
 * «De la llegada al triage» (F-07-web D6; R11): una fila por nivel en el orden de la API y el
 * total, con n, mediana y p90 en minutos tal como llegan.
 */
export function TimeToTriagePanel({ summary }: { summary: ReportSummary }) {
  const { t, locale } = useI18n();
  const title = t('reports_triage_title');
  return (
    <Panel id="reports-triage" title={title}>
      <ReportTable id="reports-triage-table" caption={title} captionHidden>
        <thead>
          <tr>
            <th scope="col">{t('reports_col_level')}</th>
            <th scope="col" className="num">
              {t('reports_col_count')}
            </th>
            <th scope="col" className="num">
              {t('reports_col_median')}
            </th>
            <th scope="col" className="num">
              {t('reports_col_p90')}
            </th>
          </tr>
        </thead>
        <tbody>
          {triageRows(summary).map((row) => (
            <tr
              key={row.key}
              className={row.level === null ? 'report-table__total' : undefined}
            >
              <th scope="row">
                {row.level === null
                  ? t('reports_total')
                  : t('reports_level', { level: romanLevel(row.level) })}
              </th>
              <td className="num">
                <ReportValue text={formatCount(row.n, locale)} />
              </td>
              <td className="num">
                <ReportValue text={formatMinutes(row.median, locale)} />
              </td>
              <td className="num">
                <ReportValue text={formatMinutes(row.p90, locale)} />
              </td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </Panel>
  );
}
