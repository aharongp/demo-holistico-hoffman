import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { Patient, Instrument, Assignment, Program, ProgramActivity, ProgramDetails, EvolutionEntry, DashboardStats, GenderDistributionSlice, PatientsByProgramSlice, InstrumentType, Question, QuestionAnswer } from '../types';
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

  const required = typeof requiredFlag === 'boolean'
    ? requiredFlag
    : (typeof requiredFlag === 'number' ? requiredFlag !== 0 : true);

  const optionList = Array.isArray(optionsValue)
    ? optionsValue
        .map((option: any) => (option === null || typeof option === 'undefined') ? null : String(option))
        .filter((option: string | null): option is string => option !== null && option.length > 0)
    : undefined;

  const order = Number(orderValue);
  const normalizedOrder = Number.isFinite(order) ? order : 0;

  const text = String(textValue ?? '').trim();

  const rawAnswers = Array.isArray(raw?.respuestas) ? raw.respuestas : [];
  const mappedAnswers: QuestionAnswer[] = rawAnswers
    .map((answer: any) => mapAnswerFromApi(answer))
    .filter((answer: QuestionAnswer): answer is QuestionAnswer => Boolean(answer.label));

  const mergedOptions = mappedAnswers.length
    ? mappedAnswers.map((answer) => answer.label)
    : optionList;

  return {
    id: String(idValue ?? ''),
    text: text.length ? text : `Pregunta ${idValue ?? ''}`,
    type: normalizeQuestionType(raw?.tipo_respuesta ?? raw?.responseType ?? raw?.tipo ?? raw?.type),
    options: mergedOptions && mergedOptions.length ? mergedOptions : undefined,
    answers: mappedAnswers,
    required,
    order: normalizedOrder,
  };
};

const QUESTION_TYPES_WITH_OPTIONS: ReadonlyArray<Question['type']> = ['multiple_choice', 'radio', 'select'];

const questionTypeRequiresOptions = (type: Question['type']): boolean =>
  QUESTION_TYPES_WITH_OPTIONS.includes(type);

