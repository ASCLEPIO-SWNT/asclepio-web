import type { ReactNode } from 'react';
import type { IconComponent } from '../lib/encounterStatus';

/**
 * Aviso de éxito de una acción (role="status"). Con `icon` (los dashboards usan una marca de
 * verificación, D29) antepone el icono decorativo y agrupa el contenido en un solo elemento,
 * para que el texto y el enlace fluyan juntos; sin él, el marcado es el de siempre.
 */
export function Notice({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon?: IconComponent;
}) {
  return (
    <div role="status" className="status status--ok notice">
      {Icon ? (
        <>
          <Icon aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </div>
  );
}
