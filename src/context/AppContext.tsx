import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { Patient, Instrument, Assignment, Program, ProgramActivity, ProgramDetails, EvolutionEntry, DashboardStats, GenderDistributionSlice, PatientsByProgramSlice, InstrumentType, InstrumentTopic, Question, QuestionAnswer, QuestionOption, Ribbon, PatientPunctualityRecord, CreatePatientPunctualityInput, UpdatePatientPunctualityInput } from '../types';
import { useAuth } from './AuthContext';

type ProgramInput = {
  name: string;
  description: string;
  instruments: string[];
  isActive?: boolean;
};



type ProgramActivityInput = {
  name: string;
  description?: string;
  day?: string;
  time?: string;
};

type ProgramActivityUpdateInput = Partial<ProgramActivityInput>;

type InstrumentTypeInput = {
  name: string;
  description?: string | null;
  criterionId?: string | null;
  createdBy?: string | null;
};

type InstrumentTypeUpdateInput = Partial<InstrumentTypeInput>;

type RibbonInput = {
  name?: string | null;
  color?: string | null;
  order?: number | null;
  description?: string | null;
  userCreated?: string | null;
  bgColor?: string | null;
  nextRibbonId?: number | null;
  hexColor?: string | null;
  thread?: string | null;
  layer?: number | null;
};

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const DAY_CODE_LOOKUP: Record<string, string> = {
  mon: 'Mon',
  monday: 'Mon',
  lunes: 'Mon',
  tue: 'Tue',
  tuesday: 'Tue',
  martes: 'Tue',
  wed: 'Wed',
  wednesday: 'Wed',
  miercoles: 'Wed',
  miércoles: 'Wed',
  thu: 'Thu',
  thursday: 'Thu',
  jueves: 'Thu',
  fri: 'Fri',
  friday: 'Fri',
  viernes: 'Fri',
  sat: 'Sat',
  saturday: 'Sat',
  sabado: 'Sat',
  sábado: 'Sat',
  sun: 'Sun',
  sunday: 'Sun',
  domingo: 'Sun',
};

const DAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const normalizeDayCode = (value: any): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const mapped = DAY_CODE_LOOKUP[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }

  if (trimmed.length >= 3) {
    const candidate = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1, 3).toLowerCase()}`;
    if (DAY_CODES.includes(candidate)) {
      return candidate;
    }
  }

  return null;
};

const normalizeGenderValue = (value: unknown): 'male' | 'female' | 'other' => {
  if (value === null || typeof value === 'undefined') {
    return 'other';
  }

  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return 'other';
  }

  if (
    [
      'male',
      'masculino',
      'masculina',
      'hombre',
      'm',
      'masc',
      'varon',
      'caballero',
    ].includes(normalized)
  ) {
    return 'male';
  }

  if (
    [
      'female',
      'femenino',
      'femenina',
      'mujer',
      'f',
      'feme',
      'fem',
      'dama',
    ].includes(normalized)
  ) {
    return 'female';
  }

  if (
    [
      'other',
      'otro',
      'otra',
      'otros',
      'otras',
      'sin especificar',
      'no especificado',
      'no especificada',
      'n/a',
      'na',
      'desconocido',
      'indefinido',
      'no binario',
      'non binary',
      'non-binary',
    ].includes(normalized)
  ) {
    return 'other';
  }

  return 'other';
};

const mapProgramFromApi = (program: any, fallbackCreatedBy: string | null = null): Program => {
  const createdAt = parseDate(program?.created_at ?? program?.createdAt) ?? new Date();
  const updatedAt = parseDate(program?.updated_at ?? program?.updatedAt);

  let instruments: string[] = [];
  if (Array.isArray(program?.instruments)) {
    instruments = program.instruments.map((id: any) => String(id));
  } else if (Array.isArray(program?.instrumentos)) {
    instruments = program.instrumentos.map((id: any) => String(id));
  }

  return {
    id: String(program?.id ?? ''),
    name: program?.nombre ?? program?.name ?? '',
    description: program?.descripcion ?? program?.description ?? '',
    instruments,
    isActive: typeof program?.activo !== 'undefined'
      ? Boolean(program.activo)
      : (typeof program?.isActive !== 'undefined' ? Boolean(program.isActive) : true),
    createdAt,
    updatedAt,
    createdBy: program?.user_created ?? program?.userCreated ?? fallbackCreatedBy ?? null,
  };
};

const mapProgramActivityFromApi = (activity: any): ProgramActivity => {
  const createdAt = parseDate(activity?.created_at ?? activity?.createdAt);
  const updatedAt = parseDate(activity?.updated_at ?? activity?.updatedAt);

  const hora = activity?.hora ?? activity?.time ?? null;
  const rawDay = activity?.dia ?? activity?.day ?? null;
  const normalizedDay = normalizeDayCode(rawDay);

  return {
    id: String(activity?.id ?? ''),
    name: activity?.nombre ?? activity?.name ?? '',
    description: activity?.descripcion ?? activity?.description ?? null,
    day: normalizedDay ?? (typeof rawDay === 'string' ? rawDay.trim() || null : null),
    time: typeof hora === 'string' ? hora : null,
    createdAt,
    updatedAt,
    createdBy: activity?.user_created ?? activity?.userCreated ?? null,
  };
};

const mapProgramDetailsFromApi = (program: any, fallbackCreatedBy: string | null = null): ProgramDetails => {
  const base = mapProgramFromApi(program, fallbackCreatedBy);
  const rawActivities = Array.isArray(program?.activities) ? program.activities : [];
  return {
    ...base,
    activities: rawActivities.map((activity: any) => mapProgramActivityFromApi(activity)),
  };
};

const parseNumeric = (value: any): number | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const numeric = Number(trimmed.replace(/,/g, '.'));
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
};

const mapPatientPunctualityFromApi = (raw: any): PatientPunctualityRecord => {
  const idValue = parseNumeric(raw?.id);
  const patientIdValue = parseNumeric(raw?.patientId ?? raw?.id_paciente);
  const punctualityValue = parseNumeric(raw?.punctuality ?? raw?.puntualidad);
  const effectivenessValue = parseNumeric(raw?.effectiveness ?? raw?.efectividad);
  const complianceValue = parseNumeric(raw?.compliance ?? raw?.cumplimiento);
  const roleEffectivenessValue = parseNumeric(raw?.roleEffectiveness ?? raw?.efectividad_rol);
  const evaluatedValue = parseNumeric(raw?.evaluated ?? raw?.evaluado);

  const resolveActivity = (): string | null => {
    const rawActivity = raw?.activity ?? raw?.actividad;
    if (typeof rawActivity !== 'string') {
      return null;
    }
    const trimmed = rawActivity.trim();
    return trimmed.length ? trimmed : null;
  };

  return {
    id: typeof idValue === 'number' ? Math.trunc(idValue) : 0,
    patientId: typeof patientIdValue === 'number' ? Math.trunc(patientIdValue) : null,
    date: parseDate(raw?.date ?? raw?.fecha),
    activity: resolveActivity(),
    punctuality: punctualityValue,
    effectiveness: effectivenessValue,
    compliance: complianceValue,
    roleEffectiveness: roleEffectivenessValue,
    evaluated: evaluatedValue === null ? null : (evaluatedValue ? 1 : 0),
    createdAt: parseDate(raw?.createdAt ?? raw?.created_at),
    updatedAt: parseDate(raw?.updatedAt ?? raw?.updated_at),
  };
};

type PunctualityPayloadInput = CreatePatientPunctualityInput | UpdatePatientPunctualityInput;

const buildPatientPunctualityPayload = (input: PunctualityPayloadInput): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  const numericPatientId = Number(input.patientId);
  if (!Number.isFinite(numericPatientId)) {
    throw new Error('El paciente seleccionado es inválido para registrar puntualidad.');
  }
  payload.id_paciente = numericPatientId;

  if (Object.prototype.hasOwnProperty.call(input, 'activity')) {
    if (input.activity === null) {
      payload.actividad = null;
    } else if (typeof input.activity === 'string') {
      const trimmed = input.activity.trim();
      payload.actividad = trimmed.length ? trimmed : null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'date')) {
    const value = input.date;
    if (value === null) {
      payload.fecha = null;
    } else if (value instanceof Date) {
      payload.fecha = value.toISOString();
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      payload.fecha = trimmed.length ? trimmed : null;
    }
  }

  const numericFields: Array<[keyof CreatePatientPunctualityInput, string]> = [
    ['punctuality', 'puntualidad'],
    ['effectiveness', 'efectividad'],
    ['compliance', 'cumplimiento'],
    ['roleEffectiveness', 'efectividad_rol'],
  ];

  numericFields.forEach(([sourceKey, targetKey]) => {
    if (!Object.prototype.hasOwnProperty.call(input, sourceKey)) {
      return;
    }

    const rawValue = input[sourceKey];
    if (rawValue === null) {
      payload[targetKey] = null;
      return;
    }

    if (typeof rawValue === 'number') {
      payload[targetKey] = rawValue;
      return;
    }

    if (typeof rawValue === 'boolean') {
      payload[targetKey] = rawValue ? 1 : 0;
      return;
    }

    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      payload[targetKey] = trimmed.length ? trimmed : null;
    }
  });

  if (Object.prototype.hasOwnProperty.call(input, 'evaluated')) {
    const rawValue = input.evaluated;
    if (rawValue === null) {
      payload.evaluado = null;
    } else if (typeof rawValue === 'boolean') {
      payload.evaluado = rawValue ? 1 : 0;
    } else {
      payload.evaluado = rawValue;
    }
  }

  return payload;
};

const normalizeRibbonString = (value: unknown): string | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

const normalizeRibbonNumber = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
};

const mapRibbonFromApi = (raw: any): Ribbon => {
  const idValue = normalizeRibbonNumber(raw?.id);
  return {
    id: idValue ?? 0,
    name: normalizeRibbonString(raw?.nombre ?? raw?.name),
    color: normalizeRibbonString(raw?.color),
    order: normalizeRibbonNumber(raw?.orden ?? raw?.order),
    description: normalizeRibbonString(raw?.descripcion ?? raw?.description),
    userCreated: normalizeRibbonString(raw?.user_created ?? raw?.userCreated),
    createdAt: parseDate(raw?.created_at ?? raw?.createdAt),
    updatedAt: parseDate(raw?.updated_at ?? raw?.updatedAt),
    bgColor: normalizeRibbonString(raw?.bg_color ?? raw?.bgColor),
    nextRibbonId: normalizeRibbonNumber(raw?.siguiente_cinta ?? raw?.siguienteCinta ?? raw?.nextRibbonId),
    hexColor: normalizeRibbonString(raw?.hexadecimal ?? raw?.hexColor ?? raw?.hex),
    thread: normalizeRibbonString(raw?.hilo ?? raw?.thread),
    layer: normalizeRibbonNumber(raw?.cinta ?? raw?.layer),
  };
};

const buildRibbonPayload = (input: RibbonInput) => {
  const payload: Record<string, unknown> = {};

  if ('name' in input) {
    payload.nombre = normalizeRibbonString(input.name ?? null);
  }
  if ('color' in input) {
    payload.color = normalizeRibbonString(input.color ?? null);
  }
  if ('order' in input) {
    payload.orden = normalizeRibbonNumber(input.order ?? null);
  }
  if ('description' in input) {
    payload.descripcion = normalizeRibbonString(input.description ?? null);
  }
  if ('userCreated' in input) {
    payload.user_created = normalizeRibbonString(input.userCreated ?? null);
  }
  if ('bgColor' in input) {
    payload.bg_color = normalizeRibbonString(input.bgColor ?? null);
  }
  if ('nextRibbonId' in input) {
    payload.siguiente_cinta = normalizeRibbonNumber(input.nextRibbonId ?? null);
  }
  if ('hexColor' in input) {
    payload.hexadecimal = normalizeRibbonString(input.hexColor ?? null);
  }
  if ('thread' in input) {
    payload.hilo = normalizeRibbonString(input.thread ?? null);
  }
  if ('layer' in input) {
    payload.cinta = normalizeRibbonNumber(input.layer ?? null);
  }

  return payload;
};

const sortRibbonsList = (list: Ribbon[]): Ribbon[] => {
  return [...list].sort((a, b) => {
    const orderA = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.id - b.id;
  });
};

const normalizeQuestionType = (value: any): Question['type'] => {
  if (value === null || typeof value === 'undefined') {
    return 'text';
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return 'text';
  }

  const canonical = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (['radio', 'radio_button', 'single', 'single_choice', 'single_option', 'opcion_unica', 'unica'].includes(canonical)) {
    return 'radio';
  }

  if (['select', 'dropdown', 'combo', 'combobox', 'desplegable', 'lista', 'lista_desplegable'].includes(canonical)) {
    return 'select';
  }

  if (['multiple_choice', 'multiple', 'choice', 'checkbox', 'checkboxes', 'seleccion_multiple', 'seleccion', 'opciones', 'opcion'].includes(canonical)) {
    return 'multiple_choice';
  }

  if (['scale', 'escala', 'likert', 'rango'].includes(canonical)) {
    return 'scale';
  }

  if (['boolean', 'yes_no', 'true_false', 'binaria', 'binario'].includes(canonical)) {
    return 'boolean';
  }

  return 'text';
};

const sortQuestionsList = (list: Question[]): Question[] =>
  [...list].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.id.localeCompare(b.id);
  });

const sortTopicsList = (list: InstrumentTopic[]): InstrumentTopic[] =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

const mapAnswerFromApi = (raw: any): QuestionAnswer => {
  const idValue = raw?.id ?? raw?.respuesta_id ?? raw?.answerId ?? raw?.answer_id ?? raw?.idRespuesta ?? raw?.id_respuesta;
  const resolvedId = (() => {
    if (idValue === null || typeof idValue === 'undefined') {
      return `answer-${Math.random().toString(36).slice(2, 11)}`;
    }
    const stringified = String(idValue);
    return stringified.trim().length ? stringified : `answer-${Math.random().toString(36).slice(2, 11)}`;
  })();

  const labelSource = raw?.nombre ?? raw?.name ?? raw?.label ?? raw?.valor ?? raw?.value ?? '';
  const labelCandidate = String(labelSource ?? '').trim();
  const label = labelCandidate.length ? labelCandidate : `Respuesta ${resolvedId}`;

  const rawValue = raw?.valor ?? raw?.value ?? null;
  const value = rawValue === null || typeof rawValue === 'undefined' ? null : String(rawValue);

  const rawColor = raw?.color ?? raw?.colour ?? raw?.color_hex ?? raw?.colorHex ?? null;
  const color = typeof rawColor === 'string' && rawColor.trim().length ? rawColor.trim() : null;

  return {
    id: resolvedId,
    label,
    value,
    color,
    createdBy: raw?.user_created ?? raw?.userCreated ?? null,
    createdAt: parseDate(raw?.created_at ?? raw?.createdAt),
    updatedAt: parseDate(raw?.updated_at ?? raw?.updatedAt),
  };
};

const mapQuestionFromApi = (raw: any): Question => {
  const idValue = raw?.id ?? raw?.question_id ?? raw?.questionId ?? '';
  const textValue = raw?.nombre ?? raw?.name ?? raw?.texto ?? raw?.text ?? '';
  const orderValue = raw?.orden ?? raw?.order ?? 0;
  const requiredFlag = raw?.habilitada ?? raw?.required;
  const optionsValue = raw?.opciones ?? raw?.options;
  const topicValue = raw?.id_topico ?? raw?.topicId ?? raw?.topico_id ?? raw?.topicoId ?? raw?.topic_id ?? null;

  const required = typeof requiredFlag === 'boolean'
    ? requiredFlag
    : (typeof requiredFlag === 'number' ? requiredFlag !== 0 : true);

  const optionList = Array.isArray(optionsValue)
    ? optionsValue
        .map((option: any) => {
          if (option === null || typeof option === 'undefined') {
            return null;
          }

          if (typeof option === 'string') {
            const trimmed = option.trim();
            if (!trimmed) {
              return null;
            }
            return { label: trimmed, value: trimmed } as QuestionOption;
          }

          if (typeof option === 'object') {
            const rawLabel = option?.label ?? option?.nombre ?? option?.name ?? option?.texto ?? option?.text ?? option?.valor ?? option?.value;
            const rawValue = option?.value ?? option?.valor ?? rawLabel;
            const label = typeof rawLabel === 'string' ? rawLabel.trim() : '';
            let value = typeof rawValue === 'string' ? rawValue.trim() : '';
            if (!value && label) {
              value = label;
            }
            if (!label || !value) {
              return null;
            }
            return { label, value } as QuestionOption;
          }

          return null;
        })
        .filter((option): option is QuestionOption => Boolean(option))
    : undefined;

  const order = Number(orderValue);
  const normalizedOrder = Number.isFinite(order) ? order : 0;

  const text = String(textValue ?? '').trim();

  const rawAnswers = Array.isArray(raw?.respuestas) ? raw.respuestas : [];
  const mappedAnswers: QuestionAnswer[] = rawAnswers
    .map((answer: any) => mapAnswerFromApi(answer))
    .filter((answer: QuestionAnswer): answer is QuestionAnswer => Boolean(answer.label));

  const optionsFromAnswers = mappedAnswers.length
    ? normalizeQuestionOptions(
        mappedAnswers.map((answer) => ({
          label: typeof answer.label === 'string' ? answer.label : '',
          value: typeof answer.value === 'string' && answer.value ? answer.value : (answer.label ?? ''),
        })),
      )
    : [];

  const fallbackOptions = optionList ? normalizeQuestionOptions(optionList) : [];

  const mergedOptions = optionsFromAnswers.length ? optionsFromAnswers : fallbackOptions;

  const resolvedTopicId = (() => {
    if (topicValue === null || typeof topicValue === 'undefined') {
      return null;
    }
    if (typeof topicValue === 'number') {
      return Number.isFinite(topicValue) ? String(topicValue) : null;
    }
    const text = String(topicValue).trim();
    if (!text.length) {
      return null;
    }
    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
      return String(numeric);
    }
    return text;
  })();

  return {
    id: String(idValue ?? ''),
    text: text.length ? text : `Pregunta ${idValue ?? ''}`,
    type: normalizeQuestionType(raw?.tipo_respuesta ?? raw?.responseType ?? raw?.tipo ?? raw?.type),
    options: mergedOptions.length ? mergedOptions : undefined,
    answers: mappedAnswers,
    required,
    order: normalizedOrder,
    topicId: resolvedTopicId,
  };
};

const mapInstrumentTopicFromApi = (raw: any): InstrumentTopic => {
  const idValue = raw?.id ?? raw?.topicId ?? raw?.topico_id ?? raw?.topicoId;
  const instrumentIdValue = raw?.id_instrumento ?? raw?.instrumentId ?? raw?.instrumento_id ?? null;
  const nameValue = raw?.nombre ?? raw?.name ?? '';
  const createdAt = parseDate(raw?.created_at ?? raw?.createdAt);
  const updatedAt = parseDate(raw?.updated_at ?? raw?.updatedAt);

  const toBoolean = (value: unknown): boolean | null => {
    if (value === null || typeof value === 'undefined') {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return null;
      if (['0', 'false', 'no', 'inactivo'].includes(normalized)) {
        return false;
      }
      if (['1', 'true', 'si', 'sí', 'yes', 'activo'].includes(normalized)) {
        return true;
      }
      const numeric = Number(normalized);
      if (Number.isFinite(numeric)) {
        return numeric !== 0;
      }
    }

    return null;
  };

  const resolvedId = (() => {
    if (idValue === null || typeof idValue === 'undefined') {
      return `topic-${Math.random().toString(36).slice(2, 11)}`;
    }
    const stringified = String(idValue);
    return stringified.trim().length ? stringified : `topic-${Math.random().toString(36).slice(2, 11)}`;
  })();

  const resolvedName = String(nameValue ?? '').trim();

  return {
    id: resolvedId,
    instrumentId:
      instrumentIdValue === null || typeof instrumentIdValue === 'undefined' || instrumentIdValue === ''
        ? null
        : String(instrumentIdValue),
    name: resolvedName.length ? resolvedName : resolvedId,
    createdBy: raw?.user_created ?? raw?.userCreated ?? null,
    createdAt,
    updatedAt,
    isVisible: toBoolean(raw?.show),
  };
};

const QUESTION_TYPES_WITH_OPTIONS: ReadonlyArray<Question['type']> = ['multiple_choice', 'radio', 'select'];

const questionTypeRequiresOptions = (type: Question['type']): boolean =>
  QUESTION_TYPES_WITH_OPTIONS.includes(type);

const normalizeQuestionOptions = (options?: Array<Partial<QuestionOption> | string> | null): QuestionOption[] => {
  if (!Array.isArray(options)) {
    return [];
  }

  const seenValues = new Set<string>();
  const normalized: QuestionOption[] = [];

  for (const option of options) {
    if (option === null || typeof option === 'undefined') {
      continue;
    }

    let label = '';
    let value = '';

    if (typeof option === 'string') {
      const trimmed = option.trim();
      label = trimmed;
      value = trimmed;
    } else if (typeof option === 'object') {
      const rawLabel = 'label' in option ? option.label : undefined;
      const rawValue = 'value' in option ? option.value : undefined;
      if (typeof rawLabel === 'string') {
        label = rawLabel.trim();
      }
      if (typeof rawValue === 'string') {
        value = rawValue.trim();
      }

      if (!value && label) {
        value = label;
      }
    }

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

const buildAnswersFromOptions = (questionId: string, options: QuestionOption[]): QuestionAnswer[] =>
  options.map((option, index) => ({
    id: `${questionId}-answer-${index}`,
    label: option.label,
    value: option.value,
    color: null,
    createdBy: null,
    createdAt: null,
    updatedAt: null,
  }));

const normalizeTopicIdentifier = (value: unknown): { normalized: string | null; payload: number | string | undefined } => {
  if (value === null || typeof value === 'undefined') {
    return { normalized: null, payload: undefined };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { normalized: null, payload: undefined };
    }
    const numeric = Math.trunc(value);
    return { normalized: String(numeric), payload: numeric };
  }

  const text = String(value).trim();
  if (!text.length) {
    return { normalized: null, payload: undefined };
  }

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return { normalized: String(numeric), payload: numeric };
  }

  return { normalized: text, payload: text };
};

type InstrumentMappingOverrides = {
  name?: string | null;
  subjectName?: string | null;
  questions?: Question[] | null;
  topics?: InstrumentTopic[] | null;
};

type QuestionInput = {
  text: string;
  type: Question['type'];
  order?: number | null;
  required?: boolean;
  options?: QuestionOption[] | null;
  topicId?: string | null;
};

type InstrumentTopicInput = {
  name: string;
  isVisible?: boolean | null;
  createdBy?: string | null;
};

const mapInstrumentFromApi = (raw: any, overrides: InstrumentMappingOverrides = {}): Instrument => {
  const idValue = raw?.id ?? raw?.instrumento_id ?? raw?.instrumentId ?? '';
  const instrumentTypeIdValue = raw?.id_instrumento_tipo ?? raw?.instrumentTypeId ?? raw?.instrumento_tipo_id ?? null;
  const subjectIdValue = raw?.id_tema ?? raw?.tema_id ?? raw?.subjectId ?? raw?.temaId ?? null;
  const baseQuestions = Array.isArray(raw?.preguntas) ? raw.preguntas.map((question: any) => mapQuestionFromApi(question)) : [];
  const overrideQuestions = overrides.questions;

  const questions = Array.isArray(overrideQuestions)
    ? overrideQuestions
    : (overrideQuestions === null ? [] : baseQuestions);

  const rawTopics = Array.isArray(raw?.topicos)
    ? raw.topicos
    : Array.isArray(raw?.topics)
      ? raw.topics
      : [];
  const baseTopics = rawTopics.map((topic: any) => mapInstrumentTopicFromApi(topic));
  const overrideTopics = overrides.topics;

  const topics = Array.isArray(overrideTopics)
    ? overrideTopics
    : (overrideTopics === null ? [] : baseTopics);

  const normalizeBoolean = (value: any, defaultValue = true): boolean => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return defaultValue;
      if (['1', 'true', 'yes', 'si', 'sí', 'activo', 'habilitada'].includes(normalized)) {
        return true;
      }
      if (['0', 'false', 'no', 'inactivo', 'deshabilitada'].includes(normalized)) {
        return false;
      }
    }

    return defaultValue;
  };

  const normalizeColorFlag = (value: any): 0 | 1 => {
    if (typeof value === 'number') {
      return value === 1 ? 1 : 0;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return 0;
      if (['1', 'true', 'si', 'sí', 'yes'].includes(normalized)) {
        return 1;
      }
      if (['0', 'false', 'no'].includes(normalized)) {
        return 0;
      }
      const numeric = Number(normalized);
      if (Number.isFinite(numeric)) {
        return numeric === 1 ? 1 : 0;
      }
    }
    return 0;
  };

  const resultDeliveryValue = raw?.resultados ?? raw?.resultados_por ?? raw?.resultadosPor ?? raw?.resultDelivery ?? null;
  const normalizedResultDelivery = (() => {
    if (resultDeliveryValue === null || typeof resultDeliveryValue === 'undefined') {
      return null;
    }
    const normalized = String(resultDeliveryValue).trim().toLowerCase();
    if (!normalized || normalized === 'null' || normalized === 'ninguno') {
      return null;
    }
    if (normalized === 'sistema' || normalized === 'programado') {
      return normalized as 'sistema' | 'programado';
    }
    return null;
  })();

  const createdAt = parseDate(raw?.created_at ?? raw?.createdAt) ?? new Date();
  const updatedAt = parseDate(raw?.updated_at ?? raw?.updatedAt);

  const subjectNameOverride = overrides.subjectName ?? null;
  const topicNameFromPayload = raw?.tema?.nombre ?? raw?.tema?.name ?? raw?.tema_nombre ?? null;
  const resolvedSubjectName = subjectNameOverride !== null && typeof subjectNameOverride !== 'undefined'
    ? subjectNameOverride
    : (typeof topicNameFromPayload === 'string' ? topicNameFromPayload.trim() : null);

  const nameOverride = overrides.name ?? null;
  const fallbackName = raw?.descripcion ?? raw?.nombre ?? `Instrumento ${idValue ?? ''}`;
  const resolvedName = nameOverride !== null && typeof nameOverride !== 'undefined'
    ? nameOverride
    : (fallbackName ? String(fallbackName) : `Instrumento ${idValue ?? ''}`);

  const instrument: Instrument = {
    id: String(idValue ?? ''),
    name: resolvedName,
    description: (raw?.descripcion ?? raw?.description ?? '').toString(),
    category: (raw?.categoria ?? raw?.category ?? 'psychological') as Instrument['category'],
    questions: sortQuestionsList(Array.isArray(questions) ? questions : []),
    estimatedDuration: (() => {
      const durationValue = raw?.duracion_estimada ?? raw?.estimatedDuration;
      const numeric = Number(durationValue);
      return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    })(),
    isActive: normalizeBoolean(raw?.activo ?? raw?.isActive, true),
    createdAt,
    instrumentTypeId: instrumentTypeIdValue !== null && typeof instrumentTypeIdValue !== 'undefined' && instrumentTypeIdValue !== ''
      ? String(instrumentTypeIdValue)
      : null,
    subjectId: subjectIdValue !== null && typeof subjectIdValue !== 'undefined' && subjectIdValue !== ''
      ? String(subjectIdValue)
      : null,
    subjectName: resolvedSubjectName,
    availability: raw?.disponible ?? raw?.availability ?? null,
    resource: raw?.recurso ?? raw?.resource ?? null,
    resultDelivery: normalizedResultDelivery,
    colorResponse: normalizeColorFlag(raw?.color_respuesta ?? raw?.colorResponse ?? raw?.colores_respuesta ?? raw?.coloresRespuesta),
    createdBy: typeof raw?.user_created === 'string' ? raw.user_created : (typeof raw?.userCreated === 'string' ? raw.userCreated : null),
    updatedAt: updatedAt ?? null,
    topics: sortTopicsList(Array.isArray(topics) ? topics : []),
  };

  return instrument;
};

const mapInstrumentTypeFromApi = (raw: any): InstrumentType => {
  const idValue = raw?.id ?? raw?.instrumento_tipo_id ?? raw?.instrumentTypeId;
  const createdAt = parseDate(raw?.created_at ?? raw?.createdAt);
  const updatedAt = parseDate(raw?.updated_at ?? raw?.updatedAt);

  const criterionId = raw?.id_criterio ?? raw?.criterionId ?? raw?.idCriterio;

  return {
    id: idValue !== undefined && idValue !== null ? String(idValue) : '',
    name: (raw?.nombre ?? raw?.name ?? '').toString().trim(),
    description: raw?.descripcion ?? raw?.description ?? null,
    createdBy: raw?.user_created ?? raw?.userCreated ?? null,
    createdAt,
    updatedAt,
    criterionId:
      criterionId !== undefined && criterionId !== null && criterionId !== ''
        ? String(criterionId)
        : null,
  };
};

const sortInstrumentTypes = (list: InstrumentType[]): InstrumentType[] =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

const buildInstrumentTopicPayload = (input: InstrumentTopicInput): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  const rawName = typeof input.name === 'string' ? input.name.trim() : '';
  if (!rawName.length) {
    throw new Error('El nombre del tópico es obligatorio.');
  }
  payload.nombre = rawName;

  if (Object.prototype.hasOwnProperty.call(input, 'createdBy')) {
    const creator = input.createdBy;
    if (typeof creator === 'string') {
      const trimmed = creator.trim();
      payload.user_created = trimmed.length ? trimmed : null;
    } else {
      payload.user_created = creator ?? null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'isVisible')) {
    const visibility = input.isVisible;
    if (visibility === null) {
      payload.show = null;
    } else if (typeof visibility === 'boolean') {
      payload.show = visibility;
    } else if (typeof visibility === 'number') {
      payload.show = visibility !== 0;
    } else {
      payload.show = Boolean(visibility);
    }
  }

  return payload;
};

interface AppContextType {
  // State
  patients: Patient[];
  instruments: Instrument[];
  assignments: Assignment[];
  programs: Program[];
  ribbons: Ribbon[];
  instrumentTypes: InstrumentType[];
  evolutionEntries: EvolutionEntry[];
  dashboardStats: DashboardStats;
  
  // Actions
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  assignProgramToPatient: (patientId: string, programId: string | null) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  
  addInstrument: (instrument: Omit<Instrument, 'id' | 'createdAt'>) => Promise<Instrument>;
  updateInstrument: (id: string, instrument: Partial<Instrument>) => Promise<Instrument | null>;
  deleteInstrument: (id: string) => Promise<boolean>;
  getInstrumentDetails: (id: string) => Promise<Instrument | null>;
  createQuestion: (instrumentId: string, input: QuestionInput) => Promise<Question>;
  updateQuestion: (instrumentId: string, questionId: string, input: QuestionInput) => Promise<Question>;
  deleteQuestion: (instrumentId: string, questionId: string) => Promise<boolean>;
  assignInstrumentToPatients: (instrumentTypeId: string, patientIds: string[]) => Promise<void>;
  getInstrumentTopics: (instrumentId: string) => Promise<InstrumentTopic[]>;
  createInstrumentTopic: (instrumentId: string, input: InstrumentTopicInput) => Promise<InstrumentTopic>;
  updateInstrumentTopic: (instrumentId: string, topicId: string, input: InstrumentTopicInput) => Promise<InstrumentTopic>;
  deleteInstrumentTopic: (instrumentId: string, topicId: string) => Promise<boolean>;
  
  addAssignment: (assignment: Omit<Assignment, 'id' | 'assignedAt'>) => void;
  updateAssignment: (id: string, assignment: Partial<Assignment>) => void;

  reloadRibbons: () => Promise<void>;
  addRibbon: (input: RibbonInput) => Promise<Ribbon>;
  updateRibbon: (id: number, input: RibbonInput) => Promise<Ribbon>;
  deleteRibbon: (id: number) => Promise<boolean>;
  
  addProgram: (program: ProgramInput) => Promise<Program>;
  updateProgram: (id: string, program: Partial<ProgramInput>) => Promise<Program | null>;
  deleteProgram: (id: string) => Promise<boolean>;
  getProgramDetails: (id: string) => Promise<ProgramDetails | null>;
  addProgramActivity: (programId: string, activity: ProgramActivityInput) => Promise<ProgramActivity>;
  updateProgramActivity: (programId: string, activityId: string, activity: ProgramActivityUpdateInput) => Promise<ProgramActivity>;
  deleteProgramActivity: (programId: string, activityId: string) => Promise<boolean>;
  getPatientPunctuality: (patientId: string) => Promise<PatientPunctualityRecord[]>;
  createPatientPunctuality: (input: CreatePatientPunctualityInput) => Promise<PatientPunctualityRecord>;
  updatePatientPunctuality: (input: UpdatePatientPunctualityInput) => Promise<PatientPunctualityRecord>;
  
  addEvolutionEntry: (entry: Omit<EvolutionEntry, 'id'>) => void;

  refreshInstrumentTypes: () => Promise<void>;
  createInstrumentType: (input: InstrumentTypeInput) => Promise<InstrumentType>;
  updateInstrumentType: (id: string, updates: InstrumentTypeUpdateInput) => Promise<InstrumentType>;
  deleteInstrumentType: (id: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Mock data
const mockPatients: Patient[] = [
  {
    id: '1',
    userId: '1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@email.com',
    cedula: 'V-12345678',
    dateOfBirth: new Date('1990-05-15'),
    gender: 'female',
    phone: '+1234567890',
    assignedTherapists: [],
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '2',
    userId: '2',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    cedula: 'V-87654321',
    dateOfBirth: new Date('1985-10-20'),
    gender: 'male',
    phone: '+1234567891',
    assignedTherapists: [],
    createdAt: new Date('2024-01-02'),
    isActive: true,
  },
];

const mockInstruments: Instrument[] = [
  {
    id: '1',
    name: 'Anxiety Assessment',
    description: 'Comprehensive anxiety evaluation instrument',
    category: 'psychological',
    questions: [
      {
        id: '1',
        text: 'How often do you feel anxious?',
        type: 'scale',
        required: true,
        order: 1,
      },
      {
        id: '2',
        text: 'What triggers your anxiety the most?',
        type: 'text',
        required: false,
        order: 2,
      },
    ],
    estimatedDuration: 15,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    instrumentTypeId: '1',
    subjectId: '1',
    availability: 'web',
    resource: 'Documento PDF',
    resultDelivery: null,
    colorResponse: 0,
    topics: [],
  },
];

const mockDashboardStats: DashboardStats = {
  totalPatients: 150,
  totalUsers: 25,
  totalInstruments: 12,
  pendingAssignments: 8,
  completedAssignments: 145,
  genderDistribution: {
    male: 75,
    female: 70,
    other: 5,
    breakdown: [
      { label: 'Femenino', count: 70, percentage: 46.67 },
      { label: 'Masculino', count: 75, percentage: 50 },
      { label: 'Otros', count: 5, percentage: 3.33 },
    ],
  },
  patientsByProgram: [
    { programId: 1, name: 'Bienestar Integral', count: 80 },
    { programId: 2, name: 'Salud Preventiva', count: 45 },
    { programId: 3, name: 'Mindfulness', count: 25 },
  ],
  lastUpdated: undefined,
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [instruments, setInstruments] = useState<Instrument[]>(mockInstruments);
  const instrumentsRef = useRef<Instrument[]>(mockInstruments);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const mockPrograms: Program[] = [
    {
      id: 'p1',
      name: 'Wellness Starter',
      description: 'Introductory program for new patients',
      instruments: ['1'],
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'system',
    },
  ];

  const [programs, setPrograms] = useState<Program[]>(mockPrograms);
  const [ribbons, setRibbons] = useState<Ribbon[]>([]);
  const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([]);
  const [evolutionEntries, setEvolutionEntries] = useState<EvolutionEntry[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(mockDashboardStats);

  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
  const { user, token } = useAuth();

  useEffect(() => {
    instrumentsRef.current = instruments;
  }, [instruments]);


  const currentUserDisplayName = useMemo(() => {
    if (!user) return null;
    const parts = [user.firstName, user.lastName].map(part => (part ?? '').trim()).filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
    return user.username?.trim() || null;
  }, [user]);

  const fetchInstrumentTypesFromApi = useCallback(async (): Promise<InstrumentType[]> => {
    const res = await fetch(`${apiBase}/instruments/types`);
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(text || `Failed to fetch instrument types: ${res.status}`);
    }

    const data = await res.json();
    const mapped = Array.isArray(data)
      ? data
          .map((item: any) => mapInstrumentTypeFromApi(item))
          .filter((item: InstrumentType) => item.id && item.name)
      : [];

    return sortInstrumentTypes(mapped);
  }, [apiBase]);

  const refreshInstrumentTypes = useCallback(async () => {
    try {
      const mapped = await fetchInstrumentTypesFromApi();
      setInstrumentTypes(mapped);
    } catch (error) {
      console.error('Error refreshing instrument types', error);
      throw error instanceof Error ? error : new Error('Error refreshing instrument types');
    }
  }, [fetchInstrumentTypesFromApi]);

  const createInstrumentType = useCallback(
    async (input: InstrumentTypeInput): Promise<InstrumentType> => {
      const trimmedName = input.name?.trim?.() ?? input.name;
      if (!trimmedName) {
        throw new Error('El nombre del tipo de instrumento es obligatorio');
      }

      const payload: Record<string, unknown> = {
        nombre: trimmedName,
      };

      if (Object.prototype.hasOwnProperty.call(input, 'description')) {
        const trimmedDescription = input.description?.trim?.() ?? input.description ?? null;
        payload.descripcion = trimmedDescription || null;
      }

      if (Object.prototype.hasOwnProperty.call(input, 'criterionId')) {
        const rawCriterion = input.criterionId ?? null;
        if (rawCriterion === null || rawCriterion === '') {
          payload.id_criterio = null;
        } else {
          const numericCriterion = Number(rawCriterion);
          if (Number.isNaN(numericCriterion)) {
            throw new Error('El criterio seleccionado es inválido');
          }
          payload.id_criterio = numericCriterion;
        }
      }

      const creator = input.createdBy ?? currentUserDisplayName ?? null;
      if (creator) {
        payload.user_created = creator;
      }

      const res = await fetch(`${apiBase}/instruments/types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.message ?? `No se pudo crear el tipo de instrumento (status ${res.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const data = await res.json();
      const mapped = mapInstrumentTypeFromApi(data);
      if (!mapped.id) {
        throw new Error('La respuesta del servidor no contiene un identificador válido.');
      }

      setInstrumentTypes((prev) => {
        const next = prev.filter((type) => type.id !== mapped.id);
        next.push(mapped);
        return sortInstrumentTypes(next);
      });

      return mapped;
    },
    [apiBase, currentUserDisplayName],
  );

  const updateInstrumentType = useCallback(
    async (id: string, updates: InstrumentTypeUpdateInput): Promise<InstrumentType> => {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        throw new Error('El identificador del tipo de instrumento es inválido');
      }

      const payload: Record<string, unknown> = {};

      if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
        const trimmedName = updates.name?.trim?.() ?? updates.name ?? '';
        if (!trimmedName) {
          throw new Error('El nombre del tipo de instrumento es obligatorio');
        }
        payload.nombre = trimmedName;
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
        const trimmedDescription = updates.description?.trim?.() ?? updates.description ?? null;
        payload.descripcion = trimmedDescription || null;
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'criterionId')) {
        const rawCriterion = updates.criterionId ?? null;
        if (rawCriterion === null || rawCriterion === '') {
          payload.id_criterio = null;
        } else {
          const numericCriterion = Number(rawCriterion);
          if (Number.isNaN(numericCriterion)) {
            throw new Error('El criterio seleccionado es inválido');
          }
          payload.id_criterio = numericCriterion;
        }
      }

      if (Object.keys(payload).length === 0) {
        const existing = instrumentTypes.find((type) => type.id === String(id));
        if (existing) {
          return existing;
        }
        throw new Error('No se proporcionaron cambios para actualizar el tipo de instrumento');
      }

      const res = await fetch(`${apiBase}/instruments/types/${numericId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.message ?? `No se pudo actualizar el tipo de instrumento (status ${res.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const data = await res.json();
      const mapped = mapInstrumentTypeFromApi(data);
      if (!mapped.id) {
        throw new Error('La respuesta del servidor no contiene un identificador válido.');
      }

      setInstrumentTypes((prev) => {
        const next = prev.map((type) => (type.id === mapped.id ? mapped : type));
        return sortInstrumentTypes(next);
      });

      return mapped;
    },
    [apiBase, instrumentTypes],
  );

  const deleteInstrumentType = useCallback(
    async (id: string): Promise<boolean> => {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        setInstrumentTypes((prev) => prev.filter((type) => type.id !== id));
        return true;
      }

      const res = await fetch(`${apiBase}/instruments/types/${numericId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.message ?? `No se pudo eliminar el tipo de instrumento (status ${res.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      await res.json().catch(() => null);

      setInstrumentTypes((prev) => prev.filter((type) => type.id !== String(numericId)));
      return true;
    },
    [apiBase],
  );

  const normalizePatientRibbonId = (value: unknown): number | null => {
    if (value === null || typeof value === 'undefined') {
      return null;
    }

    const numeric = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return Math.trunc(numeric);
  };

  // Map backend paciente -> frontend Patient
  const mapPacienteToPatient = (p: any): Patient => ({
    id: String(p.id),
    userId: p.id_usuario ? String(p.id_usuario) : undefined,
    firstName: p.nombres ?? '',
    lastName: p.apellidos ?? '',
    email: p.contacto_correo ?? p.contacto ?? '',
    cedula: typeof p.cedula === 'string' && p.cedula.trim().length ? p.cedula.trim() : null,
    dateOfBirth: p.fecha_nacimiento ? new Date(p.fecha_nacimiento) : new Date(),
    gender: normalizeGenderValue(p.genero),
    phone: p.telefono ?? p.contacto_telefono ?? undefined,
    address: p.direccion ?? undefined,
    assignedTherapists: [],
    programId: p.id_programa ? String(p.id_programa) : undefined,
    ribbonId: normalizePatientRibbonId(p.id_cinta ?? p.ribbonId ?? p.cinta ?? p.idCinta ?? null),
    createdAt: p.created_at ? new Date(p.created_at) : new Date(),
    isActive: (typeof p.activo !== 'undefined') ? Boolean(p.activo) : true,
  });

  // Load patients from backend whenever authentication changes
  useEffect(() => {
    let cancelled = false;

    const loadPatients = async () => {
      if (!token) {
        setPatients(mockPatients);
        return;
      }

      try {
        const res = await fetch(`${apiBase}/patient`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch patients: ${res.status}`);
        }

        const data = await res.json();
        if (cancelled) return;

        const mapped = Array.isArray(data) ? data.map(mapPacienteToPatient) : [];

        if (mapped.length > 0) {
          setPatients(mapped);
        } else {
          setPatients(mockPatients);
        }
      } catch (err) {
        if (!cancelled) {
          setPatients(mockPatients);
          console.error('Error loading patients from API, using mock data.', err);
        }
      }
    };

    void loadPatients();

    return () => {
      cancelled = true;
    };
  }, [apiBase, token]);

  // Load programs from backend on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/programs`);
        if (!res.ok) throw new Error(`Failed to fetch programs: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          // map backend program shape to frontend Program
          const mapped = data.map((p: any) => mapProgramFromApi(p, currentUserDisplayName));
          setPrograms(mapped);
        }
      } catch (err) {
        console.error('Error loading programs from API, keeping mock programs.', err);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase, currentUserDisplayName]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`${apiBase}/patients/ribbon`, { headers });
        if (!res.ok) {
          throw new Error(`Failed to fetch ribbons: ${res.status}`);
        }

        const data = await res.json();
        if (!mounted) return;
        const mapped = Array.isArray(data) ? data.map(mapRibbonFromApi) : [];
        setRibbons(sortRibbonsList(mapped));
      } catch (err) {
        console.error('Error loading ribbons from API.', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiBase, token]);

  // Load instruments from backend on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/instruments`);
        if (!res.ok) throw new Error(`Failed to fetch instruments: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const topicCache: Record<number, string | null> = {};
          const temaIds = Array.from(new Set(data
            .map((ins: any) => ins?.id_tema)
            .filter((id: any) => typeof id === 'number' && Number.isFinite(id))));

          for (const temaId of temaIds) {
            try {
              const r = await fetch(`${apiBase}/topics/${temaId}`);
              if (!r.ok) {
                topicCache[temaId] = null;
                continue;
              }
              const topicPayload = await r.json();
              const topicName = topicPayload?.nombre ?? topicPayload?.name ?? null;
              topicCache[temaId] = typeof topicName === 'string' ? topicName : null;
            } catch (err) {
              console.error('Failed to fetch topic', temaId, err);
              topicCache[temaId] = null;
            }
          }

          const final = data
            .map((raw: any) => {
              const temaId = raw?.id_tema;
              const topicName = typeof temaId === 'number' && Number.isFinite(temaId)
                ? topicCache[temaId] ?? null
                : null;

              return mapInstrumentFromApi(raw, {
                name: topicName ?? undefined,
                subjectName: topicName ?? undefined,
              });
            })
            .filter((instrument: Instrument) => instrument.id);

          if (final.length > 0) {
            setInstruments(final);
          }
        }
      } catch (err) {
        console.error('Error loading instruments from API, keeping mock instruments.', err);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase]);

  // Load instrument types (all) on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const mapped = await fetchInstrumentTypesFromApi();
        if (!mounted) return;
        setInstrumentTypes(mapped);
      } catch (err) {
        console.error('Error loading instrument types', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchInstrumentTypesFromApi]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/dashboard/summary`);
        if (!res.ok) throw new Error(`Failed to fetch dashboard summary: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;

        const rawBreakdown = Array.isArray(data?.patientGenderDistribution)
          ? data.patientGenderDistribution
          : [];

        const breakdown: GenderDistributionSlice[] = rawBreakdown
          .map((item: any) => ({
            label: item?.gender ?? 'Sin especificar',
            count: Number(item?.count ?? 0),
            percentage: Number(item?.percentage ?? 0),
          }))
          .filter((slice: GenderDistributionSlice) => Number.isFinite(slice.count));

        const totals = data?.totals ?? {};
        const parsedPatients = Number.isFinite(Number(totals.patients)) ? Number(totals.patients) : undefined;
        const parsedUsers = Number.isFinite(Number(totals.users)) ? Number(totals.users) : undefined;
        const parsedInstruments = Number.isFinite(Number(totals.instruments)) ? Number(totals.instruments) : undefined;
        const rawProgramDistribution = Array.isArray(data?.patientsByProgram) ? data.patientsByProgram : [];
        const patientsByProgram: PatientsByProgramSlice[] = rawProgramDistribution
          .map((item: any) => ({
            programId: typeof item?.programId === 'number' ? item.programId : null,
            name: item?.programName ?? item?.name ?? (typeof item?.programId === 'number' ? `Programa ${item.programId}` : 'Sin programa'),
            count: Number(item?.count ?? 0),
          }))
          .filter((entry: PatientsByProgramSlice) => Number.isFinite(entry.count));

        const sums = breakdown.reduce<Record<'male' | 'female' | 'other', number>>(
          (acc, slice) => {
            const normalized = normalizeGenderValue(slice.label);
            acc[normalized] += slice.count;
            return acc;
          },
          { male: 0, female: 0, other: 0 }
        );

        const withPercentages = (list: GenderDistributionSlice[]): GenderDistributionSlice[] => {
          const total = list.reduce((acc, item) => acc + item.count, 0);
          if (total === 0) {
            return list.map(item => ({ ...item, percentage: 0 }));
          }
          return list.map(item => ({
            ...item,
            percentage: Number(((item.count / total) * 100).toFixed(2)),
          }));
        };

        const fallbackBreakdown = withPercentages([
          { label: 'Masculino', count: sums.male, percentage: 0 },
          { label: 'Femenino', count: sums.female, percentage: 0 },
          { label: 'Sin especificar', count: sums.other, percentage: 0 },
        ]);

        const finalBreakdown = breakdown.length ? breakdown : fallbackBreakdown;
        const maleCount = sums.male;
        const femaleCount = sums.female;
        const otherCount = sums.other;

        setDashboardStats(prev => ({
          ...prev,
          totalPatients: typeof parsedPatients === 'number' && !Number.isNaN(parsedPatients) ? parsedPatients : prev.totalPatients,
          totalUsers: typeof parsedUsers === 'number' && !Number.isNaN(parsedUsers) ? parsedUsers : prev.totalUsers,
          totalInstruments: typeof parsedInstruments === 'number' && !Number.isNaN(parsedInstruments) ? parsedInstruments : prev.totalInstruments,
          genderDistribution: {
            male: maleCount,
            female: femaleCount,
            other: otherCount,
            breakdown: finalBreakdown.length ? finalBreakdown : prev.genderDistribution.breakdown,
          },
          patientsByProgram: patientsByProgram.length ? patientsByProgram : prev.patientsByProgram,
          lastUpdated: new Date().toISOString(),
        }));
      } catch (err) {
        console.error('Error loading dashboard summary, keeping cached stats.', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiBase]);

  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const normalizedCedula = typeof patientData.cedula === 'string' ? patientData.cedula.trim() : '';

    const payload = {
      nombres: patientData.firstName,
      apellidos: patientData.lastName,
      contacto_correo: patientData.email,
      fecha_nacimiento: patientData.dateOfBirth?.toISOString?.() ?? null,
      genero: patientData.gender,
      telefono: patientData.phone,
      direccion: patientData.address,
      id_programa: patientData.programId ? Number(patientData.programId) : null,
      activo: patientData.isActive ? 1 : 0,
      user_role: 'patient',
      cedula: normalizedCedula.length ? normalizedCedula : null,
    };

    const response = await fetch(`${apiBase}/patient`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = errorBody?.message ?? errorBody?.error ?? `No se pudo crear el paciente (status ${response.status})`;
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }

    const created = await response.json();
    const mapped = mapPacienteToPatient(created);
    setPatients(prev => [...prev, mapped]);
    return mapped;
  }, [apiBase, token]);

  const updatePatient = useCallback(async (id: string, patientData: Partial<Patient>) => {
    const payload: Record<string, unknown> = {};
    if (patientData.firstName) payload.nombres = patientData.firstName;
    if (patientData.lastName) payload.apellidos = patientData.lastName;
    if (patientData.email) payload.contacto_correo = patientData.email;
    if (patientData.dateOfBirth) {
      const date = patientData.dateOfBirth instanceof Date ? patientData.dateOfBirth : new Date(patientData.dateOfBirth);
      if (!Number.isNaN(date.getTime())) {
        payload.fecha_nacimiento = date.toISOString();
      }
    }
    if (patientData.gender) payload.genero = patientData.gender;
    if (patientData.phone) payload.telefono = patientData.phone;
    if (patientData.address) payload.direccion = patientData.address;
    if (typeof patientData.isActive !== 'undefined') payload.activo = patientData.isActive ? 1 : 0;
    if (Object.prototype.hasOwnProperty.call(patientData, 'programId')) {
      const programValue = patientData.programId;
      if (programValue === null) {
        payload.id_programa = null;
      } else if (typeof programValue !== 'undefined') {
        const maybeNum = Number(programValue);
        payload.id_programa = Number.isNaN(maybeNum) ? programValue : maybeNum;
      }
    }
    if (Object.prototype.hasOwnProperty.call(patientData, 'ribbonId')) {
      const rawRibbonId = patientData.ribbonId;
      if (rawRibbonId === null) {
        payload.id_cinta = null;
      } else if (typeof rawRibbonId !== 'undefined') {
        const numericRibbon = typeof rawRibbonId === 'number'
          ? rawRibbonId
          : Number(String(rawRibbonId).trim());

        if (!Number.isFinite(numericRibbon)) {
          throw new Error('El identificador de la cinta es inválido');
        }

        payload.id_cinta = Math.trunc(numericRibbon);
      }
    }
    if (Object.prototype.hasOwnProperty.call(patientData, 'cedula')) {
      const rawCedula = patientData.cedula;
      if (rawCedula === null) {
        payload.cedula = null;
      } else if (typeof rawCedula !== 'undefined') {
        const normalized = String(rawCedula).trim();
        payload.cedula = normalized.length ? normalized : null;
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${apiBase}/patient/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const message = errorBody?.message ?? errorBody?.error ?? `No se pudo actualizar el paciente (status ${res.status})`;
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }

    const updated = await res.json();
    setPatients(prev => prev.map(p => (p.id === id ? mapPacienteToPatient(updated) : p)));
  }, [apiBase, token]);

  const assignProgramToPatient = useCallback(async (id: string, programId: string | null) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${apiBase}/patient/${id}/program`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ programId }),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const message = errorBody?.message ?? errorBody?.error ?? `No se pudo asignar el programa (status ${res.status})`;
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }

    const updated = await res.json();
    setPatients(prev => prev.map(p => (p.id === id ? mapPacienteToPatient(updated) : p)));
  }, [apiBase, token]);

  const deletePatient = useCallback(async (id: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${apiBase}/patient/${id}`, { method: 'DELETE', headers });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const message = errorBody?.message ?? errorBody?.error ?? `No se pudo eliminar el paciente (status ${res.status})`;
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }

    setPatients(prev => prev.filter(p => p.id !== id));
  }, [apiBase, token]);

  const addInstrument = useCallback(async (instrumentData: Omit<Instrument, 'id' | 'createdAt'>): Promise<Instrument> => {
    const normalizeNumber = (value: unknown): number | null => {
      if (value === null || typeof value === 'undefined' || value === '') return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const normalizeString = (value: unknown): string | null => {
      if (value === null || typeof value === 'undefined') return null;
      const trimmed = String(value).trim();
      return trimmed.length ? trimmed : null;
    };

    const payload = {
      id_instrumento_tipo: normalizeNumber(instrumentData.instrumentTypeId),
      id_tema: normalizeNumber(instrumentData.subjectId),
      descripcion: normalizeString(instrumentData.description) ?? null,
      recurso: normalizeString(instrumentData.resource),
      activo: instrumentData.isActive ? 1 : 0,
      user_created: normalizeString(currentUserDisplayName),
      disponible: normalizeString(instrumentData.availability),
      resultados: instrumentData.resultDelivery ?? null,
      color_respuesta: instrumentData.colorResponse === 1 ? 1 : 0,
    };

    try {
      const response = await fetch(`${apiBase}/instruments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.message ?? errorBody?.error ?? `No se pudo crear el instrumento (status ${response.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const created = await response.json();

      const newInstrument: Instrument = {
        id: String(created?.id ?? Date.now()),
        name: instrumentData.name ?? created?.descripcion ?? created?.nombre ?? `Instrumento ${created?.id ?? ''}`,
        description: created?.descripcion ?? instrumentData.description ?? '',
        category: instrumentData.category ?? 'psychological',
        questions: Array.isArray(instrumentData.questions) ? instrumentData.questions : [],
        estimatedDuration: typeof instrumentData.estimatedDuration === 'number' ? instrumentData.estimatedDuration : 0,
        isActive: typeof created?.activo !== 'undefined' ? Boolean(created.activo) : instrumentData.isActive,
        createdAt: created?.created_at ? new Date(created.created_at) : new Date(),
        instrumentTypeId: created?.id_instrumento_tipo !== null && created?.id_instrumento_tipo !== undefined
          ? String(created.id_instrumento_tipo)
          : (instrumentData.instrumentTypeId ?? null),
        subjectId: created?.id_tema !== null && created?.id_tema !== undefined
          ? String(created.id_tema)
          : (instrumentData.subjectId ?? null),
        availability: created?.disponible ?? instrumentData.availability ?? null,
        resource: created?.recurso ?? instrumentData.resource ?? null,
        resultDelivery: (created?.resultados ?? created?.resultados_por ?? created?.resultadosPor ?? null) as 'sistema' | 'programado' | null,
        colorResponse: typeof created?.color_respuesta === 'number' ? (created.color_respuesta === 1 ? 1 : 0) : (instrumentData.colorResponse === 1 ? 1 : 0),
      };

      setInstruments(prev => [...prev, newInstrument]);
      return newInstrument;
    } catch (error) {
      console.error('Error al crear el instrumento', error);
      throw error instanceof Error ? error : new Error('Error desconocido al crear el instrumento');
    }
  }, [apiBase, currentUserDisplayName]);

  const updateInstrument = useCallback(async (id: string, instrumentData: Partial<Instrument>): Promise<Instrument | null> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      console.error('Identificador de instrumento inválido', id);
      throw new Error('Identificador de instrumento inválido');
    }

    const normalizeNumber = (value: unknown): number | null => {
      if (value === null || typeof value === 'undefined' || value === '') return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const normalizeString = (value: unknown): string | null => {
      if (value === null || typeof value === 'undefined') return null;
      const trimmed = String(value).trim();
      return trimmed.length ? trimmed : null;
    };

    const payload: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(instrumentData, 'instrumentTypeId')) {
      payload.id_instrumento_tipo = normalizeNumber(instrumentData.instrumentTypeId ?? null);
    }

    if (Object.prototype.hasOwnProperty.call(instrumentData, 'subjectId')) {
      payload.id_tema = normalizeNumber(instrumentData.subjectId ?? null);
    }

    if (Object.prototype.hasOwnProperty.call(instrumentData, 'description')) {
      payload.descripcion = normalizeString(instrumentData.description) ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(instrumentData, 'resource')) {
      payload.recurso = normalizeString(instrumentData.resource);
    }

    if (Object.prototype.hasOwnProperty.call(instrumentData, 'availability')) {
      payload.disponible = normalizeString(instrumentData.availability);
    }

    if (Object.prototype.hasOwnProperty.call(instrumentData, 'isActive')) {
      payload.activo = instrumentData.isActive ? 1 : 0;
    }

    if (Object.prototype.hasOwnProperty.call(instrumentData, 'resultDelivery')) {
      payload.resultados = instrumentData.resultDelivery ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(instrumentData, 'colorResponse')) {
      payload.color_respuesta = instrumentData.colorResponse === 1 ? 1 : 0;
    }

    if (!Object.keys(payload).length) {
      // Nothing to update
      return instruments.find(item => item.id === id) ?? null;
    }

    try {
      const response = await fetch(`${apiBase}/instruments/${numericId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.message ?? errorBody?.error ?? `No se pudo actualizar el instrumento (status ${response.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const updated = await response.json();

      const updatedFields: Partial<Instrument> = {};

      if (Object.prototype.hasOwnProperty.call(instrumentData, 'name') && typeof instrumentData.name !== 'undefined') {
        updatedFields.name = instrumentData.name as string;
      }

      if (Object.prototype.hasOwnProperty.call(updated, 'descripcion')) {
        updatedFields.description = updated.descripcion ?? instrumentData.description ?? '';
      }

      if (Object.prototype.hasOwnProperty.call(updated, 'id_instrumento_tipo')) {
        updatedFields.instrumentTypeId = updated.id_instrumento_tipo !== null && updated.id_instrumento_tipo !== undefined
          ? String(updated.id_instrumento_tipo)
          : null;
      }

      if (Object.prototype.hasOwnProperty.call(updated, 'id_tema')) {
        updatedFields.subjectId = updated.id_tema !== null && updated.id_tema !== undefined
          ? String(updated.id_tema)
          : null;
      }

      if (Object.prototype.hasOwnProperty.call(updated, 'recurso')) {
        updatedFields.resource = updated.recurso ?? instrumentData.resource ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(updated, 'disponible')) {
        updatedFields.availability = updated.disponible ?? instrumentData.availability ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(updated, 'activo')) {
        updatedFields.isActive = typeof updated.activo !== 'undefined' ? Boolean(updated.activo) : instrumentData.isActive;
      }

      if (Object.prototype.hasOwnProperty.call(updated, 'resultados')) {
        updatedFields.resultDelivery = (updated.resultados ?? updated.resultados_por ?? updated.resultadosPor ?? null) as 'sistema' | 'programado' | null;
      }

      if (Object.prototype.hasOwnProperty.call(updated, 'color_respuesta')) {
        updatedFields.colorResponse = typeof updated.color_respuesta === 'number' ? (updated.color_respuesta === 1 ? 1 : 0) : (instrumentData.colorResponse === 1 ? 1 : 0);
      }

      let mergedInstrument: Instrument | null = null;

      setInstruments(prev => prev.map(instrument => {
        if (instrument.id !== id) return instrument;
        mergedInstrument = { ...instrument, ...updatedFields };
        return mergedInstrument;
      }));

      return mergedInstrument;
    } catch (error) {
      console.error('Error al actualizar el instrumento', error);
      throw error instanceof Error ? error : new Error('Error desconocido al actualizar el instrumento');
    }
  }, [apiBase, instruments]);

  const deleteInstrument = useCallback(async (id: string): Promise<boolean> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setInstruments(prev => prev.filter(i => i.id !== id));
      return true;
    }

    try {
      const response = await fetch(`${apiBase}/instruments/${numericId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.message ?? errorBody?.error ?? `No se pudo eliminar el instrumento (status ${response.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      setInstruments(prev => prev.filter(i => i.id !== id));
      return true;
    } catch (error) {
      console.error('Error al eliminar el instrumento', error);
      throw error instanceof Error ? error : new Error('Error desconocido al eliminar el instrumento');
    }
  }, [apiBase]);

  const getInstrumentDetails = useCallback(async (id: string): Promise<Instrument | null> => {
    const numericId = Number(id);
    const fallback = instrumentsRef.current.find((instrument) => instrument.id === String(id)) ?? null;

    if (Number.isNaN(numericId)) {
      return fallback;
    }

    try {
      const instrumentRequest = fetch(`${apiBase}/instruments/${numericId}`);
      const questionsRequest = fetch(`${apiBase}/questions`).catch((error) => {
        console.error('Failed to fetch questions list', error);
        return null;
      });
      const topicsRequest = fetch(`${apiBase}/instruments/${numericId}/topics`).catch((error) => {
        console.error('Failed to fetch instrument topics list', error);
        return null;
      });

      const [instrumentResponse, questionsResponse, topicsResponse] = await Promise.all([
        instrumentRequest,
        questionsRequest,
        topicsRequest,
      ]);

      if (instrumentResponse.status === 404) {
        return fallback;
      }

      if (!instrumentResponse.ok) {
        const errorText = await instrumentResponse.text();
        throw new Error(errorText || `Failed to fetch instrument ${numericId} (status ${instrumentResponse.status})`);
      }

      const instrumentPayload = await instrumentResponse.json();

      let topicName: string | null = null;
      const subjectIdValue = instrumentPayload?.id_tema ?? instrumentPayload?.tema_id ?? null;
      if (subjectIdValue !== null && typeof subjectIdValue !== 'undefined') {
        try {
          const topicResponse = await fetch(`${apiBase}/topics/${subjectIdValue}`);
          if (topicResponse.ok) {
            const topicPayload = await topicResponse.json();
            topicName = topicPayload?.nombre ?? topicPayload?.name ?? null;
          }
        } catch (topicError) {
          console.error('Failed to retrieve topic for instrument', topicError);
        }
      }

      let questionList: Question[] = [];
      if (questionsResponse && questionsResponse.ok) {
        try {
          const questionsPayload = await questionsResponse.json();
          if (Array.isArray(questionsPayload)) {
            questionList = questionsPayload
              .filter((question: any) => Number(question?.id_instrumento ?? question?.instrumentId ?? question?.instrumento_id) === numericId)
              .map((question: any) => mapQuestionFromApi(question));
          }
        } catch (parseError) {
          console.error('Failed to parse questions payload', parseError);
        }
      }

      if (!questionList.length && fallback?.questions?.length) {
        questionList = fallback.questions.map((question) => ({ ...question }));
      }

      let topicsList: InstrumentTopic[] = [];
      if (topicsResponse && topicsResponse.ok) {
        try {
          const topicsPayload = await topicsResponse.json();
          if (Array.isArray(topicsPayload)) {
            topicsList = sortTopicsList(
              topicsPayload
                .map((topic: any) => mapInstrumentTopicFromApi(topic))
                .filter((topic: InstrumentTopic) => Boolean(topic.name)),
            );
          }
        } catch (topicsError) {
          console.error('Failed to parse instrument topics payload', topicsError);
        }
      } else if (topicsResponse && topicsResponse.status === 404) {
        topicsList = [];
      }

      if (!topicsList.length && fallback?.topics?.length) {
        topicsList = sortTopicsList(fallback.topics.map((topic) => ({ ...topic })));
      }

      if (questionList.length) {
        try {
          const answerResults = await Promise.all(
            questionList.map(async (question) => {
              if (Array.isArray(question.answers) && question.answers.length) {
                return { questionId: question.id, answers: [...question.answers] };
              }

              const numericQuestionId = Number(question.id);
              if (Number.isNaN(numericQuestionId)) {
                return { questionId: question.id, answers: question.answers ?? [] };
              }

              try {
                const response = await fetch(`${apiBase}/questions/${numericQuestionId}/answers`);
                if (!response.ok) {
                  console.error(`Failed to fetch answers for question ${question.id} (status ${response.status})`);
                  return { questionId: question.id, answers: question.answers ?? [] };
                }

                const payload = await response.json();
                if (!Array.isArray(payload)) {
                  return { questionId: question.id, answers: question.answers ?? [] };
                }

                const answers: QuestionAnswer[] = payload
                  .map((answer: any) => mapAnswerFromApi(answer))
                  .filter((answer: QuestionAnswer) => Boolean(answer.label));

                return { questionId: question.id, answers };
              } catch (answersError) {
                console.error(`Failed to retrieve answers for question ${question.id}`, answersError);
                return { questionId: question.id, answers: question.answers ?? [] };
              }
            }),
          );

          const answersById = new Map(answerResults.map((result) => [result.questionId, result.answers]));

          questionList = questionList.map((question) => {
            const answers = answersById.get(question.id) ?? question.answers ?? [];
            if (!answers.length) {
              return {
                ...question,
                answers: Array.isArray(question.answers) ? question.answers : [],
                options: question.options,
              };
            }

            const labels = answers.map((answer) => answer.label).filter((label) => label.length > 0);
            return {
              ...question,
              answers,
              options: labels.length ? labels : question.options,
            };
          });
        } catch (answersError) {
          console.error('Failed to enrich questions with answers', answersError);
        }
      }

      const mappedInstrument = mapInstrumentFromApi(instrumentPayload, {
        name: topicName ?? undefined,
        subjectName: topicName ?? undefined,
        questions: questionList,
        topics: topicsList,
      });

      setInstruments((prev) => {
        const existingInstrument = prev.find((instrument) => instrument.id === mappedInstrument.id);
        if (!existingInstrument) {
          return [...prev, mappedInstrument];
        }

        const hasChanges = JSON.stringify(existingInstrument) !== JSON.stringify(mappedInstrument);
        if (!hasChanges) {
          return prev;
        }

        return prev.map((instrument) => (instrument.id === mappedInstrument.id ? mappedInstrument : instrument));
      });

      return mappedInstrument;
    } catch (error) {
      console.error(`Failed to load instrument ${id}`, error);
      return fallback;
    }
  }, [apiBase]);

  const createQuestion = useCallback(async (instrumentId: string, input: QuestionInput): Promise<Question> => {
    const targetInstrument = instrumentsRef.current.find((instrument) => instrument.id === String(instrumentId)) ?? null;
    const normalizedOptions = questionTypeRequiresOptions(input.type)
      ? normalizeQuestionOptions(input.options ?? [])
      : [];
    const { normalized: normalizedTopicId, payload: topicPayloadValue } = normalizeTopicIdentifier(input.topicId ?? null);

    const nextOrder = typeof input.order === 'number' && Number.isFinite(input.order)
      ? input.order
      : (targetInstrument ? (targetInstrument.questions.length + 1) : 1);

    const buildQuestionFromInput = (idValue: string): Question => {
      const baseAnswers = normalizedOptions.length ? buildAnswersFromOptions(idValue, normalizedOptions) : [];

      return {
        id: idValue,
        text: input.text.trim(),
        type: input.type,
        order: nextOrder,
        required: typeof input.required === 'boolean' ? input.required : true,
        answers: baseAnswers,
        options: normalizedOptions.length ? normalizedOptions : undefined,
        topicId: normalizedTopicId,
      };
    };

    const numericInstrumentId = Number(instrumentId);

    if (Number.isNaN(numericInstrumentId)) {
      const mockQuestion = buildQuestionFromInput(Date.now().toString());
      if (targetInstrument) {
        setInstruments(prev => prev.map(inst => {
          if (inst.id !== targetInstrument.id) return inst;
          const updatedQuestions = sortQuestionsList([...inst.questions, mockQuestion]);
          return { ...inst, questions: updatedQuestions };
        }));
      }
      return mockQuestion;
    }

    const payload: Record<string, unknown> = {
      instrumentId: numericInstrumentId,
      name: input.text.trim(),
      responseType: input.type,
      order: nextOrder,
      isEnabled: typeof input.required === 'boolean' ? input.required : true,
    };

    if (typeof topicPayloadValue !== 'undefined') {
      payload.topicId = topicPayloadValue;
    }

    const createAnswersForQuestion = async (questionId: number, options: QuestionOption[]): Promise<QuestionAnswer[]> => {
      const createdAnswers: QuestionAnswer[] = [];
      for (const option of options) {
        const answerResponse = await fetch(`${apiBase}/questions/${questionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: option.label, value: option.value }),
        });

        if (!answerResponse.ok) {
          const text = await answerResponse.text();
          throw new Error(text || `No se pudo registrar la respuesta "${option.label}" (status ${answerResponse.status})`);
        }

        const payloadAnswer = await answerResponse.json();
        createdAnswers.push(mapAnswerFromApi(payloadAnswer));
      }

      return createdAnswers;
    };

    try {
      const response = await fetch(`${apiBase}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `No se pudo crear la pregunta (status ${response.status})`);
      }

      const data = await response.json();
      let createdQuestion = mapQuestionFromApi(data);

      if (!createdQuestion.topicId && normalizedTopicId) {
        createdQuestion = { ...createdQuestion, topicId: normalizedTopicId };
      }

      if (questionTypeRequiresOptions(createdQuestion.type) && normalizedOptions.length) {
        const numericQuestionId = Number(createdQuestion.id);
        if (!Number.isNaN(numericQuestionId)) {
          const createdAnswers = await createAnswersForQuestion(numericQuestionId, normalizedOptions);
          const optionPairs = normalizeQuestionOptions(
            createdAnswers.map((answer) => ({
              label: typeof answer.label === 'string' ? answer.label : '',
              value: typeof answer.value === 'string' && answer.value ? answer.value : (answer.label ?? ''),
            })),
          );
          createdQuestion = {
            ...createdQuestion,
            answers: createdAnswers,
            options: optionPairs.length ? optionPairs : undefined,
          };
        } else {
          const fallbackAnswers = buildAnswersFromOptions(createdQuestion.id, normalizedOptions);
          const optionPairs = normalizedOptions;
          createdQuestion = {
            ...createdQuestion,
            answers: fallbackAnswers,
            options: optionPairs.length ? optionPairs : undefined,
          };
        }
      }

      if (targetInstrument) {
        setInstruments(prev => prev.map(inst => {
          if (inst.id !== targetInstrument.id) return inst;
          const updatedQuestions = sortQuestionsList([...inst.questions, createdQuestion]);
          return { ...inst, questions: updatedQuestions };
        }));
      }

      return createdQuestion;
    } catch (error) {
      console.error(`Failed to create question for instrument ${instrumentId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al crear la pregunta');
    }
  }, [apiBase]);

  const updateQuestion = useCallback(async (instrumentId: string, questionId: string, input: QuestionInput): Promise<Question> => {
    const targetInstrument = instrumentsRef.current.find((instrument) => instrument.id === String(instrumentId)) ?? null;
    const numericQuestionId = Number(questionId);
    const existingQuestion = targetInstrument?.questions.find((question) => question.id === String(questionId)) ?? null;

    const sanitizedOptions = questionTypeRequiresOptions(input.type)
      ? normalizeQuestionOptions(input.options ?? [])
      : [];
    const topicChangeProvided = Object.prototype.hasOwnProperty.call(input, 'topicId');
    const { normalized: normalizedTopicId, payload: topicPayloadValue } = normalizeTopicIdentifier(
      topicChangeProvided ? input.topicId ?? null : existingQuestion?.topicId ?? null,
    );

    const buildLocalQuestion = (): Question => {
      const answers = sanitizedOptions.length ? buildAnswersFromOptions(questionId, sanitizedOptions) : [];
      return {
        id: questionId,
        text: input.text.trim(),
        type: input.type,
        order: typeof input.order === 'number' && Number.isFinite(input.order)
          ? input.order
          : (existingQuestion?.order ?? 0),
        required: typeof input.required === 'boolean'
          ? input.required
          : (typeof existingQuestion?.required === 'boolean' ? existingQuestion.required : true),
        answers,
        options: sanitizedOptions.length ? sanitizedOptions : undefined,
        topicId: normalizedTopicId ?? null,
      };
    };

    const applyQuestionToState = (nextQuestion: Question) => {
      if (!targetInstrument) {
        return;
      }

      setInstruments(prev => prev.map(inst => {
        if (inst.id !== targetInstrument.id) {
          return inst;
        }

        const hasQuestion = inst.questions.some(question => question.id === nextQuestion.id);
        const updatedQuestions = hasQuestion
          ? inst.questions.map(question => (question.id === nextQuestion.id ? nextQuestion : question))
          : [...inst.questions, nextQuestion];

        return { ...inst, questions: sortQuestionsList(updatedQuestions) };
      }));
    };

    if (Number.isNaN(numericQuestionId)) {
      const localQuestion = buildLocalQuestion();
      applyQuestionToState(localQuestion);
      return localQuestion;
    }

    const payload: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(input, 'text')) {
      payload.name = input.text.trim();
    }

    if (Object.prototype.hasOwnProperty.call(input, 'type')) {
      payload.responseType = input.type;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'order')) {
      payload.order = typeof input.order === 'number' && Number.isFinite(input.order) ? input.order : null;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'required')) {
      payload.isEnabled = typeof input.required === 'boolean' ? input.required : undefined;
    }

    if (topicChangeProvided) {
      payload.topicId = normalizedTopicId === null ? null : topicPayloadValue;
    }

    const syncAnswersForQuestion = async (desiredOptions: QuestionOption[]): Promise<QuestionAnswer[]> => {
      const listResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers`);
      if (!listResponse.ok) {
        const text = await listResponse.text();
        throw new Error(text || `No se pudieron obtener las respuestas de la pregunta ${numericQuestionId} (status ${listResponse.status})`);
      }

      const listPayload = await listResponse.json().catch(() => []);
      const existingAnswers = Array.isArray(listPayload)
        ? listPayload
            .map((answer: any) => mapAnswerFromApi(answer))
            .filter((answer: QuestionAnswer) => Boolean(answer.label))
        : [];

      if (!desiredOptions.length) {
        if (existingAnswers.length) {
          await Promise.all(existingAnswers.map(async (answer) => {
            const answerId = Number(answer.id);
            if (Number.isNaN(answerId)) {
              return;
            }
            const deleteResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers/${answerId}`, {
              method: 'DELETE',
            });
            if (!deleteResponse.ok) {
              const text = await deleteResponse.text();
              throw new Error(text || `No se pudo eliminar la respuesta ${answerId} (status ${deleteResponse.status})`);
            }
          }));
        }
        return [];
      }

      const remainingAnswers = [...existingAnswers];
      const nextAnswers: QuestionAnswer[] = [];

      for (const option of desiredOptions) {
        const targetLabel = option.label;
        const targetValue = option.value;
        const labelKey = targetLabel.toLocaleLowerCase('es');
        const valueKey = targetValue.toLocaleLowerCase('es');

        let matchIndex = remainingAnswers.findIndex((answer) => (answer.value ?? '').toLocaleLowerCase('es') === valueKey);
        if (matchIndex < 0) {
          matchIndex = remainingAnswers.findIndex((answer) => (answer.label ?? '').toLocaleLowerCase('es') === labelKey);
        }

        if (matchIndex >= 0) {
          const [matchedAnswer] = remainingAnswers.splice(matchIndex, 1);
          const trimmedOriginal = (matchedAnswer.label ?? '').trim();
          const trimmedOriginalValue = typeof matchedAnswer.value === 'string' ? matchedAnswer.value.trim() : '';
          const answerId = Number(matchedAnswer.id);
          const needsUpdate = trimmedOriginal !== targetLabel || trimmedOriginalValue !== targetValue;

          if (!Number.isNaN(answerId) && needsUpdate) {
            const patchResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers/${answerId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: targetLabel, value: targetValue }),
            });

            if (!patchResponse.ok) {
              const text = await patchResponse.text();
              throw new Error(text || `No se pudo actualizar la respuesta ${answerId} (status ${patchResponse.status})`);
            }

            const updatedPayload = await patchResponse.json();
            nextAnswers.push(mapAnswerFromApi(updatedPayload));
            continue;
          }

          nextAnswers.push({ ...matchedAnswer, label: targetLabel, value: targetValue });
          continue;
        }

        if (remainingAnswers.length) {
          const candidate = remainingAnswers.shift()!;
          const answerId = Number(candidate.id);
          if (!Number.isNaN(answerId)) {
            const patchResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers/${answerId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: targetLabel, value: targetValue }),
            });

            if (!patchResponse.ok) {
              const text = await patchResponse.text();
              throw new Error(text || `No se pudo actualizar la respuesta ${answerId} (status ${patchResponse.status})`);
            }

            const updatedPayload = await patchResponse.json();
            nextAnswers.push(mapAnswerFromApi(updatedPayload));
            continue;
          }
        }

        const createResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: targetLabel, value: targetValue }),
        });

        if (!createResponse.ok) {
          const text = await createResponse.text();
          throw new Error(text || `No se pudo registrar la respuesta "${targetLabel}" (status ${createResponse.status})`);
        }

        const createdPayload = await createResponse.json();
        nextAnswers.push(mapAnswerFromApi(createdPayload));
      }

      if (remainingAnswers.length) {
        for (const answer of remainingAnswers) {
          const answerId = Number(answer.id);
          if (Number.isNaN(answerId)) {
            continue;
          }
          const deleteResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers/${answerId}`, {
            method: 'DELETE',
          });
          if (!deleteResponse.ok) {
            const text = await deleteResponse.text();
            throw new Error(text || `No se pudo eliminar la respuesta ${answerId} (status ${deleteResponse.status})`);
          }
        }
      }

      return nextAnswers;
    };

    try {
      const response = await fetch(`${apiBase}/questions/${numericQuestionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `No se pudo actualizar la pregunta (status ${response.status})`);
      }

      const data = await response.json();
      const normalizedQuestion = mapQuestionFromApi(data);

      const desiredOptions = questionTypeRequiresOptions(normalizedQuestion.type) ? sanitizedOptions : [];
      const updatedAnswers = await syncAnswersForQuestion(desiredOptions);
      const optionPairs = normalizeQuestionOptions(
        updatedAnswers.map((answer) => ({
          label: typeof answer.label === 'string' ? answer.label : '',
          value: typeof answer.value === 'string' && answer.value ? answer.value : (answer.label ?? ''),
        })),
      );

      const resolvedTopicId = topicChangeProvided
        ? normalizedTopicId
        : (normalizedQuestion.topicId ?? normalizedTopicId);

      const nextQuestion: Question = {
        ...normalizedQuestion,
        answers: updatedAnswers,
        options: optionPairs.length ? optionPairs : undefined,
        topicId: resolvedTopicId ?? null,
      };

      applyQuestionToState(nextQuestion);
      return nextQuestion;
    } catch (error) {
      console.error(`Failed to update question ${questionId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al actualizar la pregunta');
    }
  }, [apiBase]);

  const deleteQuestion = useCallback(async (instrumentId: string, questionId: string): Promise<boolean> => {
    const targetInstrument = instrumentsRef.current.find((instrument) => instrument.id === String(instrumentId)) ?? null;
    const numericQuestionId = Number(questionId);

    const removeLocally = () => {
      if (targetInstrument) {
        setInstruments(prev => prev.map(inst => {
          if (inst.id !== targetInstrument.id) return inst;
          return {
            ...inst,
            questions: inst.questions.filter(question => question.id !== questionId),
          };
        }));
      }
    };

    if (Number.isNaN(numericQuestionId)) {
      removeLocally();
      return true;
    }

    try {
      const answersResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers`);
      if (!answersResponse.ok) {
        const text = await answersResponse.text();
        throw new Error(text || `No se pudieron obtener las respuestas de la pregunta ${numericQuestionId} (status ${answersResponse.status})`);
      }

      const answersPayload = await answersResponse.json().catch(() => []);
      if (Array.isArray(answersPayload) && answersPayload.length) {
        for (const rawAnswer of answersPayload) {
          const answerIdValue = rawAnswer?.id ?? rawAnswer?.answerId ?? rawAnswer?.id_respuesta ?? rawAnswer?.respuesta_id;
          const answerId = Number(answerIdValue);
          if (Number.isNaN(answerId)) {
            continue;
          }

          const deleteAnswerResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers/${answerId}`, {
            method: 'DELETE',
          });

          if (!deleteAnswerResponse.ok) {
            const text = await deleteAnswerResponse.text();
            throw new Error(text || `No se pudo eliminar la respuesta ${answerId} (status ${deleteAnswerResponse.status})`);
          }
        }
      }

      const response = await fetch(`${apiBase}/questions/${numericQuestionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `No se pudo eliminar la pregunta (status ${response.status})`);
      }

      removeLocally();
      return true;
    } catch (error) {
      console.error(`Failed to delete question ${questionId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al eliminar la pregunta');
    }
  }, [apiBase]);

  const assignInstrumentToPatients = useCallback(async (instrumentTypeId: string, patientIds: string[]): Promise<void> => {
    const numericInstrumentTypeId = Number(instrumentTypeId);
    if (Number.isNaN(numericInstrumentTypeId)) {
      throw new Error('El tipo de instrumento es inválido.');
    }

    const uniquePatientIds = Array.from(
      new Set(
        patientIds
          .map((value) => (value ?? '').toString().trim())
          .filter((value) => value.length > 0),
      ),
    );

    if (!uniquePatientIds.length) {
      throw new Error('Selecciona al menos un paciente.');
    }

    const errors: string[] = [];

    for (const patientId of uniquePatientIds) {
      const numericPatientId = Number(patientId);
      if (Number.isNaN(numericPatientId)) {
        errors.push(`Paciente inválido (${patientId}).`);
        continue;
      }

      try {
        const res = await fetch(`${apiBase}/patient-instruments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_paciente: numericPatientId,
            id_instrumento_tipo: numericInstrumentTypeId,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => null);
          errors.push(text || `No se pudo asignar el instrumento al paciente ${patientId} (status ${res.status}).`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido al asignar el instrumento';
        errors.push(`${patientId}: ${message}`);
      }
    }

    if (errors.length) {
      throw new Error(errors.join(' | '));
    }
  }, [apiBase]);

  const getInstrumentTopics = useCallback(async (instrumentId: string): Promise<InstrumentTopic[]> => {
    const numericInstrumentId = Number(instrumentId);
    const resolvedInstrumentId = Number.isNaN(numericInstrumentId)
      ? String(instrumentId)
      : String(numericInstrumentId);

    if (Number.isNaN(numericInstrumentId)) {
      const fallback = instrumentsRef.current.find((instrument) => instrument.id === resolvedInstrumentId);
      return sortTopicsList(fallback?.topics ?? []);
    }

    try {
      const response = await fetch(`${apiBase}/instruments/${numericInstrumentId}/topics`);
      if (response.status === 404) {
        setInstruments(prev => prev.map(inst => (
          inst.id === resolvedInstrumentId ? { ...inst, topics: [] } : inst
        )));
        return [];
      }

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || `No se pudieron obtener los tópicos (status ${response.status})`);
      }

      const payload = await response.json();
      const topics = Array.isArray(payload)
        ? sortTopicsList(payload.map((topic: any) => mapInstrumentTopicFromApi(topic)))
        : [];

      setInstruments(prev => prev.map(inst => (
        inst.id === resolvedInstrumentId ? { ...inst, topics } : inst
      )));

      return topics;
    } catch (error) {
      console.error(`Failed to load topics for instrument ${instrumentId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al obtener los tópicos del instrumento');
    }
  }, [apiBase]);

  const createInstrumentTopic = useCallback(async (instrumentId: string, input: InstrumentTopicInput): Promise<InstrumentTopic> => {
    const payload = buildInstrumentTopicPayload(input);
    const numericInstrumentId = Number(instrumentId);
    const resolvedInstrumentId = Number.isNaN(numericInstrumentId)
      ? String(instrumentId)
      : String(numericInstrumentId);

    const applyInsert = (topic: InstrumentTopic) => {
      setInstruments(prev => prev.map(inst => {
        if (inst.id !== resolvedInstrumentId) {
          return inst;
        }
        const previous = Array.isArray(inst.topics) ? inst.topics : [];
        const nextTopics = sortTopicsList([
          ...previous.filter(existing => existing.id !== topic.id),
          topic,
        ]);
        return { ...inst, topics: nextTopics };
      }));
    };

    if (Number.isNaN(numericInstrumentId)) {
      const now = new Date();
      const topic: InstrumentTopic = {
        id: `temp-topic-${Date.now()}`,
        instrumentId: resolvedInstrumentId,
        name: String(payload.nombre ?? input.name ?? '').trim() || `Tópico ${Date.now()}`,
        createdBy: typeof payload.user_created === 'string' ? payload.user_created : input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
        isVisible: typeof payload.show === 'boolean' ? payload.show : null,
      };
      applyInsert(topic);
      return topic;
    }

    try {
      const response = await fetch(`${apiBase}/instruments/${numericInstrumentId}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || `No se pudo crear el tópico (status ${response.status})`);
      }

      const data = await response.json();
      const topic = mapInstrumentTopicFromApi(data);
      applyInsert(topic);
      return topic;
    } catch (error) {
      console.error(`Failed to create topic for instrument ${instrumentId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al crear el tópico');
    }
  }, [apiBase]);

  const updateInstrumentTopic = useCallback(async (
    instrumentId: string,
    topicId: string,
    input: InstrumentTopicInput,
  ): Promise<InstrumentTopic> => {
    const payload = buildInstrumentTopicPayload(input);
    const numericInstrumentId = Number(instrumentId);
    const numericTopicId = Number(topicId);
    const resolvedInstrumentId = Number.isNaN(numericInstrumentId)
      ? String(instrumentId)
      : String(numericInstrumentId);
    const resolvedTopicId = Number.isNaN(numericTopicId)
      ? String(topicId)
      : String(numericTopicId);

    const applyUpdate = (topic: InstrumentTopic) => {
      setInstruments(prev => prev.map(inst => {
        if (inst.id !== resolvedInstrumentId) {
          return inst;
        }
        const previous = Array.isArray(inst.topics) ? inst.topics : [];
        const nextTopics = sortTopicsList([
          ...previous.filter(existing => existing.id !== topic.id),
          topic,
        ]);
        return { ...inst, topics: nextTopics };
      }));
    };

    if (Number.isNaN(numericInstrumentId) || Number.isNaN(numericTopicId)) {
      const now = new Date();
      const topic: InstrumentTopic = {
        id: resolvedTopicId,
        instrumentId: resolvedInstrumentId,
        name: String(payload.nombre ?? input.name ?? '').trim() || resolvedTopicId,
        createdBy: typeof payload.user_created === 'string' ? payload.user_created : input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
        isVisible: typeof payload.show === 'boolean' ? payload.show : null,
      };
      applyUpdate(topic);
      return topic;
    }

    try {
      const response = await fetch(`${apiBase}/instruments/${numericInstrumentId}/topics/${numericTopicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || `No se pudo actualizar el tópico (status ${response.status})`);
      }

      const data = await response.json();
      const topic = mapInstrumentTopicFromApi(data);
      applyUpdate(topic);
      return topic;
    } catch (error) {
      console.error(`Failed to update topic ${topicId} for instrument ${instrumentId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al actualizar el tópico');
    }
  }, [apiBase]);

  const deleteInstrumentTopic = useCallback(async (instrumentId: string, topicId: string): Promise<boolean> => {
    const numericInstrumentId = Number(instrumentId);
    const numericTopicId = Number(topicId);
    const resolvedInstrumentId = Number.isNaN(numericInstrumentId)
      ? String(instrumentId)
      : String(numericInstrumentId);
    const resolvedTopicId = Number.isNaN(numericTopicId)
      ? String(topicId)
      : String(numericTopicId);

    const applyRemoval = () => {
      setInstruments(prev => prev.map(inst => {
        if (inst.id !== resolvedInstrumentId) {
          return inst;
        }
        const previous = Array.isArray(inst.topics) ? inst.topics : [];
        const nextTopics = previous.filter(topic => topic.id !== resolvedTopicId);
        return { ...inst, topics: nextTopics };
      }));
    };

    if (Number.isNaN(numericInstrumentId) || Number.isNaN(numericTopicId)) {
      applyRemoval();
      return true;
    }

    try {
      const response = await fetch(`${apiBase}/instruments/${numericInstrumentId}/topics/${numericTopicId}`, {
        method: 'DELETE',
      });

      if (response.status === 404) {
        applyRemoval();
        return true;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || `No se pudo eliminar el tópico (status ${response.status})`);
      }

      applyRemoval();
      return true;
    } catch (error) {
      console.error(`Failed to delete topic ${topicId} for instrument ${instrumentId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al eliminar el tópico');
    }
  }, [apiBase]);

  const addAssignment = (assignmentData: Omit<Assignment, 'id' | 'assignedAt'>) => {
    const newAssignment: Assignment = {
      ...assignmentData,
      id: Date.now().toString(),
      assignedAt: new Date(),
    };
    setAssignments(prev => [...prev, newAssignment]);
  };

  const updateAssignment = (id: string, assignmentData: Partial<Assignment>) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...assignmentData } : a));
  };

  const reloadRibbons = useCallback(async (): Promise<void> => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${apiBase}/patients/ribbon`, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(text || `No se pudieron obtener las cintas (status ${res.status})`);
    }

    const data = await res.json();
    const mapped = Array.isArray(data) ? data.map(mapRibbonFromApi) : [];
    setRibbons(sortRibbonsList(mapped));
  }, [apiBase, token]);

  const addRibbon = useCallback(async (input: RibbonInput): Promise<Ribbon> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const preparedInput: RibbonInput = { ...input };
    if (!preparedInput.userCreated && currentUserDisplayName) {
      preparedInput.userCreated = currentUserDisplayName;
    }

    const payload = buildRibbonPayload(preparedInput);
    const res = await fetch(`${apiBase}/patients/ribbon`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(text || `No se pudo crear la cinta (status ${res.status})`);
    }

    const data = await res.json();
    const mapped = mapRibbonFromApi(data);
    setRibbons(prev => sortRibbonsList([...prev, mapped]));
    return mapped;
  }, [apiBase, token, currentUserDisplayName]);

  const updateRibbon = useCallback(async (id: number, input: RibbonInput): Promise<Ribbon> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const payload = buildRibbonPayload(input);
    const res = await fetch(`${apiBase}/patients/ribbon/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(text || `No se pudo actualizar la cinta (status ${res.status})`);
    }

    const data = await res.json();
    const mapped = mapRibbonFromApi(data);
    setRibbons(prev => sortRibbonsList(prev.map(ribbon => (ribbon.id === mapped.id ? mapped : ribbon))));
    return mapped;
  }, [apiBase, token]);

  const deleteRibbon = useCallback(async (id: number): Promise<boolean> => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${apiBase}/patients/ribbon/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(text || `No se pudo eliminar la cinta (status ${res.status})`);
    }

    setRibbons(prev => prev.filter(ribbon => ribbon.id !== id));
    return true;
  }, [apiBase, token]);

  const addProgram = useCallback(async (programData: ProgramInput): Promise<Program> => {
    const payload = {
      nombre: programData.name?.trim?.() ?? programData.name,
      descripcion: programData.description?.trim?.() ?? programData.description,
      user_created: currentUserDisplayName,
    };

    try {
      const res = await fetch(`${apiBase}/programs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Request failed with status ${res.status}`);
      }

      const response = await res.json();
      const createdAt = response.created_at ? new Date(response.created_at) : new Date();
      const updatedAt = response.updated_at ? new Date(response.updated_at) : (response.updatedAt ? new Date(response.updatedAt) : createdAt);
      const created: Program = {
        id: String(response.id ?? Date.now()),
        name: response.nombre ?? response.name ?? programData.name,
        description: response.descripcion ?? response.description ?? programData.description,
        instruments: Array.isArray(programData.instruments) ? [...programData.instruments] : [],
        isActive: typeof programData.isActive === 'boolean' ? programData.isActive : true,
        createdAt,
        updatedAt,
        createdBy: response.user_created ?? response.userCreated ?? currentUserDisplayName,
      };

      setPrograms(prev => [...prev, created]);
      return created;
    } catch (error) {
      console.error('Failed to create program', error);
      throw error instanceof Error ? error : new Error('Unknown error creating program');
    }
  }, [apiBase, currentUserDisplayName]);

  const updateProgram = useCallback(async (id: string, programData: Partial<ProgramInput>): Promise<Program | null> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      let normalized: Program | null = null;
      setPrograms(prev => prev.map(p => {
        if (p.id !== id) return p;
        normalized = {
          ...p,
          name: programData.name ?? p.name,
          description: programData.description ?? p.description,
          instruments: Array.isArray(programData.instruments) ? [...programData.instruments] : p.instruments,
          isActive: typeof programData.isActive === 'boolean' ? programData.isActive : p.isActive,
        };
        return normalized;
      }));
      return normalized;
    }

    const payload = {
      nombre: programData.name?.trim?.(),
      descripcion: programData.description?.trim?.(),
    };

    try {
      const res = await fetch(`${apiBase}/programs/${numericId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Update failed with status ${res.status}`);
      }

      const response = await res.json();

      let normalized: Program | null = null;
      setPrograms(prev => prev.map(p => {
  if (p.id !== id) return p;

        const createdAt = response.created_at ? new Date(response.created_at) : p.createdAt;
        const updatedAt = response.updated_at ? new Date(response.updated_at) : (response.updatedAt ? new Date(response.updatedAt) : p.updatedAt ?? createdAt);

        normalized = {
          ...p,
          name: response.nombre ?? response.name ?? programData.name ?? p.name,
          description: response.descripcion ?? response.description ?? programData.description ?? p.description,
          instruments: Array.isArray(programData.instruments) ? [...programData.instruments] : p.instruments,
          isActive: typeof programData.isActive === 'boolean' ? programData.isActive : p.isActive,
          createdAt,
          updatedAt,
          createdBy: response.user_created ?? response.userCreated ?? p.createdBy ?? currentUserDisplayName ?? null,
        };

        return normalized;
      }));

      return normalized;
    } catch (error) {
      console.error(`Failed to update program ${id}`, error);
      throw error instanceof Error ? error : new Error('Unknown error updating program');
    }
  }, [apiBase, currentUserDisplayName]);

  const deleteProgram = useCallback(async (id: string): Promise<boolean> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setPrograms(prev => prev.filter(p => p.id !== id));
      return true;
    }
    try {
      const res = await fetch(`${apiBase}/programs/${numericId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Delete failed with status ${res.status}`);
      }

      const body = await res.json().catch(() => null);
      const wasDeleted = Boolean(body?.deleted ?? true);
      if (wasDeleted) {
        const removedId = body?.id ?? numericId;
        setPrograms(prev => prev.filter(p => p.id !== String(removedId)));
      }
      return wasDeleted;
    } catch (error) {
      console.error(`Failed to delete program ${id}`, error);
      throw error instanceof Error ? error : new Error('Unknown error deleting program');
    }
  }, [apiBase]);

  const getProgramDetails = useCallback(async (id: string): Promise<ProgramDetails | null> => {
    const numericId = Number(id);

    if (Number.isNaN(numericId)) {
      const program = programs.find(p => p.id === id);
      if (!program) {
        return null;
      }
      return {
        ...program,
        activities: [],
      };
    }

    try {
      const res = await fetch(`${apiBase}/programs/${numericId}`);
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to fetch program details: ${res.status}`);
      }
      const data = await res.json();
      return mapProgramDetailsFromApi(data, currentUserDisplayName);
    } catch (error) {
      console.error(`Failed to load program ${id}`, error);
      return null;
    }
  }, [apiBase, currentUserDisplayName, programs]);

  const addProgramActivity = useCallback(async (programId: string, activity: ProgramActivityInput): Promise<ProgramActivity> => {
    const normalizedName = activity.name?.trim?.() ?? activity.name;
    if (!normalizedName) {
      throw new Error('El nombre de la actividad es obligatorio');
    }

    const normalizedDay = normalizeDayCode(activity.day);
    if (!normalizedDay) {
      throw new Error('El día de la actividad es obligatorio');
    }

    const numericId = Number(programId);
    if (Number.isNaN(numericId)) {
      const mockActivity: ProgramActivity = {
        id: Date.now().toString(),
        name: normalizedName,
        description: activity.description?.trim?.() ?? activity.description ?? null,
        day: normalizedDay,
        time: activity.time?.trim?.() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: currentUserDisplayName ?? null,
      };
      return mockActivity;
    }

    const payload = {
      nombre: normalizedName,
      descripcion: activity.description?.trim?.() ?? activity.description ?? null,
      dia: normalizedDay,
      hora: activity.time?.trim?.() || null,
      user_created: currentUserDisplayName,
    };

    try {
      const res = await fetch(`${apiBase}/programs/${numericId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to create activity: ${res.status}`);
      }

      const data = await res.json();
      return mapProgramActivityFromApi(data);
    } catch (error) {
      console.error(`Failed to create activity for program ${programId}`, error);
      throw error instanceof Error ? error : new Error('Unknown error creating activity');
    }
  }, [apiBase, currentUserDisplayName]);

  const updateProgramActivity = useCallback(async (
    programId: string,
    activityId: string,
    updates: ProgramActivityUpdateInput,
  ): Promise<ProgramActivity> => {
    const numericProgramId = Number(programId);
    const numericActivityId = Number(activityId);

    const payload: Record<string, any> = {};

    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      const trimmedName = updates.name?.trim?.() ?? updates.name;
      if (!trimmedName) {
        throw new Error('El nombre de la actividad es obligatorio');
      }
      payload.nombre = trimmedName;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
      payload.descripcion = updates.description?.trim?.() ?? updates.description ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'day')) {
      if (!updates.day) {
        payload.dia = null;
      } else {
        const normalizedDay = normalizeDayCode(updates.day);
        if (!normalizedDay) {
          throw new Error('El día de la actividad es inválido');
        }
        payload.dia = normalizedDay;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'time')) {
      const trimmedTime = updates.time?.trim?.() ?? updates.time ?? '';
      payload.hora = trimmedTime ? trimmedTime : null;
    }

    if (Number.isNaN(numericProgramId) || Number.isNaN(numericActivityId)) {
      const now = new Date();
      return {
        id: activityId,
        name: (updates.name ?? '').toString(),
        description: updates.description ?? null,
        day: updates.day ? normalizeDayCode(updates.day) ?? updates.day ?? null : null,
        time: updates.time ?? null,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUserDisplayName ?? null,
      };
    }

    try {
      const res = await fetch(`${apiBase}/programs/${numericProgramId}/activities/${numericActivityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to update activity: ${res.status}`);
      }

      const data = await res.json();
      return mapProgramActivityFromApi(data);
    } catch (error) {
      console.error(`Failed to update activity ${activityId} for program ${programId}`, error);
      throw error instanceof Error ? error : new Error('Unknown error updating activity');
    }
  }, [apiBase, currentUserDisplayName]);

  const deleteProgramActivity = useCallback(async (programId: string, activityId: string): Promise<boolean> => {
    const numericProgramId = Number(programId);
    const numericActivityId = Number(activityId);

    if (Number.isNaN(numericProgramId) || Number.isNaN(numericActivityId)) {
      return true;
    }

    try {
      const res = await fetch(`${apiBase}/programs/${numericProgramId}/activities/${numericActivityId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to delete activity: ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      return Boolean(data?.deleted ?? true);
    } catch (error) {
      console.error(`Failed to delete activity ${activityId} for program ${programId}`, error);
      throw error instanceof Error ? error : new Error('Unknown error deleting activity');
    }
  }, [apiBase]);

  const getPatientPunctuality = useCallback(async (patientId: string): Promise<PatientPunctualityRecord[]> => {
    const numericId = Number(patientId);
    if (Number.isNaN(numericId)) {
      return [];
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${apiBase}/patient-punctuality/patient/${numericId}`, { headers });

      if (res.status === 404) {
        return [];
      }

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || `No se pudo obtener la puntualidad del paciente (status ${res.status})`);
      }

      const data = await res.json();
      return Array.isArray(data) ? data.map((item: any) => mapPatientPunctualityFromApi(item)) : [];
    } catch (error) {
      console.error(`Error fetching punctuality for patient ${patientId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al obtener la puntualidad del paciente');
    }
  }, [apiBase, token]);

  const createPatientPunctuality = useCallback(async (input: CreatePatientPunctualityInput): Promise<PatientPunctualityRecord> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const payload = buildPatientPunctualityPayload(input);
      const res = await fetch(`${apiBase}/patient-punctuality`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || `No se pudo registrar la puntualidad (status ${res.status})`);
      }

      const data = await res.json();
      return mapPatientPunctualityFromApi(data);
    } catch (error) {
      console.error('Error creating patient punctuality record', error);
      throw error instanceof Error ? error : new Error('Error desconocido al registrar la puntualidad');
    }
  }, [apiBase, token]);

  const updatePatientPunctuality = useCallback(async (input: UpdatePatientPunctualityInput): Promise<PatientPunctualityRecord> => {
    const numericId = Number(input.id);
    if (!Number.isFinite(numericId)) {
      throw new Error('El registro de puntualidad seleccionado es inválido.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const payload = buildPatientPunctualityPayload(input);
      const res = await fetch(`${apiBase}/patient-punctuality/${numericId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || `No se pudo actualizar la puntualidad (status ${res.status})`);
      }

      const data = await res.json();
      return mapPatientPunctualityFromApi(data);
    } catch (error) {
      console.error(`Error updating patient punctuality record ${numericId}`, error);
      throw error instanceof Error ? error : new Error('Error desconocido al actualizar la puntualidad');
    }
  }, [apiBase, token]);

  const addEvolutionEntry = (entryData: Omit<EvolutionEntry, 'id'>) => {
    const newEntry: EvolutionEntry = {
      ...entryData,
      id: Date.now().toString(),
    };
    setEvolutionEntries(prev => [...prev, newEntry]);
  };

  const contextValue: AppContextType = {
    patients,
    instruments,
    assignments,
    programs,
    ribbons,
    instrumentTypes,
    evolutionEntries,
    dashboardStats,
    addPatient,
    updatePatient,
    assignProgramToPatient,
    deletePatient,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    getInstrumentDetails,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    assignInstrumentToPatients,
    getInstrumentTopics,
    createInstrumentTopic,
    updateInstrumentTopic,
    deleteInstrumentTopic,
    addAssignment,
    updateAssignment,
    reloadRibbons,
    addRibbon,
    updateRibbon,
    deleteRibbon,
    addProgram,
    updateProgram,
    deleteProgram,
    getProgramDetails,
    addProgramActivity,
    updateProgramActivity,
    deleteProgramActivity,
    getPatientPunctuality,
    createPatientPunctuality,
    updatePatientPunctuality,
    addEvolutionEntry,
    refreshInstrumentTypes,
    createInstrumentType,
    updateInstrumentType,
    deleteInstrumentType,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};