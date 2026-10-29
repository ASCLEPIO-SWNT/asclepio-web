import { ClockIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import { StatusBadge } from './StatusBadge';

/**
 * Franja «pendiente» (D13, R18): el hueco que dejan F-06 y F-07 dentro de `/cola` y
 * `/reportes`. Región nombrada por su `h2`, con icono, texto de lo que traerá, la insignia
 * «Próximamente» y la frase de la feature que la llenará. Sin botones, enlaces, formularios
 * ni peticiones propias, y sin niveles, tiempos, umbrales ni cifras.
 */
export function PendingStrip({
  id,
  title,
  feature,
  children,
}: {
  id: string;
  title: string;
  feature: string;
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
        <span className="muted">{t('common_pending', { feature })}</span>
      </div>
    </section>
  );
}
