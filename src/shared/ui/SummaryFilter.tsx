import type { ReactNode } from 'react';
import { LoadError } from './LoadError';

/**
 * Filtro «Sede» de la barra de resumen (D23): la última celda, con la etiqueta asociada al
 * control que recibe (`id` es el del control). Un fallo al cargar las sedes se muestra con el
 * `LoadError` vigente bajo el control, sin afectar a los indicadores ni al panel.
 */
export function SummaryFilter({
  id,
  label,
  children,
  error,
}: {
  id: string;
  label: string;
  children: ReactNode;
  error?: { message: string; onRetry: () => void; retrying?: boolean };
}) {
  return (
    <div className="summary__filter">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <LoadError
          message={error.message}
          retrying={error.retrying}
          onRetry={error.onRetry}
        />
      )}
    </div>
  );
}
