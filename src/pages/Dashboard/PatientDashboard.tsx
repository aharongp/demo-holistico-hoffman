import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock, TrendingUp, Calendar, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
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

  const completedInstrumentCount = useMemo(
    () => assignments.filter((assignment) => assignment.completed || assignment.evaluated).length,
    [assignments],
  );

  const totalAssignmentsCount = assignments.length;

  const heroHighlights = useMemo(
    () => [
      { label: 'Pendientes', value: pendingInstrumentCount },
      { label: 'Completados', value: completedInstrumentCount },
      { label: 'Asignados', value: totalAssignmentsCount },
    ],
    [pendingInstrumentCount, completedInstrumentCount, totalAssignmentsCount],
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
  const formattedLastUpdated = formatUpdatedAt(lastUpdated);

  return (
    <section className="space-y-12 from-slate-950/5 via-white to-cyan-50/50 px-4 py-8 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-r from-white/90 via-cyan-50/70 to-white/90 shadow-[0_40px_80px_-60px_rgba(15,23,42,0.6)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_60%)]" aria-hidden />
        <div className="relative z-10 flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-cyan-500">
              <Sparkles className="h-3 w-3" /> Ritmo personal
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/70">Panel del paciente</p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {`¡Bienvenid@ de nuevo ${patientName}!`}
              </h1>
              <p className="max-w-2xl text-base text-slate-500">
                Visualiza tu avance, mantén tus hábitos y atiende tus instrumentos desde esta consola minimalista inspirada en la matriz ejecutiva.
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

      <div className="rounded-[28px] border border-white/50 bg-white/80 p-4 shadow-[0_30px_70px_-60px_rgba(15,23,42,0.8)] backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-[28px] border border-white/50 bg-white/85 shadow-[0_30px_60px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/50 pb-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-400">Evolución</p>
              <h2 className="text-xl font-semibold text-slate-900">Tu progreso a lo largo del tiempo</h2>
            </div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-400">6 semanas</span>
          </div>
          <div className="mt-4">
            <Chart
              title=""
              data={PROGRESS_DATA}
              type="line"
              dataKey="value"
              xAxisKey="name"
            />
          </div>
        </Card>

        <Card className="overflow-hidden rounded-[28px] border border-white/50 bg-white/85 shadow-[0_30px_60px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-400">Agenda</p>
              <h3 className="text-lg font-semibold text-slate-900">Instrumentos por vencer</h3>
              {formattedLastUpdated && (
                <p className="text-xs text-slate-500 mt-1">Actualizado {formattedLastUpdated}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoadingInstruments}
                aria-label="Actualizar instrumentos"
                className="rounded-xl border-white/60 bg-white/70 text-slate-600 shadow-inner shadow-white/40 hover:bg-white"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingInstruments ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/activities')}
                className="rounded-xl border-white/60 bg-white/70 text-slate-600 shadow-inner shadow-white/40 hover:bg-white"
              >
                Ver todos
              </Button>
            </div>
          </div>

          {isLoadingInstruments && (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-white/60 bg-slate-50/80 p-4"
                >
                  <div className="mb-2 h-4 w-3/4 rounded bg-slate-200/80" />
                  <div className="h-3 w-1/2 rounded bg-slate-200/60" />
                </div>
              ))}
            </div>
          )}

          {!isLoadingInstruments && instrumentsError && (
            <div className="py-4 text-sm text-rose-500">{instrumentsError}</div>
          )}

          {!isLoadingInstruments && !instrumentsError && expiringInstruments.length === 0 && (
            <div className="py-4 text-sm text-slate-500">No hay instrumentos próximos a vencer.</div>
          )}

          {!isLoadingInstruments && !instrumentsError && expiringInstruments.length > 0 && (
            <div className="space-y-3 py-4">
              {expiringInstruments.map((instrument) => {
                const cardTone = instrument.isOverdue
                  ? 'from-rose-50/90 via-white to-white/95 border-rose-100/80'
                  : 'from-amber-50/90 via-white to-white/95 border-amber-100/80';

                return (
                  <div
                    key={instrument.id}
                    className={`flex flex-col gap-3 rounded-2xl border bg-gradient-to-br ${cardTone} p-4 text-slate-700 shadow-lg shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`h-5 w-5 ${instrument.isOverdue ? 'text-rose-500' : 'text-amber-500'}`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 sm:text-base">{instrument.name}</p>
                        {instrument.description && (
                          <p className="mt-1 text-xs text-slate-500">{instrument.description}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {instrument.dueLabel} · {instrument.relativeLabel}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className={`w-full rounded-xl border border-white/30 text-white shadow-lg shadow-slate-900/10 sm:w-auto ${
                        instrument.isOverdue
                          ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 hover:brightness-105'
                          : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:brightness-105'
                      }`}
                      onClick={() => navigate('/activities')}
                      disabled={!instrument.available}
                    >
                      {instrument.available ? 'Ver instrumento' : 'No disponible'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="rounded-[28px] border border-white/40 bg-white/85 shadow-[0_35px_70px_-55px_rgba(15,23,42,0.95)] backdrop-blur-xl">
        <div className="mb-6">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-400">Acciones rápidas</p>
          <h3 className="text-lg font-semibold text-slate-900">Mantén tu plan al día</h3>
          <p className="text-sm text-slate-500">Registra tus hábitos o programa la siguiente sesión en segundos.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Button
            variant="primary"
            className="w-full rounded-2xl border border-white/20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:translate-y-0.5"
          >
            <Activity className="mr-2 h-4 w-4" />
            Registrar chequeo diario
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-2xl border border-slate-200/70 bg-white/70 text-slate-700 shadow-inner shadow-white/40 transition hover:bg-white"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Ver progreso
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-2xl border border-slate-200/70 bg-white/70 text-slate-700 shadow-inner shadow-white/40 transition hover:bg-white"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Agendar sesión
          </Button>
        </div>
      </Card>
    </section>
  );
};