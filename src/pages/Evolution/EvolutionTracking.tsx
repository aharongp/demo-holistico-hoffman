import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, TrendingUp, User, Heart, Scale, Droplets, RefreshCw, Edit, Trash2, Search, LineChart, Ribbon, LayoutDashboard, Activity, ClipboardList, FileText, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Chart } from '../../components/Dashboard/Chart';
import { Modal } from '../../components/UI/Modal';
import { Table } from '../../components/UI/Table';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { InstrumentResults } from '../Results/InstrumentResults';
import type { Instrument, Question, QuestionOption } from '../../types';
import type { BackendInstrumentResponse, CoachDiagnosticObservation } from '../../types/patientInstruments';
import {
  MedicalHistoryData,
  RemotePatientMedicalHistory,
  buildUpdatePayload,
  createInitialMedicalHistory,
  createInitialOcularForm,
  mapRemoteMedicalHistoryToState,
  createInitialDentalPresence,
  createInitialDentalFindings,
  DENTAL_FIELD_GROUPS,
  DENTAL_FIELD_META,
  DENTAL_FIELDS,
  DENTAL_PRESENCE_OPTIONS,
  normalizeOcularExamRecords,
  toDisplayText,
  presenceSelectionFromBoolean,
  presenceSelectionToPayload,
} from '../MedicalHistory/MedicalHistory';
import type {
  DentalField,
  DentalFindingsState,
  DentalPresenceSelection,
  DentalPresenceState,
  DentalQuadrantKey,
  OcularExamRow,
  OcularFormState,
} from '../MedicalHistory/MedicalHistory';
import { PatientMedicalHistoryForm } from './components/PatientMedicalHistoryForm';
import {
  Patient,
  PatientVitalsSummary,
  NumericVitalRecord,
  VitalSource,
  BloodPressureRecord,
  HeartRateRecoveryRecord,
} from '../../types';

const EMPTY_VALUE = 'N/D';

const SOURCE_LABELS: Record<VitalSource, string> = {
  consultation: 'Consulta',
  pulse: 'Pulso',
  glycemia: 'Glicemia',
  heart_rate: 'Frecuencia cardiaca',
  weight: 'Peso',
  body_mass: 'Masa corporal',
  blood_pressure: 'Tension arterial',
};

const BODY_MASS_PHOTO_FALLBACK_LABELS: Record<string, string> = {
  foto_rostro: 'Rostro',
  foto_cuerpo_frente: 'Frente',
  foto_cuerpo_perfil: 'Perfil',
  foto_espalda_entero: 'Espalda',
  foto_extra: 'Extra',
};

const encodePathSegments = (input: string): string =>
  input
    .split('/')
    .filter(segment => segment.length > 0)
    .map(segment => encodeURIComponent(segment))
    .join('/');

const computeBodyMassPhotoUrl = (
  value: string,
  baseUrl: string,
  type?: string,
): string | null => {
  const sanitized = value.replace(/\\/g, '/').trim();
  if (!sanitized) {
    return null;
  }

  if (/^https?:\/\//i.test(sanitized)) {
    return sanitized;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalized = sanitized.replace(/^\/+/, '');
  const normalizedLower = normalized.toLowerCase();

  const build = (relativePath: string): string => {
    const encoded = encodePathSegments(relativePath);
    return normalizedBase ? `${normalizedBase}/${encoded}` : `/${encoded}`;
  };

  if (normalizedLower.startsWith('assets/')) {
    return build(normalized);
  }

  if (normalizedLower.startsWith('images/')) {
    return build(`assets/${normalized}`);
  }

  if (normalized.includes('/')) {
    return build(`assets/images/${normalized}`);
  }

  if (type && type.trim().length > 0) {
    return build(`assets/images/${type.trim()}/${normalized}`);
  }

  return build(`assets/images/${normalized}`);
};

type EditableVitalType = 'weight' | 'pulse' | 'glycemia' | 'blood_pressure' | 'heart_rate';

type VitalSectionKey = 'weight' | 'pulse' | 'glycemia' | 'blood_pressure' | 'bmi' | 'heart_rate';

const VITAL_ENDPOINTS: Record<EditableVitalType, string> = {
  weight: 'weight',
  pulse: 'pulse',
  glycemia: 'glycemia',
  blood_pressure: 'blood-pressure',
  heart_rate: 'heart-rate',
};

const VITAL_LABELS: Record<EditableVitalType, string> = {
  weight: 'Peso',
  pulse: 'Pulso',
  glycemia: 'Glicemia',
  blood_pressure: 'Presion arterial',
  heart_rate: 'Frecuencia cardiaca',
};

const GENDER_LABELS: Record<Patient['gender'], string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
};

const formatAge = (dateOfBirth?: Date | string | null): string => {
  if (!dateOfBirth) {
    return '—';
  }

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return '—';
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? `${age} años` : '—';
};

const parseNumericId = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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

const normalizeQuestionOptions = (question: Question | null | undefined): QuestionOption[] => {
  if (!question) {
    return [];
  }

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
    question.answers.forEach((answer) => {
      pushOption(answer.label, answer.value ?? answer.label);
    });
  }

  if (!options.length && Array.isArray(question.options)) {
    question.options.forEach((option) => {
      if (!option) {
        return;
      }

      if (typeof option === 'string') {
        pushOption(option, option);
        return;
      }

      const typed = option as QuestionOption;
      pushOption(typed.label, typed.value ?? typed.label);
    });
  }

  if (!options.length && question.type === 'boolean') {
    pushOption('Sí', 'yes');
    pushOption('No', 'no');
  }

  return options;
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

  const lowered = value.toLocaleLowerCase('es');

  for (const option of options) {
    const optionValue = option.value.toLocaleLowerCase('es');
    if (optionValue === lowered) {
      return option.label;
    }

    if (option.label.toLocaleLowerCase('es') === lowered) {
      return option.label;
    }
  }

  return null;
};

const resolveQuestionForResponse = (
  instrument: Instrument | null,
  response: BackendInstrumentResponse,
  responseIndex: number,
): Question | null => {
  const questions = instrument?.questions ?? [];
  if (!questions.length) {
    return null;
  }

  if (response.questionId !== null) {
    const stringId = String(response.questionId);
    const directMatch = questions.find((question) => String(question.id) === stringId);
    if (directMatch) {
      return directMatch;
    }

    const numericId = Number(response.questionId);
    if (Number.isFinite(numericId)) {
      const numericMatch = questions.find((question) => Number(question.id) === numericId);
      if (numericMatch) {
        return numericMatch;
      }
    }
  }

  if (typeof response.question === 'string' && response.question.trim().length) {
    const rawText = response.question.trim().toLocaleLowerCase('es');
    const textMatch = questions.find((question) => {
      const questionText = question.text?.trim();
      return questionText?.toLocaleLowerCase('es') === rawText;
    });

    if (textMatch) {
      return textMatch;
    }

    const normalizedResponse = normalizeQuestionKey(response.question);
    const normalizedMatch = questions.find((question) => {
      const questionText = question.text?.trim();
      return questionText ? normalizeQuestionKey(questionText) === normalizedResponse : false;
    });

    if (normalizedMatch) {
      return normalizedMatch;
    }
  }

  if (typeof response.order === 'number' && Number.isFinite(response.order)) {
    const targetOrder = Math.round(response.order);
    const byOrder = questions.find((question) => {
      if (typeof question.order !== 'number' || !Number.isFinite(question.order)) {
        return false;
      }

      return Math.round(question.order) === targetOrder;
    });

    if (byOrder) {
      return byOrder;
    }
  }

  return questions[responseIndex] ?? null;
};

const buildInstrumentResponseDisplay = (
  instrument: Instrument | null,
  response: BackendInstrumentResponse,
  responseIndex: number,
): { label: string; value: string | null } => {
  const question = resolveQuestionForResponse(instrument, response, responseIndex);
  const rawAnswer = typeof response.answer === 'string' ? response.answer.trim() : '';
  const rawCompetence = typeof response.competence === 'string' ? response.competence.trim() : '';

  if (!question) {
    const label = rawCompetence || rawAnswer || 'Sin respuesta registrada';
    return {
      label,
      value:
        rawAnswer && label.toLocaleLowerCase('es') !== rawAnswer.toLocaleLowerCase('es')
          ? rawAnswer
          : null,
    };
  }

  if (question.type === 'text') {
    const label = rawAnswer || rawCompetence || 'Sin respuesta registrada';
    return {
      label,
      value:
        rawAnswer && label.toLocaleLowerCase('es') !== rawAnswer.toLocaleLowerCase('es')
          ? rawAnswer
          : null,
    };
  }

  const options = normalizeQuestionOptions(question);
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

  if (!resolvedLabels.length && rawCompetence) {
    resolvedLabels.push(rawCompetence);
  }

  const label = resolvedLabels.length
    ? resolvedLabels.join(', ')
    : rawCompetence || rawAnswer || 'Sin respuesta registrada';

  const valueCandidate = answerParts.length
    ? answerParts.join(', ')
    : rawAnswer || (competenceParts.length ? competenceParts.join(', ') : '');

  const normalizedLabel = label.toLocaleLowerCase('es');
  const normalizedValue = valueCandidate.toLocaleLowerCase('es');

  const value = valueCandidate && normalizedLabel !== normalizedValue ? valueCandidate : null;

  return { label, value };
};

type HeartRateMetricKey =
  | 'resting'
  | 'after5Minutes'
  | 'after10Minutes'
  | 'after15Minutes'
  | 'after30Minutes'
  | 'after45Minutes';

type HeartRateDtoKey =
  | 'fcr'
  | 'fc5MinEntrenamiento'
  | 'fc10MinEntrenamiento'
  | 'fc15Min'
  | 'fc30Min'
  | 'fc45Min';

type HeartRateFormKey =
  | 'heartRateResting'
  | 'heartRateAfter5Minutes'
  | 'heartRateAfter10Minutes'
  | 'heartRateAfter15Minutes'
  | 'heartRateAfter30Minutes'
  | 'heartRateAfter45Minutes';

type DoctorTabId = 'summary' | 'charts' | 'records' | 'results' | 'instruments';

type BackendPatientInstrumentAssignment = {
  id: number;
  patientId: number | null;
  instrumentTypeId: number | null;
  instrumentTypeName: string | null;
  instrumentTypeDescription: string | null;
  assignedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  validUntil: string | null;
  completed: boolean;
  evaluated: boolean;
  available: boolean;
  availabilityRaw: string | null;
  origin: string | null;
  ribbonId: number | null;
  topics: string[];
};

type InstrumentAssignmentItem = {
  assignment: BackendPatientInstrumentAssignment;
  instrumentId: number | null;
  responsesCount: number;
  isCompleted: boolean;
  observation: CoachDiagnosticObservation | null;
};

const instrumentObservationTimestamp = (value: string | null | undefined): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const selectObservationForInstrument = (
  observations: CoachDiagnosticObservation[],
  instrumentId: number,
): CoachDiagnosticObservation | null => {
  if (!Array.isArray(observations) || !observations.length) {
    return null;
  }

  const candidates = observations
    .map((item) => ({
      ...item,
      comment: typeof item.comment === 'string' ? item.comment.trim() : null,
      coach: typeof item.coach === 'string' ? item.coach.trim() : null,
    }))
    .filter((item) => Number(item.instrumentId) === instrumentId && Boolean(item.comment));

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => {
    const appliedDiff = instrumentObservationTimestamp(b.appliedAt) - instrumentObservationTimestamp(a.appliedAt);
    if (appliedDiff !== 0) {
      return appliedDiff;
    }
    const updatedDiff = instrumentObservationTimestamp(b.updatedAt) - instrumentObservationTimestamp(a.updatedAt);
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    return instrumentObservationTimestamp(b.createdAt) - instrumentObservationTimestamp(a.createdAt);
  });

  return candidates[0];
};

const instrumentAssignmentTimestamp = (value: string | null | undefined): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const formatInstrumentDate = (value: string | null): string => {
  if (!value) {
    return 'Sin registro';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin registro';
  }

  return parsed.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatInstrumentResponseTimestamp = (
  value: string | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  try {
    return parsed.toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return parsed.toISOString();
  }
};

const HEART_RATE_FIELDS = [
  { key: 'resting', label: 'Reposo' },
  { key: 'after5Minutes', label: '5 min' },
  { key: 'after10Minutes', label: '10 min' },
  { key: 'after15Minutes', label: '15 min' },
  { key: 'after30Minutes', label: '30 min' },
  { key: 'after45Minutes', label: '45 min' },
] as const satisfies ReadonlyArray<{ key: HeartRateMetricKey; label: string }>;

const HEART_RATE_LABEL_MAP = HEART_RATE_FIELDS.reduce<Record<HeartRateMetricKey, string>>((acc, field) => {
  acc[field.key] = field.label;
  return acc;
}, {} as Record<HeartRateMetricKey, string>);

const HEART_RATE_FORM_FIELDS = [
  { metricKey: 'resting', formKey: 'heartRateResting', dtoKey: 'fcr' },
  { metricKey: 'after5Minutes', formKey: 'heartRateAfter5Minutes', dtoKey: 'fc5MinEntrenamiento' },
  { metricKey: 'after10Minutes', formKey: 'heartRateAfter10Minutes', dtoKey: 'fc10MinEntrenamiento' },
  { metricKey: 'after15Minutes', formKey: 'heartRateAfter15Minutes', dtoKey: 'fc15Min' },
  { metricKey: 'after30Minutes', formKey: 'heartRateAfter30Minutes', dtoKey: 'fc30Min' },
  { metricKey: 'after45Minutes', formKey: 'heartRateAfter45Minutes', dtoKey: 'fc45Min' },
] as const satisfies ReadonlyArray<{
  metricKey: HeartRateMetricKey;
  formKey: HeartRateFormKey;
  dtoKey: HeartRateDtoKey;
}>;

type EvolutionFormData = {
  weight: string;
  bloodSugar: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  pulse: string;
  heartRateResting: string;
  heartRateAfter5Minutes: string;
  heartRateAfter10Minutes: string;
  heartRateAfter15Minutes: string;
  heartRateAfter30Minutes: string;
  heartRateAfter45Minutes: string;
  heartRateSessionType: string;
  bodyMassWeight: string;
  bodyMassNeck: string;
  bodyMassBust: string;
  bodyMassWaist: string;
  bodyMassHip: string;
  bodyMassRightArm: string;
  bodyMassRightThigh: string;
  bodyMassFacePhoto: File | null;
  bodyMassFrontPhoto: File | null;
  bodyMassProfilePhoto: File | null;
  bodyMassBackPhoto: File | null;
  bodyMassExtraPhoto: File | null;
};

const INITIAL_FORM_DATA: EvolutionFormData = {
  weight: '',
  bloodSugar: '',
  bloodPressureSystolic: '',
  bloodPressureDiastolic: '',
  pulse: '',
  heartRateResting: '',
  heartRateAfter5Minutes: '',
  heartRateAfter10Minutes: '',
  heartRateAfter15Minutes: '',
  heartRateAfter30Minutes: '',
  heartRateAfter45Minutes: '',
  heartRateSessionType: '',
  bodyMassWeight: '',
  bodyMassNeck: '',
  bodyMassBust: '',
  bodyMassWaist: '',
  bodyMassHip: '',
  bodyMassRightArm: '',
  bodyMassRightThigh: '',
  bodyMassFacePhoto: null,
  bodyMassFrontPhoto: null,
  bodyMassProfilePhoto: null,
  bodyMassBackPhoto: null,
  bodyMassExtraPhoto: null,
};

const toNumeric = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeNumberInput = (value: string): string => value.replace(/,/g, '.').trim();

const parseNumberInput = (value: string): number | undefined => {
  const normalized = normalizeNumberInput(value);
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const padTwo = (value: number): string => String(value).padStart(2, '0');

const extractDateParts = (value: string | null | undefined) => {
  let reference = new Date();
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      reference = parsed;
    }
  }

  return {
    date: `${reference.getFullYear()}-${padTwo(reference.getMonth() + 1)}-${padTwo(reference.getDate())}`,
    time: `${padTwo(reference.getHours())}:${padTwo(reference.getMinutes())}`,
  };
};

const combineDateAndTimeToIso = (date: string, time: string): string | undefined => {
  if (!date) {
    return undefined;
  }

  const [year, month, day] = date.split('-').map(Number);
  if (![year, month, day].every(value => Number.isFinite(value))) {
    return undefined;
  }

  let hours = 0;
  let minutes = 0;

  if (time) {
    const [rawHours, rawMinutes] = time.split(':').map(Number);
    if (Number.isFinite(rawHours)) {
      hours = rawHours;
    }
    if (Number.isFinite(rawMinutes)) {
      minutes = rawMinutes;
    }
  }

  const combined = new Date(year, (month || 1) - 1, day || 1, hours, minutes, 0, 0);
  return Number.isNaN(combined.getTime()) ? undefined : combined.toISOString();
};

const resolveRecordedAt = (value: string | null): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const sortByRecordedAt = <T extends { recordedAt: string | null }>(records: T[]): T[] =>
  [...records].sort((a, b) => resolveRecordedAt(a.recordedAt) - resolveRecordedAt(b.recordedAt));

const sortByRecordedAtDesc = <T extends { recordedAt: string | null }>(records: T[]): T[] =>
  [...records].sort((a, b) => resolveRecordedAt(b.recordedAt) - resolveRecordedAt(a.recordedAt));

const formatDecimal = (value: number | null | undefined, digits = 0): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return EMPTY_VALUE;
  }
  return value.toFixed(digits);
};

const getBmiCategory = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return EMPTY_VALUE;
  }
  if (value < 18.5) return 'Bajo peso';
  if (value < 25) return 'Normal';
  if (value < 30) return 'Sobrepeso';
  return 'Obesidad';
};

