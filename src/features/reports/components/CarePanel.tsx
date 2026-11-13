import type { ReportSummary } from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { romanLevel } from '../../../shared/lib/level';
import { Panel } from '../../../shared/ui/Panel';
import {
  careRows,
  formatCount,
  formatMinutes,
  formatPercent,
} from '../reportsView';
import { ReportTable } from './ReportTable';
import { ReportValue } from './ReportValue';

/**
 * «Triage I y II: de la clasificación a la atención» (F-07-web D6; R12, R13): la tabla de los
 * niveles I y II con media, mediana y p90, y el cumplimiento del nivel II con el máximo que manda
 * la API (`compliance.maxMinutes`). El nivel I no tiene porcentaje: es atención inmediata.
 */
export function CarePanel({ summary }: { summary: ReportSummary }) {
  const { t, locale } = useI18n();
  const title = t('reports_care_title');
  const { compliance } = summary;
  return (
    <Panel id="reports-care" title={title}>
      <p className="report-note">{t('reports_care_note')}</p>
      <ReportTable id="reports-care-table" caption={title} captionHidden>
        <thead>
          <tr>
            <th scope="col">{t('reports_col_level')}</th>
            <th scope="col" className="num">
              {t('reports_col_count')}
            </th>
            <th scope="col" className="num">
              {t('reports_col_mean')}
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
          {careRows(summary).map((row) => (
            <tr key={row.key}>
              <th scope="row">
                {t('reports_level', { level: romanLevel(row.level) })}
              </th>
              <td className="num">
                <ReportValue text={formatCount(row.n, locale)} />
              </td>
              <td className="num">
                <ReportValue text={formatMinutes(row.mean, locale)} />
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
      <div className="report-compliance">
        <dl className="report-stats">
          <div className="report-stat">
            <dt>
              {t('reports_compliance_title', {
                max: formatCount(compliance.maxMinutes, locale) ?? '',
              })}
            </dt>
            <dd className="report-stat__value">
              <ReportValue text={formatPercent(compliance.percent, locale)} />
            </dd>
            <dd>
              {t('reports_compliance_of', {
                compliant: formatCount(compliance.compliant, locale) ?? '',
                evaluable: formatCount(compliance.evaluable, locale) ?? '',
              })}
            </dd>
          </div>
        </dl>
        <p className="report-note">
          {t('reports_not_evaluated', {
            count: formatCount(compliance.notEvaluated, locale) ?? '',
          })}
        </p>
        <p className="report-note">{t('reports_level1_note')}</p>
      </div>
    </Panel>
  );
}
