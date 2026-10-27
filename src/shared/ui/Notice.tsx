import type { ReactNode } from 'react';

/** Aviso de éxito de una acción (role="status"). */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="status status--ok notice">
      {children}
    </div>
  );
}
