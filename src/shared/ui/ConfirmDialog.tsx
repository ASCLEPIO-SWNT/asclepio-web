import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useEffect, useId, useRef } from 'react';

/**
 * Diálogo modal de confirmación (UI-03-web R1, R30, D2) sobre `<dialog>` nativo con
 * `showModal()` (foco atrapado por el navegador). Abre con el foco en la acción no destructiva;
 * `Escape` equivale a ella. Al cerrar con «Seguir editando» devuelve el foco al control que lo
 * tenía. Las dos acciones usan el mismo botón.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const stay = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
    }
    stay.current?.focus();
    return () => {
      if (dialog?.open && typeof dialog.close === 'function') dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, []);
  return (
    <dialog
      ref={ref}
      open={typeof HTMLDialogElement.prototype.showModal !== 'function'}
      className="card confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <span className="panel-state__icon tone--error">
        <ExclamationTriangleIcon aria-hidden="true" />
      </span>
      <h2 id={titleId}>{title}</h2>
      <p id={bodyId}>{body}</p>
      <div className="actions">
        <button ref={stay} type="button" className="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
