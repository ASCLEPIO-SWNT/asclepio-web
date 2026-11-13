import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSites } from '../../../shared/hooks/useSites';
import { useI18n } from '../../../shared/i18n';
import { LoadError } from '../../../shared/ui/LoadError';
import type { ReportPeriod } from '../reportsView';
import {
  periodSchema,
  type PeriodForm as PeriodFormValues,
  type PeriodValues,
} from '../schemas';

const TITLE_ID = 'reports-period-title';

/**
 * Región «Periodo» (F-07-web D10; R5–R7, R10): «Desde», «Hasta», «Sede» y «Aplicar». Nada se
 * pide hasta pulsar «Aplicar», y el periodo vive solo en memoria (ni URL ni almacenamiento).
 * `invalid` son los campos que la API rechazó (R8): se marcan y remiten al mensaje del periodo
 * (`describedBy`), con el texto de la web y no el de la API.
 */
export function PeriodForm({
  applied,
  onApply,
  invalid,
  describedBy,
}: {
  applied: ReportPeriod;
  onApply: (period: ReportPeriod) => void;
  invalid: ReadonlyArray<'from' | 'to'>;
  describedBy: string;
}) {
  const { t } = useI18n();
  const sites = useSites();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PeriodFormValues, unknown, PeriodValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      from: applied.from,
      to: applied.to,
      siteId: applied.siteId ?? '',
    },
  });

  const dateField = (name: 'from' | 'to', label: string) => {
    const id = `reports-${name}`;
    const errorId = `${id}-error`;
    const error = errors[name]?.message;
    const rejected = !error && invalid.includes(name);
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type="date"
          required
          aria-invalid={Boolean(error) || rejected}
          aria-describedby={
            error ? errorId : rejected ? describedBy : undefined
          }
          {...register(name)}
        />
        {error && (
          <p id={errorId} className="field__error">
            {t(error)}
          </p>
        )}
      </div>
    );
  };

  return (
    <section className="report-period" aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className="visually-hidden">
        {t('reports_period')}
      </h2>
      <form
        className="report-period__form"
        noValidate
        onSubmit={(event) => void handleSubmit(onApply)(event)}
      >
        {dateField('from', t('reports_from'))}
        {dateField('to', t('reports_to'))}
        <div className="field">
          <label htmlFor="reports-site">{t('feature_site')}</label>
          <select id="reports-site" {...register('siteId')}>
            <option value="">{t('feature_sites_all')}</option>
            {sites.data?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          {sites.isError && (
            <LoadError
              message={t('feature_sites_error')}
              retrying={sites.isFetching}
              onRetry={() => void sites.refetch()}
            />
          )}
        </div>
        <div className="report-period__actions">
          <button type="submit" className="button">
            {t('reports_apply')}
          </button>
        </div>
      </form>
    </section>
  );
}
