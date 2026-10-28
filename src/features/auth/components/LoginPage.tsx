import {
  featureMessage,
  fieldMessage,
} from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { HeartIcon } from '@heroicons/react/24/solid';
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

function problemMessage(
  problem: ApiProblem,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  switch (problem.kind) {
    case 'unauthorized':
      return 'Correo o contraseña incorrectos.';
    case 'rateLimited':
      return problem.retryAfterSeconds !== undefined
        ? t('feature_rate_limited_seconds', {
            seconds: problem.retryAfterSeconds,
          })
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
  const { t } = useI18n();
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
    ? problemMessage(problemOf(login.error), t)
    : null;
  const endMessage =
    !serverMessage && endReason ? END_REASON_MESSAGES[endReason] : null;

  return (
    <div className="login-scene">
      <section className="card login login-panel" aria-labelledby="login-title">
        <header className="login-heading">
          <div className="login-brand" aria-hidden="true">
            <HeartIcon />
          </div>
          <p className="login-wordmark">Asclepio</p>
          <h1 id="login-title" className="visually-hidden">
            {t('feature_login_title')}
          </h1>
          <p className="muted login-subtitle">{t('feature_login_subtitle')}</p>
        </header>

        {serverMessage && (
          <div
            ref={alertRef}
            role="alert"
            tabIndex={-1}
            className="status status--error"
          >
            {featureMessage(serverMessage)}
          </div>
        )}
        {endMessage && (
          <div role="alert" className="status status--warn">
            {featureMessage(endMessage)}
          </div>
        )}

        <form
          className="form login-form"
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
            <label htmlFor="login-email">{t('feature_email')}</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder={t('feature_login_email_placeholder')}
              aria-invalid={errors.email ? true : false}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="login-email-error" className="field__error">
                {fieldMessage(errors.email.message)}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="login-password">{t('feature_password')}</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={errors.password ? true : false}
              aria-describedby={
                errors.password ? 'login-password-error' : undefined
              }
              {...register('password')}
            />
            {errors.password && (
              <p id="login-password-error" className="field__error">
                {fieldMessage(errors.password.message)}
              </p>
            )}
          </div>

          <button type="submit" className="button" disabled={disabled}>
            {t('feature_sign_in')}
          </button>
          {busy && (
            <p role="status" className="muted">
              {t('feature_signing_in')}
            </p>
          )}
        </form>
        <p className="muted login-footer">{t('feature_login_intro')}</p>
      </section>
    </div>
  );
}
