import { SparklesIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  ClinicalCapture,
  TriageSuggestion,
} from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import {
  NETWORK_ACTION_MESSAGE,
  SERVER_ACTION_MESSAGE,
  isRetryableActionMessage,
  problemOf,
  statusOf,
} from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { useRequestTriageSuggestion } from '../hooks/useRequestTriageSuggestion';
import { useTriageSuggestions } from '../hooks/useTriageSuggestions';
import {
  isOutdated,
  suggestionMode,
  type SuggestionMode,
} from '../suggestionView';
import { ManualNotice, TriageSuggestionView } from './TriageSuggestionView';

export interface TriageSuggestionPanelProps {
  encounterId: string;
  /** La atención está habilitada para capturar (`canCapture` de la página). */
  enabled: boolean;
  capture: ClinicalCapture;
  /** 409 de la solicitud: la página comprueba el estado (F-03-web R17). */
  onConflict: () => void;
  /** 403/404 de la solicitud: la página muestra su vista sin permiso o no encontrada. */
  onUnavailable: (status: 403 | 404) => void;
  /**
   * F-05-web D3: con la atención ya registrada no hay botón de solicitud, ni el texto de tomas,
   * ni `renderActions`. La vista de la sugerencia y los errores de la consulta siguen igual.
   */
  decided?: boolean;
  /**
   * D7: punto de extensión para F-05-web (Validar, Corregir, Manual). Se renderiza debajo de la
   * vista solo si se pasa; en este slice nadie lo pasa y no queda ningún contenedor.
   */
  renderActions?: (context: {
    current: TriageSuggestion | null;
    mode: SuggestionMode;
    requesting: boolean;
  }) => ReactNode;
}

/**
 * Panel de sugerencia de triage (F-04-web D1–D5): consulta la vigente (`items[0]`) cuando la
 * captura tiene al menos una toma y pide una nueva solo al pulsar el botón. Sus errores de
 * consulta se quedan dentro del panel (R3).
 */
export function TriageSuggestionPanel({
  encounterId,
  enabled,
  capture,
  onConflict,
  onUnavailable,
  decided = false,
  renderActions,
}: TriageSuggestionPanelProps) {
  const { t } = useI18n();
  const hasVitals = capture.vitalSigns.length > 0;
  const query = useTriageSuggestions(encounterId, hasVitals);
  const mutation = useRequestTriageSuggestion(encounterId);
  // D5: una sola solicitud por pulsación, aunque React aún no haya deshabilitado el botón.
  const inFlight = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  useEffect(() => {
    if (focusTick > 0) resultRef.current?.focus();
  }, [focusTick]);
  // R3: solo una consulta con éxito aporta sugerencia vigente.
  const current = query.isSuccess ? (query.data.items[0] ?? null) : null;
  const requesting = mutation.isPending;
  const canRequest = enabled && hasVitals && !requesting && !decided;
  const request = () => {
    if (!canRequest || inFlight.current) return;
    inFlight.current = true;
    setErrorKey(null);
    mutation.mutate(undefined, {
      // D16: el resultado recibe el foco (el botón está deshabilitado durante la espera).
      onSuccess: () => setFocusTick((tick) => tick + 1),
      onError: (cause) => {
        const status = statusOf(problemOf(cause));
        if (status === 409) {
          // R18 (PA-10 a): mensaje en contexto y comprobación de estado, sin modo manual.
          setErrorKey('suggestion_conflict');
          onConflict();
        } else if (status === 403 || status === 404) {
          onUnavailable(status);
        } else if (status !== 401) {
          // R17: red → texto de red; 5xx y cualquier otro estado → texto del servidor.
          // El 401 lo resuelve el cierre de sesión global del cliente.
          setErrorKey(
            status === null ? NETWORK_ACTION_MESSAGE : SERVER_ACTION_MESSAGE,
          );
        }
      },
      onSettled: () => {
        inFlight.current = false;
      },
    });
  };
  return (
    <section
      className="card suggestion-panel"
      aria-labelledby="suggestion-title"
    >
      <h2 id="suggestion-title" className="clinical-card-heading">
        <SparklesIcon aria-hidden="true" />
        {t('suggestion_title')}
      </h2>
      {hasVitals && query.isPending && (
        <LoadingState>{t('suggestion_loading')}</LoadingState>
      )}
      {hasVitals && query.isError && (
        <LoadError
          message={t('suggestion_load_error')}
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.isSuccess && current === null && (
        <p className="muted">{t('suggestion_empty')}</p>
      )}
      {current !== null && (
        <div ref={resultRef} tabIndex={-1} className="suggestion-panel__result">
          <TriageSuggestionView suggestion={current} />
          {/* D15 (PA-8 b): aviso no bloqueante; solo compara horas del servidor. */}
          {isOutdated(current, capture) && (
            <p className="status status--warn">{t('suggestion_outdated')}</p>
          )}
        </div>
      )}
      {!decided &&
        renderActions?.({
          current,
          mode: suggestionMode(current),
          requesting,
        })}
      {/* R17 (PA-9 a): sin sugerencia vigente, un error de red o servidor deja el modo manual. */}
      {current === null && isRetryableActionMessage(errorKey) && (
        <ManualNotice />
      )}
      {errorKey && (
        <ActionError
          onRetry={isRetryableActionMessage(errorKey) ? request : undefined}
        >
          {t(errorKey)}
        </ActionError>
      )}
      {!decided && (
        <div className="suggestion-panel__request">
          <button
            type="button"
            className="button"
            disabled={!canRequest}
            aria-describedby={hasVitals ? undefined : 'suggestion-needs-vitals'}
            onClick={request}
          >
            <SparklesIcon aria-hidden="true" />
            {t(current ? 'suggestion_request_again' : 'suggestion_request')}
          </button>
          {!hasVitals && (
            <p id="suggestion-needs-vitals" className="muted">
              {t('suggestion_needs_vitals')}
            </p>
          )}
        </div>
      )}
      {requesting && <LoadingState>{t('suggestion_requesting')}</LoadingState>}
    </section>
  );
}
