import type { ClinicalCapture } from '../../../shared/api/client';
import { Fragment } from 'react';
import { useI18n } from '../../../shared/i18n';
import { formatBogota } from '../../../shared/lib/datetime';
import { VITAL_FIELDS, VITAL_UNITS } from '../clinicalSchemas';

export function ClinicalCaptureHistory({
  capture,
}: {
  capture: ClinicalCapture;
}) {
  const { t } = useI18n();
  if (!capture.vitalSigns.length && !capture.symptomFindings.length)
    return (
      <p className="muted" role="status">
        {t('clinical_history_empty')}
      </p>
    );
  return (
    <div className="clinical-history">
      {capture.vitalSigns.length > 0 && (
        <section aria-labelledby="clinical-history-vitals">
          <h2 id="clinical-history-vitals">{t('clinical_history_vitals')}</h2>
          {capture.vitalSigns.map((record, index) => (
            <article
              className="clinical-record"
              key={record.id}
              aria-labelledby={`measurement-${record.id}`}
            >
              <h3 id={`measurement-${record.id}`}>
                {t('clinical_measurement', { index: index + 1 })}
              </h3>
              <dl className="details">
                {VITAL_FIELDS.map((field) => (
                  <Fragment key={field}>
                    <dt>{t(`clinical_field_${field}`)}</dt>
                    <dd>
                      {typeof record[field] === 'boolean'
                        ? t(record[field] ? 'clinical_yes' : 'clinical_no')
                        : (record[field] ?? '—')}
                      {record[field] !== null &&
                        VITAL_UNITS[field] &&
                        ` ${VITAL_UNITS[field]}`}
                    </dd>
                  </Fragment>
                ))}
                <dt>{t('clinical_recorded_at')}</dt>
                <dd>{formatBogota(record.recordedAt)}</dd>
                <dt>{t('clinical_recorded_by')}</dt>
                <dd>{record.recordedBy.fullName ?? record.recordedBy.id}</dd>
              </dl>
            </article>
          ))}
        </section>
      )}
      {capture.symptomFindings.length > 0 && (
        <section aria-labelledby="clinical-history-findings">
          <h2 id="clinical-history-findings">
            {t('clinical_history_findings')}
          </h2>
          {capture.symptomFindings.map((record) => (
            <article className="clinical-record" key={record.id}>
              <h3>{t(`clinical_kind_${record.kind}`)}</h3>
              <p className="clinical-text">{record.description}</p>
              <dl className="details">
                <dt>{t('clinical_recorded_at')}</dt>
                <dd>{formatBogota(record.recordedAt)}</dd>
                <dt>{t('clinical_recorded_by')}</dt>
                <dd>{record.recordedBy.fullName ?? record.recordedBy.id}</dd>
              </dl>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
