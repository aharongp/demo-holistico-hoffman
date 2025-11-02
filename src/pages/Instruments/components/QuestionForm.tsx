import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/UI/Button';
import { Question } from '../../../types';

type QuestionFormMode = 'create' | 'edit';

type QuestionFormValues = {
  text: string;
  type: Question['type'];
  order: number | '';
  required: boolean;
  options: string[];
};

type QuestionFormSubmitPayload = {
  text: string;
  type: Question['type'];
  order?: number;
  required: boolean;
  options?: string[];
};

type QuestionFormProps = {
  mode: QuestionFormMode;
  initialValues?: Partial<QuestionFormValues>;
  onSubmit: (values: QuestionFormSubmitPayload) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
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

const normalizeOptionLabels = (options?: string[]): string[] => {
  if (!Array.isArray(options)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const option of options) {
    if (typeof option !== 'string') {
      continue;
    }
    const trimmed = option.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLocaleLowerCase('es');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
};

const ensureOptionFields = (list: string[], minCount = MIN_OPTION_COUNT): string[] => {
  const next = [...list];
  while (next.length < minCount) {
    next.push('');
  }
  return next;
};

export const QuestionForm: React.FC<QuestionFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const defaults: QuestionFormValues = useMemo(() => {
    const baseType = initialValues?.type ?? 'text';
    const normalizedOptions = normalizeOptionLabels(initialValues?.options);
    const preparedOptions = requiresOptions(baseType)
      ? ensureOptionFields(normalizedOptions)
      : normalizedOptions;

    return {
      text: initialValues?.text ?? '',
      type: baseType,
      order: typeof initialValues?.order === 'number' ? initialValues.order : '',
      required: initialValues?.required ?? true,
      options: preparedOptions,
    };
  }, [initialValues]);

  const [values, setValues] = useState<QuestionFormValues>(defaults);
  const [errors, setErrors] = useState<Record<keyof QuestionFormValues, string | null>>({
    text: null,
    type: null,
    order: null,
    required: null,
    options: null,
  });

  useEffect(() => {
    setValues(defaults);
    setErrors({ text: null, type: null, order: null, required: null, options: null });
  }, [defaults]);

  const handleChange = (field: keyof QuestionFormValues) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const target = event.target;
    setValues(prev => {
      if (field === 'type' && target instanceof HTMLSelectElement) {
        const nextType = target.value as Question['type'];
        const nextOptions = requiresOptions(nextType)
          ? ensureOptionFields(prev.options)
          : prev.options;
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

      if (field === 'required' && target instanceof HTMLInputElement && target.type === 'checkbox') {
        return { ...prev, required: target.checked };
      }

      return { ...prev, [field]: target.value };
    });
  };

  const handleOptionChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setValues(prev => {
      const nextOptions = [...prev.options];
      nextOptions[index] = value;
      return { ...prev, options: nextOptions };
    });
  };

  const handleAddOption = () => {
    setValues(prev => ({
      ...prev,
      options: [...prev.options, ''],
    }));
  };

  const handleRemoveOption = (index: number) => () => {
    setValues(prev => {
      const nextOptions = prev.options.filter((_, optionIndex) => optionIndex !== index);
      if (!nextOptions.length) {
        return {
          ...prev,
          options: [''],
        };
      }
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
    };

    const trimmedText = values.text.trim();
    if (!trimmedText) {
      nextErrors.text = 'La descripción de la pregunta es obligatoria.';
    }

    if (values.order !== '' && (!Number.isFinite(values.order) || Number(values.order) < 0)) {
      nextErrors.order = 'El orden debe ser un número mayor o igual a cero.';
    }

    if (requiresOptions(values.type)) {
      const trimmedOptions = values.options
        .map(option => (typeof option === 'string' ? option.trim() : ''))
        .filter(option => option.length > 0);

      if (trimmedOptions.length < MIN_OPTION_COUNT) {
        nextErrors.options = `Agrega al menos ${MIN_OPTION_COUNT} opciones.`;
      }

      if (!nextErrors.options) {
        const seen = new Set<string>();
        const hasDuplicates = trimmedOptions.some(option => {
          const key = option.toLocaleLowerCase('es');
          if (seen.has(key)) {
            return true;
          }
          seen.add(key);
          return false;
        });

        if (hasDuplicates) {
          nextErrors.options = 'No se permiten opciones duplicadas.';
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

    const sanitizedOptions = normalizeOptionLabels(values.options);
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
              <div key={`question-option-${index}`} className="flex items-center gap-2">
                <input
                  id={`question-option-${index}`}
                  type="text"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Opción ${index + 1}`}
                  value={option}
                  onChange={handleOptionChange(index)}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveOption(index)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
