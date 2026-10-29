import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { PreferencesProvider } from './PreferencesProvider';
import { VoiceGuide } from './VoiceGuide';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('R10: speaks only supplied static instructions after activation, pauses, resumes, repeats and cancels on route or locale change', () => {
  const synthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
  };
  vi.stubGlobal('speechSynthesis', synthesis);
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = '';
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  const view = render(
    <VoiceGuide
      text="Instrucciones estáticas"
      locale="es"
      route="/recepcion"
    />,
  );
  expect(synthesis.speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Escuchar guía' }));
  expect(synthesis.speak.mock.calls[0][0]).toMatchObject({
    text: 'Instrucciones estáticas',
    lang: 'es-CO',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
  expect(synthesis.pause).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(synthesis.resume).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Repetir guía' }));
  expect(synthesis.speak).toHaveBeenCalledTimes(2);
  const oldUtterance = synthesis.speak.mock
    .calls[0][0] as SpeechSynthesisUtterance;
  act(() => {
    oldUtterance.onend?.(new Event('end') as SpeechSynthesisEvent);
  });
  expect(screen.getByRole('button', { name: 'Pausar' })).toBeEnabled();
  view.rerender(
    <VoiceGuide text="Static directions" locale="en" route="/atenciones" />,
  );
  expect(synthesis.cancel).toHaveBeenCalled();
  expect(synthesis.speak).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Escuchar guía' })).toBeEnabled();
});

it('R11: shows a translated unavailable message without blocking other controls', () => {
  vi.stubGlobal('speechSynthesis', undefined);
  render(
    <PreferencesProvider>
      <I18nProvider>
        <VoiceGuide text="Safe text" locale="es" route="/" />
        <input aria-label="Still usable" />
      </I18nProvider>
    </PreferencesProvider>,
  );
  expect(
    screen.getByText('La guía por voz no está disponible en este navegador.'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Still usable')).toBeEnabled();
});

it('R11: reports a current playback error when the API exists and ignores errors from cancelled older speech', () => {
  const synthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
  };
  vi.stubGlobal('speechSynthesis', synthesis);
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = '';
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  const view = render(
    <>
      <VoiceGuide
        text="Instrucciones estáticas"
        locale="es"
        route="/recepcion"
      />
      <input aria-label="Other controls remain usable" />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Escuchar guía' }));
  fireEvent.click(screen.getByRole('button', { name: 'Repetir guía' }));
  const older = synthesis.speak.mock.calls[0][0] as SpeechSynthesisUtterance;
  const current = synthesis.speak.mock.calls[1][0] as SpeechSynthesisUtterance;
  act(() => {
    older.onerror?.({ error: 'canceled' } as SpeechSynthesisErrorEvent);
  });
  expect(
    screen.queryByText('La guía por voz no está disponible en este navegador.'),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pausar' })).toBeEnabled();
  act(() => {
    current.onerror?.({
      error: 'synthesis-unavailable',
    } as SpeechSynthesisErrorEvent);
  });
  expect(screen.getByRole('status')).toHaveTextContent(
    'La guía por voz no está disponible en este navegador.',
  );
  expect(
    screen.queryByRole('button', { name: 'Pausar' }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText('Other controls remain usable')).toBeEnabled();
  view.rerender(
    <VoiceGuide text="Static directions" locale="en" route="/atenciones" />,
  );
  act(() => {
    current.onerror?.({ error: 'canceled' } as SpeechSynthesisErrorEvent);
  });
  expect(
    screen.queryByText('La guía por voz no está disponible en este navegador.'),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Escuchar guía' })).toBeEnabled();
});

it.each(['active', 'failed'] as const)(
  'R24: a cancelled %s guide starts fresh after route A → B → A and ignores its old callbacks',
  (state) => {
    const synthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [],
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
        lang = '';
      },
    );
    const view = render(
      <VoiceGuide text="Guía estática" locale="es" route="/triage" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar guía' }));
    const old = synthesis.speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    if (state === 'failed')
      act(() => {
        old.onerror?.({
          error: 'synthesis-unavailable',
        } as SpeechSynthesisErrorEvent);
      });
    view.rerender(
      <VoiceGuide text="Guía de captura" locale="es" route="/triage/another" />,
    );
    view.rerender(
      <VoiceGuide text="Guía estática" locale="es" route="/triage" />,
    );
    act(() => {
      old.onerror?.({ error: 'canceled' } as SpeechSynthesisErrorEvent);
      old.onend?.(new Event('end') as SpeechSynthesisEvent);
    });
    expect(screen.getByRole('button', { name: 'Escuchar guía' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Pausar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'La guía por voz no está disponible en este navegador.',
      ),
    ).not.toBeInTheDocument();
    expect(synthesis.speak).toHaveBeenCalledOnce();
  },
);

it('R24: changing guide language or authored text clears playback without speaking automatically', () => {
  const synthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
  };
  vi.stubGlobal('speechSynthesis', synthesis);
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
      lang = '';
    },
  );
  const view = render(<VoiceGuide text="Guía" locale="es" route="/triage" />);
  fireEvent.click(screen.getByRole('button', { name: 'Escuchar guía' }));
  view.rerender(<VoiceGuide text="Guide" locale="en" route="/triage" />);
  expect(
    screen.queryByRole('button', { name: 'Pausar' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Escuchar guía' }));
  view.rerender(
    <VoiceGuide text="Updated guide" locale="en" route="/triage" />,
  );
  expect(
    screen.queryByRole('button', { name: 'Pausar' }),
  ).not.toBeInTheDocument();
  expect(synthesis.speak).toHaveBeenCalledTimes(2);
});
