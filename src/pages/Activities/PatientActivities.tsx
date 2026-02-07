import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Clock, CheckCircle, FileText, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Instrument } from '../../types';
import { InstrumentResponseModal } from './components/InstrumentResponseModal';
import {
  BackendInstrumentResponse,
  CoachDiagnosticObservation,
  PreparedInstrumentAnswer,
} from '../../types/patientInstruments';

type ActivityStatus = 'pending' | 'in_progress' | 'completed';

interface BackendPatientInstrumentAssignment {
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
}

interface Activity {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: ActivityStatus;
  assignedAt: string | null;
  dueDate: string | null;
  completedAt: string | null;
  topics: string[];
  origin: string | null;
  available: boolean;
  evaluated: boolean;
  createdAt: string | null;
  rawAssignment: BackendPatientInstrumentAssignment;
}

const resolveTimestamp = (value: string | null): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const CATEGORY_STYLES: ReadonlyArray<{ match: (value: string) => boolean; className: string }> = [
  {
    match: (value) => value.includes('salud') || value.includes('health'),
    className: 'bg-emerald-50/80 text-emerald-600 ring-1 ring-emerald-100/80',
  },
  {
    match: (value) => value.includes('psic') || value.includes('psy'),
    className: 'bg-sky-50/80 text-sky-600 ring-1 ring-sky-100/80',
  },
  {
    match: (value) => value.includes('actitud') || value.includes('attitude'),
    className: 'bg-violet-50/80 text-violet-600 ring-1 ring-violet-100/80',
  },
  {
    match: (value) => value.includes('emoc') || value.includes('emotion'),
    className: 'bg-rose-50/80 text-rose-600 ring-1 ring-rose-100/80',
  },
];

const getCategoryColor = (category: string): string => {
  const normalized = category.trim().toLowerCase();
  const match = CATEGORY_STYLES.find((style) => style.match(normalized));
  return match ? match.className : 'bg-slate-100/80 text-slate-700 ring-1 ring-slate-200/80';
};

const formatCategoryLabel = (category: string): string => {
  const normalized = category.trim();
  if (!normalized) {
    return 'General';
  }

  return normalized
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase());
};

const resolveStatus = (assignment: BackendPatientInstrumentAssignment): ActivityStatus => {
  if (assignment.completed || assignment.evaluated) {
    return 'completed';
  }

  const availability = assignment.availabilityRaw?.toLowerCase() ?? '';
  if (availability.includes('progreso') || availability.includes('progress') || availability.includes('curso')) {
    return 'in_progress';
  }

  if (assignment.available) {
    return 'pending';
  }

  return 'pending';
};

const resolveCategory = (assignment: BackendPatientInstrumentAssignment): string => {
  const topic = assignment.topics.find((value) => Boolean(value?.trim()));
  if (topic) {
    return topic.trim();
  }

  if (assignment.origin) {
    return assignment.origin;
  }

  return 'General';
};

const mapAssignmentToActivity = (assignment: BackendPatientInstrumentAssignment): Activity => {
  const status = resolveStatus(assignment);
  const category = resolveCategory(assignment);
  const fallbackInstrumentId = assignment.instrumentTypeId ?? assignment.id;

  return {
    id: assignment.id.toString(),
    name: assignment.instrumentTypeName ?? `Instrumento #${fallbackInstrumentId}`,
    description: assignment.instrumentTypeDescription ?? assignment.origin ?? null,
    category,
    status,
    assignedAt: assignment.assignedAt ?? assignment.createdAt,
    dueDate: assignment.validUntil,
    completedAt: assignment.completed ? assignment.updatedAt ?? assignment.assignedAt : null,
    topics: assignment.topics,
    origin: assignment.origin,
    available: assignment.available,
    evaluated: assignment.evaluated,
    createdAt: assignment.createdAt,
    rawAssignment: assignment,
  };
};

