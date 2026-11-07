import { ClockIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import { StatusBadge } from './StatusBadge';

/**
 * Franja «pendiente» (D13, R18): el hueco que dejan F-06 y F-07 dentro de `/cola` y
 * `/reportes`. Región nombrada por su `h2`, con icono, texto de lo que traerá, la insignia
 * «Próximamente» y una frase neutral sin código interno de feature (UI-04-web R10, D10). Sin
 * botones, enlaces, formularios ni peticiones propias, y sin niveles, tiempos, umbrales ni cifras.
 */
export function PendingStrip({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="pending" aria-labelledby={id}>
      <span className="pending__icon">
        <ClockIcon aria-hidden="true" />
      </span>
      <div className="pending__text">
        <h2 id={id} className="pending__title">
          {title}
        </h2>
        <p>{children}</p>
      </div>
      <div className="pending__meta">
        <StatusBadge tone="neutral" icon={ClockIcon}>
          {t('common_pending_label')}
        </StatusBadge>
        <span className="muted">{t('common_pending')}</span>
      </div>
    </section>
  );
}
