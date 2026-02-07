import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/UI/Button';
import { InstrumentTopic, Question, QuestionOption } from '../../../types';

type QuestionFormMode = 'create' | 'edit';

type QuestionFormValues = {
  text: string;
  type: Question['type'];
  order: number | '';
  required: boolean;
  options: QuestionOption[];
  topicId: string;
};

type QuestionFormSubmitPayload = {
  text: string;
  type: Question['type'];
  order?: number;
  required: boolean;
  options?: QuestionOption[];
  topicId?: string | null;
};

type QuestionFormProps = {
  mode: QuestionFormMode;
  initialValues?: Partial<QuestionFormValues>;
  onSubmit: (values: QuestionFormSubmitPayload) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  topics: InstrumentTopic[];
};

const QUESTION_TYPE_OPTIONS: Array<{ value: Question['type']; label: string }> = [
  { value: 'text', label: 'Texto abierto' },
  { value: 'multiple_choice', label: 'Selección múltiple' },
  { value: 'scale', label: 'Escala' },
  { value: 'boolean', label: 'Sí/No' },
  { value: 'radio', label: 'Opción única' },
  { value: 'select', label: 'Desplegable' },
];

const QUESTION_TYPES_WITH_OPTIONS: ReadonlyArray<Question['type']> = [
  'multiple_choice',
  'radio',
  'select',
];

const MIN_OPTION_COUNT = 2;

const requiresOptions = (type: Question['type']): boolean =>
  QUESTION_TYPES_WITH_OPTIONS.includes(type);

const normalizeOptionEntries = (options?: QuestionOption[] | null): QuestionOption[] => {
  if (!Array.isArray(options)) {
    return [];
  }

  const seenValues = new Set<string>();
  const normalized: QuestionOption[] = [];

  for (const option of options) {
    if (!option || typeof option !== 'object') {
      continue;
    }

    const label = typeof option.label === 'string' ? option.label.trim() : '';
    const value = typeof option.value === 'string' ? option.value.trim() : '';

    if (!label || !value) {
      continue;
    }

    const valueKey = value.toLocaleLowerCase('es');
    if (seenValues.has(valueKey)) {
      continue;
    }

    seenValues.add(valueKey);
    normalized.push({ label, value });
  }

  return normalized;
};

const ensureOptionFields = (list: QuestionOption[], minCount = MIN_OPTION_COUNT): QuestionOption[] => {
  const next = [...list];
  while (next.length < minCount) {
    next.push({ label: '', value: '' });
  }
  return next;
};

