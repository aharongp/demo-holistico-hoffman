import React, { useEffect, useMemo, useState } from 'react';
import { Instrument, Question, QuestionAnswer, QuestionOption } from '../../../types';
import { Modal } from '../../../components/UI/Modal';
import { Button } from '../../../components/UI/Button';
import {
  BackendInstrumentResponse,
  CoachDiagnosticObservation,
  PreparedInstrumentAnswer,
} from '../../../types/patientInstruments';

const QUESTION_TYPE_LABELS: Record<Question['type'], string> = {
  text: 'Respuesta abierta',
  boolean: 'Sí / No',
  multiple_choice: 'Selección múltiple',
  radio: 'Opción única',
  select: 'Desplegable',
  scale: 'Escala',
};

type QuestionFormValue = string | string[];

type InstrumentResponseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  instrument: Instrument | null;
  assignmentName: string;
  mode: 'form' | 'readonly';
  responses: BackendInstrumentResponse[];
  onSubmit: (answers: PreparedInstrumentAnswer[]) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
  isLoadingInstrument: boolean;
  infoMessage?: string | null;
  coachObservation: CoachDiagnosticObservation | null;
  isLoadingCoachObservation: boolean;
  coachObservationError: string | null;
};

const normalizeOptionList = (question: Question): QuestionOption[] => {
  const seen = new Set<string>();
  const options: QuestionOption[] = [];

  const pushOption = (labelRaw: unknown, valueRaw: unknown) => {
    const label = typeof labelRaw === 'string' ? labelRaw.trim() : '';
    const value = typeof valueRaw === 'string' ? valueRaw.trim() : label;
    if (!label || !value) {
      return;
    }
    const key = value.toLocaleLowerCase('es');
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push({ label, value });
  };

  if (Array.isArray(question.answers)) {
    question.answers.forEach((answer: QuestionAnswer) => {
      pushOption(answer.label, answer.value ?? answer.label);
    });
  }

  if (options.length === 0 && Array.isArray(question.options)) {
    question.options.forEach((option) => {
      if (typeof option === 'string') {
        pushOption(option, option);
        return;
      }
      pushOption((option as QuestionOption)?.label, (option as QuestionOption)?.value ?? (option as QuestionOption)?.label);
    });
  }

  if (options.length === 0 && question.type === 'boolean') {
    pushOption('Sí', 'yes');
    pushOption('No', 'no');
  }

  return options;
};

const buildDefaultValue = (question: Question, options: QuestionOption[]): QuestionFormValue => {
  switch (question.type) {
    case 'multiple_choice':
      return [];
    case 'scale': {
      const numericValues = options
        .map((option) => Number(option.value))
        .filter((value) => Number.isFinite(value));
      if (numericValues.length) {
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const midpoint = Math.round((min + max) / 2);
        return String(midpoint);
      }
      return '5';
    }
    default:
      return '';
  }
};

const normalizeQuestionKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/^pregunta[_\s-]*/i, '')
    .replace(/^\d+[\s.)-]*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');

const formatObservationTimestamp = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  } catch (error) {
    console.warn('No fue posible formatear la fecha de observación', error);
    return parsed.toISOString();
  }
};

const mapResponseByQuestion = (responses: BackendInstrumentResponse[]) => {
  const byId = new Map<number, BackendInstrumentResponse>();
  const byText = new Map<string, BackendInstrumentResponse>();
  const byOrder = new Map<number, BackendInstrumentResponse>();
  const fallbackInOrder: BackendInstrumentResponse[] = [];

  responses.forEach((response, arrayIndex) => {
    fallbackInOrder.push(response);

    if (response.questionId !== null) {
      byId.set(response.questionId, response);
    }

    if (typeof response.question === 'string' && response.question.trim().length) {
      const rawKey = response.question.trim().toLocaleLowerCase('es');
      if (rawKey) {
        byText.set(rawKey, response);
      }

      const normalizedKey = normalizeQuestionKey(response.question);
      if (normalizedKey && normalizedKey !== rawKey) {
        byText.set(normalizedKey, response);
      }
    }

    if (typeof response.order === 'number' && Number.isFinite(response.order)) {
      const normalizedOrder = Math.round(response.order);
      if (!byOrder.has(normalizedOrder)) {
        byOrder.set(normalizedOrder, response);
      }
    }

    const fallbackOrder = arrayIndex + 1;
    if (!byOrder.has(fallbackOrder)) {
      byOrder.set(fallbackOrder, response);
    }
  });

  return { byId, byText, byOrder, fallbackInOrder };
};

