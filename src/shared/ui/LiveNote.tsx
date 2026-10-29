import { useI18n } from '../i18n';

/**
 * «Se actualiza cada 30 s» (R38, D25): texto plano junto a los datos que se refrescan. Sin
 * `role` ni `aria-live`, para que el lector de pantalla la lea en su sitio y no anuncie cada
 * ciclo; el punto de estado es decorativo (`::before` en el CSS).
 */
export function LiveNote({ seconds }: { seconds: number }) {
  const { t } = useI18n();
  return <span className="live">{t('dash_live', { seconds })}</span>;
}