export const QuestionForm: React.FC<QuestionFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  topics = [],
}) => {
  const defaults: QuestionFormValues = useMemo(() => {
    const baseType = initialValues?.type ?? 'text';

    const rawOptions = (() => {
      if (!initialValues?.options || !Array.isArray(initialValues.options)) {
        return [] as QuestionOption[];
      }

      return initialValues.options.map((option) => {
        if (!option) {
          return { label: '', value: '' };
        }

        if (typeof (option as any) === 'string') {
          const trimmed = String(option).trim();
          return { label: trimmed, value: trimmed };
        }

        const label = typeof option.label === 'string' ? option.label : '';
        const value = typeof option.value === 'string' ? option.value : label;
        return { label, value };
      });
    })();

    const normalizedOptions = normalizeOptionEntries(rawOptions);
    const preparedOptions = requiresOptions(baseType)
      ? ensureOptionFields(normalizedOptions)
      : normalizedOptions;

    const resolveTopic = () => {
      const rawTopic = initialValues?.topicId;
      if (rawTopic === null || typeof rawTopic === 'undefined') {
        return '';
      }
      if (typeof rawTopic === 'string') {
        return rawTopic;
      }
      const text = String(rawTopic).trim();
      return text.length ? text : '';
    };

    return {
      text: initialValues?.text ?? '',
      type: baseType,
      order: typeof initialValues?.order === 'number' ? initialValues.order : '',
      required: initialValues?.required ?? true,
      options: preparedOptions,
      topicId: resolveTopic(),
    };
  }, [initialValues]);

  const [values, setValues] = useState<QuestionFormValues>(defaults);
  const [errors, setErrors] = useState<Record<keyof QuestionFormValues, string | null>>({
    text: null,
    type: null,
    order: null,
    required: null,
    options: null,
    topicId: null,
  });

  useEffect(() => {
    setValues(defaults);
    setErrors({ text: null, type: null, order: null, required: null, options: null, topicId: null });
  }, [defaults]);

  const handleChange = (field: keyof QuestionFormValues) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const target = event.target;
    setValues(prev => {
      if (field === 'type' && target instanceof HTMLSelectElement) {
        const nextType = target.value as Question['type'];
        const sanitizedOptions = prev.options.map(option => ({
          label: option?.label ?? '',
          value: option?.value ?? '',
        }));
        const nextOptions = requiresOptions(nextType)
          ? ensureOptionFields(sanitizedOptions)
          : sanitizedOptions;
        return {
          ...prev,
          type: nextType,
          options: nextOptions,
        };
      }

      if (field === 'order') {
        const nextValue = target.value;
        if (nextValue === '') {
          return { ...prev, order: '' };
        }
        const numericValue = Number(nextValue);
        if (Number.isFinite(numericValue)) {
          return { ...prev, order: numericValue };
        }
        return prev;
      }

      if (field === 'topicId') {
        return { ...prev, topicId: target.value };
      }

      if (field === 'required' && target instanceof HTMLInputElement && target.type === 'checkbox') {
        return { ...prev, required: target.checked };
      }

      return { ...prev, [field]: target.value };
    });
  };

  const handleOptionChange = (index: number, field: keyof QuestionOption) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { value } = event.target;
    setValues(prev => {
      const nextOptions = prev.options.map(option => ({
        label: option?.label ?? '',
        value: option?.value ?? '',
      }));
      const current = nextOptions[index] ?? { label: '', value: '' };
      nextOptions[index] = {
        ...current,
        [field]: value,
      };
      return { ...prev, options: nextOptions };
    });
  };

  const handleAddOption = () => {
    setValues(prev => {
      const sanitizedOptions = prev.options.map(option => ({
        label: option?.label ?? '',
        value: option?.value ?? '',
      }));

      return {
        ...prev,
        options: [...sanitizedOptions, { label: '', value: '' }],
      };
    });
  };

  const handleRemoveOption = (index: number) => () => {
    setValues(prev => {
      const filteredOptions = prev.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map(option => ({
          label: option?.label ?? '',
          value: option?.value ?? '',
        }));

      const nextOptions = ensureOptionFields(filteredOptions);

      return {
        ...prev,
        options: nextOptions,
      };
    });
  };

  const validate = (): boolean => {
    const nextErrors: Record<keyof QuestionFormValues, string | null> = {
      text: null,
      type: null,
      order: null,
      required: null,
      options: null,
      topicId: null,
    };

    const trimmedText = values.text.trim();
    if (!trimmedText) {
      nextErrors.text = 'La descripción de la pregunta es obligatoria.';
    }

    if (values.order !== '' && (!Number.isFinite(values.order) || Number(values.order) < 0)) {
      nextErrors.order = 'El orden debe ser un número mayor o igual a cero.';
    }

    if (requiresOptions(values.type)) {
      const trimmedOptions = values.options.map(option => ({
        label: typeof option.label === 'string' ? option.label.trim() : '',
        value: typeof option.value === 'string' ? option.value.trim() : '',
      }));

      const hasPartialOption = trimmedOptions.some(option =>
        (!!option.label && !option.value) || (!option.label && !!option.value),
      );

      if (hasPartialOption) {
        nextErrors.options = 'Completa cada opción con etiqueta y valor.';
      }

      const validOptions = trimmedOptions.filter(option => option.label && option.value);

      if (!nextErrors.options && validOptions.length < MIN_OPTION_COUNT) {
        nextErrors.options = `Agrega al menos ${MIN_OPTION_COUNT} opciones.`;
      }

      if (!nextErrors.options) {
        const seenValues = new Set<string>();
        const hasDuplicateValues = validOptions.some(option => {
          const key = option.value.toLocaleLowerCase('es');
          if (seenValues.has(key)) {
            return true;
          }
          seenValues.add(key);
          return false;
        });

        if (hasDuplicateValues) {
          nextErrors.options = 'El valor de cada opción debe ser único.';
        }
      }
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every(error => error === null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const payload: QuestionFormSubmitPayload = {
      text: values.text.trim(),
      type: values.type,
      required: values.required,
    };

    const topicIdValue = values.topicId.trim();
    payload.topicId = topicIdValue.length ? topicIdValue : null;

    const sanitizedOptions = normalizeOptionEntries(values.options);
    if (requiresOptions(values.type) && sanitizedOptions.length) {
      payload.options = sanitizedOptions;
    }

    if (values.order !== '' && Number.isFinite(values.order)) {
      payload.order = Number(values.order);
    }

    await onSubmit(payload);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="question-topic">
          Tópico asociado
        </label>
        <select
          id="question-topic"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={values.topicId}
          onChange={handleChange('topicId')}
          disabled={isSubmitting}
        >
          <option value="">Sin tópico</option>
          {values.topicId && !topics.some((topic) => {
            const rawId = topic.id ?? '';
            const topicIdValue = typeof rawId === 'string' ? rawId : String(rawId);
            return topicIdValue === values.topicId;
          }) ? (
            <option value={values.topicId}>Tópico no disponible</option>
          ) : null}
          {topics.map((topic) => {
            const value = topic.id ?? '';
            const optionValue = typeof value === 'string' ? value : String(value);
            return (
              <option key={topic.id} value={optionValue}>
                {topic.name}
              </option>
            );
          })}
        </select>
        {topics.length === 0 ? (
          <p className="text-xs text-gray-500">
            Agrega tópicos al instrumento para poder asociarlos a las preguntas.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="question-text">
          Pregunta
        </label>
        <textarea
          id="question-text"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Describe la pregunta que se mostrará"
          value={values.text}
          onChange={handleChange('text')}
          disabled={isSubmitting}
        />
        {errors.text ? <p className="text-xs text-red-600">{errors.text}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="question-type">
            Tipo de respuesta
          </label>
          <select
            id="question-type"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={values.type}
            onChange={handleChange('type')}
            disabled={isSubmitting}
          >
            {QUESTION_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="question-order">
            Orden
          </label>
          <input
            id="question-order"
            type="number"
            min={0}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={values.order}
            onChange={handleChange('order')}
            disabled={isSubmitting}
          />
          {errors.order ? <p className="text-xs text-red-600">{errors.order}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="question-required"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={values.required}
          onChange={handleChange('required')}
          disabled={isSubmitting}
        />
        <label className="text-sm text-gray-700" htmlFor="question-required">
          Requiere respuesta
        </label>
      </div>

      {requiresOptions(values.type) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700" htmlFor="question-option-0">
              Opciones de respuesta
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              disabled={isSubmitting}
            >
              <Plus className="mr-1 h-4 w-4" />
              Agregar opción
            </Button>
          </div>
          <div className="space-y-2">
            {values.options.map((option, index) => (
              <div
                key={`question-option-${index}`}
                className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr,1fr,auto] sm:items-center"
              >
                <div className="sm:col-span-1">
                  <label className="sr-only" htmlFor={`question-option-label-${index}`}>
                    Etiqueta de la opción {index + 1}
                  </label>
                  <input
                    id={`question-option-label-${index}`}
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Etiqueta ${index + 1}`}
                    value={option.label}
                    onChange={handleOptionChange(index, 'label')}
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="sr-only" htmlFor={`question-option-value-${index}`}>
                    Valor de la opción {index + 1}
                  </label>
                  <input
                    id={`question-option-value-${index}`}
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Valor ${index + 1}`}
                    value={option.value}
                    onChange={handleOptionChange(index, 'value')}
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveOption(index)}
                    disabled={isSubmitting}
                    aria-label={`Eliminar opción ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {errors.options ? <p className="text-xs text-red-600">{errors.options}</p> : null}
          <p className="text-xs text-gray-500">Las opciones se mostrarán en el mismo orden en la previsualización.</p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {mode === 'create' ? 'Agregar pregunta' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
};
