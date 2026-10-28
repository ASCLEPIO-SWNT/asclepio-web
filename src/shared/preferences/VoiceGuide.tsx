import { useEffect, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { useI18n, type Locale } from '../i18n';

const SPEECH_LOCALES: Record<Locale, string> = {
  es: 'es-CO',
  en: 'en-US',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
};

/** The caller supplies authored directions, never patient data or DOM content. */
export function VoiceGuide({
  text,
  locale,
  route,
}: {
  text: string;
  locale: Locale;
  route: string;
}) {
  const { t } = useI18n();
  const supported =
    typeof window.speechSynthesis !== 'undefined' &&
    typeof SpeechSynthesisUtterance !== 'undefined';
  const id = `${route}:${locale}`;
  const [playback, setPlayback] = useState({
    id,
    active: false,
    paused: false,
    failed: false,
  });
  const generation = useRef(0);
  const active = playback.id === id && playback.active;
  const paused = active && playback.paused;
  const failed = playback.id === id && playback.failed;

  useEffect(() => {
    const synthesis = window.speechSynthesis;
    return () => {
      generation.current += 1;
      synthesis?.cancel();
    };
  }, [route, locale, text]);

  if (!supported || failed)
    return (
      <p
        className="muted voice-unavailable"
        role={failed ? 'status' : undefined}
      >
        {t('common_voice_unavailable')}
      </p>
    );

  const start = () => {
    const synthesis = window.speechSynthesis;
    const currentGeneration = ++generation.current;
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALES[locale];
    const voice = synthesis
      .getVoices()
      .find((candidate) => candidate.lang.toLowerCase().startsWith(locale));
    if (voice) utterance.voice = voice;
    const finish = (failed = false) => {
      if (generation.current === currentGeneration)
        setPlayback({ id, active: false, paused: false, failed });
    };
    utterance.onend = () => finish();
    utterance.onerror = () => finish(true);
    setPlayback({ id, active: true, paused: false, failed: false });
    try {
      synthesis.speak(utterance);
    } catch {
      finish(true);
    }
  };
  const pauseOrResume = () => {
    if (paused) window.speechSynthesis.resume();
    else window.speechSynthesis.pause();
    setPlayback({ id, active: true, paused: !paused, failed: false });
  };

  return (
    <div className="voice-controls">
      <button className="button button--soft" type="button" onClick={start}>
        <SpeakerWaveIcon aria-hidden="true" />
        {t('common_voice_start')}
      </button>
      {active && (
        <>
          <button
            className="button button--secondary"
            type="button"
            onClick={pauseOrResume}
          >
            {paused ? (
              <PlayIcon aria-hidden="true" />
            ) : (
              <PauseIcon aria-hidden="true" />
            )}
            {t(paused ? 'common_voice_resume' : 'common_voice_pause')}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={start}
          >
            <ArrowPathIcon aria-hidden="true" />
            {t('common_voice_repeat')}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              generation.current += 1;
              window.speechSynthesis.cancel();
              setPlayback({ id, active: false, paused: false, failed: false });
            }}
          >
            <StopIcon aria-hidden="true" />
            {t('common_voice_stop')}
          </button>
        </>
      )}
    </div>
  );
}
