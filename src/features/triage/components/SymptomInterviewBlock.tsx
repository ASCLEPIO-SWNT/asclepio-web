import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useId } from 'react';
import type { SymptomInterview } from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import {
  INTERVIEW_DIMENSION_LABELS,
  INTERVIEW_ENDED_LABELS,
  INTERVIEW_ENGINE_LABELS,
} from '../../../shared/lib/labels';

/**
 * Respuestas del paciente a la entrevista de la app (F-11-web R1, R4). Es información que dio
 * el paciente, no verificada: un estilo neutro propio (`.interview-block`), sin insignias, sin
 * nivel y sin acciones, para que no se confunda con la sugerencia de IA (F-04) ni con una
 * decisión (RNF-17). Las preguntas van en el orden recibido.
 */
export function SymptomInterviewBlock({
  interview,
  headingLevel,
}: {
  interview: SymptomInterview;
  headingLevel: 2 | 3;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="interview-block" aria-labelledby={titleId}>
      <Heading id={titleId} className="interview-block__title">
        <ChatBubbleLeftRightIcon aria-hidden="true" />
        {t('interview_title')}
      </Heading>
      <p className="interview-block__note">{t('interview_note')}</p>
      {interview.turns.length === 0 ? (
        <p>{t('interview_no_turns')}</p>
      ) : (
        <ol
          className="interview-block__turns"
          aria-label={t('interview_turns')}
        >
          {interview.turns.map((turn, index) => (
            <li key={index}>
              <span className="interview-block__dimension">
                {INTERVIEW_DIMENSION_LABELS[turn.dimension]}
              </span>
              <dl>
                <dt>{turn.question}</dt>
                <dd>
                  {turn.answer ?? (
                    <span className="muted">{t('interview_unknown')}</span>
                  )}
                </dd>
              </dl>
            </li>
          ))}
        </ol>
      )}
      <dl className="interview-block__meta">
        <div>
          <dt>{t('interview_engine')}</dt>
          <dd>{INTERVIEW_ENGINE_LABELS[interview.engine]}</dd>
        </div>
        <div>
          <dt>{t('interview_ended')}</dt>
          <dd>{INTERVIEW_ENDED_LABELS[interview.endedBy]}</dd>
        </div>
      </dl>
    </section>
  );
}
