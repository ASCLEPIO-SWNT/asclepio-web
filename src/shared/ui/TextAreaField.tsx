import type { UseFormRegisterReturn } from 'react-hook-form';

/** Campo de texto con su mensaje de error accesible (`aria-invalid`, `aria-describedby`). */
export function TextAreaField({
  id,
  label,
  error,
  registration,
  rows = 3,
}: {
  id: string;
  label: string;
  error: string | undefined;
  registration: UseFormRegisterReturn;
  rows?: number;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : false}
        aria-describedby={error ? errorId : undefined}
        {...registration}
      />
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
