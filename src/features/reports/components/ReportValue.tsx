import { useI18n } from '../../../shared/i18n';

/**
 * Un valor del servidor ya formateado (F-07-web D5; R3, R4), o «Sin datos» si la API mandó
 * `null`: nunca «0», «0 %», «—» ni una celda vacía.
 */
export function ReportValue({ text }: { text: string | null }) {
  const { t } = useI18n();
  return text === null ? (
    <span className="report-value report-value--empty">
      {t('reports_no_data')}
    </span>
  ) : (
    <span className="report-value">{text}</span>
  );
}
