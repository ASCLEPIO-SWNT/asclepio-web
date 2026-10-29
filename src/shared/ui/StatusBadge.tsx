import type { ReactNode } from 'react';
import type { IconComponent, Tone } from '../lib/encounterStatus';

/**
 * Insignia con icono y texto (R30): el estado nunca se transmite solo con color. El tono
 * (`.tone--*`) sale de los tokens semánticos y cambia con el tema y el modo de color.
 */
export function StatusBadge({
  tone,
  icon: Icon,
  children,
}: {
  tone: Tone;
  icon: IconComponent;
  children: ReactNode;
}) {
  return (
    <span className={`badge tone--${tone}`}>
      <Icon aria-hidden="true" />
      {children}
    </span>
  );
}