const resolveResponseForQuestion = (
  question: Question,
  index: number,
  responseMaps: ReturnType<typeof mapResponseByQuestion>,
): BackendInstrumentResponse | null => {
  const numericId = Number(question.id);
  if (Number.isFinite(numericId)) {
    const byIdMatch = responseMaps.byId.get(numericId);
    if (byIdMatch) {
      return byIdMatch;
    }
  }

  if (typeof question.text === 'string' && question.text.trim().length) {
    const normalizedKey = normalizeQuestionKey(question.text);
    const textMatch = responseMaps.byText.get(normalizedKey);
    if (textMatch) {
      return textMatch;
    }
  }

  const normalizedOrderCandidates: number[] = [];

  if (typeof question.order === 'number' && Number.isFinite(question.order)) {
    normalizedOrderCandidates.push(Math.round(question.order));
  }

  normalizedOrderCandidates.push(index + 1);

  for (const candidate of normalizedOrderCandidates) {
    if (!Number.isFinite(candidate)) {
      continue;
    }
    const byOrderMatch = responseMaps.byOrder.get(candidate);
    if (byOrderMatch) {
      return byOrderMatch;
    }
  }

  const fallbackKeys = [
    `pregunta_${index + 1}`,
    `pregunta_${index}`,
    `pregunta ${index + 1}`,
    `pregunta-${index + 1}`,
  ];

  for (const key of fallbackKeys) {
    const rawKey = key.toLocaleLowerCase('es');
    const match = responseMaps.byText.get(rawKey) ?? responseMaps.byText.get(normalizeQuestionKey(key));
    if (match) {
      return match;
    }
  }

  return responseMaps.fallbackInOrder[index] ?? null;
};

const buildLabelFromValue = (value: string, options: QuestionOption[]): string => {
  const match = options.find((option) => option.value === value);
  return match ? match.label : value;
};

