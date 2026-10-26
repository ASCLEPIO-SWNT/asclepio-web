import { CONSUMED_CONTRACT } from '../../shared/api/client';
import { formatBogota } from '../../shared/lib/datetime';
import { useHealth } from './useHealth';

export function StatusPage() {
  const health = useHealth();

  return (
    <section className="card" aria-labelledby="status-title">
      <h1 id="status-title">Estado del sistema</h1>
      {health.isPending && <p role="status">Consultando la API…</p>}
      {health.isError && (
        <p role="alert" className="status status--error">
          API no disponible. {health.error.message}
        </p>
      )}
      {health.isSuccess && (
        <p role="status" className="status status--ok">
          API operativa · hora del servidor {formatBogota(health.data.time)}{' '}
          (Bogotá)
        </p>
      )}
      <p className="muted">Contrato consumido: v{CONSUMED_CONTRACT}</p>
    </section>
  );
}
