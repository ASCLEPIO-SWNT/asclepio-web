import { BellAlertIcon } from '@heroicons/react/24/outline';
import type { RedFlag } from '../api/client';
import { useI18n } from '../i18n';
import { RED_FLAG_LABELS } from '../lib/labels';
import { StatusBadge } from './StatusBadge';

/**
 * Insignia «Señal de alarma referida por el paciente» (F-11-web R2, R5): icono decorativo y
 * texto visible, nunca solo color. Con `flags` añade la lista traducida en el orden recibido;
 * la cola solo trae `hasRedFlags` y la usa sin lista. Informa: no cambia ni propone un nivel.
 */
export function RedFlagBadge({ flags = [] }: { flags?: readonly RedFlag[] }) {
  const { t } = useI18n();
  return (
    <div className="red-flags">
      <StatusBadge tone="error" icon={BellAlertIcon}>
        {t('red_flag_badge')}
      </StatusBadge>
      {flags.length > 0 && (
        <ul className="red-flags__list" aria-label={t('red_flag_list')}>
          {flags.map((flag) => (
            <li key={flag}>{RED_FLAG_LABELS[flag]}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