const normalizeSelections = (input: QuestionFormValue): string[] => {
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === 'string' && input.trim().length) {
    return input.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const splitAnswerParts = (value?: string | null): string[] => {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

const findLabelForValue = (value: string, options: QuestionOption[]): string | null => {
  if (!value || !options.length) {
    return null;
  }

  const direct = options.find((option) => option.value === value);
  if (direct) {
    return direct.label;
  }

  const lowered = value.toLocaleLowerCase('es');
  const byValueInsensitive = options.find((option) => option.value.toLocaleLowerCase('es') === lowered);
  if (byValueInsensitive) {
    return byValueInsensitive.label;
  }

  const byLabelInsensitive = options.find((option) => option.label.toLocaleLowerCase('es') === lowered);
  if (byLabelInsensitive) {
    return byLabelInsensitive.label;
  }

  return null;
};

const buildReadonlyDisplay = (question: Question, response: BackendInstrumentResponse) => {
  const options = normalizeOptionList(question);
  const rawAnswer = typeof response.answer === 'string' ? response.answer.trim() : '';
  const rawCompetence = typeof response.competence === 'string' ? response.competence.trim() : '';

  if (question.type === 'text') {
    const label = rawAnswer || rawCompetence || 'Sin respuesta registrada.';
    return { label, value: null };
  }

  const answerParts = splitAnswerParts(rawAnswer);
  const competenceParts = splitAnswerParts(rawCompetence);

  const resolvedLabels: string[] = [];

  if (answerParts.length) {
    answerParts.forEach((part) => {
      const match = findLabelForValue(part, options);
      resolvedLabels.push(match ?? part);
    });
  }

  if (!resolvedLabels.length && competenceParts.length) {
    competenceParts.forEach((part) => {
      const match = findLabelForValue(part, options);
      resolvedLabels.push(match ?? part);
    });
  }

  let label = resolvedLabels.length ? resolvedLabels.join(', ') : rawCompetence || rawAnswer || 'Sin respuesta registrada.';

  const valueCandidate = answerParts.length ? answerParts.join(', ') : rawAnswer;
  let value: string | null = null;

  if (valueCandidate && label.toLocaleLowerCase('es') !== valueCandidate.toLocaleLowerCase('es')) {
    value = valueCandidate;
  }

  return { label, value };
};

export const InstrumentResponseModal: React.FC<InstrumentResponseModalProps> = ({
  isOpen,
  onClose,
  instrument,
  assignmentName,
  mode,
  responses,
  onSubmit,
  isSubmitting,
  error,
  isLoadingInstrument,
  infoMessage,
  coachObservation,
  isLoadingCoachObservation,
  coachObservationError,
}) => {
  const questions = useMemo(() => {
    if (!instrument?.questions) {
      return [] as Question[];
    }
    return [...instrument.questions].sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return a.id.localeCompare(b.id);
    });
  }, [instrument?.questions]);

  const responseMaps = useMemo(() => mapResponseByQuestion(responses), [responses]);

  const observationComment = coachObservation?.comment?.trim() ?? '';
  const observationCoach = coachObservation?.coach?.trim() ?? '';
  const observationTimestamp = formatObservationTimestamp(
    coachObservation?.appliedAt ?? coachObservation?.updatedAt ?? coachObservation?.createdAt ?? null,
  );

  const initialFormValues = useMemo(() => {
    if (mode === 'readonly') {
      return {} as Record<string, QuestionFormValue>;
    }

    return questions.reduce<Record<string, QuestionFormValue>>((acc, question) => {
      const options = normalizeOptionList(question);
      acc[String(question.id)] = buildDefaultValue(question, options);
      return acc;
    }, {});
  }, [mode, questions]);

  const [formValues, setFormValues] = useState<Record<string, QuestionFormValue>>(initialFormValues);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || mode === 'readonly') {
      return;
    }
    setFormValues(initialFormValues);
    setValidationError(null);
    setSubmitSuccess(null);
  }, [initialFormValues, isOpen, mode]);

  useEffect(() => {
    if (!isOpen) {
      setSubmitSuccess(null);
    }
  }, [isOpen]);

  const handleOptionToggle = (question: Question, value: string) => {
    setFormValues((prev) => {
      const key = String(question.id);
      const current = prev[key];
      const selections = normalizeSelections(current);

      if (selections.includes(value)) {
        const next = selections.filter((item) => item !== value);
        return { ...prev, [key]: next };
      }

      return { ...prev, [key]: [...selections, value] };
    });
  };

  const handleValueChange = (question: Question, value: string) => {
    const key = String(question.id);
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    setSubmitSuccess(null);

    if (mode === 'readonly') {
      onClose();
      return;
    }

    const preparedAnswers: PreparedInstrumentAnswer[] = [];

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const key = String(question.id);
      const options = normalizeOptionList(question);
      const rawValue = formValues[key];

      if (question.type === 'multiple_choice') {
        const selections = normalizeSelections(rawValue);
        if (!selections.length) {
          if (question.required) {
            setValidationError('Responde todas las preguntas obligatorias.');
            return;
          }
          continue;
        }
        const labels = selections.map((selection) => buildLabelFromValue(selection, options));
        preparedAnswers.push({
          questionId: key,
          questionNumericId: Number.isFinite(Number(question.id)) ? Number(question.id) : null,
          questionText: question.text,
          value: selections.join(', '),
          label: labels.join(', '),
          selections,
          order: question.order ?? index + 1,
          theme: instrument?.subjectName ?? null,
        });
        continue;
      }

      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (!value.length) {
        if (question.required) {
          setValidationError('Responde todas las preguntas obligatorias.');
          return;
        }
        continue;
      }

      let label = value;
      if (question.type !== 'text') {
        label = buildLabelFromValue(value, options);
      }

      preparedAnswers.push({
        questionId: key,
        questionNumericId: Number.isFinite(Number(question.id)) ? Number(question.id) : null,
        questionText: question.text,
        value,
        label,
        order: question.order ?? index + 1,
        theme: instrument?.subjectName ?? null,
      });
    }

    if (!preparedAnswers.length) {
      setValidationError('Agrega al menos una respuesta antes de guardar.');
      return;
    }

    try {
      await onSubmit(preparedAnswers);
      setSubmitSuccess('¡Respuestas guardadas correctamente!');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'No se pudieron guardar las respuestas.';
      setValidationError(message);
    }
  };

  const renderFormQuestion = (question: Question, index: number) => {
    const options = normalizeOptionList(question);
    const key = String(question.id);
    const value = formValues[key];

    switch (question.type) {
      case 'multiple_choice': {
        const selections = normalizeSelections(value);
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <label key={`${question.id}-${option.value}`} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                  checked={selections.includes(option.value)}
                  onChange={() => handleOptionToggle(question, option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
            {!options.length && (
              <p className="text-xs text-slate-500">Este tipo de pregunta requiere opciones configuradas.</p>
            )}
          </div>
        );
      }
      case 'radio':
      case 'boolean':
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <label key={`${question.id}-${option.value}`} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  className="h-4 w-4 border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                  checked={value === option.value}
                  onChange={() => handleValueChange(question, option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
            {!options.length && (
              <p className="text-xs text-slate-500">No se encontraron opciones configuradas.</p>
            )}
          </div>
        );
      case 'select':
        return (
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleValueChange(question, event.target.value)}
          >
            <option value="">Selecciona una opción</option>
            {options.map((option) => (
              <option key={`${question.id}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'scale': {
        const numericOptions = options
          .map((option) => Number(option.value))
          .filter((item) => Number.isFinite(item));
        const min = numericOptions.length ? Math.min(...numericOptions) : 1;
        const max = numericOptions.length ? Math.max(...numericOptions) : 10;
        const currentValue = typeof value === 'string' && value.length ? value : String(Math.round((min + max) / 2));

        return (
          <div className="space-y-2">
            <input
              type="range"
              min={min}
              max={max}
              value={currentValue}
              onChange={(event) => handleValueChange(question, event.target.value)}
              className="w-full accent-fuchsia-600"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{min}</span>
              <span className="font-semibold text-slate-700">{currentValue}</span>
              <span>{max}</span>
            </div>
          </div>
        );
      }
      case 'text':
      default:
        return (
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleValueChange(question, event.target.value)}
            placeholder="Escribe tu respuesta"
          />
        );
    }
  };

  const renderReadonlyAnswer = (question: Question, index: number) => {
    const response = resolveResponseForQuestion(question, index, responseMaps);

    if (!response) {
      return <p className="text-sm text-slate-500">Sin respuesta registrada.</p>;
    }

    const { label: displayLabel, value: displayValue } = buildReadonlyDisplay(question, response);

    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-900">{displayLabel}</p>
        {displayValue ? <p className="text-xs text-slate-500">Valor registrado: {displayValue}</p> : null}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'readonly' ? 'Respuestas registradas' : 'Responder instrumento'}
      size="lg"
    >
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_25px_60px_-45px_rgba(76,29,149,0.35)]">
          <h3 className="text-xl font-semibold text-slate-900">{assignmentName}</h3>
          <p className="text-sm text-slate-500">
            {instrument?.description ?? 'Responde cada pregunta con sinceridad. Los campos marcados como obligatorios deberán completarse antes de guardar.'}
          </p>
          {instrument?.subjectName ? (
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-fuchsia-500">Tema: {instrument.subjectName}</p>
          ) : null}
        </div>

        {infoMessage ? (
          <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-600">
            {infoMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-100/80 bg-rose-50/70 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        {validationError ? (
          <div className="rounded-2xl border border-rose-100/80 bg-rose-50/70 px-4 py-3 text-sm text-rose-600">
            {validationError}
          </div>
        ) : null}

        {submitSuccess ? (
          <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-600">
            {submitSuccess}
          </div>
        ) : null}

        {mode === 'readonly' ? (
          <div className="rounded-3xl border border-indigo-100/80 bg-indigo-50/70 px-4 py-4 shadow-[0_20px_45px_-45px_rgba(76,29,149,0.3)]">
            {isLoadingCoachObservation ? (
              <div className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-indigo-200/70" />
                <div className="h-3 w-full animate-pulse rounded bg-indigo-100/70" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-indigo-100/70" />
              </div>
            ) : observationComment ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-500">
                  Observación del coach
                </p>
                <p className="text-sm text-slate-700">{observationComment}</p>
                {observationCoach || observationTimestamp ? (
                  <p className="text-xs text-slate-500">
                    {observationCoach ? `Coach: ${observationCoach}` : ''}
                    {observationCoach && observationTimestamp ? ' · ' : ''}
                    {observationTimestamp ? `Registrado: ${observationTimestamp}` : ''}
                  </p>
                ) : null}
              </div>
            ) : coachObservationError ? (
              <p className="text-sm text-rose-500">{coachObservationError}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-500">
                  Observación del coach
                </p>
                <p className="text-sm text-slate-500">
                  No hay comentarios disponibles para este instrumento.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {isLoadingInstrument ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-3xl border border-white/50 bg-white/70 p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200/80" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-200/60" />
                <div className="mt-4 h-16 rounded bg-slate-100/80" />
              </div>
            ))}
          </div>
        ) : null}

        {!isLoadingInstrument && (!instrument || !questions.length) ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
            No se encontraron preguntas configuradas para este instrumento.
          </div>
        ) : null}

        {!isLoadingInstrument && instrument && questions.length ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_20px_60px_-45px_rgba(76,29,149,0.25)]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-fuchsia-400">
                      {QUESTION_TYPE_LABELS[question.type] ?? 'Pregunta'}
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-slate-900">
                      {index + 1}. {question.text}
                    </h4>
                  </div>
                  {question.required ? (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">
                      Obligatoria
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      Opcional
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  {mode === 'readonly' ? renderReadonlyAnswer(question, index) : renderFormQuestion(question, index)}
                </div>
              </div>
            ))}

            {mode === 'form' ? (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar respuestas'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-end pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            )}
          </form>
        ) : null}
      </div>
    </Modal>
  );
};