const observationTimestampValue = (value: string | null | undefined): number => {
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

  const filtered = observations
    .map((item) => ({
      ...item,
      comment: typeof item.comment === 'string' ? item.comment.trim() : null,
      coach: typeof item.coach === 'string' ? item.coach.trim() : null,
    }))
    .filter((item) => Number(item.instrumentId) === instrumentId && Boolean(item.comment));

  if (!filtered.length) {
    return null;
  }

  filtered.sort((a, b) => {
    const appliedDiff = observationTimestampValue(b.appliedAt) - observationTimestampValue(a.appliedAt);
    if (appliedDiff !== 0) {
      return appliedDiff;
    }
    const updatedDiff = observationTimestampValue(b.updatedAt) - observationTimestampValue(a.updatedAt);
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    return observationTimestampValue(b.createdAt) - observationTimestampValue(a.createdAt);
  });

  return filtered[0];
};

const parseNumericId = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const readStoredUserId = (): number | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem('hoffmann_user') ??
      window.localStorage.getItem('hoffman_user');
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parseNumericId(parsed?.id ?? parsed?.userId ?? null);
  } catch (error) {
    console.warn('No fue posible obtener el usuario almacenado', error);
    return null;
  }
};

const sanitizeApiBase = (value: string): string => value.replace(/\/+$/, '');

const getStatusIcon = (status: ActivityStatus) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'in_progress':
      return <Play className="w-4 h-4 text-blue-500" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    default:
      return null;
  }
};

