import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { session, type EndReason } from '../../../shared/api/session';
import { ApiProblemError, type ApiProblem } from '../../../shared/lib/problem';
import { useLogin } from '../hooks/useLogin';
import { useMe } from '../hooks/useMe';
import { loginSchema, type LoginForm } from '../schemas';
import { useSession } from '../useSession';

/** Segundos de bloqueo tras un 429 sin Retry-After entero (ventana de R39 de F-01-api). */
const DEFAULT_RETRY_AFTER_SECONDS = 60;

const END_REASON_MESSAGES: Record<EndReason, string | null> = {
  expired: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  patient:
    'Esta web es solo para el personal. Los pacientes usan la app móvil.',
  logout: null,
};

function problemMessage(problem: ApiProblem): string {
  switch (problem.kind) {
    case 'unauthorized':
      return 'Correo o contraseña incorrectos.';
    case 'rateLimited':
      return problem.retryAfterSeconds !== undefined
        ? `Demasiados intentos. Espera ${problem.retryAfterSeconds} segundos e inténtalo de nuevo.`
        : 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'network':
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    case 'other':
      return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}

const problemOf = (error: unknown): ApiProblem =>
  error instanceof ApiProblemError
    ? error.problem
    : { kind: 'other', status: 0, fieldErrors: [] };

export function LoginPage() {
  const { session: current, endReason } = useSession();
  const me = useMe();
  const login = useLogin();
  const [blockedSeconds, setBlockedSeconds] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const alertRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    resetField,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    shouldFocusError: true,
  });

  // R4: el login y el primer GET /me posterior cuentan como "ingresando".
  const busy = login.isPending || (current !== null && me.isPending);
  const disabled = busy || blockedSeconds > 0;

  // R7: Ingresar queda deshabilitado durante los segundos de Retry-After.
  useEffect(() => {
    if (blockedSeconds <= 0) return;
    const timer = setTimeout(() => setBlockedSeconds(0), blockedSeconds * 1000);
    return () => clearTimeout(timer);
  }, [blockedSeconds]);

  // D11: el foco va al mensaje de error del servidor.
  useEffect(() => {
    if (alertCount > 0) alertRef.current?.focus();
  }, [alertCount]);

  const onValid = (values: LoginForm) => {
    if (disabled) return;
    session.dismissEndReason();
    login.mutate(values, {
      onError: (error) => {
        const problem = problemOf(error);
        if (problem.kind === 'unauthorized') resetField('password');
        if (problem.kind === 'rateLimited') {
          setBlockedSeconds(
            problem.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS,
          );
        }
        if (problem.kind === 'other') {
          for (const { field, message } of problem.fieldErrors) {
            if (field === 'email' || field === 'password') {
              setError(field, { type: 'server', message });
            }
          }
        }
        setAlertCount((n) => n + 1);
      },
    });
  };

  const serverMessage = login.isError
    ? problemMessage(problemOf(login.error))
    : null;
  const endMessage =
    !serverMessage && endReason ? END_REASON_MESSAGES[endReason] : null;

  return (
    <section className="card login" aria-labelledby="login-title">
      <h1 id="login-title">Iniciar sesión</h1>
      <p className="muted">Acceso para el personal de la IPS.</p>

      {serverMessage && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="status status--error"
        >
          {serverMessage}
        </div>
      )}
      {endMessage && (
        <div role="alert" className="status status--warn">
          {endMessage}
        </div>
      )}

      <form
        className="form"
        noValidate
        onSubmit={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          void handleSubmit(onValid)(event);
        }}
      >
        <div className="field">
          <label htmlFor="login-email">Correo</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            aria-invalid={errors.email ? true : false}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="login-email-error" className="field__error">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : false}
            aria-describedby={
              errors.password ? 'login-password-error' : undefined
            }
            {...register('password')}
          />
          {errors.password && (
            <p id="login-password-error" className="field__error">
              {errors.password.message}
            </p>
          )}
        </div>

        <button type="submit" className="button" disabled={disabled}>
          Ingresar
        </button>
        {busy && (
          <p role="status" className="muted">
            Ingresando…
          </p>
        )}
      </form>
    </section>
  );
}
