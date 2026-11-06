import { useState } from 'react';
import { useLocation } from 'react-router';

/**
 * Región viva cortés única del marco (UI-03-web R11, D9): anuncia el título de la pantalla al
 * navegar dentro de la aplicación, no en la carga inicial. No mueve el foco: cada pantalla ya
 * gestiona el suyo.
 */
export function RouteAnnouncer({ title }: { title: string }) {
  const { key } = useLocation();
  const [initialKey] = useState(key);
  return (
    <div
      className="visually-hidden"
      aria-live="polite"
      aria-atomic="true"
      data-route-announcer=""
    >
      {key === initialKey ? '' : title}
    </div>
  );
}
