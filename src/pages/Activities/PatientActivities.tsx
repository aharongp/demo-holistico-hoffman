import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Clock, CheckCircle, FileText, RefreshCw } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useAuth } from '../../context/AuthContext';

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
  { match: (value) => value.includes('salud') || value.includes('health'), className: 'bg-green-100 text-green-800' },
  { match: (value) => value.includes('psic') || value.includes('psy'), className: 'bg-blue-100 text-blue-800' },
  { match: (value) => value.includes('actitud') || value.includes('attitude'), className: 'bg-purple-100 text-purple-800' },
  { match: (value) => value.includes('emoc') || value.includes('emotion'), className: 'bg-pink-100 text-pink-800' },
];

const getCategoryColor = (category: string): string => {
  const normalized = category.trim().toLowerCase();
  const match = CATEGORY_STYLES.find((style) => style.match(normalized));
  return match ? match.className : 'bg-gray-100 text-gray-800';
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
  };
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
};

const sanitizeApiBase = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'http://localhost:3000';
  }

  return value.replace(/\/+$/, '');
};

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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const apiBase = useMemo(() => sanitizeApiBase((import.meta as any)?.env?.VITE_API_BASE), []);
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
      const response = await fetch(`${apiBase}/patient-instruments/user/${resolvedUserId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
  throw new Error(`Error al obtener instrumentos (${response.status})`);
      }

      const payload: BackendPatientInstrumentAssignment[] = await response.json();
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
  }, [apiBase, resolvedUserId, token]);

  useEffect(() => {
    if (hasAuthContext) {
      void loadActivities();
    } else {
      setActivities([]);
    }
  }, [hasAuthContext, loadActivities]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis instrumentos</h1>
          <p className="text-gray-600">Instrumentos y evaluaciones asignadas para tu seguimiento</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">Actualizado {formatDate(lastUpdated, 'recientemente')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={!hasAuthContext || isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <div className="text-sm text-red-600">{error}</div>
        </Card>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { key: 'all', label: 'Todas', count: counts.all },
            { key: 'pending', label: 'Pendientes', count: counts.pending },
            { key: 'completed', label: 'Completadas', count: counts.completed },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {showSkeleton ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <div className="animate-pulse space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-9 bg-gray-200 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity) => (
            <Card key={activity.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  {getStatusIcon(activity.status)}
                  <span
                    className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(activity.category)}`}
                  >
                    {formatCategoryLabel(activity.category)}
                  </span>
                </div>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">{activity.name}</h3>
              {activity.description && <p className="text-sm text-gray-600 mb-4">{activity.description}</p>}

              {activity.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {activity.topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{formatDate(activity.assignedAt, 'Sin fecha de asignación')}</span>
                <span>
                  {activity.status === 'completed'
                    ? `Finalizado ${formatDate(activity.completedAt, 'sin fecha')}`
                    : formatDueDate(activity.dueDate)}
                </span>
              </div>

              {activity.evaluated && (
                <div className="mb-4">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    Evaluado
                  </span>
                </div>
              )}

              <div className="flex space-x-2">
                {activity.status === 'completed' ? (
                  <Button variant="outline" className="w-full" size="sm">
                    Ver resultados
                  </Button>
                ) : (
                  <Button variant="primary" className="w-full" size="sm" disabled={!activity.available}>
                    <Play className="w-4 h-4 mr-2" />
                    {activity.status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredActivities.length === 0 && !isLoading && !error && (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron instrumentos</h3>
            <p className="text-gray-600">
              {activeTab === 'pending' && 'No tienes instrumentos pendientes por el momento.'}
              {activeTab === 'completed' && 'Aún no has completado ningún instrumento.'}
              {activeTab === 'all' && 'Todavía no se han asignado instrumentos para ti.'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};