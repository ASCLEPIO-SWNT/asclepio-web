import type { ReportSummary } from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { romanLevel } from '../../../shared/lib/level';
import { Panel } from '../../../shared/ui/Panel';
import { formatCount, formatKappa, formatPercent } from '../reportsView';
import { ReportTable } from './ReportTable';
import { ReportValue } from './ReportValue';

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * «Concordancia IA–enfermería» (F-07-web D6; R14, R15, R18): agregados del periodo, nunca una
 * atención concreta. Junto al kappa van siempre el número de pares y la nota de fiabilidad, sin
 * umbral (PA-4 a). La matriz es `matrix[sugerido − 1][final − 1]`, con las filas rotuladas por el
 * nivel sugerido por la IA y las columnas por el nivel final de enfermería.
 */
export function ConcordancePanel({ summary }: { summary: ReportSummary }) {
  const { t, locale } = useI18n();
  const { concordance } = summary;
  return (
    <Panel id="reports-concordance" title={t('reports_concordance_title')}>
      <dl className="report-stats">
        <div className="report-stat">
          <dt>{t('reports_pairs')}</dt>
          <dd className="report-stat__value">
            <ReportValue text={formatCount(concordance.pairs, locale)} />
          </dd>
        </div>
        <div className="report-stat">
          <dt>{t('reports_exact')}</dt>
          <dd className="report-stat__value">
            <ReportValue
              text={formatPercent(concordance.exactAgreementPercent, locale)}
            />
          </dd>
        </div>
        <div className="report-stat">
          <dt>{t('reports_kappa')}</dt>
          <dd className="report-stat__value">
            <ReportValue
              text={formatKappa(concordance.weightedKappa, locale)}
            />{' '}
            <span className="report-stat__meta">
              {t('reports_pairs_count', {
                pairs: formatCount(concordance.pairs, locale) ?? '',
              })}
            </span>{' '}
            <span className="report-stat__meta">{t('reports_kappa_note')}</span>
          </dd>
        </div>
        <div className="report-stat">
          <dt>{t('reports_under')}</dt>
          <dd className="report-stat__value">
            <ReportValue
              text={formatPercent(concordance.underTriagePercent, locale)}
            />
          </dd>
        </div>
        <div className="report-stat">
          <dt>{t('reports_over')}</dt>
          <dd className="report-stat__value">
            <ReportValue
              text={formatPercent(concordance.overTriagePercent, locale)}
            />
          </dd>
        </div>
      </dl>
      <ReportTable
        id="reports-matrix"
        caption={t('reports_matrix_caption')}
        className="report-matrix"
      >
        <thead>
          <tr>
            {/* Esquina sin dato: ni encabezado de fila ni de columna. */}
            <td className="report-matrix__corner" />
            {LEVELS.map((level) => (
              <th key={level} scope="col" className="num">
                {t('reports_matrix_final', { level: romanLevel(level) })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {concordance.matrix.map((row, suggested) => (
            <tr key={suggested}>
              <th scope="row">
                {t('reports_matrix_suggested', {
                  level: romanLevel(suggested + 1),
                })}
              </th>
              {row.map((count, final) => (
                <td
                  key={final}
                  className={
                    final === suggested ? 'num report-matrix__diag' : 'num'
                  }
                >
                  <ReportValue text={formatCount(count, locale)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </Panel>
  );
}
