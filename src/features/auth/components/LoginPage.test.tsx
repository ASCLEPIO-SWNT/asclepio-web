import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY, session } from '../../../shared/api/session';
import {
  PASSWORD,
  TOKEN,
  accessToken,
  deferred,
  fakeApi,
  json,
  networkError,
  problem,
  staffMe,
} from '../../../test/fakeApi';
import { LoginPage } from './LoginPage';

const EMAIL = 'enfermera@ips.example';

function renderLogin() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

const emailInput = () => screen.getByLabelText('Correo');
const passwordInput = () => screen.getByLabelText('Contraseña');
const submitButton = () => screen.getByRole('button', { name: 'Ingresar' });

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  email = EMAIL,
  password = PASSWORD,
) {
  if (email) await user.type(emailInput(), email);
  if (password) await user.type(passwordInput(), password);
  await user.click(submitButton());
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('LoginPage', () => {
  it('R1: muestra correo y contraseña con etiqueta visible, autocomplete y el botón Ingresar', () => {
    renderLogin();
    expect(emailInput()).toHaveAttribute('type', 'email');
    expect(emailInput()).toHaveAttribute('autocomplete', 'username');
    expect(passwordInput()).toHaveAttribute('type', 'password');
    expect(passwordInput()).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('Correo').tagName).toBe('LABEL');
    expect(screen.getByText('Contraseña').tagName).toBe('LABEL');
    expect(submitButton()).toHaveAttribute('type', 'submit');
  });

  it('R2: con campos vacíos no llama a la API, marca cada campo y enfoca el primero inválido', async () => {
    const net = fakeApi({});
    const user = userEvent.setup();
    renderLogin();

    await user.click(submitButton());

    const emailError = await screen.findByText('Escribe tu correo.');
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument();
    expect(emailInput()).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput()).toHaveAttribute('aria-describedby', emailError.id);
    expect(passwordInput()).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput()).toHaveAccessibleDescription(
      'Escribe tu contraseña.',
    );
    expect(emailInput()).toHaveFocus();
    expect(net.requests).toHaveLength(0);
  });

  it('R2: correo sin formato y contraseña de más de 128 caracteres no llaman a la API', async () => {
    const net = fakeApi({});
    const user = userEvent.setup();
    renderLogin();

    await user.type(emailInput(), 'enfermera');
    await user.click(passwordInput());
    await user.paste('x'.repeat(129));
    await user.click(submitButton());

    expect(
      await screen.findByText('Escribe un correo válido.'),
    ).toBeInTheDocument();
    expect(passwordInput()).toHaveAccessibleDescription(
      'La contraseña no puede tener más de 128 caracteres.',
    );
    expect(emailInput()).toHaveFocus();
    expect(net.requests).toHaveLength(0);
  });

  it('R2: si solo falta la contraseña, el foco va a la contraseña', async () => {
    fakeApi({});
    const user = userEvent.setup();
    renderLogin();
    await fillAndSubmit(user, EMAIL, '');
    expect(
      await screen.findByText('Escribe tu contraseña.'),
    ).toBeInTheDocument();
    expect(emailInput()).toHaveAttribute('aria-invalid', 'false');
    expect(passwordInput()).toHaveFocus();
  });

  it('R3: envía POST /api/v1/auth/login con { email, password } en JSON y sin Authorization', async () => {
    const net = fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
      'GET /api/v1/me': json(200, staffMe.NURSE),
    });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    const [login] = net.calls('POST /api/v1/auth/login');
    expect(login.body).toEqual({ email: EMAIL, password: PASSWORD });
    expect(login.headers.get('Content-Type')).toContain('application/json');
    expect(login.headers.has('Authorization')).toBe(false);
  });

  it('R4: mientras el login y el primer GET /me están en curso deshabilita Ingresar, muestra carga e ignora reenvíos', async () => {
    const loginGate = deferred(json(200, accessToken()));
    const meGate = deferred(json(200, staffMe.NURSE));
    const net = fakeApi({
      'POST /api/v1/auth/login': loginGate.handler,
      'GET /api/v1/me': meGate.handler,
    });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);
    expect(await screen.findByRole('status')).toHaveTextContent('Ingresando');
    expect(submitButton()).toBeDisabled();
    await user.type(passwordInput(), '{Enter}');
    expect(net.calls('POST /api/v1/auth/login')).toHaveLength(1);

    act(() => {
      loginGate.release();
    });
    await vi.waitFor(() => expect(net.calls('GET /api/v1/me')).toHaveLength(1));
    expect(submitButton()).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
    await user.type(passwordInput(), '{Enter}');
    expect(net.calls('POST /api/v1/auth/login')).toHaveLength(1);

    act(() => {
      meGate.release();
    });
  });

  it.each([
    [{ title: 'Unauthorized', detail: 'Cuenta bloqueada' }],
    [
      {
        title: 'Unauthorized',
        errors: [{ field: 'password', message: 'Contraseña incorrecta' }],
      },
    ],
  ])(
    'R6: un 401 muestra el mismo mensaje genérico (%o), vacía la contraseña, conserva el correo y enfoca la alerta',
    async (body) => {
      fakeApi({ 'POST /api/v1/auth/login': problem(401, body) });
      const user = userEvent.setup();
      renderLogin();

      await fillAndSubmit(user);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/^Correo o contraseña incorrectos\.$/);
      expect(alert).toHaveFocus();
      expect(
        screen.queryByText(/bloqueada|Contraseña incorrecta/),
      ).not.toBeInTheDocument();
      expect(passwordInput()).toHaveValue('');
      expect(emailInput()).toHaveValue(EMAIL);
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    },
  );

  it('R7: un 429 con Retry-After muestra los segundos, no reintenta y bloquea Ingresar ese tiempo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const net = fakeApi({
      'POST /api/v1/auth/login': problem(
        429,
        { title: 'Too Many Requests' },
        { 'Retry-After': '30' },
      ),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderLogin();

    await fillAndSubmit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Demasiados intentos. Espera 30 segundos e inténtalo de nuevo.',
    );
    expect(alert).toHaveFocus();
    expect(submitButton()).toBeDisabled();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(29_000);
    });
    expect(submitButton()).toBeDisabled();
    expect(net.requests).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(submitButton()).toBeEnabled();
    expect(net.requests).toHaveLength(1);
  });

  it('R7: un 429 sin Retry-After entero pide esperar un momento y bloquea 60 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fakeApi({
      'POST /api/v1/auth/login': problem(429, {}, { 'Retry-After': 'pronto' }),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderLogin();

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    );
    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(submitButton()).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(submitButton()).toBeEnabled();
  });

  it('R8: sin respuesta HTTP muestra el error de conexión, conserva el correo y enfoca la alerta', async () => {
    fakeApi({ 'POST /api/v1/auth/login': networkError() });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(alert).toHaveFocus();
    expect(emailInput()).toHaveValue(EMAIL);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('R9: otro estado muestra el error genérico y los errors[] de email y password junto a su campo', async () => {
    fakeApi({
      'POST /api/v1/auth/login': problem(400, {
        title: 'Bad Request',
        errors: [
          { field: 'email', message: 'email must be an email' },
          { field: 'password', message: 'password is too long' },
          { field: 'tenantId', message: 'no se muestra' },
        ],
      }),
    });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'No se pudo iniciar sesión. Inténtalo de nuevo.',
    );
    expect(alert).toHaveFocus();
    expect(emailInput()).toHaveAccessibleDescription('email must be an email');
    expect(passwordInput()).toHaveAccessibleDescription('password is too long');
    expect(screen.queryByText('no se muestra')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('R9: un 500 muestra el error genérico', async () => {
    fakeApi({
      'POST /api/v1/auth/login': problem(500, {
        title: 'Internal Server Error',
      }),
    });
    const user = userEvent.setup();
    renderLogin();
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo iniciar sesión. Inténtalo de nuevo.',
    );
  });

  it('R10: tras un login 200 guarda solo accessToken y expiresAt en sessionStorage', async () => {
    const token = accessToken();
    fakeApi({
      'POST /api/v1/auth/login': json(200, token),
      'GET /api/v1/me': json(200, staffMe.NURSE),
    });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    await vi.waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null')).toEqual(
        {
          accessToken: TOKEN,
          expiresAt: token.expiresAt,
        },
      ),
    );
    expect(sessionStorage.length).toBe(1);
    expect(localStorage.length).toBe(0);
  });
});