const normalizeQuestionOptionLabels = (options?: string[] | null): string[] => {
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

const buildAnswersFromLabels = (questionId: string, labels: string[]): QuestionAnswer[] =>
  labels.map((label, index) => ({
    id: `${questionId}-answer-${index}`,
    label,
    value: null,
    color: null,
    createdBy: null,
    createdAt: null,
    updatedAt: null,
  }));

type InstrumentMappingOverrides = {
  name?: string | null;
  subjectName?: string | null;
  questions?: Question[] | null;
};

type QuestionInput = {
  text: string;
  type: Question['type'];
  order?: number | null;
  required?: boolean;
  options?: string[] | null;
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

interface AppContextType {
  // State
  patients: Patient[];
  instruments: Instrument[];
  assignments: Assignment[];
  programs: Program[];
  instrumentTypes: InstrumentType[];
  evolutionEntries: EvolutionEntry[];
  dashboardStats: DashboardStats;
  
  // Actions
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  
  addInstrument: (instrument: Omit<Instrument, 'id' | 'createdAt'>) => Promise<Instrument>;
  updateInstrument: (id: string, instrument: Partial<Instrument>) => Promise<Instrument | null>;
  deleteInstrument: (id: string) => Promise<boolean>;
  getInstrumentDetails: (id: string) => Promise<Instrument | null>;
  createQuestion: (instrumentId: string, input: QuestionInput) => Promise<Question>;
  updateQuestion: (instrumentId: string, questionId: string, input: QuestionInput) => Promise<Question>;
  deleteQuestion: (instrumentId: string, questionId: string) => Promise<boolean>;
  
  addAssignment: (assignment: Omit<Assignment, 'id' | 'assignedAt'>) => void;
  updateAssignment: (id: string, assignment: Partial<Assignment>) => void;
  
  addProgram: (program: ProgramInput) => Promise<Program>;
  updateProgram: (id: string, program: Partial<ProgramInput>) => Promise<Program | null>;
  deleteProgram: (id: string) => Promise<boolean>;
  getProgramDetails: (id: string) => Promise<ProgramDetails | null>;
  addProgramActivity: (programId: string, activity: ProgramActivityInput) => Promise<ProgramActivity>;
  updateProgramActivity: (programId: string, activityId: string, activity: ProgramActivityUpdateInput) => Promise<ProgramActivity>;
  deleteProgramActivity: (programId: string, activityId: string) => Promise<boolean>;
  
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
  const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([]);
  const [evolutionEntries, setEvolutionEntries] = useState<EvolutionEntry[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(mockDashboardStats);

  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
  const { user } = useAuth();

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

  // Map backend paciente -> frontend Patient
  const mapPacienteToPatient = (p: any): Patient => ({
    id: String(p.id),
    userId: p.id_usuario ? String(p.id_usuario) : undefined,
    firstName: p.nombres ?? '',
    lastName: p.apellidos ?? '',
    email: p.contacto_correo ?? p.contacto ?? '',
    dateOfBirth: p.fecha_nacimiento ? new Date(p.fecha_nacimiento) : new Date(),
    gender: (p.genero === 'male' || p.genero === 'female') ? p.genero : 'other',
    phone: p.telefono ?? p.contacto_telefono ?? undefined,
    address: p.direccion ?? undefined,
    assignedTherapists: [],
    programId: p.id_programa ? String(p.id_programa) : undefined,
    createdAt: p.created_at ? new Date(p.created_at) : new Date(),
    isActive: (typeof p.activo !== 'undefined') ? Boolean(p.activo) : true,
  });

  // Load patients from backend on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/patient`);
        if (!res.ok) throw new Error(`Failed to fetch patients: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const mapped = Array.isArray(data) ? data.map(mapPacienteToPatient) : [];
          // if API returns no patients, keep mocks so UI doesn't appear empty
          if (mapped.length > 0) {
            setPatients(mapped);
          } else {
            setPatients(mockPatients);
          }
      } catch (err) {
        // fallback to mocks on error
        setPatients(mockPatients);
        console.error('Error loading patients from API, using mock data.', err);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase]);

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

    const normalizeGenderLabel = (value: string | null | undefined): 'male' | 'female' | 'other' => {
      const normalized = (value ?? '').toString().trim().toLowerCase();
      if (['male', 'masculino', 'hombre', 'm'].includes(normalized)) return 'male';
      if (['female', 'femenino', 'mujer', 'f'].includes(normalized)) return 'female';
      if (['other', 'otro', 'otros', 'otras', 'sin especificar', 'no especificado', 'n/a', ''].includes(normalized)) return 'other';
      return 'other';
    };

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
            const normalized = normalizeGenderLabel(slice.label);
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
    try {
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
      };
      const res = await fetch(`${apiBase}/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to create patient: ${res.status}`);
      const created = await res.json();
      setPatients(prev => [...prev, mapPacienteToPatient(created)]);
    } catch (err) {
      console.error('Create patient failed, applying locally', err);
      // fallback local create
      const newPatient: Patient = {
        ...patientData,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      setPatients(prev => [...prev, newPatient]);
    }
  }, [apiBase]);

  const updatePatient = useCallback(async (id: string, patientData: Partial<Patient>) => {
    try {
      const payload: any = {};
      if (patientData.firstName) payload.nombres = patientData.firstName;
      if (patientData.lastName) payload.apellidos = patientData.lastName;
      if (patientData.email) payload.contacto_correo = patientData.email;
      if (patientData.dateOfBirth) payload.fecha_nacimiento = (patientData.dateOfBirth as Date).toISOString();
      if (patientData.gender) payload.genero = patientData.gender;
      if (patientData.phone) payload.telefono = patientData.phone;
      if (patientData.address) payload.direccion = patientData.address;
      if (typeof patientData.isActive !== 'undefined') payload.activo = patientData.isActive ? 1 : 0;
      if (patientData.programId) {
        // If programId looks numeric, send number; otherwise send as-is (backend may accept string ids)
        const maybeNum = Number(patientData.programId);
        payload.id_programa = Number.isNaN(maybeNum) ? patientData.programId : maybeNum;
      }

      const res = await fetch(`${apiBase}/patient/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to update patient: ${res.status}`);
      const updated = await res.json();
      setPatients(prev => prev.map(p => p.id === id ? mapPacienteToPatient(updated) : p));
    } catch (err) {
      console.error('Update patient failed, applying locally', err);
      setPatients(prev => prev.map(p => p.id === id ? { ...p, ...patientData } as Patient : p));
    }
  }, [apiBase]);

  const deletePatient = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/patient/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete patient: ${res.status}`);
      setPatients(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete patient failed, removing locally', err);
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  }, [apiBase]);

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

      const [instrumentResponse, questionsResponse] = await Promise.all([instrumentRequest, questionsRequest]);

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
      ? normalizeQuestionOptionLabels(input.options)
      : [];

    const nextOrder = typeof input.order === 'number' && Number.isFinite(input.order)
      ? input.order
      : (targetInstrument ? (targetInstrument.questions.length + 1) : 1);

    const buildQuestionFromInput = (idValue: string): Question => {
      const baseAnswers = normalizedOptions.length ? buildAnswersFromLabels(idValue, normalizedOptions) : [];
      const optionLabels = baseAnswers.length ? baseAnswers.map((answer) => answer.label) : normalizedOptions;

      return {
        id: idValue,
        text: input.text.trim(),
        type: input.type,
        order: nextOrder,
        required: typeof input.required === 'boolean' ? input.required : true,
        answers: baseAnswers,
        options: optionLabels.length ? optionLabels : undefined,
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

    const createAnswersForQuestion = async (questionId: number, labels: string[]): Promise<QuestionAnswer[]> => {
      const createdAnswers: QuestionAnswer[] = [];
      for (const label of labels) {
        const answerResponse = await fetch(`${apiBase}/questions/${questionId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: label }),
        });

        if (!answerResponse.ok) {
          const text = await answerResponse.text();
          throw new Error(text || `No se pudo registrar la respuesta "${label}" (status ${answerResponse.status})`);
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

      if (questionTypeRequiresOptions(createdQuestion.type) && normalizedOptions.length) {
        const numericQuestionId = Number(createdQuestion.id);
        if (!Number.isNaN(numericQuestionId)) {
          const createdAnswers = await createAnswersForQuestion(numericQuestionId, normalizedOptions);
          const optionLabels = createdAnswers.map((answer) => answer.label).filter((label) => label.length > 0);
          createdQuestion = {
            ...createdQuestion,
            answers: createdAnswers,
            options: optionLabels.length ? optionLabels : undefined,
          };
        } else {
          const fallbackAnswers = buildAnswersFromLabels(createdQuestion.id, normalizedOptions);
          const optionLabels = fallbackAnswers.map((answer) => answer.label).filter((label) => label.length > 0);
          createdQuestion = {
            ...createdQuestion,
            answers: fallbackAnswers,
            options: optionLabels.length ? optionLabels : undefined,
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
      ? normalizeQuestionOptionLabels(input.options)
      : [];

    const buildLocalQuestion = (): Question => {
      const answers = sanitizedOptions.length ? buildAnswersFromLabels(questionId, sanitizedOptions) : [];
      const optionLabels = answers.length ? answers.map((answer) => answer.label) : sanitizedOptions;
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
        options: optionLabels.length ? optionLabels : undefined,
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

    const syncAnswersForQuestion = async (desiredLabels: string[]): Promise<QuestionAnswer[]> => {
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

      if (!desiredLabels.length) {
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

      for (const label of desiredLabels) {
        const normalizedLabel = label.toLocaleLowerCase('es');
        const matchIndex = remainingAnswers.findIndex((answer) => (answer.label ?? '').toLocaleLowerCase('es') === normalizedLabel);

        if (matchIndex >= 0) {
          const [matchedAnswer] = remainingAnswers.splice(matchIndex, 1);
          const trimmedOriginal = (matchedAnswer.label ?? '').trim();
          if (trimmedOriginal !== label) {
            const answerId = Number(matchedAnswer.id);
            if (!Number.isNaN(answerId)) {
              const patchResponse = await fetch(`${apiBase}/questions/${numericQuestionId}/answers/${answerId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: label }),
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

          nextAnswers.push({ ...matchedAnswer, label });
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
              body: JSON.stringify({ name: label }),
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
          body: JSON.stringify({ name: label }),
        });

        if (!createResponse.ok) {
          const text = await createResponse.text();
          throw new Error(text || `No se pudo registrar la respuesta "${label}" (status ${createResponse.status})`);
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

      const desiredLabels = questionTypeRequiresOptions(normalizedQuestion.type) ? sanitizedOptions : [];
      const updatedAnswers = await syncAnswersForQuestion(desiredLabels);
      const optionLabels = updatedAnswers.map((answer) => answer.label).filter((label) => label.length > 0);

      const nextQuestion: Question = {
        ...normalizedQuestion,
        answers: updatedAnswers,
        options: optionLabels.length ? optionLabels : undefined,
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

  const addEvolutionEntry = (entryData: Omit<EvolutionEntry, 'id'>) => {
    const newEntry: EvolutionEntry = {
      ...entryData,
      id: Date.now().toString(),
    };
    setEvolutionEntries(prev => [...prev, newEntry]);
  };

  return (
    <AppContext.Provider value={{
      patients,
      instruments,
      assignments,
      programs,
      instrumentTypes,
      evolutionEntries,
      dashboardStats,
      addPatient,
      updatePatient,
      deletePatient,
      addInstrument,
      updateInstrument,
      deleteInstrument,
  getInstrumentDetails,
  createQuestion,
  updateQuestion,
  deleteQuestion,
      addAssignment,
      updateAssignment,
      addProgram,
      updateProgram,
      deleteProgram,
      getProgramDetails,
      addProgramActivity,
      updateProgramActivity,
      deleteProgramActivity,
      addEvolutionEntry,
      refreshInstrumentTypes,
      createInstrumentType,
      updateInstrumentType,
      deleteInstrumentType,
    }}>
      {children}
    </AppContext.Provider>
  );
};