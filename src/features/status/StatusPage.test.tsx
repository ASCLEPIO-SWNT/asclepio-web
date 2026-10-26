import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatusPage } from './StatusPage';

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StatusPage />
    </QueryClientProvider>,
  );
}

// Se simula la red (fetch), no los hooks internos (CHECKPOINTS C4).
function mockFetch(response: Response | Error) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('StatusPage', () => {
  it('muestra API operativa con la hora del servidor en Bogotá', async () => {
    mockFetch(
      new Response(
        JSON.stringify({ status: 'ok', time: '2026-10-27T00:42:00.000Z' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    renderPage();
    expect(await screen.findByText(/API operativa/)).toHaveTextContent(
      '7:42:00',
    );
  });

  it('muestra error si la API responde problem+json', async () => {
    mockFetch(
      new Response(
        JSON.stringify({
          type: 'about:blank',
          title: 'Service Unavailable',
          status: 503,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'API no disponible',
    );
  });

  it('muestra error si la API no es alcanzable', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'API no disponible',
    );
  });
});
