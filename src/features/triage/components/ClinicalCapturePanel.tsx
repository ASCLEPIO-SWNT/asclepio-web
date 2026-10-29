import { useI18n } from '../../../shared/i18n';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { ViewForbidden } from '../../../shared/ui/ViewForbidden';
import { useClinicalCapture } from '../hooks/useClinicalCapture';
import { ClinicalCaptureHistory } from './ClinicalCaptureHistory';

export function ClinicalCaptureReadout({
  query,
}: {
  query: ReturnType<typeof useClinicalCapture>;
}) {
  const { t } = useI18n();
  if (query.isPending)
    return <LoadingState>{t('clinical_history_loading')}</LoadingState>;
  if (query.isError) {
    const status = statusOf(problemOf(query.error));
    if (status === 403) return <ViewForbidden />;
    if (status === 404)
      return (
        <p className="status status--error" role="alert">
          {t('clinical_not_found')}
        </p>
      );
    return (
      <LoadError
        message={t('clinical_history_error')}
        retrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <ClinicalCaptureHistory capture={query.data} />;
}

/** Mounted only for the roles authorized to read the clinical endpoint. */
export function ClinicalCapturePanel({ encounterId }: { encounterId: string }) {
  const query = useClinicalCapture(encounterId);
  return (
    <div className="clinical-history-panel">
      <ClinicalCaptureReadout query={query} />
    </div>
  );
}