const parseDateInput = (value: string, endOfDay: boolean): number | null => {
  if (!value) {
    return null;
  }
  const base = new Date(`${value}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  if (endOfDay) {
    base.setHours(23, 59, 59, 999);
  }
  return base.getTime();
};

export const EvolutionTracking: React.FC = () => {
  const { user, token } = useAuth();
  const { addEvolutionEntry, patients, programs, ribbons, reloadRibbons, updatePatient, getInstrumentDetails } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const selectedPatientUserId = useMemo(() => {
    if (!selectedPatient) {
      return null;
    }
    const primary = parseNumericId(selectedPatient.userId ?? null);
    if (primary !== null) {
      return primary;
    }
    return parseNumericId(selectedPatient.id);
  }, [selectedPatient]);
  const selectedPatientFullName = useMemo(() => {
    if (!selectedPatient) {
      return '';
    }
    return `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim();
  }, [selectedPatient]);
  const [activeTab, setActiveTab] = useState('weight');
  const [doctorActiveTab, setDoctorActiveTab] = useState<DoctorTabId>('summary');
  const [formData, setFormData] = useState<EvolutionFormData>(() => ({ ...INITIAL_FORM_DATA }));
  const [bodyMassPhotoResetKey, setBodyMassPhotoResetKey] = useState(0);
  const resetEvolutionForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM_DATA });
    setBodyMassPhotoResetKey(value => value + 1);
  }, []);
  const [vitals, setVitals] = useState<PatientVitalsSummary | null>(null);
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | Patient['gender']>('all');
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<VitalSectionKey, boolean>>({
    weight: false,
    pulse: false,
    glycemia: false,
    blood_pressure: false,
    bmi: false,
    heart_rate: false,
  });
  const [editForm, setEditForm] = useState<EditFormState>({
    date: '',
    time: '',
    numericValues: {},
    sessionType: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [isRibbonModalOpen, setIsRibbonModalOpen] = useState(false);
  const [patientForRibbon, setPatientForRibbon] = useState<Patient | null>(null);
  const [selectedRibbonId, setSelectedRibbonId] = useState<string>('');
  const [isUpdatingRibbon, setIsUpdatingRibbon] = useState(false);
  const [isLoadingRibbonOptions, setIsLoadingRibbonOptions] = useState(false);
  const [ribbonModalError, setRibbonModalError] = useState<string | null>(null);
  const [medicalHistoryData, setMedicalHistoryData] = useState<MedicalHistoryData>(() => createInitialMedicalHistory());
  const [isLoadingMedicalHistory, setIsLoadingMedicalHistory] = useState(false);
  const [medicalHistoryError, setMedicalHistoryError] = useState<string | null>(null);
  const [medicalHistoryNotice, setMedicalHistoryNotice] = useState<string | null>(null);
  const [isSavingMedicalHistory, setIsSavingMedicalHistory] = useState(false);
  const [medicalHistorySuccess, setMedicalHistorySuccess] = useState<string | null>(null);
  const [dentalPresence, setDentalPresence] = useState<DentalPresenceState>(createInitialDentalPresence());
  const [dentalFindings, setDentalFindings] = useState<DentalFindingsState>(createInitialDentalFindings());
  const [dentalPresenceRecordId, setDentalPresenceRecordId] = useState<number | null>(null);
  const [dentalExamRecordId, setDentalExamRecordId] = useState<number | null>(null);
  const [isLoadingDental, setIsLoadingDental] = useState(false);
  const [dentalLoadError, setDentalLoadError] = useState<string | null>(null);
  const [isDentalModalOpen, setIsDentalModalOpen] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<DentalField | null>(null);
  const [pendingPresence, setPendingPresence] = useState<DentalPresenceSelection>('unknown');
  const [pendingFinding, setPendingFinding] = useState('');
  const [isSavingTooth, setIsSavingTooth] = useState(false);
  const [dentalModalError, setDentalModalError] = useState<string | null>(null);
  const apiBase = useMemo(() => (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000', []);
  const [ocularExams, setOcularExams] = useState<OcularExamRow[]>([]);
  const [isLoadingOcular, setIsLoadingOcular] = useState(false);
  const [ocularLoadError, setOcularLoadError] = useState<string | null>(null);
  const [ocularRefreshKey, setOcularRefreshKey] = useState(0);
  const [isOcularModalOpen, setIsOcularModalOpen] = useState(false);
  const [ocularForm, setOcularForm] = useState<OcularFormState>(createInitialOcularForm());
  const [isSavingOcularExam, setIsSavingOcularExam] = useState(false);
  const [ocularModalError, setOcularModalError] = useState<string | null>(null);
  const [ocularFormResetKey, setOcularFormResetKey] = useState(0);
  const [instrumentAssignments, setInstrumentAssignments] = useState<InstrumentAssignmentItem[]>([]);
  const [isLoadingInstrumentAssignments, setIsLoadingInstrumentAssignments] = useState(false);
  const [instrumentAssignmentsError, setInstrumentAssignmentsError] = useState<string | null>(null);
  const [instrumentCommentDrafts, setInstrumentCommentDrafts] = useState<Record<number, string>>({});
  const [instrumentCommentSavingId, setInstrumentCommentSavingId] = useState<number | null>(null);
  const [instrumentActionMessages, setInstrumentActionMessages] = useState<Record<number, { type: 'success' | 'error'; message: string } | null>>({});
  const [instrumentDeletingId, setInstrumentDeletingId] = useState<number | null>(null);
  const [instrumentAssignmentsRefreshKey, setInstrumentAssignmentsRefreshKey] = useState(0);
  const [instrumentCache, setInstrumentCache] = useState<Record<number, Instrument | null>>({});
  const [instrumentNotice, setInstrumentNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [instrumentResponsesByAssignment, setInstrumentResponsesByAssignment] = useState<Record<number, BackendInstrumentResponse[]>>({});
  const [isInstrumentResponsesModalOpen, setIsInstrumentResponsesModalOpen] = useState(false);
  const [instrumentResponsesModalAssignment, setInstrumentResponsesModalAssignment] = useState<InstrumentAssignmentItem | null>(null);
  const [instrumentResponsesModalData, setInstrumentResponsesModalData] = useState<BackendInstrumentResponse[]>([]);
  const [instrumentResponsesModalInstrument, setInstrumentResponsesModalInstrument] = useState<Instrument | null>(null);
  const [instrumentResponsesModalError, setInstrumentResponsesModalError] = useState<string | null>(null);
  const [isInstrumentResponsesModalLoading, setIsInstrumentResponsesModalLoading] = useState(false);
  const assetsBase = useMemo(() => {
    const rawEnv = (import.meta as any).env?.VITE_ASSETS_BASE;
    const normalizedEnv = typeof rawEnv === 'string' ? rawEnv.trim() : '';
    if (normalizedEnv.length > 0) {
      return normalizedEnv.replace(/\/+$/, '');
    }

    return apiBase.replace(/\/+$/, '');
  }, [apiBase]);
  const normalizedApiBase = useMemo(() => apiBase.replace(/\/+$/, ''), [apiBase]);

  const resetDentalState = useCallback((errorMessage: string | null = null) => {
    setDentalPresence(createInitialDentalPresence());
    setDentalFindings(createInitialDentalFindings());
    setDentalPresenceRecordId(null);
    setDentalExamRecordId(null);
    setSelectedTooth(null);
    setPendingPresence('unknown');
    setPendingFinding('');
    setDentalModalError(null);
    setIsDentalModalOpen(false);
    setIsSavingTooth(false);
    setIsLoadingDental(false);
    setDentalLoadError(errorMessage);
  }, [
    setDentalPresence,
    setDentalFindings,
    setDentalPresenceRecordId,
    setDentalExamRecordId,
    setSelectedTooth,
    setPendingPresence,
    setPendingFinding,
    setDentalModalError,
    setIsDentalModalOpen,
    setIsSavingTooth,
    setIsLoadingDental,
    setDentalLoadError,
  ]);

  useEffect(() => {
    if (!isRibbonModalOpen) {
      return;
    }

    let cancelled = false;

    const fetchRibbonsList = async () => {
      setIsLoadingRibbonOptions(true);
      try {
        await reloadRibbons();
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudieron cargar las cintas para la asignacion manual.', error);
          setRibbonModalError('No se pudieron cargar las cintas. Intenta nuevamente.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRibbonOptions(false);
        }
      }
    };

    void fetchRibbonsList();

    return () => {
      cancelled = true;
    };
  }, [isRibbonModalOpen, reloadRibbons]);
  const storedUserId = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.localStorage.getItem('hoffman_user');
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return parseNumericId(parsed?.id ?? parsed?.userId ?? null);
    } catch (error) {
      console.warn('No fue posible obtener el usuario almacenado', error);
      return null;
    }
  }, []);

  const resolvedUserId = useMemo(() => {
    const contextId = parseNumericId(user?.id);
    if (contextId !== null) {
      return contextId;
    }
    return storedUserId;
  }, [storedUserId, user?.id]);
  const programNameById = useMemo(() => {
    const lookup: Record<string, string> = {};
    programs.forEach(program => {
      lookup[program.id] = program.name;
    });
    return lookup;
  }, [programs]);
  const programOptions = useMemo(() => {
    const sortedPrograms = [...programs]
      .map(program => ({ value: program.id, label: program.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return [
      { value: 'all', label: 'Todos los programas' },
      { value: 'no-program', label: 'Sin programa asignado' },
      ...sortedPrograms,
    ];
  }, [programs]);
  const selectedPatientNumericId = useMemo(() => parseNumericId(selectedPatient?.id), [selectedPatient?.id]);
  const filteredPatients = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return patients.filter(patient => {
      const firstName = patient.firstName ?? '';
      const lastName = patient.lastName ?? '';
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const email = (patient.email ?? '').toLowerCase();
      const cedula = patient.cedula ? patient.cedula.toLowerCase() : '';

      const matchesTerm =
        !normalizedTerm ||
        fullName.includes(normalizedTerm) ||
        firstName.toLowerCase().includes(normalizedTerm) ||
        lastName.toLowerCase().includes(normalizedTerm) ||
        email.includes(normalizedTerm) ||
        cedula.includes(normalizedTerm);

      if (!matchesTerm) {
        return false;
      }

      const matchesProgram =
        selectedProgram === 'all'
          ? true
          : selectedProgram === 'no-program'
            ? !patient.programId
            : patient.programId === selectedProgram;

      if (!matchesProgram) {
        return false;
      }

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? patient.isActive
            : !patient.isActive;

      if (!matchesStatus) {
        return false;
      }

      const matchesAssignment =
        assignmentFilter === 'all'
          ? true
          : assignmentFilter === 'assigned'
            ? Boolean(patient.programId)
            : !patient.programId;

      if (!matchesAssignment) {
        return false;
      }

      const matchesGender = genderFilter === 'all' ? true : patient.gender === genderFilter;

      return matchesGender;
    });
  }, [assignmentFilter, genderFilter, patients, searchTerm, selectedProgram, statusFilter]);
  const filteredPatientCount = filteredPatients.length;
  const totalPatients = useMemo(() => patients.length, [patients]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
    []
  );
  const formatRecordedAt = useCallback(
    (value: string | null, index: number) => {
      if (value) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return dateFormatter.format(parsed);
        }
      }
      return `Registro ${index + 1}`;
    },
    [dateFormatter]
  );

  const formatRecordedAtValue = useCallback(
    (value: string | null) => {
      if (value) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return dateFormatter.format(parsed);
        }
      }
      return 'Registro sin fecha';
    },
    [dateFormatter]
  );

  type SingleValuePoint = { label: string; value: number };
  type BloodPressurePoint = { label: string; systolic: number | null; diastolic: number | null };
  type BodyMassPhotoRow = { type: string; label: string; url: string; path: string };
  type BmiRow = {
    id: number;
    label: string;
    bmi: number | null;
    category: string;
    source: VitalSource;
    record: NumericVitalRecord;
    photos: BodyMassPhotoRow[];
  };
  type WeightRow = {
    id: number;
    label: string;
    source: VitalSource;
    value: number | null;
    rawValue: string | null;
    record: NumericVitalRecord;
  };
  type PulseRow = {
    id: number;
    label: string;
    source: VitalSource;
    value: number | null;
    rawValue: string | null;
    record: NumericVitalRecord;
  };
  type GlycemiaRow = {
    id: number;
    label: string;
    source: VitalSource;
    value: number | null;
    rawValue: string | null;
    record: NumericVitalRecord;
  };
  type BloodPressureRow = {
    id: number;
    label: string;
    source: VitalSource;
    systolic: number | null;
    diastolic: number | null;
    rawValue: string | null;
    record: BloodPressureRecord;
  };
  type HeartRateRow = {
    id: number;
    label: string;
    sessionType: string | null;
    source: VitalSource;
    record: HeartRateRecoveryRecord;
  } & {
    [K in (typeof HEART_RATE_FIELDS)[number]['key']]: number | null;
  };

  type EditState =
    | { type: 'weight' | 'pulse' | 'glycemia'; record: NumericVitalRecord }
    | { type: 'blood_pressure'; record: BloodPressureRecord }
    | { type: 'heart_rate'; record: HeartRateRecoveryRecord };

  type DeleteState = EditState;

  interface EditFormState {
    date: string;
    time: string;
    numericValues: Record<string, string>;
    sessionType: string;
  }

  const isPatient = user?.role === 'patient' || user?.role === 'student';
  const isTherapist = ['administrator', 'trainer', 'therapist', 'doctor', 'coach'].includes(user?.role || '');
  const canManageRecords = isPatient || isTherapist;
  const shouldShowDoctorTabs = Boolean(selectedPatient) && isTherapist && !isPatient;
  const showSummarySection = !shouldShowDoctorTabs || doctorActiveTab === 'summary';
  const showChartsSection = !shouldShowDoctorTabs || doctorActiveTab === 'charts';
  const showRecordsSection = !shouldShowDoctorTabs || doctorActiveTab === 'records';
  const showResultsSection = shouldShowDoctorTabs && doctorActiveTab === 'results';
  const showInstrumentsSection = shouldShowDoctorTabs && doctorActiveTab === 'instruments';
  const showVitalsMessaging = !shouldShowDoctorTabs || doctorActiveTab !== 'summary';

  useEffect(() => {
    if (!shouldShowDoctorTabs) {
      return;
    }
    setDoctorActiveTab('summary');
  }, [shouldShowDoctorTabs, selectedPatient?.id]);

  useEffect(() => {
    if (!shouldShowDoctorTabs) {
      setMedicalHistoryData(createInitialMedicalHistory());
      setMedicalHistoryError(null);
      setMedicalHistoryNotice(null);
      setMedicalHistorySuccess(null);
      setIsLoadingMedicalHistory(false);
      return;
    }

    const patientUserId = selectedPatient?.userId;

    if (!patientUserId) {
      setMedicalHistoryData(createInitialMedicalHistory());
      setMedicalHistoryNotice('El paciente no tiene un usuario vinculado para consultar la historia médica.');
      setMedicalHistoryError(null);
      setIsLoadingMedicalHistory(false);
      return;
    }

    if (!token) {
      setMedicalHistoryData(createInitialMedicalHistory());
      setMedicalHistoryError('No se pudo autenticar la solicitud. Intenta iniciar sesión nuevamente.');
      setMedicalHistoryNotice(null);
      setIsLoadingMedicalHistory(false);
      return;
    }

    const controller = new AbortController();
    let isCancelled = false;

    const fetchMedicalHistory = async () => {
      setIsLoadingMedicalHistory(true);
      setMedicalHistoryError(null);
      setMedicalHistoryNotice(null);
      setMedicalHistorySuccess(null);

      try {
        const response = await fetch(`${apiBase}/patient/user/${patientUserId}/history`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (response.status === 404) {
          if (!isCancelled) {
            setMedicalHistoryData(createInitialMedicalHistory());
            setMedicalHistoryNotice('El paciente aún no registra una historia médica.');
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch medical history (${response.status})`);
        }

        const payload = (await response.json()) as RemotePatientMedicalHistory | null;

        if (!isCancelled) {
          const mappedHistory = mapRemoteMedicalHistoryToState(payload);
          setMedicalHistoryData(mappedHistory);
        }
      } catch (error: any) {
        if (isCancelled || error?.name === 'AbortError') {
          return;
        }
        console.error('Failed to load patient medical history', error);
        setMedicalHistoryError('No se pudo cargar la historia médica. Intenta nuevamente.');
      } finally {
        if (!isCancelled) {
          setIsLoadingMedicalHistory(false);
        }
      }
    };

    void fetchMedicalHistory();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [apiBase, selectedPatient?.userId, shouldShowDoctorTabs, token]);

  useEffect(() => {
    if (!shouldShowDoctorTabs) {
      resetDentalState(null);
      return;
    }

    const patientId = selectedPatient?.id ?? null;

    if (!patientId) {
      resetDentalState(null);
      return;
    }

    if (!token) {
      resetDentalState('No se pudo autenticar la solicitud. Intenta iniciar sesión nuevamente.');
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadDentalData = async () => {
      setIsLoadingDental(true);
      setDentalLoadError(null);

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const presenceRes = await fetch(
          `${apiBase}/patients/history/${patientId}/dental-exams/presence`,
          {
            method: 'GET',
            headers,
            signal: controller.signal,
          },
        );

        let presenceRecord: any = null;
        if (presenceRes.status === 404 || presenceRes.status === 204) {
          presenceRecord = null;
        } else if (!presenceRes.ok) {
          throw new Error(`Failed to fetch dental presence (${presenceRes.status})`);
        } else {
          const payload = await presenceRes.json().catch(() => null);
          if (Array.isArray(payload)) {
            presenceRecord = payload[0] ?? null;
          } else {
            presenceRecord = payload;
          }
        }

        const examRes = await fetch(
          `${apiBase}/patients/history/${patientId}/dental-exams`,
          {
            method: 'GET',
            headers,
            signal: controller.signal,
          },
        );

        let examRecord: any = null;
        if (examRes.status === 404 || examRes.status === 204) {
          examRecord = null;
        } else if (!examRes.ok) {
          throw new Error(`Failed to fetch dental findings (${examRes.status})`);
        } else {
          const payload = await examRes.json().catch(() => null);
          if (Array.isArray(payload)) {
            examRecord = payload[0] ?? null;
          } else {
            examRecord = payload;
          }
        }

        if (cancelled) {
          return;
        }

        if (presenceRecord && typeof presenceRecord === 'object') {
          const nextPresence = createInitialDentalPresence();
          if (presenceRecord.presence && typeof presenceRecord.presence === 'object') {
            DENTAL_FIELDS.forEach((field) => {
              const raw = presenceRecord.presence[field];
              if (typeof raw === 'boolean') {
                nextPresence[field] = raw;
              } else if (typeof raw === 'number') {
                nextPresence[field] = raw === 1;
              } else if (raw === null) {
                nextPresence[field] = null;
              } else {
                nextPresence[field] = null;
              }
            });
          }

          setDentalPresenceRecordId(
            typeof presenceRecord.id === 'number' ? presenceRecord.id : null,
          );
          setDentalPresence(nextPresence);
        } else {
          setDentalPresenceRecordId(null);
          setDentalPresence(createInitialDentalPresence());
        }

        if (examRecord && typeof examRecord === 'object') {
          const nextFindings = createInitialDentalFindings();
          if (examRecord.details && typeof examRecord.details === 'object') {
            DENTAL_FIELDS.forEach((field) => {
              const raw = examRecord.details[field];
              if (typeof raw === 'string') {
                nextFindings[field] = raw;
              } else if (raw === null || typeof raw === 'undefined') {
                nextFindings[field] = '';
              } else {
                nextFindings[field] = String(raw ?? '');
              }
            });
          }

          setDentalExamRecordId(
            typeof examRecord.id === 'number' ? examRecord.id : null,
          );
          setDentalFindings(nextFindings);
        } else {
          setDentalExamRecordId(null);
          setDentalFindings(createInitialDentalFindings());
        }
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') {
          return;
        }

        console.error('Failed to load dental exam data', error);
        resetDentalState('No se pudo cargar el examen dental. Intenta nuevamente.');
      } finally {
        if (!cancelled) {
          setIsLoadingDental(false);
        }
      }
    };

    void loadDentalData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase, resetDentalState, selectedPatient?.id, shouldShowDoctorTabs, token]);

  useEffect(() => {
    if (!shouldShowDoctorTabs) {
      setOcularExams([]);
      setOcularLoadError(null);
      setIsLoadingOcular(false);
      return;
    }

    const patientId = selectedPatient?.id ?? null;

    if (!patientId) {
      setOcularExams([]);
      setOcularLoadError(null);
      setIsLoadingOcular(false);
      return;
    }

    if (!token) {
      setOcularLoadError('No se pudo autenticar la solicitud. Intenta iniciar sesión nuevamente.');
      setOcularExams([]);
      setIsLoadingOcular(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadOcularData = async () => {
      setIsLoadingOcular(true);
      setOcularLoadError(null);

      try {
        const response = await fetch(`${apiBase}/patients/history/${patientId}/ocular-exams`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (response.status === 204 || response.status === 404) {
          if (!cancelled) {
            setOcularExams([]);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch ocular exams (${response.status})`);
        }

        const payload = await response.json().catch(() => null);

        if (cancelled) {
          return;
        }

        const records = Array.isArray(payload)
          ? payload
          : payload
          ? [payload]
          : [];

        const normalized = normalizeOcularExamRecords(records, assetsBase);
        setOcularExams(normalized);
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') {
          return;
        }

        console.error('Failed to load ocular exam data', error);
        setOcularLoadError('No se pudo cargar el examen ocular. Intenta nuevamente.');
        setOcularExams([]);
      } finally {
        if (!cancelled) {
          setIsLoadingOcular(false);
        }
      }
    };

    void loadOcularData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase, assetsBase, ocularRefreshKey, selectedPatient?.id, shouldShowDoctorTabs, token]);

  useEffect(() => {
    if (!medicalHistorySuccess) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMedicalHistorySuccess(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [medicalHistorySuccess]);

  const loadInstrumentForAssignment = useCallback(
    async (assignment: BackendPatientInstrumentAssignment): Promise<Instrument | null> => {
      const typeId = assignment.instrumentTypeId;
      if (!typeId) {
        return null;
      }

      const cached = instrumentCache[typeId];
      if (typeof cached !== 'undefined') {
        return cached;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      try {
        const response = await fetch(`${normalizedApiBase}/instruments/by-type/${typeId}`, {
          headers,
        });

        if (!response.ok) {
          throw new Error(`Falló la carga con estado ${response.status}`);
        }

        const payload = await response.json().catch(() => []);
        const instrumentCandidate = Array.isArray(payload) && payload.length ? payload[0] : null;

        if (!instrumentCandidate) {
          setInstrumentCache((prev) => ({ ...prev, [typeId]: null }));
          return null;
        }

        const rawInstrumentId =
          instrumentCandidate?.id ??
          instrumentCandidate?.instrumento_id ??
          instrumentCandidate?.instrumentId;
        const numericInstrumentId = Number(rawInstrumentId);

        if (!Number.isFinite(numericInstrumentId)) {
          throw new Error('No se pudo determinar el identificador del instrumento.');
        }

        const instrument = await getInstrumentDetails(String(numericInstrumentId));
        setInstrumentCache((prev) => ({ ...prev, [typeId]: instrument ?? null }));
        return instrument ?? null;
      } catch (error) {
        console.error('Error al cargar el detalle del instrumento', error);
        setInstrumentCache((prev) => ({ ...prev, [typeId]: null }));
        return null;
      }
    },
    [getInstrumentDetails, instrumentCache, normalizedApiBase, token],
  );

  const resolveInstrumentIdForAssignment = useCallback(
    async (item: InstrumentAssignmentItem): Promise<number | null> => {
      if (item.instrumentId !== null) {
        return item.instrumentId;
      }

      const instrument = await loadInstrumentForAssignment(item.assignment);
      if (!instrument) {
        return null;
      }

      const numericInstrumentId = Number(instrument.id);
      if (!Number.isFinite(numericInstrumentId)) {
        return null;
      }

      setInstrumentAssignments((prev) =>
        prev.map((assignmentItem) =>
          assignmentItem.assignment.id === item.assignment.id
            ? { ...assignmentItem, instrumentId: numericInstrumentId }
            : assignmentItem,
        ),
      );

      return numericInstrumentId;
    },
    [loadInstrumentForAssignment],
  );

  const loadInstrumentAssignments = useCallback(async (): Promise<void> => {
    if (!shouldShowDoctorTabs || doctorActiveTab !== 'instruments') {
      return;
    }

    if (!selectedPatientNumericId) {
      setInstrumentAssignments([]);
      setInstrumentCommentDrafts({});
      setInstrumentActionMessages({});
      setInstrumentAssignmentsError('Selecciona un paciente para ver sus instrumentos asignados.');
      return;
    }

    if (!token) {
      setInstrumentAssignments([]);
      setInstrumentCommentDrafts({});
      setInstrumentActionMessages({});
      setInstrumentAssignmentsError('No se pudo autenticar la solicitud. Intenta iniciar sesión nuevamente.');
      return;
    }

    setIsLoadingInstrumentAssignments(true);
    setInstrumentAssignmentsError(null);
    setInstrumentNotice(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const [assignmentsRes, responsesRes, observationsRes] = await Promise.all([
        fetch(`${normalizedApiBase}/patient-instruments/patient/${selectedPatientNumericId}`, { headers }),
        fetch(`${normalizedApiBase}/patient-instruments/responses/patient/${selectedPatientNumericId}`, { headers }),
        fetch(`${normalizedApiBase}/coach-diagnostic-observation?patientId=${selectedPatientNumericId}`, { headers }),
      ]);

      if (!assignmentsRes.ok) {
        const text = await assignmentsRes.text().catch(() => null);
        throw new Error(text || `No se pudieron obtener las asignaciones (${assignmentsRes.status}).`);
      }

      if (!responsesRes.ok) {
        const text = await responsesRes.text().catch(() => null);
        throw new Error(text || `No se pudieron obtener las respuestas (${responsesRes.status}).`);
      }

      let observationsPayload: CoachDiagnosticObservation[] = [];
      if (observationsRes.ok) {
        const observationsText = await observationsRes.text();
        if (observationsText.trim().length) {
          try {
            const parsed = JSON.parse(observationsText);
            observationsPayload = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            console.error('No fue posible interpretar las observaciones del coach', parseError);
            observationsPayload = [];
          }
        }
      } else if (observationsRes.status !== 404) {
        const text = await observationsRes.text().catch(() => null);
        throw new Error(text || `No se pudieron obtener las observaciones (${observationsRes.status}).`);
      }

      const assignmentsPayload: BackendPatientInstrumentAssignment[] = await assignmentsRes
        .json()
        .catch(() => []);
      const responsesPayload: BackendInstrumentResponse[] = await responsesRes
        .json()
        .catch(() => []);

      const responsesByAssignment = new Map<number, BackendInstrumentResponse[]>();
      responsesPayload.forEach((response) => {
        const assignmentId = typeof response.patientInstrumentId === 'number' ? response.patientInstrumentId : null;
        if (assignmentId === null) {
          return;
        }
        if (!responsesByAssignment.has(assignmentId)) {
          responsesByAssignment.set(assignmentId, []);
        }
        responsesByAssignment.get(assignmentId)!.push(response);
      });

      const responsesRecord: Record<number, BackendInstrumentResponse[]> = {};
      const items = assignmentsPayload.map<InstrumentAssignmentItem>((assignment) => {
        const responseList = [...(responsesByAssignment.get(assignment.id) ?? [])].sort((a, b) => {
          const orderDiff = (a.order ?? 0) - (b.order ?? 0);
          if (orderDiff !== 0) {
            return orderDiff;
          }
          return a.id - b.id;
        });
        responsesRecord[assignment.id] = responseList;
        let instrumentId: number | null = null;
        for (const response of responseList) {
          const numericInstrumentId = Number(response.instrumentId);
          if (Number.isFinite(numericInstrumentId)) {
            instrumentId = numericInstrumentId;
            break;
          }
        }

        const isCompleted = Boolean(assignment.completed || assignment.evaluated || responseList.length > 0);
        const observation = instrumentId !== null
          ? selectObservationForInstrument(observationsPayload, instrumentId)
          : null;

        return {
          assignment,
          instrumentId,
          responsesCount: responseList.length,
          isCompleted,
          observation,
        };
      });

      items.sort((a, b) => {
        const aTimestamp = instrumentAssignmentTimestamp(a.assignment.assignedAt ?? a.assignment.createdAt);
        const bTimestamp = instrumentAssignmentTimestamp(b.assignment.assignedAt ?? b.assignment.createdAt);
        return bTimestamp - aTimestamp;
      });

      const drafts: Record<number, string> = {};
      const feedback: Record<number, { type: 'success' | 'error'; message: string } | null> = {};

      items.forEach((item) => {
        drafts[item.assignment.id] = item.observation?.comment ?? '';
        feedback[item.assignment.id] = null;
      });

      setInstrumentResponsesByAssignment(responsesRecord);
      setInstrumentAssignments(items);
      setInstrumentCommentDrafts(drafts);
      setInstrumentActionMessages(feedback);
      setInstrumentAssignmentsError(null);
    } catch (error) {
      console.error('Error al obtener las asignaciones de instrumentos', error);
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los instrumentos asignados. Intenta nuevamente.';
      setInstrumentAssignments([]);
      setInstrumentCommentDrafts({});
      setInstrumentActionMessages({});
      setInstrumentResponsesByAssignment({});
      setInstrumentAssignmentsError(message);
    } finally {
      setIsLoadingInstrumentAssignments(false);
    }
  }, [doctorActiveTab, normalizedApiBase, selectedPatientNumericId, shouldShowDoctorTabs, token]);

  useEffect(() => {
    if (!shouldShowDoctorTabs || doctorActiveTab !== 'instruments') {
      return;
    }

    void loadInstrumentAssignments();
  }, [doctorActiveTab, loadInstrumentAssignments, shouldShowDoctorTabs, instrumentAssignmentsRefreshKey]);

  const handleRefreshInstrumentAssignments = useCallback(() => {
    setInstrumentAssignmentsRefreshKey((value) => value + 1);
  }, []);

  const handleViewInstrumentResponses = useCallback(
    async (item: InstrumentAssignmentItem) => {
      const responses = instrumentResponsesByAssignment[item.assignment.id] ?? [];
      setInstrumentResponsesModalError(null);
      setInstrumentResponsesModalAssignment(item);
      setInstrumentResponsesModalData([...responses]);
      setIsInstrumentResponsesModalOpen(true);
      setIsInstrumentResponsesModalLoading(true);

      try {
        const instrument = await loadInstrumentForAssignment(item.assignment);
        setInstrumentResponsesModalInstrument(instrument);

        if (!instrument) {
          setInstrumentResponsesModalError('No se pudo cargar el detalle del instrumento asociado.');
        }
      } catch (error) {
        console.error('Error al cargar el instrumento para revisar respuestas', error);
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el detalle del instrumento asociado.';
        setInstrumentResponsesModalInstrument(null);
        setInstrumentResponsesModalError(message);
      } finally {
        setIsInstrumentResponsesModalLoading(false);
      }
    },
    [instrumentResponsesByAssignment, loadInstrumentForAssignment],
  );

  const handleCloseInstrumentResponsesModal = useCallback(() => {
    setIsInstrumentResponsesModalOpen(false);
    setInstrumentResponsesModalAssignment(null);
    setInstrumentResponsesModalData([]);
    setInstrumentResponsesModalInstrument(null);
    setInstrumentResponsesModalError(null);
  }, []);

  const handleInstrumentCommentChange = useCallback((assignmentId: number, value: string) => {
    setInstrumentCommentDrafts((prev) => ({
      ...prev,
      [assignmentId]: value,
    }));

    setInstrumentActionMessages((prev) => {
      if (!prev[assignmentId]) {
        return prev;
      }

      const next = { ...prev };
      next[assignmentId] = null;
      return next;
    });
  }, []);

  const handleSaveInstrumentComment = useCallback(
    async (assignmentId: number) => {
      const item = instrumentAssignments.find((candidate) => candidate.assignment.id === assignmentId);
      if (!item) {
        return;
      }

      const draftValue = instrumentCommentDrafts[assignmentId] ?? '';
      const trimmedComment = draftValue.trim();

      if (!trimmedComment.length) {
        setInstrumentActionMessages((prev) => ({
          ...prev,
          [assignmentId]: { type: 'error', message: 'Ingresa un comentario antes de guardarlo.' },
        }));
        return;
      }

      if (!token) {
        setInstrumentActionMessages((prev) => ({
          ...prev,
          [assignmentId]: { type: 'error', message: 'Tu sesión ha expirado. Inicia sesión nuevamente.' },
        }));
        return;
      }

      if (!selectedPatientNumericId) {
        setInstrumentActionMessages((prev) => ({
          ...prev,
          [assignmentId]: { type: 'error', message: 'No se pudo identificar al paciente asociado.' },
        }));
        return;
      }

      setInstrumentCommentSavingId(assignmentId);
      setInstrumentActionMessages((prev) => ({ ...prev, [assignmentId]: null }));

      try {
        const instrumentId = await resolveInstrumentIdForAssignment(item);
        if (!instrumentId) {
          throw new Error('No se pudo determinar el instrumento asociado a la asignación.');
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const coachName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || null;
        const endpoint = item.observation
          ? `${normalizedApiBase}/coach-diagnostic-observation/${item.observation.id}`
          : `${normalizedApiBase}/coach-diagnostic-observation`;
        const method = item.observation ? 'PATCH' : 'POST';
        const payload = item.observation
          ? {
              comentario: trimmedComment,
              coach: coachName,
            }
          : {
              id_paciente: selectedPatientNumericId,
              id_instrumento: instrumentId,
              comentario: trimmedComment,
              coach: coachName,
              fecha_aplicado: new Date().toISOString(),
            };

        const response = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => null);
          throw new Error(text || `No se pudo guardar el comentario (${response.status}).`);
        }

        const data = await response.json().catch(() => null);
        const updatedObservation =
          data && typeof data === 'object' ? (data as CoachDiagnosticObservation) : item.observation;

        setInstrumentAssignments((prev) =>
          prev.map((assignmentItem) =>
            assignmentItem.assignment.id === assignmentId
              ? {
                  ...assignmentItem,
                  instrumentId,
                  observation: updatedObservation ?? null,
                }
              : assignmentItem,
          ),
        );
        setInstrumentCommentDrafts((prev) => ({
          ...prev,
          [assignmentId]: trimmedComment,
        }));
        setInstrumentActionMessages((prev) => ({
          ...prev,
          [assignmentId]: { type: 'success', message: 'Comentario guardado correctamente.' },
        }));
        setInstrumentNotice({ type: 'success', message: 'Comentario guardado correctamente.' });
      } catch (error) {
        console.error('Error al guardar el comentario del instrumento', error);
        const message =
          error instanceof Error ? error.message : 'No se pudo guardar el comentario. Intenta nuevamente.';
        setInstrumentActionMessages((prev) => ({
          ...prev,
          [assignmentId]: { type: 'error', message },
        }));
        setInstrumentNotice({ type: 'error', message });
      } finally {
        setInstrumentCommentSavingId(null);
      }
    },
    [
      instrumentAssignments,
      instrumentCommentDrafts,
      normalizedApiBase,
      resolveInstrumentIdForAssignment,
      selectedPatientNumericId,
      token,
      user,
    ],
  );

  const handleDeleteInstrumentAssignment = useCallback(
    async (assignmentId: number) => {
      if (!token) {
        setInstrumentNotice({
          type: 'error',
          message: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
        });
        return;
      }

      setInstrumentDeletingId(assignmentId);
      setInstrumentNotice(null);

      try {
        const response = await fetch(`${normalizedApiBase}/patient-instruments/${assignmentId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const text = await response.text().catch(() => null);
          throw new Error(text || `No se pudo eliminar la asignación (${response.status}).`);
        }

        setInstrumentAssignments((prev) =>
          prev.filter((item) => item.assignment.id !== assignmentId),
        );
        setInstrumentCommentDrafts((prev) => {
          const next = { ...prev };
          delete next[assignmentId];
          return next;
        });
        setInstrumentActionMessages((prev) => {
          const next = { ...prev };
          delete next[assignmentId];
          return next;
        });
        setInstrumentNotice({ type: 'success', message: 'Asignación eliminada correctamente.' });
        handleRefreshInstrumentAssignments();
      } catch (error) {
        console.error('Error al eliminar la asignación del instrumento', error);
        const message =
          error instanceof Error ? error.message : 'No se pudo eliminar la asignación. Intenta nuevamente.';
        setInstrumentNotice({ type: 'error', message });
      } finally {
        setInstrumentDeletingId(null);
      }
    },
    [handleRefreshInstrumentAssignments, normalizedApiBase, token],
  );

  const presenceOptionClass = (value: DentalPresenceSelection): string =>
    `rounded-full border px-4 py-2 text-sm font-medium transition ${
      value === pendingPresence
        ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
    }`;

  const getToothStatusClasses = (value: boolean | null): string => {
    if (value === true) {
      return 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600';
    }
    if (value === false) {
      return 'bg-rose-500 border-rose-500 text-white hover:bg-rose-600 hover:border-rose-600';
    }
    return 'bg-white border-slate-200 text-slate-500 hover:border-slate-400';
  };

  const formatToothTooltip = (field: DentalField): string => {
    const meta = DENTAL_FIELD_META[field];
    const presenceValue = dentalPresence[field];
    const presenceLabel =
      presenceValue === true
        ? 'Presente'
        : presenceValue === false
        ? 'Ausente'
        : 'Sin registro';
    const finding = dentalFindings[field].trim();
    return `${meta.quadrantLabel} ${meta.number} - ${presenceLabel}${finding ? ` - ${finding}` : ''}`;
  };

  const handleToothClick = (field: DentalField) => {
    setSelectedTooth(field);
    setPendingPresence(presenceSelectionFromBoolean(dentalPresence[field] ?? null));
    setPendingFinding(dentalFindings[field] ?? '');
    setDentalModalError(null);
    setIsDentalModalOpen(true);
  };

  const handleDentalModalClose = () => {
    if (isSavingTooth) {
      return;
    }

    setIsDentalModalOpen(false);
    setSelectedTooth(null);
    setPendingPresence('unknown');
    setPendingFinding('');
    setDentalModalError(null);
  };

  const handleDentalSave = async () => {
    const patientId = selectedPatient?.id ?? null;

    if (!selectedTooth || !patientId || !token) {
      setDentalModalError('No se pudo identificar la pieza o el paciente.');
      return;
    }

    setIsSavingTooth(true);
    setDentalModalError(null);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const payloadPresenceValue = presenceSelectionToPayload(pendingPresence);
    const sanitizedFinding = pendingFinding.trim();

    let nextPresenceState = { ...dentalPresence };
    let nextFindingsState = { ...dentalFindings };
    let nextPresenceId = dentalPresenceRecordId;
    let nextExamId = dentalExamRecordId;

    try {
      if (payloadPresenceValue !== null || dentalPresenceRecordId !== null) {
        const presencePayload: Record<string, number | null> = {
          [selectedTooth]: payloadPresenceValue,
        };
        const presenceUrl =
          dentalPresenceRecordId !== null
            ? `${apiBase}/patients/history/${patientId}/dental-exams/presence/${dentalPresenceRecordId}`
            : `${apiBase}/patients/history/${patientId}/dental-exams/presence`;
        const presenceMethod = dentalPresenceRecordId !== null ? 'PUT' : 'POST';
        const res = await fetch(presenceUrl, {
          method: presenceMethod,
          headers,
          body: JSON.stringify(presencePayload),
        });

        if (!res.ok) {
          throw new Error(`Failed to save dental presence (${res.status})`);
        }

        const payload = await res.json().catch(() => null);
        if (payload && typeof payload === 'object') {
          if (typeof payload.id === 'number') {
            nextPresenceId = payload.id;
          }

          if (payload.presence && typeof payload.presence === 'object') {
            const updatedPresence = createInitialDentalPresence();
            DENTAL_FIELDS.forEach((field) => {
              const raw = payload.presence[field];
              if (typeof raw === 'boolean') {
                updatedPresence[field] = raw;
              } else if (typeof raw === 'number') {
                updatedPresence[field] = raw === 1;
              } else if (raw === null) {
                updatedPresence[field] = null;
              } else {
                updatedPresence[field] = null;
              }
            });
            nextPresenceState = updatedPresence;
          } else {
            nextPresenceState = {
              ...dentalPresence,
              [selectedTooth]:
                payloadPresenceValue === null ? null : payloadPresenceValue === 1,
            };
          }
        }
      } else {
        nextPresenceState = {
          ...dentalPresence,
          [selectedTooth]: null,
        };
      }

      const hasExistingExam = dentalExamRecordId !== null;
      if (hasExistingExam || sanitizedFinding.length > 0) {
        const examPayload: Record<string, string | null> = {
          [selectedTooth]: sanitizedFinding.length > 0 ? sanitizedFinding : null,
        };
        const examUrl =
          hasExistingExam
            ? `${apiBase}/patients/history/${patientId}/dental-exams/${dentalExamRecordId}`
            : `${apiBase}/patients/history/${patientId}/dental-exams`;
        const examMethod = hasExistingExam ? 'PUT' : 'POST';
        const res = await fetch(examUrl, {
          method: examMethod,
          headers,
          body: JSON.stringify(examPayload),
        });

        if (!res.ok) {
          throw new Error(`Failed to save dental finding (${res.status})`);
        }

        const payload = await res.json().catch(() => null);
        if (payload && typeof payload === 'object') {
          if (typeof payload.id === 'number') {
            nextExamId = payload.id;
          }

          if (payload.details && typeof payload.details === 'object') {
            const updatedFindings = createInitialDentalFindings();
            DENTAL_FIELDS.forEach((field) => {
              const raw = payload.details[field];
              if (typeof raw === 'string') {
                updatedFindings[field] = raw;
              } else if (raw === null || typeof raw === 'undefined') {
                updatedFindings[field] = '';
              } else {
                updatedFindings[field] = String(raw ?? '');
              }
            });
            nextFindingsState = updatedFindings;
          } else {
            nextFindingsState = {
              ...dentalFindings,
              [selectedTooth]: sanitizedFinding,
            };
          }
        }
      } else {
        nextFindingsState = {
          ...dentalFindings,
          [selectedTooth]: '',
        };
      }

      setDentalPresence(nextPresenceState);
      setDentalFindings(nextFindingsState);
      setDentalPresenceRecordId(nextPresenceId);
      setDentalExamRecordId(nextExamId);
      setIsDentalModalOpen(false);
      setSelectedTooth(null);
      setPendingPresence('unknown');
      setPendingFinding('');
    } catch (error) {
      console.error('Failed to save dental exam data', error);
      setDentalModalError('No se pudo guardar la información dental. Intenta nuevamente.');
    } finally {
      setIsSavingTooth(false);
    }
  };

  const handleOpenOcularModal = () => {
    setOcularModalError(null);
    setOcularForm(createInitialOcularForm());
    setOcularFormResetKey((value) => value + 1);
    setIsOcularModalOpen(true);
  };

  const handleCloseOcularModal = () => {
    if (isSavingOcularExam) {
      return;
    }

    setIsOcularModalOpen(false);
    setOcularModalError(null);
  };

  type OcularTextField = 'date' | 'reason' | 'rightObservation' | 'leftObservation' | 'comment';

  const handleOcularFieldChange = (field: OcularTextField, value: string) => {
    setOcularForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  type OcularFileField = 'rightEyeFile' | 'leftEyeFile';

  const handleOcularFileChange = (field: OcularFileField, file: File | null) => {
    setOcularForm((prev) => ({
      ...prev,
      [field]: file,
    }));
  };

  const handleSubmitOcularExam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const patientId = selectedPatient?.id ?? null;

    if (!patientId || !token) {
      setOcularModalError('No se pudo identificar al paciente autenticado. Intenta nuevamente.');
      return;
    }

    setIsSavingOcularExam(true);
    setOcularModalError(null);

    const toNullable = (value: string): string | null => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const normalizedDate = ocularForm.date.trim();
    const formData = new FormData();

    if (normalizedDate) {
      formData.append('fecha', normalizedDate);
    }

    const motivo = toNullable(ocularForm.reason);
    if (motivo) {
      formData.append('motivo', motivo);
    }

    const observacionDerecho = toNullable(ocularForm.rightObservation);
    if (observacionDerecho) {
      formData.append('observacion_derecho', observacionDerecho);
    }

    const observacionIzquierdo = toNullable(ocularForm.leftObservation);
    if (observacionIzquierdo) {
      formData.append('observacion_izquierdo', observacionIzquierdo);
    }

    const comentario = toNullable(ocularForm.comment);
    if (comentario) {
      formData.append('comentario', comentario);
    }

    if (ocularForm.rightEyeFile) {
      formData.append('rightEyeImage', ocularForm.rightEyeFile);
    }

    if (ocularForm.leftEyeFile) {
      formData.append('leftEyeImage', ocularForm.leftEyeFile);
    }

    try {
      const response = await fetch(`${apiBase}/patients/history/${patientId}/ocular-exams`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to create ocular exam (${response.status})`);
      }

      setIsOcularModalOpen(false);
      setOcularForm(createInitialOcularForm());
      setOcularFormResetKey((value) => value + 1);
      setOcularModalError(null);
      setOcularRefreshKey((value) => value + 1);
    } catch (error) {
      console.error('Failed to create ocular exam', error);
      setOcularModalError('No se pudo registrar el examen ocular. Intenta nuevamente.');
    } finally {
      setIsSavingOcularExam(false);
    }
  };

  const renderQuadrant = (key: DentalQuadrantKey) => {
    const config = DENTAL_FIELD_GROUPS[key];

    return (
      <div key={key} className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.2em]">
          {config.label}
        </h4>
        <div className="flex flex-wrap gap-2">
          {config.order.map((field) => {
            const meta = DENTAL_FIELD_META[field];
            const status = dentalPresence[field];
            const finding = dentalFindings[field].trim();
            return (
              <button
                key={field}
                type="button"
                onClick={() => handleToothClick(field)}
                title={formatToothTooltip(field)}
                className={`relative h-10 w-10 rounded-full border text-sm font-semibold transition ${getToothStatusClasses(status)} focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2`}
              >
                {meta.number}
                {finding && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const vitalsUrl = useMemo(() => {
    if (!token) {
      return null;
    }

    if (!isPatient && isTherapist && !selectedPatient) {
      return null;
    }

    if (selectedPatient) {
      if (selectedPatient.id) {
        return `${apiBase}/vitals/patient/${selectedPatient.id}`;
      }
      if (selectedPatient.userId) {
        return `${apiBase}/vitals/user/${selectedPatient.userId}`;
      }
      return null;
    }

    if (user?.id) {
      return `${apiBase}/vitals/user/${user.id}`;
    }

    return null;
  }, [apiBase, isPatient, isTherapist, selectedPatient?.id, selectedPatient?.userId, token, user?.id]);

  const dateFromTimestamp = useMemo(() => parseDateInput(dateFrom, false), [dateFrom]);
  const dateToTimestamp = useMemo(() => parseDateInput(dateTo, true), [dateTo]);

  const clearDateFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
  }, []);

  const fetchVitals = useCallback(
    async ({ signal }: { signal?: AbortSignal } = {}) => {
      if (!token || !vitalsUrl) {
        setVitals(null);
        setIsLoadingVitals(false);
        setVitalsError(null);
        return;
      }

      setIsLoadingVitals(true);
      setVitalsError(null);

      try {
        const res = await fetch(vitalsUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        if (!res.ok) {
          if (res.status === 404) {
            if (!signal?.aborted) {
              setVitals(null);
            }
            return;
          }

          const message =
            res.status === 401
              ? 'No autorizado para obtener los signos vitales.'
              : `Error ${res.status} al obtener los signos vitales.`;
          throw new Error(message);
        }

        const data = (await res.json()) as PatientVitalsSummary;
        if (!signal?.aborted) {
          setVitals(data);
        }
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        console.error('No se pudieron obtener los signos vitales', error);
        setVitalsError(
          error instanceof Error
            ? error.message
            : 'No se pudieron obtener los signos vitales.'
        );
        setVitals(null);
      } finally {
        if (!signal?.aborted) {
          setIsLoadingVitals(false);
        }
      }
    },
    [token, vitalsUrl]
  );

  const handleMedicalHistorySubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedPatient) {
        setMedicalHistoryError('Selecciona un paciente para actualizar la historia médica.');
        return;
      }

      if (!selectedPatient.userId) {
        setMedicalHistoryError('El paciente no tiene un usuario vinculado para actualizar la historia médica.');
        return;
      }

      if (!token) {
        setMedicalHistoryError('No se pudo autenticar la solicitud. Intenta iniciar sesión nuevamente.');
        return;
      }

      setIsSavingMedicalHistory(true);
      setMedicalHistoryError(null);
      setMedicalHistoryNotice(null);

      try {
        const payload = buildUpdatePayload(medicalHistoryData);
        const response = await fetch(`${apiBase}/patient/user/${selectedPatient.userId}/history`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to update medical history (${response.status})`);
        }

        const updated = (await response.json()) as RemotePatientMedicalHistory | null;
        const mappedHistory = mapRemoteMedicalHistoryToState(updated);
        setMedicalHistoryData(mappedHistory);
        setMedicalHistorySuccess('Historia médica guardada correctamente.');
      } catch (error) {
        console.error('Failed to save medical history', error);
        setMedicalHistoryError('No se pudo guardar la historia médica. Intenta nuevamente.');
      } finally {
        setIsSavingMedicalHistory(false);
      }
    },
    [apiBase, medicalHistoryData, selectedPatient, token]
  );

  const registerVital = useCallback(
    async (path: string, payload: Record<string, unknown> | FormData) => {
      if (resolvedUserId === null) {
        throw new Error('No se pudo determinar el usuario asociado al registro.');
      }

      if (!token) {
        throw new Error('Sesion no valida. Inicia sesion nuevamente.');
      }

      const isFormData = payload instanceof FormData;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${apiBase}/vitals/user/${resolvedUserId}/${path}`, {
        method: 'POST',
        headers,
        body: isFormData ? payload : JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `Error ${response.status} al registrar ${path}.`;
        try {
          const body = await response.json();
          const bodyMessage = Array.isArray(body?.message) ? body.message[0] : body?.message;
          if (typeof bodyMessage === 'string' && bodyMessage.trim().length) {
            message = bodyMessage;
          }
        } catch (error) {
          console.warn('Fallo al parsear la respuesta del registro de vitales', error);
        }
        throw new Error(message);
      }

      try {
        return await response.json();
      } catch {
        return null;
      }
    },
    [apiBase, resolvedUserId, token]
  );

  const updateVital = useCallback(
    async (path: string, recordId: number, payload: Record<string, unknown>) => {
      if (resolvedUserId === null) {
        throw new Error('No se pudo determinar el usuario asociado al registro.');
      }

      if (!token) {
        throw new Error('Sesion no valida. Inicia sesion nuevamente.');
      }

      const sanitizedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      );

      const response = await fetch(
        `${apiBase}/vitals/user/${resolvedUserId}/${path}/${recordId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(sanitizedPayload),
        }
      );

      if (!response.ok) {
        let message = `Error ${response.status} al actualizar ${path}.`;
        try {
          const body = await response.json();
          const bodyMessage = Array.isArray(body?.message) ? body.message[0] : body?.message;
          if (typeof bodyMessage === 'string' && bodyMessage.trim().length) {
            message = bodyMessage;
          }
        } catch (error) {
          console.warn('Fallo al parsear la respuesta de actualizacion de vitales', error);
        }
        throw new Error(message);
      }

      try {
        return await response.json();
      } catch {
        return null;
      }
    },
    [apiBase, resolvedUserId, token]
  );

  const deleteVital = useCallback(
    async (path: string, recordId: number) => {
      if (resolvedUserId === null) {
        throw new Error('No se pudo determinar el usuario asociado al registro.');
      }

      if (!token) {
        throw new Error('Sesion no valida. Inicia sesion nuevamente.');
      }

      const response = await fetch(
        `${apiBase}/vitals/user/${resolvedUserId}/${path}/${recordId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let message = `Error ${response.status} al eliminar ${path}.`;
        try {
          const body = await response.json();
          const bodyMessage = Array.isArray(body?.message) ? body.message[0] : body?.message;
          if (typeof bodyMessage === 'string' && bodyMessage.trim().length) {
            message = bodyMessage;
          }
        } catch (error) {
          console.warn('Fallo al parsear la respuesta de eliminacion de vitales', error);
        }
        throw new Error(message);
      }
    },
    [apiBase, resolvedUserId, token]
  );

  const handleOpenEdit = useCallback(
    (
      type: EditableVitalType,
      record: NumericVitalRecord | BloodPressureRecord | HeartRateRecoveryRecord,
    ) => {
      switch (type) {
        case 'weight':
        case 'pulse':
        case 'glycemia':
          setEditState({ type, record: record as NumericVitalRecord });
          break;
        case 'blood_pressure':
          setEditState({ type, record: record as BloodPressureRecord });
          break;
        case 'heart_rate':
          setEditState({ type, record: record as HeartRateRecoveryRecord });
          break;
        default:
          break;
      }
    },
    []
  );

  const handleOpenDelete = useCallback(
    (
      type: EditableVitalType,
      record: NumericVitalRecord | BloodPressureRecord | HeartRateRecoveryRecord,
    ) => {
      switch (type) {
        case 'weight':
        case 'pulse':
        case 'glycemia':
          setDeleteState({ type, record: record as NumericVitalRecord });
          break;
        case 'blood_pressure':
          setDeleteState({ type, record: record as BloodPressureRecord });
          break;
        case 'heart_rate':
          setDeleteState({ type, record: record as HeartRateRecoveryRecord });
          break;
        default:
          break;
      }
    },
    []
  );
  const handleCloseEditModal = useCallback(() => {
    if (isProcessingEdit) {
      return;
    }
    setEditError(null);
    setEditState(null);
  }, [isProcessingEdit]);

  const handleCloseDeleteModal = useCallback(() => {
    if (isProcessingDelete) {
      return;
    }
    setDeleteError(null);
    setDeleteState(null);
  }, [isProcessingDelete]);

  const handleEditSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!editState) {
        return;
      }

      setEditError(null);
      setIsProcessingEdit(true);

      const payload: Record<string, unknown> = {};
      const isoDate = combineDateAndTimeToIso(editForm.date, editForm.time);
      if (isoDate) {
        payload.fecha = isoDate;
      }

      const normalizeField = (key: string): string | null | undefined => {
        if (!(key in editForm.numericValues)) {
          return undefined;
        }
        const raw = editForm.numericValues[key];
        if (typeof raw !== 'string') {
          return undefined;
        }
        const trimmed = raw.trim();
        if (!trimmed.length) {
          return null;
        }
        return normalizeNumberInput(trimmed);
      };

      try {
        switch (editState.type) {
          case 'weight': {
            const value = normalizeField('value');
            if (value !== undefined) {
              payload.peso = value;
            }
            break;
          }
          case 'pulse': {
            const value = normalizeField('value');
            if (value !== undefined) {
              payload.pulso = value;
            }
            break;
          }
          case 'glycemia': {
            const value = normalizeField('value');
            if (value !== undefined) {
              payload.glicemia = value;
            }
            break;
          }
          case 'blood_pressure': {
            const systolic = normalizeField('systolic');
            const diastolic = normalizeField('diastolic');
            if (systolic !== undefined) {
              payload.sistolica = systolic;
            }
            if (diastolic !== undefined) {
              payload.diastolica = diastolic;
            }
            break;
          }
          case 'heart_rate': {
            HEART_RATE_FORM_FIELDS.forEach(field => {
              const value = normalizeField(field.metricKey);
              if (value !== undefined) {
                payload[field.dtoKey] = value;
              }
            });
            payload.entrenamiento = editForm.sessionType.trim().length
              ? editForm.sessionType.trim()
              : null;
            break;
          }
          default:
            break;
        }

        if (!Object.keys(payload).length) {
          setEditError('No hay cambios para guardar.');
          setIsProcessingEdit(false);
          return;
        }

        await updateVital(VITAL_ENDPOINTS[editState.type], editState.record.id, payload);
        await fetchVitals();
        setEditState(null);
      } catch (error) {
        console.error('Fallo la actualizacion de signos vitales', error);
        setEditError(
          error instanceof Error
            ? error.message
            : 'No fue posible actualizar el registro. Intenta nuevamente.',
        );
      } finally {
        setIsProcessingEdit(false);
      }
    },
    [editForm.date, editForm.numericValues, editForm.sessionType, editForm.time, editState, fetchVitals, updateVital]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteState) {
      return;
    }

    setDeleteError(null);
    setIsProcessingDelete(true);

    try {
      await deleteVital(VITAL_ENDPOINTS[deleteState.type], deleteState.record.id);
      await fetchVitals();
      setDeleteState(null);
    } catch (error) {
      console.error('Fallo la eliminacion de signos vitales', error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'No fue posible eliminar el registro. Intenta nuevamente.',
      );
    } finally {
      setIsProcessingDelete(false);
    }
  }, [deleteState, deleteVital, fetchVitals]);

  const toggleSection = useCallback((section: VitalSectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);


  useEffect(() => {
    if (!vitalsUrl || !token) {
      setVitals(null);
      setIsLoadingVitals(false);
      return;
    }

    const controller = new AbortController();
    fetchVitals({ signal: controller.signal }).catch(error => {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Error inesperado al obtener los signos vitales', error);
    });

    return () => {
      controller.abort();
    };
  }, [fetchVitals, token, vitalsUrl]);

  useEffect(() => {
    if (!editState) {
      setEditForm({ date: '', time: '', numericValues: {}, sessionType: '' });
      setEditError(null);
      return;
    }

    const { date, time } = extractDateParts(editState.record.recordedAt);
    const numericValues: Record<string, string> = {};

    switch (editState.type) {
      case 'weight':
      case 'pulse':
      case 'glycemia': {
        const record = editState.record as NumericVitalRecord;
        const rawValue = record.rawValue ?? (record.value !== null && record.value !== undefined ? String(record.value) : '');
        numericValues.value = rawValue ?? '';
        break;
      }
      case 'blood_pressure': {
        const record = editState.record as BloodPressureRecord;
        numericValues.systolic = record.systolic !== null && record.systolic !== undefined ? String(record.systolic) : '';
        numericValues.diastolic = record.diastolic !== null && record.diastolic !== undefined ? String(record.diastolic) : '';
        break;
      }
      case 'heart_rate': {
        const record = editState.record as HeartRateRecoveryRecord;
        HEART_RATE_FORM_FIELDS.forEach(field => {
          const metricValue = record[field.metricKey];
          numericValues[field.metricKey] =
            metricValue === null || metricValue === undefined ? '' : String(metricValue);
        });
        break;
      }
      default:
        break;
    }

    setEditForm({
      date,
      time,
      numericValues,
      sessionType: editState.type === 'heart_rate' ? editState.record.sessionType ?? '' : '',
    });
    setEditError(null);
  }, [editState]);

  useEffect(() => {
    if (deleteState) {
      setDeleteError(null);
    }
  }, [deleteState]);

  const filterRecordsByDate = useCallback(
    <T extends { recordedAt: string | null }>(records: T[] | undefined): T[] => {
      if (!records?.length) {
        return [];
      }

      return records.filter(record => {
        const timestamp = resolveRecordedAt(record.recordedAt);

        if (dateFromTimestamp !== null && timestamp !== Number.NEGATIVE_INFINITY && timestamp < dateFromTimestamp) {
          return false;
        }

        if (dateToTimestamp !== null && timestamp !== Number.NEGATIVE_INFINITY && timestamp > dateToTimestamp) {
          return false;
        }

        return true;
      });
    },
    [dateFromTimestamp, dateToTimestamp]
  );

  const buildSingleSeries = useCallback(
    (records: NumericVitalRecord[] | undefined): SingleValuePoint[] => {
      if (!records?.length) {
        return [];
      }

      return sortByRecordedAt(records)
        .map((record, index) => {
          const numericValue = toNumeric(record.value);
          const fallbackValue = numericValue ?? toNumeric(record.rawValue);
          if (fallbackValue === null) {
            return null;
          }
          return {
            label: formatRecordedAt(record.recordedAt, index),
            value: fallbackValue,
          };
        })
        .filter((item): item is SingleValuePoint => item !== null);
    },
    [formatRecordedAt]
  );

  const filteredWeightRecords = useMemo(() => filterRecordsByDate(vitals?.weight), [filterRecordsByDate, vitals?.weight]);
  const filteredPulseRecords = useMemo(() => filterRecordsByDate(vitals?.pulse), [filterRecordsByDate, vitals?.pulse]);
  const filteredGlycemiaRecords = useMemo(() => filterRecordsByDate(vitals?.glycemia), [filterRecordsByDate, vitals?.glycemia]);
  const filteredBloodPressureRecords = useMemo(
    () => filterRecordsByDate(vitals?.bloodPressure),
    [filterRecordsByDate, vitals?.bloodPressure]
  );
  const filteredBmiRecords = useMemo(() => filterRecordsByDate(vitals?.bodyMassIndex), [filterRecordsByDate, vitals?.bodyMassIndex]);
  const filteredHeartRateRecords = useMemo(
    () => filterRecordsByDate(vitals?.heartRateRecovery),
    [filterRecordsByDate, vitals?.heartRateRecovery]
  );

  const weightChartData = useMemo(() => buildSingleSeries(filteredWeightRecords), [buildSingleSeries, filteredWeightRecords]);
  const pulseChartData = useMemo(() => buildSingleSeries(filteredPulseRecords), [buildSingleSeries, filteredPulseRecords]);
  const glycemiaChartData = useMemo(() => buildSingleSeries(filteredGlycemiaRecords), [buildSingleSeries, filteredGlycemiaRecords]);

  const bloodPressureChartData = useMemo<BloodPressurePoint[]>(() => {
    if (!filteredBloodPressureRecords.length) {
      return [];
    }

    return sortByRecordedAt(filteredBloodPressureRecords)
      .map((record, index) => {
        const systolic = toNumeric(record.systolic);
        const diastolic = toNumeric(record.diastolic);
        if (systolic === null && diastolic === null) {
          return null;
        }
        return {
          label: formatRecordedAt(record.recordedAt, index),
          systolic,
          diastolic,
        };
      })
      .filter((item): item is BloodPressurePoint => item !== null);
  }, [filteredBloodPressureRecords, formatRecordedAt]);

  const weightRows = useMemo<WeightRow[]>(() => {
    if (!filteredWeightRecords.length) {
      return [];
    }

    return sortByRecordedAtDesc(filteredWeightRecords).map((record, index) => {
      const numericValue = toNumeric(record.value);
      const fallbackValue = numericValue ?? toNumeric(record.rawValue);

      return {
        id: record.id,
        label: formatRecordedAt(record.recordedAt, index),
        source: record.source,
        value: fallbackValue,
        rawValue: record.rawValue,
        record,
      } satisfies WeightRow;
    });
  }, [filteredWeightRecords, formatRecordedAt]);

  const pulseRows = useMemo<PulseRow[]>(() => {
    if (!filteredPulseRecords.length) {
      return [];
    }

    return sortByRecordedAtDesc(filteredPulseRecords).map((record, index) => {
      const numericValue = toNumeric(record.value);
      const fallbackValue = numericValue ?? toNumeric(record.rawValue);

      return {
        id: record.id,
        label: formatRecordedAt(record.recordedAt, index),
        source: record.source,
        value: fallbackValue,
        rawValue: record.rawValue,
        record,
      } satisfies PulseRow;
    });
  }, [filteredPulseRecords, formatRecordedAt]);

  const glycemiaRows = useMemo<GlycemiaRow[]>(() => {
    if (!filteredGlycemiaRecords.length) {
      return [];
    }

    return sortByRecordedAtDesc(filteredGlycemiaRecords).map((record, index) => {
      const numericValue = toNumeric(record.value);
      const fallbackValue = numericValue ?? toNumeric(record.rawValue);

      return {
        id: record.id,
        label: formatRecordedAt(record.recordedAt, index),
        source: record.source,
        value: fallbackValue,
        rawValue: record.rawValue,
        record,
      } satisfies GlycemiaRow;
    });
  }, [filteredGlycemiaRecords, formatRecordedAt]);

  const bloodPressureRows = useMemo<BloodPressureRow[]>(() => {
    if (!filteredBloodPressureRecords.length) {
      return [];
    }

    return sortByRecordedAtDesc(filteredBloodPressureRecords).map((record, index) => ({
      id: record.id,
      label: formatRecordedAt(record.recordedAt, index),
      source: record.source,
      systolic: toNumeric(record.systolic),
      diastolic: toNumeric(record.diastolic),
      rawValue: record.rawValue,
      record,
    } satisfies BloodPressureRow));
  }, [filteredBloodPressureRecords, formatRecordedAt]);

  const bmiRows = useMemo<BmiRow[]>(() => {
    if (!filteredBmiRecords.length) {
      return [];
    }

    return sortByRecordedAtDesc(filteredBmiRecords).map((record, index) => {
      const value = toNumeric(record.value);
      const normalizedPhotos = Array.isArray(record.photos)
        ? record.photos
            .map<BodyMassPhotoRow | null>(photo => {
              if (!photo || typeof photo.path !== 'string') {
                return null;
              }

              const url = computeBodyMassPhotoUrl(photo.path, assetsBase, photo.type);
              if (!url) {
                return null;
              }

              const type = typeof photo.type === 'string' && photo.type.trim().length > 0 ? photo.type.trim() : 'unknown';
              const labelSource =
                typeof photo.label === 'string' && photo.label.trim().length > 0
                  ? photo.label.trim()
                  : BODY_MASS_PHOTO_FALLBACK_LABELS[type] ?? 'Foto corporal';

              return {
                type,
                label: labelSource,
                url,
                path: photo.path,
              } satisfies BodyMassPhotoRow;
            })
            .filter((photo): photo is BodyMassPhotoRow => photo !== null)
        : [];

      return {
        id: record.id,
        label: formatRecordedAt(record.recordedAt, index),
        bmi: value,
        category: getBmiCategory(value),
        source: record.source,
        record,
        photos: normalizedPhotos,
      } satisfies BmiRow;
    });
  }, [assetsBase, filteredBmiRecords, formatRecordedAt]);

  const heartRateRows = useMemo<HeartRateRow[]>(() => {
    if (!filteredHeartRateRecords.length) {
      return [];
    }

    return sortByRecordedAtDesc(filteredHeartRateRecords).map((record, index) => ({
      id: record.id,
      label: formatRecordedAt(record.recordedAt, index),
      sessionType: record.sessionType,
      source: record.source,
      record,
      resting: toNumeric(record.resting),
      after5Minutes: toNumeric(record.after5Minutes),
      after10Minutes: toNumeric(record.after10Minutes),
      after15Minutes: toNumeric(record.after15Minutes),
      after30Minutes: toNumeric(record.after30Minutes),
      after45Minutes: toNumeric(record.after45Minutes),
    }));
  }, [filteredHeartRateRecords, formatRecordedAt]);

  const totalRecords = useMemo(() => {
    return (
      weightRows.length +
      pulseRows.length +
      glycemiaRows.length +
      bloodPressureRows.length +
      bmiRows.length +
      heartRateRows.length
    );
  }, [weightRows, pulseRows, glycemiaRows, bloodPressureRows, bmiRows, heartRateRows]);

  const trackedMetricsCount = useMemo(() => {
    return [weightRows, pulseRows, glycemiaRows, bloodPressureRows, bmiRows, heartRateRows]
      .filter(rows => rows.length > 0)
      .length;
  }, [weightRows, pulseRows, glycemiaRows, bloodPressureRows, bmiRows, heartRateRows]);

  const lastRecordedLabel = useMemo(() => {
    let latest = Number.NEGATIVE_INFINITY;

    const captureLatest = (records?: Array<{ recordedAt: string | null }>) => {
      records?.forEach(record => {
        const timestamp = resolveRecordedAt(record.recordedAt);
        if (timestamp > latest) {
          latest = timestamp;
        }
      });
    };

    captureLatest(filteredWeightRecords);
    captureLatest(filteredPulseRecords);
    captureLatest(filteredGlycemiaRecords);
    captureLatest(filteredBloodPressureRecords);
    captureLatest(filteredBmiRecords);
    captureLatest(filteredHeartRateRecords);

    if (!Number.isFinite(latest) || latest === Number.NEGATIVE_INFINITY) {
      return 'Sin registros';
    }

    try {
      return dateFormatter.format(new Date(latest));
    } catch {
      return 'Sin registros';
    }
  }, [
    dateFormatter,
    filteredWeightRecords,
    filteredPulseRecords,
    filteredGlycemiaRecords,
    filteredBloodPressureRecords,
    filteredBmiRecords,
    filteredHeartRateRecords,
  ]);

  const weightColumns = useMemo(() => {
    const columns: Array<{
      key: string;
      header: string;
      render?: (row: WeightRow) => React.ReactNode;
    }> = [
      { key: 'label', header: 'Fecha' },
      {
        key: 'value',
        header: 'Peso (kg)',
        render: (row: WeightRow): React.ReactNode => formatDecimal(row.value, 1),
      },
      {
        key: 'source',
        header: 'Origen',
        render: (row: WeightRow): React.ReactNode => SOURCE_LABELS[row.source] ?? row.source,
      },
    ];

    if (canManageRecords) {
      columns.push({
        key: 'actions',
        header: 'Acciones',
        render: (row: WeightRow): React.ReactNode => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={event => {
                event.stopPropagation();
                handleOpenEdit('weight', row.record);
              }}
              disabled={isProcessingEdit}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={event => {
                event.stopPropagation();
                handleOpenDelete('weight', row.record);
              }}
              disabled={isProcessingDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      });
    }

    return columns;
  }, [canManageRecords, handleOpenDelete, handleOpenEdit, isProcessingDelete, isProcessingEdit]);

  const pulseColumns = useMemo(() => {
    const columns: Array<{
      key: string;
      header: string;
      render?: (row: PulseRow) => React.ReactNode;
    }> = [
      { key: 'label', header: 'Fecha' },
      {
        key: 'value',
        header: 'Pulso (bpm)',
        render: (row: PulseRow): React.ReactNode => formatDecimal(row.value, 0),
      },
      {
        key: 'source',
        header: 'Origen',
        render: (row: PulseRow): React.ReactNode => SOURCE_LABELS[row.source] ?? row.source,
      },
    ];

    if (canManageRecords) {
      columns.push({
        key: 'actions',
        header: 'Acciones',
        render: (row: PulseRow): React.ReactNode => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={event => {
                event.stopPropagation();
                handleOpenEdit('pulse', row.record);
              }}
              disabled={isProcessingEdit}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={event => {
                event.stopPropagation();
                handleOpenDelete('pulse', row.record);
              }}
              disabled={isProcessingDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      });
    }

    return columns;
  }, [canManageRecords, handleOpenDelete, handleOpenEdit, isProcessingDelete, isProcessingEdit]);

  const glycemiaColumns = useMemo(() => {
    const columns: Array<{
      key: string;
      header: string;
      render?: (row: GlycemiaRow) => React.ReactNode;
    }> = [
      { key: 'label', header: 'Fecha' },
      {
        key: 'value',
        header: 'Glicemia (mg/dL)',
        render: (row: GlycemiaRow): React.ReactNode => formatDecimal(row.value, 0),
      },
      {
        key: 'source',
        header: 'Origen',
        render: (row: GlycemiaRow): React.ReactNode => SOURCE_LABELS[row.source] ?? row.source,
      },
    ];

    if (canManageRecords) {
      columns.push({
        key: 'actions',
        header: 'Acciones',
        render: (row: GlycemiaRow): React.ReactNode => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={event => {
                event.stopPropagation();
                handleOpenEdit('glycemia', row.record);
              }}
              disabled={isProcessingEdit}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={event => {
                event.stopPropagation();
                handleOpenDelete('glycemia', row.record);
              }}
              disabled={isProcessingDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      });
    }

    return columns;
  }, [canManageRecords, handleOpenDelete, handleOpenEdit, isProcessingDelete, isProcessingEdit]);

  const bloodPressureColumns = useMemo(() => {
    const columns: Array<{
      key: string;
      header: string;
      render?: (row: BloodPressureRow) => React.ReactNode;
    }> = [
      { key: 'label', header: 'Fecha' },
      {
        key: 'systolic',
        header: 'Sistolica (mmHg)',
        render: (row: BloodPressureRow): React.ReactNode => formatDecimal(row.systolic, 0),
      },
      {
        key: 'diastolic',
        header: 'Diastolica (mmHg)',
        render: (row: BloodPressureRow): React.ReactNode => formatDecimal(row.diastolic, 0),
      },
      {
        key: 'source',
        header: 'Origen',
        render: (row: BloodPressureRow): React.ReactNode => SOURCE_LABELS[row.source] ?? row.source,
      },
    ];

    if (canManageRecords) {
      columns.push({
        key: 'actions',
        header: 'Acciones',
        render: (row: BloodPressureRow): React.ReactNode => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={event => {
                event.stopPropagation();
                handleOpenEdit('blood_pressure', row.record);
              }}
              disabled={isProcessingEdit}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={event => {
                event.stopPropagation();
                handleOpenDelete('blood_pressure', row.record);
              }}
              disabled={isProcessingDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      });
    }

    return columns;
  }, [canManageRecords, handleOpenDelete, handleOpenEdit, isProcessingDelete, isProcessingEdit]);

  const hasVitalsData = useMemo(
    () =>
      Boolean(
        weightChartData.length ||
          pulseChartData.length ||
          bloodPressureChartData.length ||
          glycemiaChartData.length ||
          bmiRows.length ||
          heartRateRows.length
      ),
    [
      bloodPressureChartData.length,
      bmiRows.length,
      glycemiaChartData.length,
      heartRateRows.length,
      pulseChartData.length,
      weightChartData.length,
    ]
  );

  const bmiColumns = useMemo(
    () => [
      { key: 'label', header: 'Fecha' },
      {
        key: 'bmi',
        header: 'BMI',
        render: (row: BmiRow) => formatDecimal(row.bmi, 1),
      },
      { key: 'category', header: 'Clasificacion' },
      {
        key: 'photos',
        header: 'Fotos',
        className: '!whitespace-normal align-top',
        render: (row: BmiRow) => {
          if (!row.photos.length) {
            return EMPTY_VALUE;
          }

          return (
            <div className="flex flex-wrap gap-3">
              {row.photos.map(photo => (
                <div
                  key={`${row.id}-${photo.type}-${photo.path}`}
                  className="flex flex-col items-center gap-1 max-w-[4.5rem]"
                >
                  <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={photo.url}
                      alt={`Foto ${photo.label}`}
                      className="h-16 w-16 rounded-md object-cover border border-gray-200 shadow-sm"
                      loading="lazy"
                    />
                  </a>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">
                    {photo.label}
                  </span>
                </div>
              ))}
            </div>
          );
        },
      },
      {
        key: 'source',
        header: 'Origen',
        render: (row: BmiRow) => SOURCE_LABELS[row.source] ?? row.source,
      },
    ],
    []
  );

  const heartRateColumns = useMemo(() => {
    const metricColumns = HEART_RATE_FIELDS.map(field => ({
      key: field.key,
      header: field.label,
      render: (row: HeartRateRow): React.ReactNode => formatDecimal(row[field.key], 0),
    }));

    const columns: Array<{
      key: string;
      header: string;
      render?: (row: HeartRateRow) => React.ReactNode;
    }> = [
      { key: 'label', header: 'Fecha' },
      ...metricColumns,
      {
        key: 'sessionType',
        header: 'Tipo de sesion',
        render: (row: HeartRateRow): React.ReactNode => row.sessionType || EMPTY_VALUE,
      },
      {
        key: 'source',
        header: 'Origen',
        render: (row: HeartRateRow): React.ReactNode => SOURCE_LABELS[row.source] ?? row.source,
      },
    ];

    if (canManageRecords) {
      columns.push({
        key: 'actions',
        header: 'Acciones',
        render: (row: HeartRateRow): React.ReactNode => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={event => {
                event.stopPropagation();
                handleOpenEdit('heart_rate', row.record);
              }}
              disabled={isProcessingEdit}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={event => {
                event.stopPropagation();
                handleOpenDelete('heart_rate', row.record);
              }}
              disabled={isProcessingDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      });
    }

    return columns;
  }, [canManageRecords, handleOpenDelete, handleOpenEdit, isProcessingDelete, isProcessingEdit]);

  const calculateBMI = (weight: number, height: number = 1.7): number | undefined => {
    if (!Number.isFinite(weight) || !Number.isFinite(height) || height <= 0) {
      return undefined;
    }

    const bmi = weight / (height * height);
    if (!Number.isFinite(bmi)) {
      return undefined;
    }

    return Number(bmi.toFixed(1));
  };

  const bmiEstimate = useMemo(() => {
    const weightReference = formData.bodyMassWeight || formData.weight;
    if (!weightReference) {
      return undefined;
    }

    const parsedWeight = parseNumberInput(weightReference);
    if (parsedWeight === undefined) {
      return undefined;
    }

    return calculateBMI(parsedWeight);
  }, [formData.bodyMassWeight, formData.weight]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setSaveError(null);

    if (resolvedUserId === null) {
      setSaveError('No se encontro el usuario asociado para registrar los signos vitales.');
      return;
    }

    if (!token) {
      setSaveError('Sesion expirada. Inicia sesion nuevamente.');
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const queue: Array<() => Promise<unknown>> = [];

    const weightInput = normalizeNumberInput(formData.weight);
    if (weightInput) {
      queue.push(() => registerVital('weight', { peso: weightInput, fecha: nowIso }));
    }

    const bodyMassPayload: Record<string, unknown> = {};
    const bodyMassFiles: Array<{ key: string; file: File }> = [];
    let hasBodyMassPayload = false;

    const assignBodyMassMeasurement = (value: string, key: string) => {
      const normalized = normalizeNumberInput(value);
      if (!normalized) {
        return;
      }
      bodyMassPayload[key] = normalized;
      hasBodyMassPayload = true;
    };

    const assignBodyMassFile = (file: File | null, key: string) => {
      if (!file) {
        return;
      }
      bodyMassFiles.push({ key, file });
      hasBodyMassPayload = true;
    };

    assignBodyMassMeasurement(formData.bodyMassWeight, 'peso');
    assignBodyMassMeasurement(formData.bodyMassNeck, 'cuello');
    assignBodyMassMeasurement(formData.bodyMassBust, 'busto');
    assignBodyMassMeasurement(formData.bodyMassWaist, 'cintura');
    assignBodyMassMeasurement(formData.bodyMassHip, 'cadera');
    assignBodyMassMeasurement(formData.bodyMassRightArm, 'brazoDerecho');
    assignBodyMassMeasurement(formData.bodyMassRightThigh, 'musloDerecho');
    assignBodyMassFile(formData.bodyMassFacePhoto, 'fotoRostro');
    assignBodyMassFile(formData.bodyMassFrontPhoto, 'fotoCuerpoFrente');
    assignBodyMassFile(formData.bodyMassProfilePhoto, 'fotoCuerpoPerfil');
    assignBodyMassFile(formData.bodyMassBackPhoto, 'fotoEspaldaEntero');
    assignBodyMassFile(formData.bodyMassExtraPhoto, 'fotoExtra');

    if (hasBodyMassPayload) {
      bodyMassPayload.fecha = nowIso;
      let requestPayload: Record<string, unknown> | FormData = bodyMassPayload;

      if (bodyMassFiles.length) {
        const formDataPayload = new FormData();
        Object.entries(bodyMassPayload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formDataPayload.append(key, String(value));
          }
        });

        bodyMassFiles.forEach(({ key, file }) => {
          formDataPayload.append(key, file);
        });

        requestPayload = formDataPayload;
      }

      queue.push(() => registerVital('body-mass', requestPayload));
    } else if (weightInput) {
      queue.push(() => registerVital('body-mass', { peso: weightInput, fecha: nowIso }));
    }

    const pulseInput = normalizeNumberInput(formData.pulse);
    if (pulseInput) {
      queue.push(() => registerVital('pulse', { pulso: pulseInput, fecha: nowIso }));
    }

    const heartRatePayload: Record<string, unknown> = {};
    for (const field of HEART_RATE_FORM_FIELDS) {
      const normalizedValue = normalizeNumberInput(formData[field.formKey]);
      if (normalizedValue) {
        heartRatePayload[field.dtoKey] = normalizedValue;
      }
    }

    const sessionType = formData.heartRateSessionType.trim();
    if (sessionType) {
      heartRatePayload.entrenamiento = sessionType;
    }

    if (Object.keys(heartRatePayload).length > 0) {
      heartRatePayload.fecha = nowIso;
      queue.push(() => registerVital('heart-rate', heartRatePayload));
    }

    const bloodSugarInput = normalizeNumberInput(formData.bloodSugar);
    if (bloodSugarInput) {
      queue.push(() => registerVital('glycemia', { glicemia: bloodSugarInput, fecha: nowIso }));
    }

    const systolicInput = normalizeNumberInput(formData.bloodPressureSystolic);
    const diastolicInput = normalizeNumberInput(formData.bloodPressureDiastolic);
    if (systolicInput && diastolicInput) {
      queue.push(() =>
        registerVital('blood-pressure', {
          sistolica: systolicInput,
          diastolica: diastolicInput,
          fecha: nowIso,
        })
      );
    }

    setIsSavingEntry(true);

    try {
      for (const task of queue) {
        await task();
      }

      if (queue.length) {
        await fetchVitals();
      }

      if (user) {
        const weightValue = parseNumberInput(formData.weight);
        const bodyMassWeightValue = parseNumberInput(formData.bodyMassWeight);
        const bmiWeightReference = bodyMassWeightValue ?? weightValue;
        const bmiValue =
          bmiWeightReference !== undefined ? calculateBMI(bmiWeightReference) : undefined;
        const bloodSugarValue = parseNumberInput(formData.bloodSugar);
        const systolicValue = parseNumberInput(formData.bloodPressureSystolic);
        const diastolicValue = parseNumberInput(formData.bloodPressureDiastolic);
        const pulseValue = parseNumberInput(formData.pulse);
        const restingHeartRate = parseNumberInput(formData.heartRateResting);

        addEvolutionEntry({
          patientId: user.id,
          date: now,
          weight: weightValue ?? bodyMassWeightValue ?? undefined,
          bloodSugar: bloodSugarValue,
          bloodPressureSystolic: systolicValue,
          bloodPressureDiastolic: diastolicValue,
          pulse: pulseValue,
          bodyMassIndex: bmiValue,
          heartRate: restingHeartRate,
        });
      }

      resetEvolutionForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Fallo el registro de signos vitales', error);
      setSaveError(
        error instanceof Error
          ? error.message
          : 'No fue posible registrar los signos vitales. Intenta nuevamente.',
      );
    } finally {
      setIsSavingEntry(false);
    }
  };

  const resolveRibbonLabel = useCallback((id: number | null | undefined): string => {
    if (typeof id !== 'number' || Number.isNaN(id)) {
      return 'Sin cinta asignada';
    }

    const match = ribbons.find(ribbon => ribbon.id === id);
    if (match) {
      const name = match.name?.trim();
      return name?.length ? name : `Cinta ${match.id}`;
    }

    return `Cinta ${id}`;
  }, [ribbons]);

  const handleOpenRibbonModal = useCallback((patient: Patient) => {
    setPatientForRibbon(patient);
    if (typeof patient.ribbonId === 'number' && Number.isFinite(patient.ribbonId)) {
      setSelectedRibbonId(String(patient.ribbonId));
    } else {
      setSelectedRibbonId('');
    }
    setRibbonModalError(null);
    setIsRibbonModalOpen(true);
  }, []);

  const handleCloseRibbonModal = useCallback(() => {
    setIsRibbonModalOpen(false);
    setPatientForRibbon(null);
    setSelectedRibbonId('');
    setRibbonModalError(null);
    setIsLoadingRibbonOptions(false);
    setIsUpdatingRibbon(false);
  }, []);

  const handleRibbonChangeSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!patientForRibbon) {
      return;
    }

    const trimmedId = selectedRibbonId.trim();
    const nextRibbonId = trimmedId ? Number(trimmedId) : null;

    if (trimmedId && Number.isNaN(nextRibbonId)) {
      setRibbonModalError('Selecciona una cinta válida.');
      return;
    }

    setIsUpdatingRibbon(true);
    setRibbonModalError(null);

    try {
      await updatePatient(patientForRibbon.id, { ribbonId: nextRibbonId });

      setSelectedPatient(prev =>
        prev && prev.id === patientForRibbon.id ? { ...prev, ribbonId: nextRibbonId } : prev,
      );

      setPatientForRibbon(prev => (prev ? { ...prev, ribbonId: nextRibbonId } : prev));

      handleCloseRibbonModal();
    } catch (error) {
      console.error('No se pudo actualizar la cinta del paciente.', error);
      const message = error instanceof Error ? error.message : 'No se pudo actualizar la cinta. Intenta nuevamente.';
      setRibbonModalError(message);
    } finally {
      setIsUpdatingRibbon(false);
    }
  }, [handleCloseRibbonModal, patientForRibbon, selectedRibbonId, updatePatient]);

  const patientColumns = [
    {
      key: 'firstName',
      header: 'Nombre del paciente',
      render: (patient: Patient) => `${patient.firstName} ${patient.lastName}`,
    },
    {
      key: 'ageGender',
      header: 'Edad y género',
      render: (patient: Patient) => (
        <span className="text-sm text-slate-700">
          {formatAge(patient.dateOfBirth)} · {GENDER_LABELS[patient.gender] ?? '—'}
        </span>
      ),
    },
    {
      key: 'program',
      header: 'Programa',
      render: (patient: Patient) => {
        if (!patient.programId) {
          return <span className="text-xs text-slate-400">Sin asignar</span>;
        }
        const programLabel = programNameById[patient.programId] ?? 'Programa sin nombre';
        return <span className="text-xs font-medium text-[#B45309]">{programLabel}</span>;
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (patient: Patient) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            patient.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {patient.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'lastEntry',
      header: 'Último registro',
      render: () => '2024-01-15', // Datos simulados
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (patient: Patient) => (
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setSelectedPatient(patient)}
            aria-label="Ver evolución"
            className="gap-1"
          >
            <LineChart className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Ver evolución</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenRibbonModal(patient);
            }}
            aria-label="Cambiar cinta"
            className="gap-1"
          >
            <Ribbon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Cambiar cinta</span>
          </Button>
        </div>
      ),
    },
  ];

  const doctorTabs = [
    { id: 'summary', label: 'Resumen clínico', icon: LayoutDashboard },
    { id: 'charts', label: 'Evolución', icon: Activity },
    { id: 'records', label: 'Registros de evolución detallados', icon: ClipboardList },
    { id: 'results', label: 'Resultados de instrumentos', icon: BarChart3 },
    { id: 'instruments', label: 'Instrumentos', icon: FileText },
  ] as const satisfies ReadonlyArray<{ id: DoctorTabId; label: string; icon: LucideIcon }>;

  const healthTabs = [
    { id: 'weight', label: 'Peso', icon: Scale },
    { id: 'pulse', label: 'Pulso', icon: Activity },
    { id: 'pressure', label: 'Presión arterial', icon: Heart },
    { id: 'glycemia', label: 'Glicemia', icon: Droplets },
    { id: 'bmi', label: 'Índice de masa corporal', icon: TrendingUp },
    { id: 'recovery', label: 'Recuperación cardiaca', icon: RefreshCw },
  ];

  const ribbonModal = (
    <Modal
      isOpen={isRibbonModalOpen}
      onClose={handleCloseRibbonModal}
      title={patientForRibbon ? `Cambiar cinta · ${patientForRibbon.firstName} ${patientForRibbon.lastName}` : 'Cambiar cinta'}
      size="sm"
    >
      <form onSubmit={handleRibbonChangeSubmit} className="space-y-4">
        <div className="space-y-1 text-sm text-slate-600">
          <p>
            Paciente:
            <span className="ml-1 font-semibold text-slate-900">
              {patientForRibbon ? `${patientForRibbon.firstName} ${patientForRibbon.lastName}` : 'Sin seleccionar'}
            </span>
          </p>
          <p>
            Cinta actual:
            <span className="ml-1 font-semibold text-slate-900">
              {resolveRibbonLabel(patientForRibbon?.ribbonId ?? null)}
            </span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nueva cinta</label>
          <select
            value={selectedRibbonId}
            onChange={(event) => setSelectedRibbonId(event.target.value)}
            disabled={isLoadingRibbonOptions || isUpdatingRibbon}
            className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed"
          >
            <option value="">Sin cinta asignada</option>
            {patientForRibbon && typeof patientForRibbon.ribbonId === 'number' && Number.isFinite(patientForRibbon.ribbonId) &&
              !ribbons.some(ribbon => ribbon.id === patientForRibbon.ribbonId) ? (
                <option value={String(patientForRibbon.ribbonId)}>
                  {resolveRibbonLabel(patientForRibbon.ribbonId)}
                </option>
              ) : null}
            {ribbons.map((ribbon) => (
              <option key={ribbon.id} value={String(ribbon.id)}>
                {ribbon.name?.trim()?.length ? ribbon.name : `Cinta ${ribbon.id}`}
              </option>
            ))}
          </select>
          {isLoadingRibbonOptions ? (
            <p className="mt-2 text-xs text-slate-500">Cargando cintas disponibles...</p>
          ) : null}
          {!isLoadingRibbonOptions && ribbons.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No hay cintas registradas. Crea una desde Programas &gt; Cintas.
            </p>
          ) : null}
        </div>

        {ribbonModalError ? <p className="text-sm text-red-600">{ribbonModalError}</p> : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseRibbonModal}
            disabled={isUpdatingRibbon}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isUpdatingRibbon || isLoadingRibbonOptions}
          >
            {isUpdatingRibbon ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );

  if (isTherapist && !selectedPatient) {
    return (
      <>
        <section className="space-y-8 px-4 py-8 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-br from-[#FFF5EC] via-[#FFF8F3] to-[#FFE9F3] p-6 sm:p-10 shadow-[0_45px_110px_rgba(120,53,15,0.15)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_60%)]" />
          <div aria-hidden className="absolute -top-10 right-0 h-56 w-56 rounded-full bg-[#FED7AA] opacity-60 blur-3xl" />
          <div aria-hidden className="absolute -bottom-12 left-4 h-48 w-48 rounded-full bg-[#F9A8D4] opacity-40 blur-3xl" />
          <div className="relative space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.55em] text-[#9A3412]">
              Evolución
              <span className="h-1 w-1 rounded-full bg-[#FB923C]" />
              Áurea
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Explora la evolución clínica de tu equipo
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
                Selecciona un paciente para revisar curvas de progreso, narrativas longitudinales y métricas vitales en un entorno translúcido y centrado en la precisión.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-[#FFE4D6]/80 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#B45309]">Coincidencias</p>
                <p className="text-3xl font-semibold">{filteredPatientCount.toLocaleString()}</p>
                <span className="text-xs text-[#B45309]/70">Total: {totalPatients.toLocaleString()}</span>
              </div>
              <div className="rounded-3xl border border-[#FFE4D6]/80 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#B45309]">Métricas</p>
                <p className="text-3xl font-semibold">{trackedMetricsCount}</p>
                <span className="text-xs text-[#B45309]/70">Monitoreadas</span>
              </div>
              <div className="rounded-3xl border border-[#FFE4D6]/80 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#B45309]">Último pulso</p>
                <p className="text-2xl font-semibold">{lastRecordedLabel}</p>
                <span className="text-xs text-[#B45309]/70">Fecha de corte</span>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-[28px] border border-[#FFE4D6]/70 bg-white/85 shadow-[0_35px_95px_rgba(124,45,18,0.12)] backdrop-blur" padding="lg">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FDBA74]/30 to-[#FECACA]/60 text-[#B45309]">
                <User className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Selecciona un paciente</h3>
                <p className="text-sm text-slate-600">Accede al histórico completo de evolución y signos vitales.</p>
              </div>
            </div>
            <span className="rounded-full border border-[#FFE4D6]/80 bg-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[#B45309]">
              Listado maestro
            </span>
          </div>
          <div className="mb-5">
            <div className="flex flex-col gap-4 sm:flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="grid w-full gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))] xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Busca por nombre, cédula o correo"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 pl-10 pr-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
                <div>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  >
                    {programOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  >
                    <option value="all">Estado: todos</option>
                    <option value="active">Solo activos</option>
                    <option value="inactive">Solo inactivos</option>
                  </select>
                </div>
                <div>
                  <select
                    value={assignmentFilter}
                    onChange={(e) => setAssignmentFilter(e.target.value as typeof assignmentFilter)}
                    className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  >
                    <option value="all">Asignación: todas</option>
                    <option value="assigned">Con programa</option>
                    <option value="unassigned">Sin programa</option>
                  </select>
                </div>
                <div className="hidden xl:block">
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as typeof genderFilter)}
                    className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  >
                    <option value="all">Género: todos</option>
                    <option value="female">Femenino</option>
                    <option value="male">Masculino</option>
                    <option value="other">Otro / no binario</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
                <div className="xl:hidden">
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as typeof genderFilter)}
                    className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  >
                    <option value="all">Género: todos</option>
                    <option value="female">Femenino</option>
                    <option value="male">Masculino</option>
                    <option value="other">Otro / no binario</option>
                  </select>
                </div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400 text-center sm:text-right">
                  {filteredPatientCount.toLocaleString()} resultados
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 shadow-inner">
            <Table data={filteredPatients} columns={patientColumns} />
          </div>
        </Card>
        </section>
        {ribbonModal}
      </>
    );
  }


  return (
    <>
    <section className="space-y-8 px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/35 bg-gradient-to-br from-[#FFF7ED] via-[#FFF0F5] to-[#FFE6E0] p-6 sm:p-10 shadow-[0_45px_110px_rgba(120,53,15,0.15)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.14),_transparent_60%)]" />
        <div aria-hidden className="absolute -top-12 left-6 h-48 w-48 rounded-full bg-[#FED7AA] opacity-60 blur-3xl" />
        <div aria-hidden className="absolute -bottom-10 right-6 h-52 w-52 rounded-full bg-[#F9A8D4] opacity-40 blur-3xl" />
        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {selectedPatient && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                    className="rounded-full border border-[#FED7AA] bg-white/60 px-4 py-2 text-sm font-semibold text-[#B45309] backdrop-blur hover:text-[#7C2D12]"
                  >
                    ← Volver a pacientes
                  </Button>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-[#FED7AA] bg-white/50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.55em] text-[#9A3412]">
                  Evolución
                  <span className="h-1 w-1 rounded-full bg-[#FB923C]" />
                  Calima
                </span>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                  {selectedPatient
                    ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                    : 'Seguimiento de evolución'}
                </h1>
                <p className="text-sm text-slate-600 sm:text-base">
                  {isPatient
                    ? 'Revisa tu progreso diario, energía y signos vitales en un panel integrado.'
                    : selectedPatient
                      ? `Monitorea la evolución completa de ${selectedPatient.firstName} con métricas longitudinales.`
                      : 'Selecciona un paciente para revisar su evolución clínica y tomar decisiones informadas.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchVitals()}
                disabled={!vitalsUrl || isLoadingVitals}
                className="rounded-full border border-[#FED7AA] bg-white/60 px-5 py-2 text-sm font-semibold text-[#B45309] backdrop-blur hover:text-[#7C2D12]"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isLoadingVitals ? 'Actualizando' : 'Actualizar'}
              </Button>
              {isPatient && (
                <Button
                  onClick={() => {
                    setSaveError(null);
                    resetEvolutionForm();
                    setIsModalOpen(true);
                  }}
                  className="rounded-full bg-gradient-to-r from-[#F97316] via-[#FB7185] to-[#F472B6] px-6 py-2 text-sm font-semibold text-white shadow-[0_25px_60px_rgba(249,115,22,0.35)] hover:opacity-90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar datos
                </Button>
              )}
            </div>
          </div>

        {shouldShowDoctorTabs && (
          <div className="rounded-[28px] border border-[#FFE4D6]/70 bg-white/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
            <nav className="flex flex-wrap gap-2 sm:gap-3">
              {doctorTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = doctorActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDoctorActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]/40 sm:text-sm ${
                      isActive
                        ? 'bg-gradient-to-r from-[#F97316] via-[#FB7185] to-[#F472B6] text-white shadow-[0_15px_40px_rgba(249,115,22,0.25)]'
                        : 'border border-transparent bg-white/70 text-[#B45309] hover:border-[#FDBA74] hover:bg-white/90 hover:text-[#7C2D12]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {shouldShowDoctorTabs && showResultsSection && (
          selectedPatientUserId !== null ? (
            <InstrumentResults
              patientUserId={selectedPatientUserId}
              titleOverride={selectedPatientFullName ? `Resultados clínicos de ${selectedPatientFullName}` : undefined}
              subtitleOverride="Consulta la síntesis de instrumentos completados por el paciente para orientar su plan terapéutico."
              className="px-0 sm:px-0 lg:px-0"
            />
          ) : (
            <Card className="rounded-[28px] border border-[#FFE4D6]/70 bg-white/90 p-6 text-sm text-slate-600 shadow-[0_25px_65px_rgba(124,45,18,0.08)] backdrop-blur">
              No se pudo determinar el usuario asociado al paciente seleccionado. Verifica sus datos antes de consultar los resultados.
            </Card>
          )
        )}

        {shouldShowDoctorTabs && showInstrumentsSection && (
          <Card className="rounded-[28px] border border-[#FFE4D6]/70 bg-white/90 p-6 shadow-[0_30px_70px_rgba(124,45,18,0.08)] backdrop-blur">
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Instrumentos asignados</h2>
                  <p className="text-sm text-slate-500">
                    Consulta los instrumentos del paciente, agrega comentarios y elimina los pendientes si es necesario.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshInstrumentAssignments}
                  disabled={isLoadingInstrumentAssignments}
                  className="inline-flex items-center gap-2 self-start md:self-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingInstrumentAssignments ? 'animate-spin' : ''}`} />
                  {isLoadingInstrumentAssignments ? 'Actualizando' : 'Actualizar lista'}
                </Button>
              </div>

              {instrumentNotice ? (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    instrumentNotice.type === 'success'
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                      : 'border-rose-100 bg-rose-50 text-rose-600'
                  }`}
                >
                  {instrumentNotice.message}
                </div>
              ) : null}

              {instrumentAssignmentsError ? (
                <div className="rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
                  {instrumentAssignmentsError}
                </div>
              ) : null}

              {isLoadingInstrumentAssignments ? (
                <div className="rounded-xl border border-slate-100 bg-white/70 px-4 py-6 text-sm text-slate-600">
                  Cargando instrumentos asignados...
                </div>
              ) : instrumentAssignments.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-white/80 px-4 py-6 text-sm text-slate-600">
                  No hay instrumentos asignados para este paciente.
                </div>
              ) : (
                <div className="space-y-4">
                  {instrumentAssignments.map((item) => {
                    const { assignment } = item;
                    const statusLabel = item.isCompleted
                      ? 'Completado'
                      : item.responsesCount > 0
                        ? 'En progreso'
                        : 'Pendiente';
                    const statusClasses = item.isCompleted
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : item.responsesCount > 0
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200';
                    const hasTopics = assignment.topics.some((topic) => Boolean(topic?.trim()));
                    const actionFeedback = instrumentActionMessages[assignment.id] ?? null;
                    const commentDraft = instrumentCommentDrafts[assignment.id] ?? '';

                    return (
                      <div
                        key={assignment.id}
                        className="space-y-4 rounded-2xl border border-slate-100 bg-white/85 p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-900">
                                {assignment.instrumentTypeName ?? 'Instrumento sin nombre'}
                              </h3>
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>
                                {statusLabel}
                              </span>
                            </div>
                            {assignment.instrumentTypeDescription ? (
                              <p className="text-sm text-slate-500">{assignment.instrumentTypeDescription}</p>
                            ) : null}
                            {hasTopics ? (
                              <div className="flex flex-wrap gap-2">
                                {assignment.topics
                                  .filter((topic) => Boolean(topic?.trim()))
                                  .map((topic) => (
                                    <span
                                      key={`${assignment.id}-${topic}`}
                                      className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                    >
                                      {topic.trim()}
                                    </span>
                                  ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="grid gap-2 text-xs text-slate-500 sm:text-sm">
                            <div>
                              <span className="font-semibold text-slate-600">Asignado:</span>{' '}
                              {formatInstrumentDate(assignment.assignedAt ?? assignment.createdAt)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-600">Disponible hasta:</span>{' '}
                              {formatInstrumentDate(assignment.validUntil)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-600">Respuestas registradas:</span>{' '}
                              {item.responsesCount}
                            </div>
                          </div>
                        </div>

                        {item.isCompleted ? (
                          <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <label className="text-sm font-semibold text-slate-700" htmlFor={`instrument-comment-${assignment.id}`}>
                                Comentario para el paciente
                              </label>
                              {item.responsesCount > 0 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewInstrumentResponses(item)}
                                  className="self-start rounded-full border border-[#FDBA74] bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#9A3412] hover:bg-white sm:self-auto"
                                >
                                  Ver respuestas del paciente
                                </Button>
                              ) : null}
                            </div>
                            <textarea
                              id={`instrument-comment-${assignment.id}`}
                              rows={3}
                              value={commentDraft}
                              onChange={(event) => handleInstrumentCommentChange(assignment.id, event.target.value)}
                              disabled={instrumentCommentSavingId === assignment.id}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#FB923C] focus:outline-none focus:ring-2 focus:ring-[#FDBA74] disabled:cursor-not-allowed"
                              placeholder="Comparte hallazgos o recomendaciones breves."
                            />
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-xs text-slate-500">
                                {actionFeedback ? (
                                  <span
                                    className={actionFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}
                                  >
                                    {actionFeedback.message}
                                  </span>
                                ) : (
                                  'El paciente verá este comentario junto a su instrumento completado.'
                                )}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSaveInstrumentComment(assignment.id)}
                                disabled={instrumentCommentSavingId === assignment.id}
                                className="self-start sm:self-auto"
                              >
                                {instrumentCommentSavingId === assignment.id ? 'Guardando...' : 'Guardar comentario'}
                              </Button>
                            </div>
                          </div>
                        ) : item.responsesCount === 0 ? (
                          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-600">
                              Este instrumento todavía no tiene respuestas. Puedes eliminar la asignación si fue creada por error.
                            </p>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteInstrumentAssignment(assignment.id)}
                              disabled={instrumentDeletingId === assignment.id}
                            >
                              {instrumentDeletingId === assignment.id ? 'Eliminando...' : 'Eliminar asignación'}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-600">
                              El instrumento ya cuenta con respuestas registradas. Espera a que el paciente lo complete para agregar un comentario.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewInstrumentResponses(item)}
                              className="self-start rounded-full border border-[#FDBA74] bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#9A3412] hover:bg-white sm:self-auto"
                            >
                              Ver respuestas del paciente
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        {showSummarySection && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-[#FFE4D6]/80 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#B45309]">Registros</p>
              <p className="text-3xl font-semibold">{totalRecords}</p>
              <span className="text-xs text-[#B45309]/70">Acumulados</span>
            </div>
            <div className="rounded-3xl border border-[#FFE4D6]/80 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#B45309]">Métricas</p>
              <p className="text-3xl font-semibold">{trackedMetricsCount}</p>
              <span className="text-xs text-[#B45309]/70">Activas</span>
            </div>
            <div className="rounded-3xl border border-[#FFE4D6]/80 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#B45309]">Último registro</p>
              <p className="text-2xl font-semibold">{lastRecordedLabel}</p>
              <span className="text-xs text-[#B45309]/70">Fecha exacta</span>
            </div>
          </div>
        )}

        {showSummarySection && (
          <div className="grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C2410C]" htmlFor="evolution-date-from">
                Desde
              </label>
              <input
                id="evolution-date-from"
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#FFE4D6]/80 bg-white/70 px-3 py-2 text-sm text-slate-900 backdrop-blur focus:border-[#FDBA74] focus:outline-none focus:ring-2 focus:ring-[#FED7AA]"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C2410C]" htmlFor="evolution-date-to">
                Hasta
              </label>
              <input
                id="evolution-date-to"
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#FFE4D6]/80 bg-white/70 px-3 py-2 text-sm text-slate-900 backdrop-blur focus:border-[#FDBA74] focus:outline-none focus:ring-2 focus:ring-[#FED7AA]"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearDateFilters}
                disabled={!dateFrom && !dateTo}
                className="w-full rounded-2xl border border-[#FED7AA] bg-white/60 px-4 py-2 text-sm font-semibold text-[#B45309] backdrop-blur hover:text-[#7C2D12]"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}

        {shouldShowDoctorTabs && showSummarySection && (
          <Card className="rounded-[28px] border border-[#FFE4D6]/70 bg-white/90 p-6 shadow-[0_30px_70px_rgba(124,45,18,0.08)] backdrop-blur">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[#B45309]">Historia médica</p>
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  {selectedPatient
                    ? `Historia clínica de ${selectedPatient.firstName} ${selectedPatient.lastName}`
                    : 'Historia clínica del paciente'}
                </h2>
                <p className="text-sm text-slate-600">
                  Revisa y actualiza los antecedentes médicos para mantener la información al día.
                </p>
              </div>

              <PatientMedicalHistoryForm
                data={medicalHistoryData}
                setData={setMedicalHistoryData}
                onSubmit={handleMedicalHistorySubmit}
                isSaving={isSavingMedicalHistory}
                errorMessage={medicalHistoryError}
                successMessage={medicalHistorySuccess}
                noticeMessage={medicalHistoryNotice}
                isLoading={isLoadingMedicalHistory}
              />
            </div>
          </Card>
        )}

        {shouldShowDoctorTabs && showSummarySection && selectedPatient && (
          <Card className="rounded-[28px] border border-[#FFE4D6]/70 bg-white/90 p-6 shadow-[0_30px_70px_rgba(124,45,18,0.08)] backdrop-blur">
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Examen dental</h2>
                  <p className="text-sm text-slate-500">
                    Marca la presencia de cada pieza dental y registra los hallazgos detectados.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    Presente
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500" />
                    Ausente
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
                    Sin dato
                  </span>
                </div>
              </div>

              {dentalLoadError && (
                <div className="rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
                  {dentalLoadError}
                </div>
              )}

              {isLoadingDental ? (
                <div className="rounded-xl border border-slate-100 bg-white/70 px-4 py-6 text-sm text-slate-600">
                  Cargando información dental...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {renderQuadrant('superiorDerecha')}
                    {renderQuadrant('superiorIzquierda')}
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {renderQuadrant('inferiorDerecha')}
                    {renderQuadrant('inferiorIzquierda')}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Detalle de los hallazgos
                </h3>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  {(Object.entries(DENTAL_FIELD_GROUPS) as Array<[
                    DentalQuadrantKey,
                    (typeof DENTAL_FIELD_GROUPS)[DentalQuadrantKey],
                  ]>).map(([key, config]) => (
                    <div key={key} className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-600">{config.label}</h4>
                      <div className="space-y-1 rounded-xl bg-slate-50/70 p-3">
                        {config.order.map((field) => {
                          const meta = DENTAL_FIELD_META[field];
                          const rawFinding = dentalFindings[field];
                          const trimmedFinding = rawFinding.trim();
                          return (
                            <div
                              key={field}
                              className="flex items-start gap-2 text-sm text-slate-600"
                            >
                              <span className="w-14 font-semibold text-slate-500">
                                {`${meta.displayCode}${meta.number}:`}
                              </span>
                              <span className="flex-1 text-slate-500">
                                {trimmedFinding ? trimmedFinding : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {shouldShowDoctorTabs && showSummarySection && selectedPatient && (
          <Card className="rounded-[28px] border border-[#FFE4D6]/70 bg-white/90 p-6 shadow-[0_30px_70px_rgba(124,45,18,0.08)] backdrop-blur">
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Examen ocular</h2>
                  <p className="text-sm text-slate-500">
                    Consulta el historial de evaluaciones oculares registradas por el equipo médico.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleOpenOcularModal}
                  className="inline-flex items-center gap-2 self-start md:self-auto"
                  disabled={!token || !selectedPatient}
                  title={!token ? 'Inicia sesión nuevamente para registrar un examen ocular' : 'Registrar examen ocular'}
                >
                  <Plus className="h-4 w-4" />
                  Registrar examen ocular
                </Button>
              </div>

              {ocularLoadError && (
                <div className="rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
                  {ocularLoadError}
                </div>
              )}

              {isLoadingOcular ? (
                <div className="rounded-xl border border-slate-100 bg-white/70 px-4 py-6 text-sm text-slate-600">
                  Cargando historial ocular...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white/80">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Motivo</th>
                        <th className="px-4 py-3">Observación ojo derecho</th>
                        <th className="px-4 py-3">Imagen ojo derecho</th>
                        <th className="px-4 py-3">Observación ojo izquierdo</th>
                        <th className="px-4 py-3">Imagen ojo izquierdo</th>
                        <th className="px-4 py-3">Comentario ojo izquierdo</th>
                        <th className="px-4 py-3">Comentario ojo derecho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ocularExams.length > 0 ? (
                        ocularExams.map((exam) => {
                          const rightEyeDisplay = toDisplayText(exam.rightEye);
                          const leftEyeDisplay = toDisplayText(exam.leftEye);
                          return (
                            <tr key={exam.id} className="text-sm text-slate-600">
                              <td className="whitespace-nowrap px-4 py-3">{exam.dateLabel}</td>
                              <td className="min-w-[10rem] px-4 py-3">{toDisplayText(exam.reason)}</td>
                              <td className="min-w-[12rem] px-4 py-3">{toDisplayText(exam.rightObservation)}</td>
                              <td className="min-w-[10rem] px-4 py-3">
                                {exam.rightEyeImageUrl ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <a
                                      href={exam.rightEyeImageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center"
                                      title="Abrir imagen del ojo derecho"
                                    >
                                      <img
                                        src={exam.rightEyeImageUrl}
                                        alt="Imagen del ojo derecho"
                                        loading="lazy"
                                        className="h-24 w-24 rounded-lg border border-slate-200 object-cover shadow-sm"
                                      />
                                    </a>
                                  </div>
                                ) : (
                                  <span>{rightEyeDisplay}</span>
                                )}
                              </td>
                              <td className="min-w-[12rem] px-4 py-3">{toDisplayText(exam.leftObservation)}</td>
                              <td className="min-w-[10rem] px-4 py-3">
                                {exam.leftEyeImageUrl ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <a
                                      href={exam.leftEyeImageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center"
                                      title="Abrir imagen del ojo izquierdo"
                                    >
                                      <img
                                        src={exam.leftEyeImageUrl}
                                        alt="Imagen del ojo izquierdo"
                                        loading="lazy"
                                        className="h-24 w-24 rounded-lg border border-slate-200 object-cover shadow-sm"
                                      />
                                    </a>
                                  </div>
                                ) : (
                                  <span>{leftEyeDisplay}</span>
                                )}
                              </td>
                              <td className="min-w-[12rem] px-4 py-3">{toDisplayText(exam.leftComment)}</td>
                              <td className="min-w-[12rem] px-4 py-3">{toDisplayText(exam.rightComment)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-6 text-center text-sm text-slate-500"
                          >
                            No hay registros oculares disponibles.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>

      {showVitalsMessaging && vitalsError && (
        <Card className="rounded-2xl border border-[#FFE4D6]/80 bg-white/85 shadow-[0_30px_70px_rgba(120,53,15,0.08)] backdrop-blur">
          <p className="text-sm text-red-600">{vitalsError}</p>
        </Card>
      )}

      {showVitalsMessaging && !vitalsError && !isLoadingVitals && !hasVitalsData && (
        <Card className="rounded-2xl border border-[#FFE4D6]/80 bg-white/85 shadow-[0_30px_70px_rgba(120,53,15,0.08)] backdrop-blur">
          <p className="text-sm text-slate-600">
            {selectedPatient
              ? 'No hay registros de signos vitales para este paciente.'
              : 'Todavia no hay registros de signos vitales.'}
          </p>
        </Card>
      )}

      {hasVitalsData && (
        <>
          {showChartsSection && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Chart
              title="Peso"
              data={weightChartData}
              type="line"
              dataKey="value"
              xAxisKey="label"
              colors={['#F59E0B']}
            />
            <Chart
              title="Pulso"
              data={pulseChartData}
              type="line"
              dataKey="value"
              xAxisKey="label"
              colors={['#EF4444']}
            />
            <Chart
              title="Presion arterial"
              data={bloodPressureChartData}
              type="line"
              dataKey={['systolic', 'diastolic']}
              xAxisKey="label"
              colors={['#FB923C', '#F472B6']}
            />
            <Chart
              title="Glicemia"
              data={glycemiaChartData}
              type="line"
              dataKey="value"
              xAxisKey="label"
              colors={['#F97316']}
            />
            </div>
          )}

          {showRecordsSection && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <Card
              padding="sm"
              className="space-y-4 rounded-[28px] border border-[#FFE4D6]/70 bg-white/85 shadow-[0_30px_80px_rgba(124,45,18,0.08)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Historial de peso</h3>
                  <p className="text-sm text-gray-600">Registros ordenados del mas reciente al mas antiguo.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSection('weight')}
                >
                  {expandedSections.weight ? 'Ocultar' : 'Ver registros'}
                </Button>
              </div>
              {expandedSections.weight ? (
                weightRows.length ? (
                  <Table
                    data={weightRows}
                    columns={weightColumns}
                    rowKey={(row) => row.id}
                    className="shadow-none ring-0 border border-white/40"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay registros de peso disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>

            <Card
              padding="sm"
              className="space-y-4 rounded-[28px] border border-[#FFE4D6]/70 bg-white/85 shadow-[0_30px_80px_rgba(124,45,18,0.08)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Historial de pulso</h3>
                  <p className="text-sm text-gray-600">Seguimiento de las mediciones de pulso en reposo.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSection('pulse')}
                >
                  {expandedSections.pulse ? 'Ocultar' : 'Ver registros'}
                </Button>
              </div>
              {expandedSections.pulse ? (
                pulseRows.length ? (
                  <Table
                    data={pulseRows}
                    columns={pulseColumns}
                    rowKey={(row) => row.id}
                    className="shadow-none ring-0 border border-white/40"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay registros de pulso disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>

            <Card
              padding="sm"
              className="space-y-4 rounded-[28px] border border-[#FFE4D6]/70 bg-white/85 shadow-[0_30px_80px_rgba(124,45,18,0.08)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Glicemia</h3>
                  <p className="text-sm text-gray-600">Valores de glicemia plasmaticos mas recientes.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSection('glycemia')}
                >
                  {expandedSections.glycemia ? 'Ocultar' : 'Ver registros'}
                </Button>
              </div>
              {expandedSections.glycemia ? (
                glycemiaRows.length ? (
                  <Table
                    data={glycemiaRows}
                    columns={glycemiaColumns}
                    rowKey={(row) => row.id}
                    className="shadow-none ring-0 border border-white/40"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay registros de glicemia disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>

            <Card
              padding="sm"
              className="space-y-4 rounded-[28px] border border-[#FFE4D6]/70 bg-white/85 shadow-[0_30px_80px_rgba(124,45,18,0.08)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Presion arterial</h3>
                  <p className="text-sm text-gray-600">Valores sistolicos y diastolicos documentados.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSection('blood_pressure')}
                >
                  {expandedSections.blood_pressure ? 'Ocultar' : 'Ver registros'}
                </Button>
              </div>
              {expandedSections.blood_pressure ? (
                bloodPressureRows.length ? (
                  <Table
                    data={bloodPressureRows}
                    columns={bloodPressureColumns}
                    rowKey={(row) => row.id}
                    className="shadow-none ring-0 border border-white/40"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay registros de presion arterial disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>
          </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <Card
              padding="sm"
              className="space-y-4 rounded-[28px] border border-[#FFE4D6]/70 bg-white/85 shadow-[0_30px_80px_rgba(124,45,18,0.08)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Indice de masa corporal (BMI)</h3>
                  <p className="text-sm text-gray-600">Historial calculado desde los signos vitales registrados.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSection('bmi')}
                >
                  {expandedSections.bmi ? 'Ocultar' : 'Ver registros'}
                </Button>
              </div>
              {expandedSections.bmi ? (
                bmiRows.length ? (
                  <Table
                    data={bmiRows}
                    columns={bmiColumns}
                    rowKey={(row) => row.id}
                    className="shadow-none ring-0 border border-white/40"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay calculos de BMI disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>

            <Card
              padding="sm"
              className="space-y-4 rounded-[28px] border border-[#FFE4D6]/70 bg-white/85 shadow-[0_30px_80px_rgba(124,45,18,0.08)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Recuperacion de frecuencia cardiaca</h3>
                  <p className="text-sm text-gray-600">Comparativo de la respuesta cardiaca durante las sesiones.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSection('heart_rate')}
                >
                  {expandedSections.heart_rate ? 'Ocultar' : 'Ver registros'}
                </Button>
              </div>
              {expandedSections.heart_rate ? (
                heartRateRows.length ? (
                  <Table
                    data={heartRateRows}
                    columns={heartRateColumns}
                    rowKey={(row) => row.id}
                    className="shadow-none ring-0 border border-white/40"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay registros de recuperacion cardiaca disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>
              </div>
            </>
          )}
        </>
      )}
      <Modal
        isOpen={isInstrumentResponsesModalOpen}
        onClose={handleCloseInstrumentResponsesModal}
        title={
          instrumentResponsesModalAssignment?.assignment.instrumentTypeName
            ? `Respuestas · ${instrumentResponsesModalAssignment.assignment.instrumentTypeName}`
            : 'Respuestas del paciente'
        }
        size="lg"
      >
        <div className="space-y-4">
          {instrumentResponsesModalError ? (
            <div className="rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
              {instrumentResponsesModalError}
            </div>
          ) : null}

          {instrumentResponsesModalInstrument ? (
            <div className="rounded-lg border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-sm text-slate-600">
              <p className="text-sm font-semibold text-slate-800">
                {instrumentResponsesModalInstrument.name ?? 'Instrumento sin nombre'}
              </p>
              {instrumentResponsesModalInstrument.description ? (
                <p className="mt-1 text-xs text-slate-500">
                  {instrumentResponsesModalInstrument.description}
                </p>
              ) : null}
            </div>
          ) : instrumentResponsesModalAssignment?.assignment.instrumentTypeDescription ? (
            <div className="rounded-lg border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-sm text-slate-600">
              {instrumentResponsesModalAssignment.assignment.instrumentTypeDescription}
            </div>
          ) : null}

          {isInstrumentResponsesModalLoading ? (
            <p className="text-sm text-slate-500">Cargando información del instrumento...</p>
          ) : instrumentResponsesModalData.length > 0 ? (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {instrumentResponsesModalData.map((response, index) => {
                const questionLabel = response.question?.trim().length
                  ? response.question.trim()
                  : `Pregunta ${index + 1}`;
                const { label: answerText, value: answerValue } = buildInstrumentResponseDisplay(
                  instrumentResponsesModalInstrument,
                  response,
                  index,
                );
                const answeredAt = formatInstrumentResponseTimestamp(response.answerDate);

                return (
                  <div
                    key={`${response.id}-${index}`}
                    className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                        Pregunta {index + 1}
                      </span>
                      <p className="text-sm font-medium text-slate-800">{questionLabel}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-sm text-slate-700">{answerText}</p>
                      {answerValue ? (
                        <p className="mt-1 text-xs text-slate-500">Valor numérico: {answerValue}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      {answeredAt ? <span>Respondido: {answeredAt}</span> : null}
                      {response.theme ? <span>Tema: {response.theme}</span> : null}
                      {response.topic ? <span>Bloque: {response.topic}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              El paciente aún no registra respuestas para este instrumento.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isOcularModalOpen}
        onClose={handleCloseOcularModal}
        title="Registrar examen ocular"
      >
        <form className="space-y-5" onSubmit={handleSubmitOcularExam}>
          {ocularModalError && (
            <div className="rounded-md border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
              {ocularModalError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Fecha del examen
              </label>
              <input
                type="date"
                value={ocularForm.date}
                onChange={(event) => handleOcularFieldChange('date', event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Motivo de consulta
              </label>
              <input
                type="text"
                value={ocularForm.reason}
                onChange={(event) => handleOcularFieldChange('reason', event.target.value)}
                placeholder="Describe brevemente el motivo"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-[0.2em]">
                Ojo derecho
              </h4>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Observación
                </label>
                <textarea
                  value={ocularForm.rightObservation}
                  onChange={(event) => handleOcularFieldChange('rightObservation', event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Anota los hallazgos del ojo derecho"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Imagen del ojo derecho
                </label>
                <input
                  key={`right-eye-upload-${ocularFormResetKey}`}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) =>
                    handleOcularFileChange(
                      'rightEyeFile',
                      event.target.files && event.target.files.length > 0
                        ? event.target.files[0]
                        : null,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Admite JPG o PNG de hasta 10&nbsp;MB.
                </p>
                {ocularForm.rightEyeFile && (
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {ocularForm.rightEyeFile.name}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-[0.2em]">
                Ojo izquierdo
              </h4>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Observación
                </label>
                <textarea
                  value={ocularForm.leftObservation}
                  onChange={(event) => handleOcularFieldChange('leftObservation', event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Anota los hallazgos del ojo izquierdo"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Imagen del ojo izquierdo
                </label>
                <input
                  key={`left-eye-upload-${ocularFormResetKey}`}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) =>
                    handleOcularFileChange(
                      'leftEyeFile',
                      event.target.files && event.target.files.length > 0
                        ? event.target.files[0]
                        : null,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Admite JPG o PNG de hasta 10&nbsp;MB.
                </p>
                {ocularForm.leftEyeFile && (
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {ocularForm.leftEyeFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Comentarios adicionales
            </label>
            <textarea
              value={ocularForm.comment}
              onChange={(event) => handleOcularFieldChange('comment', event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Registra notas complementarias (opcional)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseOcularModal}
              disabled={isSavingOcularExam}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingOcularExam}>
              {isSavingOcularExam ? 'Guardando...' : 'Guardar examen'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDentalModalOpen}
        onClose={handleDentalModalClose}
        title={
          selectedTooth
            ? `Actualizar pieza ${DENTAL_FIELD_META[selectedTooth].displayCode}${DENTAL_FIELD_META[selectedTooth].number}`
            : 'Actualizar pieza dental'
        }
      >
        {selectedTooth ? (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleDentalSave();
            }}
          >
            <p className="text-sm text-slate-600">
              {DENTAL_FIELD_META[selectedTooth].quadrantLabel} - {DENTAL_FIELD_META[selectedTooth].number}
            </p>

            {dentalModalError && (
              <div className="rounded-md border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
                {dentalModalError}
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-slate-700">Presencia</span>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DENTAL_PRESENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={presenceOptionClass(option.value)}
                    onClick={() => setPendingPresence(option.value)}
                    title={option.helper}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Hallazgo</label>
              <textarea
                value={pendingFinding}
                onChange={(event) => setPendingFinding(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Describe el hallazgo para esta pieza (opcional)"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDentalModalClose}
                disabled={isSavingTooth}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingTooth}>
                {isSavingTooth ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-600">
            Selecciona una pieza dental para actualizar su información.
          </p>
        )}
      </Modal>

      {ribbonModal}

      {editState && (
        <Modal
          isOpen
          onClose={handleCloseEditModal}
          title={`Editar ${VITAL_LABELS[editState.type]}`}
          size={editState.type === 'heart_rate' ? 'xl' : 'md'}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
                <input
                  type="time"
                  value={editForm.time}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      time: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {(editState.type === 'weight' || editState.type === 'pulse' || editState.type === 'glycemia') && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor</label>
                <input
                  type="text"
                  value={editForm.numericValues.value ?? ''}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      numericValues: {
                        ...prev.numericValues,
                        value: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {editState.type === 'blood_pressure' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sistolica (mmHg)</label>
                  <input
                    type="text"
                    value={editForm.numericValues.systolic ?? ''}
                    onChange={event =>
                      setEditForm(prev => ({
                        ...prev,
                        numericValues: {
                          ...prev.numericValues,
                          systolic: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Diastolica (mmHg)</label>
                  <input
                    type="text"
                    value={editForm.numericValues.diastolic ?? ''}
                    onChange={event =>
                      setEditForm(prev => ({
                        ...prev,
                        numericValues: {
                          ...prev.numericValues,
                          diastolic: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {editState.type === 'heart_rate' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {HEART_RATE_FIELDS.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {field.label} (bpm)
                      </label>
                      <input
                        type="text"
                        value={editForm.numericValues[field.key] ?? ''}
                        onChange={event =>
                          setEditForm(prev => ({
                            ...prev,
                            numericValues: {
                              ...prev.numericValues,
                              [field.key]: event.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de sesion</label>
                  <input
                    type="text"
                    value={editForm.sessionType}
                    onChange={event =>
                      setEditForm(prev => ({
                        ...prev,
                        sessionType: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {editError && <p className="text-sm text-red-600">{editError}</p>}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditModal}
                disabled={isProcessingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isProcessingEdit}>
                {isProcessingEdit ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteState && (
        <Modal
          isOpen
          onClose={handleCloseDeleteModal}
          title={`Eliminar ${VITAL_LABELS[deleteState.type]}`}
          size="sm"
        >
          <div className="space-y-4">
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            <p className="text-sm text-gray-700">
              Estas a punto de eliminar el registro capturado el{' '}
              <span className="font-medium">
                {formatRecordedAtValue(deleteState.record.recordedAt)}
              </span>.
            </p>
            <p className="text-sm text-gray-600">
              Esta accion es permanente y no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDeleteModal}
                disabled={isProcessingDelete}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteConfirm}
                disabled={isProcessingDelete}
              >
                {isProcessingDelete ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Entry Modal for Patients */}
      {isPatient && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            if (isSavingEntry) {
              return;
            }
            setSaveError(null);
            resetEvolutionForm();
            setIsModalOpen(false);
          }}
          title="Registrar tu salud"
          size="lg"
        >
          <div className="space-y-6">
            {/* Navegación por pestañas */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
                {healthTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'weight' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(event) => setFormData(prev => ({ ...prev, weight: event.target.value }))}
                      placeholder="Ingresa tu peso"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Este valor actualizará tus registros de peso y permitirá calcular tu evolución.
                  </p>
                </div>
              )}

              {activeTab === 'pulse' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pulso (bpm)
                    </label>
                    <input
                      type="number"
                      value={formData.pulse}
                      onChange={(event) => setFormData(prev => ({ ...prev, pulse: event.target.value }))}
                      placeholder="Ingresa tu pulso"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Registra el pulso en reposo para monitorear tu frecuencia cardiaca basal.
                  </p>
                </div>
              )}

              {activeTab === 'pressure' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Presión sistólica (mmHg)
                      </label>
                      <input
                        type="number"
                        value={formData.bloodPressureSystolic}
                        onChange={(event) => setFormData(prev => ({ ...prev, bloodPressureSystolic: event.target.value }))}
                        placeholder="120"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Presión diastólica (mmHg)
                      </label>
                      <input
                        type="number"
                        value={formData.bloodPressureDiastolic}
                        onChange={(event) => setFormData(prev => ({ ...prev, bloodPressureDiastolic: event.target.value }))}
                        placeholder="80"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Procura medir la presión en condiciones de reposo y con el mismo equipo para obtener resultados consistentes.
                  </p>
                </div>
              )}

              {activeTab === 'glycemia' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Glucosa en sangre (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={formData.bloodSugar}
                      onChange={(event) => setFormData(prev => ({ ...prev, bloodSugar: event.target.value }))}
                      placeholder="Ingresa tu nivel de glucosa"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Anota tu lectura en ayunas o según la recomendación de tu especialista.
                  </p>
                </div>
              )}

              {activeTab === 'bmi' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Registra tus medidas corporales para complementar el seguimiento del programa. Estos datos se almacenan junto con el peso y permiten comparar cambios a lo largo del tiempo.
                    </p>
                    <p className="text-xs text-gray-500">
                      Los campos numéricos aceptan valores con decimales. Carga tus fotos en formato JPG o PNG (máximo 10&nbsp;MB); las ajustaremos automáticamente a un recorte de 4&nbsp;cm por 4&nbsp;cm.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bodyMassWeight}
                        onChange={(event) =>
                          setFormData(prev => ({ ...prev, bodyMassWeight: event.target.value }))
                        }
                        placeholder="Ej. 68.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cuello (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bodyMassNeck}
                        onChange={(event) =>
                          setFormData(prev => ({ ...prev, bodyMassNeck: event.target.value }))
                        }
                        placeholder="Ej. 36"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Busto (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bodyMassBust}
                        onChange={(event) =>
                          setFormData(prev => ({ ...prev, bodyMassBust: event.target.value }))
                        }
                        placeholder="Ej. 92"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cintura (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bodyMassWaist}
                        onChange={(event) =>
                          setFormData(prev => ({ ...prev, bodyMassWaist: event.target.value }))
                        }
                        placeholder="Ej. 78"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cadera (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bodyMassHip}
                        onChange={(event) =>
                          setFormData(prev => ({ ...prev, bodyMassHip: event.target.value }))
                        }
                        placeholder="Ej. 100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brazo derecho (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bodyMassRightArm}
                        onChange={(event) =>
                          setFormData(prev => ({ ...prev, bodyMassRightArm: event.target.value }))
                        }
                        placeholder="Ej. 32"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Muslo derecho (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bodyMassRightThigh}
                        onChange={(event) =>
                          setFormData(prev => ({ ...prev, bodyMassRightThigh: event.target.value }))
                        }
                        placeholder="Ej. 55"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {bmiEstimate !== undefined && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-800">
                      <strong>IMC estimado:</strong> {bmiEstimate}
                      <span className="ml-2 text-xs">
                        (considerando una estatura de referencia de 1.70&nbsp;m)
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto rostro
                      </label>
                      <input
                        key={`body-mass-face-${bodyMassPhotoResetKey}`}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) =>
                          setFormData(prev => ({
                            ...prev,
                            bodyMassFacePhoto: event.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.bodyMassFacePhoto && (
                        <p className="mt-1 text-xs text-gray-500">
                          Archivo seleccionado: {formData.bodyMassFacePhoto.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto cuerpo de frente
                      </label>
                      <input
                        key={`body-mass-front-${bodyMassPhotoResetKey}`}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) =>
                          setFormData(prev => ({
                            ...prev,
                            bodyMassFrontPhoto: event.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.bodyMassFrontPhoto && (
                        <p className="mt-1 text-xs text-gray-500">
                          Archivo seleccionado: {formData.bodyMassFrontPhoto.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto cuerpo de perfil
                      </label>
                      <input
                        key={`body-mass-profile-${bodyMassPhotoResetKey}`}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) =>
                          setFormData(prev => ({
                            ...prev,
                            bodyMassProfilePhoto: event.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.bodyMassProfilePhoto && (
                        <p className="mt-1 text-xs text-gray-500">
                          Archivo seleccionado: {formData.bodyMassProfilePhoto.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto espalda completa
                      </label>
                      <input
                        key={`body-mass-back-${bodyMassPhotoResetKey}`}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) =>
                          setFormData(prev => ({
                            ...prev,
                            bodyMassBackPhoto: event.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.bodyMassBackPhoto && (
                        <p className="mt-1 text-xs text-gray-500">
                          Archivo seleccionado: {formData.bodyMassBackPhoto.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto adicional (opcional)
                      </label>
                      <input
                        key={`body-mass-extra-${bodyMassPhotoResetKey}`}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) =>
                          setFormData(prev => ({
                            ...prev,
                            bodyMassExtraPhoto: event.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.bodyMassExtraPhoto && (
                        <p className="mt-1 text-xs text-gray-500">
                          Archivo seleccionado: {formData.bodyMassExtraPhoto.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'recovery' && (
                <div className="space-y-4">
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Recuperación de frecuencia cardiaca</span>
                    <p className="text-xs text-gray-500">
                      Registra los valores en reposo y durante la recuperación posterior al entrenamiento.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {HEART_RATE_FORM_FIELDS.map((field) => (
                      <div key={field.formKey}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {HEART_RATE_LABEL_MAP[field.metricKey]}
                        </label>
                        <input
                          type="number"
                          value={formData[field.formKey]}
                          onChange={(event) =>
                            setFormData(prev => ({ ...prev, [field.formKey]: event.target.value }))
                          }
                          placeholder="Ej. 72"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de sesión
                    </label>
                    <input
                      type="text"
                      value={formData.heartRateSessionType}
                      onChange={(event) =>
                        setFormData(prev => ({ ...prev, heartRateSessionType: event.target.value }))
                      }
                      placeholder="Entrenamiento funcional, resistencia, descanso..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingEntry}
                  onClick={() => {
                    setSaveError(null);
                    resetEvolutionForm();
                    setIsModalOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingEntry}>
                  {isSavingEntry ? 'Guardando...' : 'Guardar registro'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </section>
    </>
  );
};