import { useEffect, useRef, type ReactNode } from 'react';
import type { IconComponent } from '../lib/encounterStatus';

/**
 * Aviso de éxito de una acción (role="status"). Con `icon` (los dashboards usan una marca de
 * verificación, D29) antepone el icono decorativo y agrupa el contenido en un solo elemento,
 * para que el texto y el enlace fluyan juntos; sin él, el marcado es el de siempre. Con
 * `autoFocus` (UI-04-web R16, D16) es enfocable por programa y toma el foco al montarse: el
 * formulario que lo muestra deshabilitó su botón durante el envío y el foco caía en `body`.
 */
export function Notice({
  children,
  icon: Icon,
  autoFocus = false,
}: {
  children: ReactNode;
  icon?: IconComponent;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div
      ref={ref}
      role="status"
      className="status status--ok notice"
      tabIndex={autoFocus ? -1 : undefined}
    >
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
