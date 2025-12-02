import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, Edit3, Loader2, Plus, Trash2 } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp } from '../../context/AppContext';
import { Instrument, Question } from '../../types';
import { QuestionForm } from './components/QuestionForm';

type PreviewOption = { key: string; label: string; color?: string | null };

const SelectPreview: React.FC<{ questionId: string; options: PreviewOption[]; placeholder?: string }> = ({
  questionId,
  options,
  placeholder = 'Selecciona una opción',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const hasOptions = options.length > 0;

  return (
    <div ref={containerRef} className="relative mt-1">
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 ${isOpen ? 'ring-2 ring-gray-300' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${questionId}-preview-options`}
      >
        <span className="truncate text-left">{placeholder}</span>
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen ? (
        <div
          id={`${questionId}-preview-options`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-white/60 bg-white/90 py-1 shadow-xl shadow-slate-200/70 backdrop-blur"
        >
          {hasOptions ? (
            options.map((option) => (
              <div
                key={option.key}
                role="option"
                aria-selected="false"
                className="flex cursor-default items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50/80"
              >
                <span className="flex items-center gap-2">
                  {option.color ? (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-2.5 w-2.5 rounded-full border border-white/60"
                      style={{ backgroundColor: option.color }}
                      title={option.color ?? undefined}
                    />
                  ) : null}
                  <span>{option.label}</span>
                </span>
                <span className="text-xs text-slate-400">Vista previa</span>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500">No hay opciones disponibles.</div>
          )}
        </div>
      ) : null}
    </div>
  );
};

type InstrumentDetailParams = {
  instrumentId: string;
};

const QUESTION_TYPE_LABEL: Record<Question['type'], string> = {
  multiple_choice: 'Selección múltiple',
  scale: 'Escala',
  text: 'Texto abierto',
  boolean: 'Sí/No',
  radio: 'Opción única',
  select: 'Desplegable',
};

const formatDateTime = (value?: Date | null): string => {
  if (!value) return '—';
  try {
    return value.toLocaleString();
  } catch (error) {
    console.error('Failed to format date', error);
    return '—';
  }
};

const formatDuration = (minutes?: number): string => {
  if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes <= 0) {
    return '—';
  }
  return `${minutes} min`;
};

export const InstrumentDetail: React.FC = () => {
  const { instrumentId } = useParams<InstrumentDetailParams>();
  const navigate = useNavigate();
  const { getInstrumentDetails, createQuestion, updateQuestion, deleteQuestion } = useApp();

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const formatQuestionType = useCallback((type: Question['type']): string => {
    return QUESTION_TYPE_LABEL[type] ?? type;
  }, []);

  const sortQuestions = useCallback((list: Question[]): Question[] => {
    return [...list].sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.id.localeCompare(b.id);
    });
  }, []);

  const activeQuestions = useMemo(() => {
    if (!instrument) {
      return [] as Question[];
    }
    return instrument.questions.filter((question) => question.required);
  }, [instrument]);

  const renderQuestionPreview = useCallback((question: Question) => {
    const renderOptions = (options: PreviewOption[], inputType: 'checkbox' | 'radio') => (
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type={inputType}
              name={question.id}
              disabled
              className="h-4 w-4 rounded border-white/60 bg-white/80 text-slate-700 focus:ring-gray-300"
            />
            <span className="flex items-center gap-2">
              {option.color ? (
                <span
                  aria-hidden="true"
                  className="inline-flex h-2.5 w-2.5 rounded-full border border-white/60"
                  style={{ backgroundColor: option.color }}
                  title={option.color ?? undefined}
                />
              ) : null}
              <span>{option.label}</span>
            </span>
          </label>
        ))}
      </div>
    );

    const { options: previewOptions, hasProvidedOptions } = (() => {
      if (Array.isArray(question.answers) && question.answers.length) {
        const options = question.answers.reduce<PreviewOption[]>((acc, answer, index) => {
          const label = typeof answer.label === 'string' ? answer.label.trim() : '';
          if (!label.length) {
            return acc;
          }
          const keySource = answer.id ?? `${index}`;
          acc.push({
            key: `${question.id}-answer-${keySource}`,
            label,
            color: answer.color ?? null,
          });
          return acc;
        }, []);
        return { options, hasProvidedOptions: options.length > 0 };
      }

      if (Array.isArray(question.options) && question.options.length) {
        const options = question.options.reduce<PreviewOption[]>((acc, option, index) => {
          const label = typeof option === 'string' ? option.trim() : '';
          if (!label.length) {
            return acc;
          }
          acc.push({
            key: `${question.id}-option-${index}`,
            label,
          });
          return acc;
        }, []);
        return { options, hasProvidedOptions: options.length > 0 };
      }

      return {
        options: [
          { key: `${question.id}-fallback-0`, label: 'Opción 1' },
          { key: `${question.id}-fallback-1`, label: 'Opción 2' },
        ],
        hasProvidedOptions: false,
      };
    })();

    switch (question.type) {
      case 'multiple_choice':
        return renderOptions(previewOptions, 'checkbox');
      case 'radio':
        return renderOptions(previewOptions, 'radio');
      case 'select':
        return <SelectPreview questionId={question.id} options={previewOptions} />;
      case 'boolean':
        if (hasProvidedOptions) {
          return renderOptions(previewOptions, 'radio');
        }
        return (
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={`${question.id}-boolean`}
                disabled
                className="h-4 w-4 border-white/60 bg-white/80 text-slate-700 focus:ring-gray-300"
              />
              <span>Sí</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={`${question.id}-boolean`}
                disabled
                className="h-4 w-4 border-white/60 bg-white/80 text-slate-700 focus:ring-gray-300"
              />
              <span>No</span>
            </label>
          </div>
        );
      case 'scale':
        return (
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min={1}
              max={10}
              defaultValue={5}
              disabled
              className="w-full accent-slate-600"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        );
      case 'text':
      default:
        return (
          <textarea
            disabled
            rows={3}
            className="mt-1 block w-full rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="Respuesta del paciente"
          />
        );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInstrument = async () => {
      if (!instrumentId) {
        if (!cancelled) {
          setInstrument(null);
          setError('Identificador de instrumento inválido.');
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const details = await getInstrumentDetails(instrumentId);
        if (cancelled) return;

        if (!details) {
          setInstrument(null);
          setError('No se encontró el instrumento solicitado.');
        } else {
          setInstrument(details);
          setError(null);
        }
      } catch (loadError) {
        if (cancelled) return;
        console.error('Error al cargar el instrumento', loadError);
        setInstrument(null);
        const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar el instrumento.';
        setError(message || 'No se pudo cargar el instrumento.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadInstrument();
    return () => {
      cancelled = true;
    };
  }, [instrumentId, getInstrumentDetails]);

  const handleOpenCreateForm = useCallback(() => {
    if (!instrument) return;
    setFormMode('create');
    setSelectedQuestion(null);
    setActionError(null);
    setIsFormOpen(true);
  }, [instrument]);

  const handleOpenEditForm = useCallback((question: Question) => {
    setFormMode('edit');
    setSelectedQuestion(question);
    setActionError(null);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setSelectedQuestion(null);
    setActionError(null);
  }, []);

  const handleSubmitForm = useCallback(async (values: { text: string; type: Question['type']; order?: number; required: boolean; options?: string[] }) => {
    if (!instrument) return;
    setIsSaving(true);
    try {
      if (formMode === 'create') {
        const created = await createQuestion(instrument.id, values);
        setInstrument(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: sortQuestions([...prev.questions, created]),
          };
        });
      } else if (formMode === 'edit' && selectedQuestion) {
        const updated = await updateQuestion(instrument.id, selectedQuestion.id, values);
        setInstrument(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: sortQuestions(prev.questions.map(question => (question.id === updated.id ? updated : question))),
          };
        });
      }
      setActionError(null);
      handleCloseForm();
    } catch (submitError) {
      console.error('Failed to save question', submitError);
      const message = submitError instanceof Error ? submitError.message : 'No se pudo guardar la pregunta.';
      setActionError(message);
    } finally {
      setIsSaving(false);
    }
  }, [instrument, formMode, createQuestion, sortQuestions, selectedQuestion, updateQuestion, handleCloseForm]);

  const handleDeleteQuestion = useCallback(async (question: Question) => {
    if (!instrument) return;
    const confirmed = window.confirm(`¿Deseas eliminar la pregunta "${question.text}"?`);
    if (!confirmed) {
      return;
    }

    setPendingQuestionId(question.id);
    try {
      await deleteQuestion(instrument.id, question.id);
      setInstrument(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.filter(item => item.id !== question.id),
        };
      });
      setActionError(null);
    } catch (deleteError) {
      console.error('Failed to delete question', deleteError);
      const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la pregunta.';
      setActionError(message);
    } finally {
      setPendingQuestionId(null);
    }
  }, [instrument, deleteQuestion]);

  const handleOpenPreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const questionColumns = useMemo(() => [
    {
      key: 'order',
      header: 'Orden',
      render: (question: Question) => (Number.isFinite(question.order) ? question.order : '—'),
    },
    {
      key: 'text',
      header: 'Pregunta',
      render: (question: Question) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 leading-snug">{question.text}</span>
          {(() => {
            const labels = Array.isArray(question.answers) && question.answers.length
              ? question.answers.reduce<string[]>((acc, answer) => {
                  const label = typeof answer.label === 'string' ? answer.label.trim() : '';
                  if (label.length) {
                    acc.push(label);
                  }
                  return acc;
                }, [])
              : (Array.isArray(question.options) ? question.options : []);
            return labels.length ? (
              <span className="text-xs text-slate-500 mt-1">
                Opciones: {labels.join(', ')}
              </span>
            ) : null;
          })()}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (question: Question) => formatQuestionType(question.type),
    },
    {
      key: 'required',
      header: 'Activa',
      render: (question: Question) => (question.required ? 'Sí' : 'No'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (question: Question) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenEditForm(question);
            }}
            disabled={Boolean(pendingQuestionId) || isSaving}
          >
            <Edit3 className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Modificar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={(event) => {
              event.stopPropagation();
              void handleDeleteQuestion(question);
            }}
            disabled={pendingQuestionId === question.id}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        </div>
      ),
    },
  ], [formatQuestionType, handleDeleteQuestion, handleOpenEditForm, isSaving, pendingQuestionId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/instruments')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a instrumentos
        </Button>
        <Card>
          <div className="p-6 text-center text-red-600 font-medium">{error}</div>
        </Card>
      </div>
    );
  }

  if (!instrument) {
    return null;
  }

  const heroStats = [
    { label: 'Preguntas', value: instrument.questions.length.toString() },
    { label: 'Activas', value: activeQuestions.length.toString() },
    { label: 'Duración', value: formatDuration(instrument.estimatedDuration) },
  ];

  const highlightBadges = [
    instrument.availability ? `Disponible: ${instrument.availability}` : null,
    instrument.resource ? `Recurso: ${instrument.resource}` : null,
    instrument.resultDelivery ? `Resultados: ${instrument.resultDelivery === 'sistema' ? 'Sistema' : 'Programado'}` : null,
  ].filter(Boolean) as string[];

  return (
    <section className="space-y-8 from-[#E8ECF8] via-[#F7F8FD] to-[#DDE3F7] px-4 py-8 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/50 bg-gradient-to-br from-[#FAF3CA] via-white to-[#8A8484] shadow-[0_35px_90px_rgba(15,23,42,0.16)]">
        <div aria-hidden className="absolute -top-10 right-6 h-52 w-52 rounded-full bg-[#E6E0DF]/80 blur-3xl" />
        <div aria-hidden className="absolute -bottom-12 left-8 h-52 w-52 rounded-full bg-[#E6E0DF]/70 blur-3xl" />
        <div className="relative flex flex-col gap-6 px-6 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/instruments')}
                className="rounded-full border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-inner shadow-white/40 backdrop-blur hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              {instrument.subjectName ? (
                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                  {instrument.subjectName}
                </span>
              ) : null}
              {instrument.instrumentTypeId ? (
                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                  {instrument.instrumentTypeId}
                </span>
              ) : null}
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${instrument.isActive ? 'border-emerald-200/60 bg-emerald-50/80 text-emerald-600' : 'border-rose-200/60 bg-rose-50/80 text-rose-600'}`}>
                {instrument.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-500">Instrumento clínico</p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                {instrument.name || 'Instrumento'}
              </h1>
              <p className="max-w-3xl text-sm text-slate-600">
                {instrument.description || 'Sin descripción disponible para este instrumento.'}
              </p>
            </div>
            {highlightBadges.length ? (
              <div className="flex flex-wrap gap-3 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                {highlightBadges.map((badge) => (
                  <span key={badge} className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-[0.6rem] font-semibold tracking-[0.35em] text-slate-500">
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-white/60 bg-white/75 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-500">{stat.label}</p>
                <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card className="border border-white/50 bg-white/85 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-900/5 p-3 text-slate-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Descripción</h2>
              <p className="text-slate-600 mt-1 leading-relaxed">
                {instrument.description || 'Sin descripción disponible para este instrumento.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Tema</span>
              <span className="font-semibold text-slate-900">{instrument.subjectName ?? '—'}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Tipo de instrumento</span>
              <span className="font-semibold text-slate-900">{instrument.instrumentTypeId ?? '—'}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Disponibilidad</span>
              <span className="font-semibold text-slate-900">{instrument.availability ?? '—'}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Recurso</span>
              <span className="font-semibold text-slate-900">{instrument.resource ?? '—'}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Entrega de resultados</span>
              <span className="font-semibold text-slate-900">
                {instrument.resultDelivery ? (instrument.resultDelivery === 'sistema' ? 'Sistema' : 'Programado') : '—'}
              </span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Resalta respuestas</span>
              <span className="font-semibold text-slate-900">{instrument.colorResponse === 1 ? 'Sí' : 'No'}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Estado</span>
              <span className={`font-semibold ${instrument.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {instrument.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Duración estimada</span>
              <span className="font-semibold text-slate-900">{formatDuration(instrument.estimatedDuration)}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Creado por</span>
              <span className="font-semibold text-slate-900">{instrument.createdBy ?? '—'}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Fecha de creación</span>
              <span className="font-semibold text-slate-900">{formatDateTime(instrument.createdAt)}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4">
              <span className="uppercase text-xs text-slate-400">Última actualización</span>
              <span className="font-semibold text-slate-900">{formatDateTime(instrument.updatedAt)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border border-white/50 bg-white/85 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Preguntas</h2>
              <p className="text-sm text-slate-600">
                {instrument.questions.length ? `Total de preguntas: ${instrument.questions.length}` : 'Este instrumento aún no tiene preguntas registradas.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPreview}
                disabled={activeQuestions.length === 0}
                className="rounded-full border border-white/60 bg-white/60 px-5 py-2 text-sm font-semibold text-slate-700 shadow-inner shadow-white/40 backdrop-blur disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previsualizar preguntas
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleOpenCreateForm}
                disabled={isSaving || Boolean(pendingQuestionId)}
                className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar pregunta
              </Button>
            </div>
          </div>

          {!isFormOpen && actionError ? (
            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">
              {actionError}
            </div>
          ) : null}

          {instrument.questions.length === 0 ? (
            <div className="rounded-3xl border border-white/60 bg-white/70 py-10 text-center text-sm text-slate-500">
              No hay preguntas registradas para este instrumento.
            </div>
          ) : (
            <Table
              data={instrument.questions}
              columns={questionColumns}
              rowKey={(question) => question.id}
            />
          )}
        </div>
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={formMode === 'create' ? 'Agregar pregunta' : 'Editar pregunta'}
        size="lg"
      >
        <div className="space-y-4">
          {actionError ? (
            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">
              {actionError}
            </div>
          ) : null}

          <QuestionForm
            mode={formMode}
            initialValues={formMode === 'edit' && selectedQuestion ? {
              text: selectedQuestion.text,
              type: selectedQuestion.type,
              order: typeof selectedQuestion.order === 'number' ? selectedQuestion.order : undefined,
              required: selectedQuestion.required,
              options: (() => {
                if (!selectedQuestion) {
                  return [];
                }
                if (Array.isArray(selectedQuestion.answers) && selectedQuestion.answers.length) {
                  return selectedQuestion.answers
                    .map((answer) => (typeof answer.label === 'string' ? answer.label.trim() : ''))
                    .filter((label) => label.length > 0);
                }
                if (Array.isArray(selectedQuestion.options) && selectedQuestion.options.length) {
                  return selectedQuestion.options
                    .map((option) => (typeof option === 'string' ? option.trim() : ''))
                    .filter((option) => option.length > 0);
                }
                return [];
              })(),
            } : undefined}
            onSubmit={async (values) => {
              await handleSubmitForm(values);
            }}
            onCancel={handleCloseForm}
            isSubmitting={isSaving}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        title="Previsualización del instrumento"
        size="lg"
      >
        {activeQuestions.length === 0 ? (
          <div className="rounded-3xl border border-white/60 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
            No hay preguntas activas para mostrar.
          </div>
        ) : (
          <div className="space-y-6">
            {activeQuestions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-slate-900">{index + 1}.</span>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900 leading-snug">{question.text}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {formatQuestionType(question.type)}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">Activa</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  {renderQuestionPreview(question)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
};