export const PatientActivities: React.FC = () => {
  const { user, token } = useAuth();
  const { getInstrumentDetails } = useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [instrumentCache, setInstrumentCache] = useState<Record<number, Instrument>>({});
  const [responsesByAssignment, setResponsesByAssignment] = useState<Record<number, BackendInstrumentResponse[]>>({});
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [activeInstrument, setActiveInstrument] = useState<Instrument | null>(null);
  const [modalMode, setModalMode] = useState<'form' | 'readonly'>('form');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalInfoMessage, setModalInfoMessage] = useState<string | null>(null);
  const [isLoadingInstrumentDetail, setIsLoadingInstrumentDetail] = useState(false);
  const [isSubmittingResponses, setIsSubmittingResponses] = useState(false);
  const [coachObservationByAssignment, setCoachObservationByAssignment] = useState<Record<number, CoachDiagnosticObservation | null>>({});
  const [activeCoachObservation, setActiveCoachObservation] = useState<CoachDiagnosticObservation | null>(null);
  const [isLoadingCoachObservation, setIsLoadingCoachObservation] = useState(false);
  const [coachObservationError, setCoachObservationError] = useState<string | null>(null);

  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
  const normalizedApiBase = useMemo(() => sanitizeApiBase(apiBase), [apiBase]);
  const storedUserId = useMemo(() => readStoredUserId(), []);
  const resolvedUserId = useMemo(() => {
    const contextId = parseNumericId(user?.id ?? (user as { userId?: number } | null)?.userId);
    if (contextId !== null) {
      return contextId;
    }
    return storedUserId;
  }, [storedUserId, user?.id]);
  const hasAuthContext = Boolean(token) && resolvedUserId !== null;
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }), []);
  const shortDateFormatter = useMemo(() => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }), []);

  const formatDate = useCallback(
    (value: string | null, fallback: string) => {
      if (!value) {
        return fallback;
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return fallback;
      }

      return dateFormatter.format(parsed);
    },
    [dateFormatter],
  );

  const formatDueDate = useCallback(
    (value: string | null) => {
      if (!value) {
        return 'Sin fecha límite';
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return 'Fecha inválida';
      }

      return `Vence: ${shortDateFormatter.format(parsed)}`;
    },
    [shortDateFormatter],
  );

  const loadActivities = useCallback(async () => {
    if (!token) {
      setError('Debes iniciar sesión para ver tus instrumentos.');
      setActivities([]);
      return;
    }

    if (resolvedUserId === null) {
      setError('No se encontró un paciente asociado al usuario actual.');
      setActivities([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${normalizedApiBase}/patient-instruments/user/${resolvedUserId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Error al obtener instrumentos (${res.status})`);
      }

      const payload: BackendPatientInstrumentAssignment[] = await res.json();
      const mapped = payload.map(mapAssignmentToActivity);
      mapped.sort((a, b) => resolveTimestamp(b.createdAt) - resolveTimestamp(a.createdAt));
      setActivities(mapped);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching patient activities', error);
      setError('No fue posible cargar tus instrumentos. Intenta nuevamente más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [normalizedApiBase, resolvedUserId, token]);

  const loadResponses = useCallback(async () => {
    if (!token) {
      setResponsesByAssignment({});
      setResponsesError('Debes iniciar sesión para ver tus respuestas.');
      return;
    }

    if (resolvedUserId === null) {
      setResponsesByAssignment({});
      setResponsesError('No se encontró un paciente asociado al usuario actual.');
      return;
    }

    setIsLoadingResponses(true);
    setResponsesError(null);

    try {
      const res = await fetch(`${normalizedApiBase}/patient-instruments/responses/user/${resolvedUserId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Error al obtener respuestas (${res.status})`);
      }

      const payload: BackendInstrumentResponse[] = await res.json();
      const grouped: Record<number, BackendInstrumentResponse[]> = {};

      if (Array.isArray(payload)) {
        payload.forEach((item) => {
          const assignmentId = typeof item.patientInstrumentId === 'number' ? item.patientInstrumentId : null;
          if (assignmentId === null) {
            return;
          }
          if (!grouped[assignmentId]) {
            grouped[assignmentId] = [];
          }
          grouped[assignmentId].push(item);
        });
      }

      Object.values(grouped).forEach((list) => {
        list.sort((a, b) => {
          const orderDiff = (a.order ?? 0) - (b.order ?? 0);
          if (orderDiff !== 0) {
            return orderDiff;
          }
          return a.id - b.id;
        });
      });

      setResponsesByAssignment(grouped);
    } catch (fetchError) {
      console.error('Error fetching patient responses', fetchError);
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar tus respuestas.';
      setResponsesError(message);
      setResponsesByAssignment({});
    } finally {
      setIsLoadingResponses(false);
    }
  }, [normalizedApiBase, resolvedUserId, token]);

  const loadInstrumentForAssignment = useCallback(
    async (assignment: BackendPatientInstrumentAssignment): Promise<Instrument | null> => {
      if (!assignment.instrumentTypeId) {
        throw new Error('La asignación no tiene un tipo de instrumento asociado.');
      }

      const cached = instrumentCache[assignment.instrumentTypeId];
      if (cached) {
        return cached;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const instrumentsResponse = await fetch(
        `${normalizedApiBase}/instruments/by-type/${assignment.instrumentTypeId}`,
        { headers },
      );

      if (!instrumentsResponse.ok) {
        const message = await instrumentsResponse.text();
        throw new Error(message || 'No se pudo cargar el instrumento asociado.');
      }

      const instrumentsPayload = await instrumentsResponse.json();

      if (!Array.isArray(instrumentsPayload) || !instrumentsPayload.length) {
        throw new Error('No se encontraron instrumentos configurados para esta asignación.');
      }

      const instrumentCandidate = instrumentsPayload[0];
      const rawInstrumentId = instrumentCandidate?.id ?? instrumentCandidate?.instrumento_id ?? instrumentCandidate?.instrumentId;

      if (!Number.isFinite(Number(rawInstrumentId))) {
        throw new Error('No se pudo determinar el identificador del instrumento.');
      }

      const instrumentId = String(rawInstrumentId);
      const detailedInstrument = await getInstrumentDetails(instrumentId);

      if (!detailedInstrument) {
        throw new Error('No se pudo obtener el detalle del instrumento.');
      }

      setInstrumentCache((prev) => ({
        ...prev,
        [assignment.instrumentTypeId!]: detailedInstrument,
      }));

      return detailedInstrument;
    },
    [getInstrumentDetails, instrumentCache, normalizedApiBase, token],
  );

  const loadCoachObservationForAssignment = useCallback(
    async (
      assignment: BackendPatientInstrumentAssignment,
      instrument: Instrument | null,
    ): Promise<CoachDiagnosticObservation | null> => {
      if (!token) {
        return null;
      }

      if (!instrument) {
        return null;
      }

      const patientId = assignment.patientId;
      if (!patientId) {
        setCoachObservationByAssignment((prev) => ({
          ...prev,
          [assignment.id]: null,
        }));
        return null;
      }

      const numericInstrumentId = Number(instrument.id);
      if (!Number.isFinite(numericInstrumentId)) {
        setCoachObservationByAssignment((prev) => ({
          ...prev,
          [assignment.id]: null,
        }));
        return null;
      }

      setIsLoadingCoachObservation(true);
      setCoachObservationError(null);

      try {
        const response = await fetch(
          `${normalizedApiBase}/coach-diagnostic-observation?patientId=${patientId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Falló la carga con estado ${response.status}`);
        }

        const responseText = await response.text();
        let payload: CoachDiagnosticObservation[] = [];

        if (responseText.trim().length) {
          try {
            const parsed = JSON.parse(responseText);
            payload = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            console.error('Error al interpretar la respuesta de observación del coach', parseError);
            payload = [];
          }
        }

        const selected = selectObservationForInstrument(payload, numericInstrumentId);

        setCoachObservationByAssignment((prev) => ({
          ...prev,
          [assignment.id]: selected ?? null,
        }));

        return selected ?? null;
      } catch (observationError) {
        console.error('Error al obtener la observación del coach', observationError);
        setCoachObservationError('No se pudo cargar la observación del coach.');
        return null;
      } finally {
        setIsLoadingCoachObservation(false);
      }
    },
    [normalizedApiBase, token],
  );

  const handleOpenInstrument = useCallback(
    async (activity: Activity, desiredMode?: 'form' | 'readonly') => {
      setActiveActivity(activity);
      const nextMode: 'form' | 'readonly' = desiredMode ?? (activity.status === 'completed' || activity.evaluated ? 'readonly' : 'form');
      setModalMode(nextMode);
      setModalError(null);
      setModalInfoMessage(nextMode === 'readonly' ? 'Este instrumento ya fue respondido y no puede editarse.' : null);
      setIsModalOpen(true);
      setActiveCoachObservation(null);
      setCoachObservationError(null);

      if (!activity.rawAssignment.instrumentTypeId) {
        setModalError('La asignación no tiene un instrumento asociado.');
        setActiveInstrument(null);
        return;
      }

      try {
        setIsLoadingInstrumentDetail(true);
        const instrument = await loadInstrumentForAssignment(activity.rawAssignment);
        setActiveInstrument(instrument);
        setModalError(null);

        if (nextMode === 'readonly') {
          const assignmentId = activity.rawAssignment.id;
          const cachedObservation = coachObservationByAssignment[assignmentId] ?? null;

          if (cachedObservation) {
            setActiveCoachObservation(cachedObservation);
          }

          const fetchedObservation = await loadCoachObservationForAssignment(
            activity.rawAssignment,
            instrument,
          );

          if (fetchedObservation !== null || !cachedObservation) {
            setActiveCoachObservation(fetchedObservation);
          }
        }
      } catch (loadingError) {
        console.error('Error al cargar el instrumento asignado', loadingError);
        const message = loadingError instanceof Error ? loadingError.message : 'No se pudo cargar el instrumento asociado.';
        setActiveInstrument(null);
        setModalError(message);
      } finally {
        setIsLoadingInstrumentDetail(false);
      }
    },
    [coachObservationByAssignment, loadCoachObservationForAssignment, loadInstrumentForAssignment],
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setActiveActivity(null);
    setActiveInstrument(null);
    setActiveCoachObservation(null);
    setModalError(null);
    setModalInfoMessage(null);
    setCoachObservationError(null);
    setIsLoadingCoachObservation(false);
    setModalMode('form');
  }, []);

  const handleSubmitInstrumentResponses = useCallback(
    async (answers: PreparedInstrumentAnswer[]) => {
      if (!activeActivity) {
        throw new Error('No hay una asignación activa para registrar respuestas.');
      }

      if (!token) {
        throw new Error('Debes iniciar sesión para guardar tus respuestas.');
      }

      const assignment = activeActivity.rawAssignment;
      const rawInstrumentId = activeInstrument ? Number(activeInstrument.id) : NaN;
      const numericInstrumentId = Number.isFinite(rawInstrumentId) ? rawInstrumentId : null;

      setIsSubmittingResponses(true);

      try {
        const payload = {
          instrumentId: numericInstrumentId,
          instrumentTypeId: assignment.instrumentTypeId ?? null,
          patientId: assignment.patientId ?? null,
          instrumentTypeName: assignment.instrumentTypeName ?? null,
          instrumentName: activeInstrument?.description ?? activeInstrument?.name ?? null,
          theme: activeInstrument?.subjectName ?? null,
          answers: answers.map((answer) => ({
            questionId: answer.questionNumericId,
            questionText: answer.questionText,
            value: answer.value,
            label: answer.label,
            selections: answer.selections ?? [],
            order: answer.order ?? null,
            theme: answer.theme ?? null,
          })),
        };

        const response = await fetch(`${normalizedApiBase}/patient-instruments/${assignment.id}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'No se pudieron guardar las respuestas.');
        }

        const savedResponses: BackendInstrumentResponse[] = await response.json();
        const normalizedSaved = Array.isArray(savedResponses) ? [...savedResponses] : [];
        normalizedSaved.sort((a, b) => {
          const orderDiff = (a.order ?? 0) - (b.order ?? 0);
          if (orderDiff !== 0) {
            return orderDiff;
          }
          return a.id - b.id;
        });

        setResponsesByAssignment((prev) => ({
          ...prev,
          [assignment.id]: normalizedSaved,
        }));

        setActivities((prev) =>
          prev.map((item) => {
            if (item.id !== activeActivity.id) {
              return item;
            }

            return {
              ...item,
              status: 'completed',
              completedAt: new Date().toISOString(),
              available: false,
              rawAssignment: {
                ...item.rawAssignment,
                completed: true,
                evaluated: item.rawAssignment.evaluated,
                available: false,
              },
            };
          }),
        );

        setActiveActivity((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            status: 'completed',
            completedAt: new Date().toISOString(),
            available: false,
            rawAssignment: {
              ...prev.rawAssignment,
              completed: true,
              evaluated: prev.rawAssignment.evaluated,
              available: false,
            },
          };
        });

        setModalMode('readonly');
        setModalInfoMessage('Tus respuestas han sido registradas.');
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : 'No se pudieron guardar las respuestas.';
        throw new Error(message);
      } finally {
        setIsSubmittingResponses(false);
      }
    },
    [activeActivity, activeInstrument, normalizedApiBase, token],
  );

  useEffect(() => {
    if (hasAuthContext) {
      void loadActivities();
      void loadResponses();
    } else {
      setActivities([]);
      setResponsesByAssignment({});
      setResponsesError(null);
    }
  }, [hasAuthContext, loadActivities, loadResponses]);

  const handleRefresh = useCallback(() => {
    void loadActivities();
  }, [loadActivities]);

  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;

    activities.forEach((activity) => {
      if (activity.status === 'completed') {
        completed += 1;
        return;
      }

      if (activity.status === 'pending' || activity.status === 'in_progress') {
        pending += 1;
      }
    });

    return {
      all: activities.length,
      pending,
      completed,
    };
  }, [activities]);

  const heroHighlights = useMemo(
    () => [
      { label: 'Activas', value: counts.pending },
      { label: 'Completadas', value: counts.completed },
      { label: 'Total', value: counts.all },
    ],
    [counts],
  );

  const tabConfig = useMemo(
    () => [
      { key: 'all' as const, label: 'Todas', count: counts.all },
      { key: 'pending' as const, label: 'Pendientes', count: counts.pending },
      { key: 'completed' as const, label: 'Completadas', count: counts.completed },
    ],
    [counts],
  );

  const filteredActivities = useMemo(() => {
    if (activeTab === 'pending') {
      return activities.filter((activity) => activity.status === 'pending' || activity.status === 'in_progress');
    }

    if (activeTab === 'completed') {
      return activities.filter((activity) => activity.status === 'completed');
    }

    return activities;
  }, [activities, activeTab]);

  const showSkeleton = isLoading && activities.length === 0;
  const formattedLastUpdated = lastUpdated ? formatDate(lastUpdated, 'Pendiente') : null;
  const currentResponses = useMemo(() => {
    if (!activeActivity) {
      return [] as BackendInstrumentResponse[];
    }
    const assignmentId = activeActivity.rawAssignment.id;
    return responsesByAssignment[assignmentId] ?? [];
  }, [activeActivity, responsesByAssignment]);

  return (
    <section className="space-y-10 from-fuchsia-50/60 via-white to-slate-50/70 px-4 py-10 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-r from-white/90 via-fuchsia-50/70 to-white/90 shadow-[0_40px_80px_-60px_rgba(76,29,149,0.45)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.22),_transparent_58%)]" aria-hidden />
        <div className="relative z-10 flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-fuchsia-500">
              <Sparkles className="h-3 w-3" /> Experiencia guiada
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/70">Instrumentos personales</p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">Mis instrumentos</h1>
              <p className="max-w-2xl text-base text-slate-500">
                Instrumentos y evaluaciones asignadas para tu seguimiento diario. Mantén el ritmo con esta consola futurista alineada al panel ejecutivo.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 rounded-3xl border border-white/60 bg-white/80 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 shadow-inner shadow-white/40 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:flex-col">
            <span>{formattedLastUpdated ? 'Actualizado' : 'Sincronización'}</span>
            <span className="text-base tracking-[0.1em] text-slate-900">{formattedLastUpdated ?? 'Pendiente'}</span>
          </div>
        </div>
        <div className="relative z-10 grid gap-3 border-t border-white/40 px-6 py-4 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500 sm:grid-cols-3">
          {heroHighlights.map((item) => (
            <span
              key={item.label}
              className="rounded-2xl border border-white/60 bg-white/70 px-3 py-3 text-center text-slate-600"
            >
              <strong className="block text-2xl font-semibold tracking-normal text-slate-900">{item.value}</strong>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/50 bg-white/85 p-5 shadow-[0_35px_75px_-55px_rgba(136,19,55,0.45)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-400">Tablero</p>
            <h2 className="text-xl font-semibold text-slate-900">Gestiona tus actividades</h2>
            <p className="text-sm text-slate-500">Filtra, actualiza o continúa cualquier instrumento desde aquí.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={!hasAuthContext || isLoading}
              className="rounded-2xl border-white/60 bg-white/80 text-slate-600 shadow-inner shadow-white/50 hover:bg-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <nav className="flex gap-3 rounded-2xl bg-white/80 p-2 text-sm font-semibold text-slate-500">
            {tabConfig.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition border border-gray/60 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/30'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-xs font-normal opacity-80">{tab.count}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {error && (
        <div className="rounded-[24px] border border-rose-100 bg-rose-50/85 p-4 text-sm text-rose-600 shadow-[0_25px_55px_-45px_rgba(190,24,93,0.6)]">
          {error}
        </div>
      )}

      {responsesError && !error && (
        <div className="rounded-[24px] border border-amber-100 bg-amber-50/85 p-4 text-sm text-amber-600 shadow-[0_25px_55px_-45px_rgba(217,119,6,0.3)]">
          {responsesError}
        </div>
      )}

      {showSkeleton ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[26px] border border-white/50 bg-white/85 p-6 shadow-[0_34px_60px_-45px_rgba(136,19,55,0.45)] backdrop-blur-xl"
            >
              <div className="animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100" />
                  <div className="h-4 w-32 rounded bg-slate-100" />
                </div>
                <div className="h-5 w-3/4 rounded bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-1/2 rounded bg-slate-100" />
                <div className="h-10 w-full rounded-2xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map((activity) => (
            <Card
              key={activity.id}
              className="flex h-full flex-col space-y-4 !rounded-[26px] !border-gray/60 !bg-gradient-to-br !from-white/95 !via-rose-50/60 !to-white/95 !shadow-[0_35px_75px_-55px_rgba(136,19,55,0.45)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap items-center gap-2 text-slate-500">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-inner">
                    {getStatusIcon(activity.status)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getCategoryColor(
                      activity.category,
                    )}`}
                  >
                    {formatCategoryLabel(activity.category)}
                  </span>
                </div>
                <span className="rounded-2xl border border-white/70 bg-white/85 p-2 text-fuchsia-300 shadow-inner">
                  <FileText className="h-5 w-5" />
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">{activity.name}</h3>
                {activity.description && <p className="text-sm text-slate-500">{activity.description}</p>}
              </div>

              {activity.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activity.topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center rounded-full bg-slate-100/80 px-2.5 py-1 text-xs text-slate-500 shadow-inner shadow-white/60"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-600">
                  {formatDate(activity.assignedAt, 'Sin fecha de asignación')}
                </span>
                <span className="text-slate-500">
                  {activity.status === 'completed'
                    ? `Finalizado ${formatDate(activity.completedAt, 'sin fecha')}`
                    : formatDueDate(activity.dueDate)}
                </span>
              </div>

              {activity.evaluated && (
                <div>
                  <span className="inline-flex items-center rounded-full bg-fuchsia-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-600">
                    Evaluado
                  </span>
                </div>
              )}

              <div className="mt-auto flex space-x-2">
                {activity.status === 'completed' ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl !border-fuchsia-100 !bg-white/85 !text-fuchsia-700 shadow-inner shadow-white/60 hover:!bg-white"
                    size="sm"
                    onClick={() => handleOpenInstrument(activity, 'readonly')}
                  >
                    Ver resultados
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full rounded-2xl !border-white/30 !bg-gradient-to-r !from-fuchsia-600 !via-rose-500 !to-indigo-600 !text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-105"
                    size="sm"
                    disabled={!activity.available}
                    onClick={() => handleOpenInstrument(activity, 'form')}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {activity.status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredActivities.length === 0 && !isLoading && !error && (
        <div className="rounded-[30px] border border-dashed border-fuchsia-100 bg-white/90 px-6 py-12 text-center shadow-[0_35px_75px_-55px_rgba(136,19,55,0.45)] backdrop-blur-xl">
          <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No se encontraron instrumentos</h3>
          <p className="text-slate-500">
            {activeTab === 'pending' && 'No tienes instrumentos pendientes por el momento.'}
            {activeTab === 'completed' && 'Aún no has completado ningún instrumento.'}
            {activeTab === 'all' && 'Todavía no se han asignado instrumentos para ti.'}
          </p>
        </div>
      )}

      <InstrumentResponseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        instrument={activeInstrument}
        assignmentName={activeActivity?.name ?? 'Instrumento asignado'}
        mode={modalMode}
        responses={currentResponses}
        onSubmit={handleSubmitInstrumentResponses}
        isSubmitting={isSubmittingResponses}
        error={modalError}
        isLoadingInstrument={isLoadingInstrumentDetail}
        infoMessage={
          modalMode === 'readonly' && isLoadingResponses
            ? 'Cargando respuestas guardadas...'
            : modalInfoMessage
        }
        coachObservation={modalMode === 'readonly' ? activeCoachObservation : null}
        isLoadingCoachObservation={modalMode === 'readonly' ? isLoadingCoachObservation : false}
        coachObservationError={modalMode === 'readonly' ? coachObservationError : null}
      />
    </section>
  );
};