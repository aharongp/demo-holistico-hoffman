import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, TrendingUp, User, Heart, Scale, Droplets, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Chart } from '../../components/Dashboard/Chart';
import { Modal } from '../../components/UI/Modal';
import { Table } from '../../components/UI/Table';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  Patient,
  PatientVitalsSummary,
  NumericVitalRecord,
  VitalSource,
  BloodPressureRecord,
  HeartRateRecoveryRecord,
} from '../../types';

const EMPTY_VALUE = 'N/A';

const SOURCE_LABELS: Record<VitalSource, string> = {
  consultation: 'Consulta',
  pulse: 'Pulso',
  glycemia: 'Glucemia',
  heart_rate: 'Frecuencia cardiaca',
  weight: 'Peso',
  body_mass: 'Masa corporal',
  blood_pressure: 'Tension arterial',
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
  glycemia: 'Glucemia',
  blood_pressure: 'Presion arterial',
  heart_rate: 'Frecuencia cardiaca',
};

const parseNumericId = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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
  mood: number;
  energy: number;
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
  notes: string;
};

const INITIAL_FORM_DATA: EvolutionFormData = {
  mood: 5,
  energy: 5,
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
  notes: '',
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
  const { addEvolutionEntry, patients } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState('mood');
  const [formData, setFormData] = useState<EvolutionFormData>(() => ({ ...INITIAL_FORM_DATA }));
  const [vitals, setVitals] = useState<PatientVitalsSummary | null>(null);
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
  const apiBase = useMemo(() => (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000', []);
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
  type BmiRow = { id: number; label: string; bmi: number | null; category: string; source: VitalSource };
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
        console.error('Failed to fetch vitals', error);
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

  const registerVital = useCallback(
    async (path: string, payload: Record<string, unknown>) => {
      if (resolvedUserId === null) {
        throw new Error('No se pudo determinar el usuario asociado al registro.');
      }

      if (!token) {
        throw new Error('Sesion no valida. Inicia sesion nuevamente.');
      }

      const response = await fetch(`${apiBase}/vitals/user/${resolvedUserId}/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
      console.error('Unexpected error fetching vitals', error);
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
      return {
        id: record.id,
        label: formatRecordedAt(record.recordedAt, index),
        bmi: value,
        category: getBmiCategory(value),
        source: record.source,
      };
    });
  }, [filteredBmiRecords, formatRecordedAt]);

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
        header: 'Glucemia (mg/dL)',
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
        const bmiValue = weightValue !== undefined ? calculateBMI(weightValue) : undefined;
        const bloodSugarValue = parseNumberInput(formData.bloodSugar);
        const systolicValue = parseNumberInput(formData.bloodPressureSystolic);
        const diastolicValue = parseNumberInput(formData.bloodPressureDiastolic);
        const pulseValue = parseNumberInput(formData.pulse);
        const restingHeartRate = parseNumberInput(formData.heartRateResting);

        addEvolutionEntry({
          patientId: user.id,
          date: now,
          mood: formData.mood,
          energy: formData.energy,
          weight: weightValue,
          bloodSugar: bloodSugarValue,
          bloodPressureSystolic: systolicValue,
          bloodPressureDiastolic: diastolicValue,
          pulse: pulseValue,
          bodyMassIndex: bmiValue,
          heartRate: restingHeartRate,
          notes: formData.notes,
        });
      }

      setFormData({ ...INITIAL_FORM_DATA });
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

  const patientColumns = [
    {
      key: 'firstName',
      header: 'Patient Name',
      render: (patient: Patient) => `${patient.firstName} ${patient.lastName}`,
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'lastEntry',
      header: 'Last Entry',
      render: () => '2024-01-15', // Mock data
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (patient: Patient) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setSelectedPatient(patient)}
        >
          View Evolution
        </Button>
      ),
    },
  ];

  const healthTabs = [
    { id: 'mood', label: 'Mood & Energy', icon: TrendingUp },
    { id: 'weight', label: 'Weight', icon: Scale },
    { id: 'blood', label: 'Blood Metrics', icon: Droplets },
    { id: 'vitals', label: 'Vital Signs', icon: Heart },
  ];

  if (isTherapist && !selectedPatient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Patient Evolution Tracking</h1>
            <p className="text-sm sm:text-base text-gray-600">Monitor patient progress and evolution</p>
          </div>
        </div>

        <Card>
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Select Patient</h3>
          </div>
          <Table data={patients} columns={patientColumns} />
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            {selectedPatient && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPatient(null)}
              >
                ← Back to Patients
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {selectedPatient 
                ? `${selectedPatient.firstName} ${selectedPatient.lastName} - Evolution`
                : 'Evolution Tracking'
              }
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            {isPatient 
              ? 'Track your daily progress and wellbeing'
              : `Monitor ${selectedPatient?.firstName}'s progress and evolution`
            }
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end space-y-3">
          <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600" htmlFor="evolution-date-from">
                Desde
              </label>
              <input
                id="evolution-date-from"
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600" htmlFor="evolution-date-to">
                Hasta
              </label>
              <input
                id="evolution-date-to"
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearDateFilters}
              disabled={!dateFrom && !dateTo}
              className="self-end"
            >
              Limpiar
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchVitals()}
              disabled={!vitalsUrl || isLoadingVitals}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isLoadingVitals ? 'Actualizando' : 'Actualizar'}
            </Button>
            {isPatient && (
              <Button
                onClick={() => {
                  setSaveError(null);
                  setFormData({ ...INITIAL_FORM_DATA });
                  setIsModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            )}
          </div>
        </div>
      </div>

      {vitalsError && (
        <Card>
          <p className="text-sm text-red-600">{vitalsError}</p>
        </Card>
      )}

      {!vitalsError && !isLoadingVitals && !hasVitalsData && (
        <Card>
          <p className="text-sm text-gray-600">
            {selectedPatient
              ? 'No hay registros de signos vitales para este paciente.'
              : 'Todavia no hay registros de signos vitales.'}
          </p>
        </Card>
      )}

      {hasVitalsData && (
        <>
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
              colors={['#2563EB', '#10B981']}
            />
            <Chart
              title="Glucemia"
              data={glycemiaChartData}
              type="line"
              dataKey="value"
              xAxisKey="label"
              colors={['#8B5CF6']}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <Card padding="sm" className="space-y-4">
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
                    className="shadow-none ring-0 border border-gray-200"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay registros de peso disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>

            <Card padding="sm" className="space-y-4">
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
                    className="shadow-none ring-0 border border-gray-200"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay registros de pulso disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>

            <Card padding="sm" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Glucemia</h3>
                  <p className="text-sm text-gray-600">Valores de glucosa plasmaticos mas recientes.</p>
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
                    className="shadow-none ring-0 border border-gray-200"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay registros de glucemia disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>

            <Card padding="sm" className="space-y-4">
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
                    className="shadow-none ring-0 border border-gray-200"
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
            <Card padding="sm" className="space-y-4">
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
                    className="shadow-none ring-0 border border-gray-200"
                  />
                ) : (
                  <p className="text-sm text-gray-600">No hay calculos de BMI disponibles.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Haz clic en "Ver registros" para mostrar los datos.</p>
              )}
            </Card>

            <Card padding="sm" className="space-y-4">
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
                    className="shadow-none ring-0 border border-gray-200"
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
            setFormData({ ...INITIAL_FORM_DATA });
            setIsModalOpen(false);
          }}
          title="Add Health Entry"
          size="lg"
        >
          <div className="space-y-6">
            {/* Tab Navigation */}
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
              {/* Mood & Energy Tab */}
              {activeTab === 'mood' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mood Level (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.mood}
                      onChange={(e) => setFormData(prev => ({ ...prev, mood: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Very Low</span>
                      <span className="font-medium">Current: {formData.mood}</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Energy Level (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.energy}
                      onChange={(e) => setFormData(prev => ({ ...prev, energy: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Very Low</span>
                      <span className="font-medium">Current: {formData.energy}</span>
                      <span>High Energy</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Weight Tab */}
              {activeTab === 'weight' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="Enter your weight"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {formData.weight && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>BMI:</strong> {calculateBMI(parseFloat(formData.weight))} 
                        <span className="text-xs ml-2">(Based on average height of 1.7m)</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Blood Metrics Tab */}
              {activeTab === 'blood' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blood Sugar Level (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={formData.bloodSugar}
                      onChange={(e) => setFormData(prev => ({ ...prev, bloodSugar: e.target.value }))}
                      placeholder="Enter blood sugar level"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blood Pressure - Systolic (mmHg)
                      </label>
                      <input
                        type="number"
                        value={formData.bloodPressureSystolic}
                        onChange={(e) => setFormData(prev => ({ ...prev, bloodPressureSystolic: e.target.value }))}
                        placeholder="120"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blood Pressure - Diastolic (mmHg)
                      </label>
                      <input
                        type="number"
                        value={formData.bloodPressureDiastolic}
                        onChange={(e) => setFormData(prev => ({ ...prev, bloodPressureDiastolic: e.target.value }))}
                        placeholder="80"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vital Signs Tab */}
              {activeTab === 'vitals' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pulse (bpm)
                    </label>
                    <input
                      type="number"
                      value={formData.pulse}
                      onChange={(e) => setFormData(prev => ({ ...prev, pulse: e.target.value }))}
                      placeholder="Enter pulse rate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-sm font-medium text-gray-700">
                        Frecuencia cardiaca (bpm)
                      </span>
                      <p className="text-xs text-gray-500">
                        Registra los valores en reposo y durante la recuperacion posterior al entrenamiento.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {HEART_RATE_FORM_FIELDS.map(field => (
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
                        Tipo de sesion
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
                </div>
              )}

              {/* Notes - Available in all tabs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="How are you feeling today? Any significant events or observations..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingEntry}
                  onClick={() => {
                    setSaveError(null);
                    setFormData({ ...INITIAL_FORM_DATA });
                    setIsModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEntry}>
                  {isSavingEntry ? 'Guardando...' : 'Save Entry'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};