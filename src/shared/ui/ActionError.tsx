import type { ReactNode } from 'react';

/** "Error de acción" (glosario de F-02-web): va junto al control que lanzó la acción. */
export function ActionError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="status status--error">
      {children}
    </div>
  );
}
