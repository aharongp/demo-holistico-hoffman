import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock, TrendingUp, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../components/Dashboard/StatsCard';
import { Chart } from '../../components/Dashboard/Chart';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useAuth } from '../../context/AuthContext';

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

type InstrumentStatus = 'pending' | 'in_progress' | 'completed';

const MS_IN_DAY = 1000 * 60 * 60 * 24;

const PROGRESS_DATA = [
  { name: 'Semana 1', value: 65 },
  { name: 'Semana 2', value: 70 },
  { name: 'Semana 3', value: 75 },
  { name: 'Semana 4', value: 82 },
  { name: 'Semana 5', value: 78 },
  { name: 'Semana 6', value: 85 },
];

const sanitizeApiBase = (value: string): string => value.replace(/\/+$/, '');

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

const resolveTimestamp = (value: string | null): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

const resolveStatus = (assignment: BackendPatientInstrumentAssignment): InstrumentStatus => {
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

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState<BackendPatientInstrumentAssignment[]>([]);
  const [isLoadingInstruments, setIsLoadingInstruments] = useState(false);
  const [instrumentsError, setInstrumentsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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

  const shortDateFormatter = useMemo(() => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }), []);
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  );

  const formatAbsoluteDueDate = useCallback(
    (value: string) => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return 'Fecha inválida';
      }
      return shortDateFormatter.format(parsed);
    },
    [shortDateFormatter],
  );

  const formatRelativeDueDate = useCallback((value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Fecha inválida';
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const diffDays = Math.round((dueStart.getTime() - todayStart.getTime()) / MS_IN_DAY);

    if (diffDays === 0) {
      return 'Vence hoy';
    }
    if (diffDays === 1) {
      return 'Vence mañana';
    }
    if (diffDays > 1) {
      return `En ${diffDays} días`;
    }
    if (diffDays === -1) {
      return 'Venció ayer';
    }
    return `Venció hace ${Math.abs(diffDays)} días`;
  }, []);

  const formatUpdatedAt = useCallback(
    (value: string | null) => {
      if (!value) {
        return null;
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return dateTimeFormatter.format(parsed);
    },
    [dateTimeFormatter],
  );

  const loadInstruments = useCallback(async () => {
    if (!token || resolvedUserId === null) {
      return;
    }

    setIsLoadingInstruments(true);
    setInstrumentsError(null);

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
      setAssignments(payload);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching patient instruments for dashboard', error);
      setAssignments([]);
      setLastUpdated(null);
      setInstrumentsError('No fue posible cargar los instrumentos. Intenta nuevamente más tarde.');
    } finally {
      setIsLoadingInstruments(false);
    }
  }, [normalizedApiBase, resolvedUserId, token]);

  useEffect(() => {
    if (!token) {
      setAssignments([]);
      setLastUpdated(null);
      setInstrumentsError('No hay una sesión activa.');
      return;
    }

    if (resolvedUserId === null) {
      setAssignments([]);
      setLastUpdated(null);
      setInstrumentsError('No se encontró un paciente asociado al usuario actual.');
      return;
    }

    void loadInstruments();
  }, [token, resolvedUserId, loadInstruments]);

  const pendingInstrumentCount = useMemo(
    () => assignments.filter((assignment) => !assignment.completed && !assignment.evaluated).length,
    [assignments],
  );

  const expiringInstruments = useMemo(() => {
    const now = Date.now();

    return assignments
      .filter((assignment) => !assignment.completed && !assignment.evaluated && Boolean(assignment.validUntil))
      .map((assignment) => {
        const due = assignment.validUntil as string;
        const dueTimestamp = resolveTimestamp(due);
        const status = resolveStatus(assignment);

        return {
          id: assignment.id,
          name: assignment.instrumentTypeName ?? `Instrumento #${assignment.instrumentTypeId ?? assignment.id}`,
          description: assignment.instrumentTypeDescription ?? assignment.origin ?? null,
          dueTimestamp,
          dueDate: due,
          dueLabel: formatAbsoluteDueDate(due),
          relativeLabel: formatRelativeDueDate(due),
          available: assignment.available,
          status,
          isOverdue: dueTimestamp !== Number.NEGATIVE_INFINITY && dueTimestamp < now,
        };
      })
      .filter((instrument) => instrument.dueTimestamp !== Number.NEGATIVE_INFINITY)
      .sort((a, b) => a.dueTimestamp - b.dueTimestamp)
      .slice(0, 3);
  }, [assignments, formatAbsoluteDueDate, formatRelativeDueDate]);

  const handleRefresh = useCallback(() => {
    void loadInstruments();
  }, [loadInstruments]);

  const patientNameRaw = user?.firstName ?? user?.username ?? 'paciente';
  const patientName = patientNameRaw.trim();

  return (
    <section className="space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{`¡Bienvenid@ de nuevo, ${patientName}!`}</h1>
        <p className="text-sm sm:text-base text-gray-600">Este es tu resumen de progreso</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatsCard
          title="Avance del programa"
          value="85%"
          icon={TrendingUp}
          change={{ value: 5, positive: true }}
          color="green"
        />
        <StatsCard
          title="Instrumentos pendientes"
          value={pendingInstrumentCount}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Completadas esta semana"
          value={7}
          icon={Activity}
          color="blue"
        />
        <StatsCard
          title="Días consecutivos"
          value={12}
          icon={Calendar}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Progress Chart */}
        <Chart
          title="Tu progreso a lo largo del tiempo"
          data={PROGRESS_DATA}
          type="line"
          dataKey="value"
          xAxisKey="name"
        />

        {/* Upcoming Activities */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Instrumentos por vencer</h3>
              {formatUpdatedAt(lastUpdated) && (
                <p className="text-xs text-gray-500 mt-1">Actualizado {formatUpdatedAt(lastUpdated)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoadingInstruments}
                aria-label="Actualizar instrumentos"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingInstruments ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/activities')}>
                Ver todos
              </Button>
            </div>
          </div>
          {isLoadingInstruments && (
            <div className="space-y-2 sm:space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse p-3 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!isLoadingInstruments && instrumentsError && (
            <div className="text-sm text-red-600">{instrumentsError}</div>
          )}

          {!isLoadingInstruments && !instrumentsError && expiringInstruments.length === 0 && (
            <div className="text-sm text-gray-600">No hay instrumentos próximos a vencer.</div>
          )}

          {!isLoadingInstruments && !instrumentsError && expiringInstruments.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              {expiringInstruments.map((instrument) => (
                <div
                  key={instrument.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg ${instrument.isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 ${instrument.isOverdue ? 'text-red-500' : 'text-yellow-500'}`}
                    />
                    <div>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{instrument.name}</p>
                      {instrument.description && (
                        <p className="text-xs text-gray-600 mt-1">{instrument.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {instrument.dueLabel} · {instrument.relativeLabel}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={instrument.isOverdue ? 'danger' : 'secondary'}
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => navigate('/activities')}
                    disabled={!instrument.available}
                  >
                    {instrument.available ? 'Ver instrumento' : 'No disponible'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Acciones rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <Button variant="primary" className="w-full">
            <Activity className="w-4 h-4 mr-2" />
            Registrar chequeo diario
          </Button>
          <Button variant="outline" className="w-full">
            <TrendingUp className="w-4 h-4 mr-2" />
            Ver progreso
          </Button>
          <Button variant="outline" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Agendar sesión
          </Button>
        </div>
      </Card>
    </section>
  );
};