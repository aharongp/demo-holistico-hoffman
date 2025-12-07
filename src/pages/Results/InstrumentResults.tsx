import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, Download, Filter, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useAuth } from '../../context/AuthContext';
import {
  AttitudinalStrengthResult,
  DailyReviewResult,
  HealthDiagnosticResult,
  PatientAggregatedResults,
  TestResult,
} from '../../types/patientResults';

type SummaryMetric = {
  label: string;
  helper: string;
  value: string;
};

type TestKey = 'stress' | 'health' | 'biologicalAge' | 'codependency';

const DEFAULT_METRICS: SummaryMetric[] = [
  {
    label: 'Competencias evaluadas',
    helper: 'Fortalezas',
    value: '—',
  },
  {
    label: 'Promedio actitudinal',
    helper: 'Escala 0-5',
    value: '—',
  },
  {
    label: 'Indicadores de salud',
    helper: 'Diagnóstico',
    value: '—',
  },
];

const TEST_METADATA: Record<
  TestKey,
  { title: string; description: string; accent: string; helper: string }
> = {
  stress: {
    title: 'Test de estrés',
    helper: 'Exposición actual',
    description: 'Clasificación según los niveles de estrés reportados en el instrumento clínico.',
    accent: 'from-[#fee2e2]/80 via-white to-[#fecaca]/70',
  },
  health: {
    title: 'Test de salud integral',
    helper: 'Estado general',
    description: 'Resultados ponderados en función de tu edad cronológica y hábitos de salud.',
    accent: 'from-[#d9f99d]/80 via-white to-[#a7f3d0]/70',
  },
  biologicalAge: {
    title: 'Test de edad biológica',
    helper: 'Comparativo cronológico',
    description: 'Evalúa el desfase entre tu edad cronológica y los indicadores medidos.',
    accent: 'from-[#e0e7ff]/80 via-white to-[#c7d2fe]/70',
  },
  codependency: {
    title: 'Test de código de dependencia',
    helper: 'Tendencia adictiva',
    description: 'Identifica patrones de dependencia emocional y conductual dentro de tu entorno.',
    accent: 'from-[#fde68a]/80 via-white to-[#fbcfe8]/70',
  },
};

const timelineMilestones = [
  {
    title: 'Revisión mensual programada',
    date: '12 febrero 2026',
    description: 'Sesión de retroalimentación integral con terapeuta asignado.',
    tag: 'Agenda',
  },
  {
    title: 'Instrumento Insight 360',
    date: 'Completado hace 4 días',
    description: 'Resultados listos para análisis comparativo contra el mes anterior.',
    tag: 'Historial',
  },
  {
    title: 'Nueva meta de respiración consciente',
    date: 'Pendiente de activar',
    description: 'Configura micro objetivos diarios vinculados a nivel de estrés percibido.',
    tag: 'Plan personal',
  },
];

const sanitizeApiBase = (value: string): string => value.replace(/\/+$/g, '');

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
    console.warn('No fue posible recuperar el usuario almacenado', error);
    return null;
  }
};

const buildSummaryMetrics = (results: PatientAggregatedResults | null): SummaryMetric[] => {
  if (!results) {
    return DEFAULT_METRICS;
  }

  const strengthsCount = results.attitudinal.strengths.length;
  const attitudinalAverage = results.attitudinal.summary?.average ?? null;
  const diagnosticsCount = results.health.diagnostics.length;

  return [
    {
      label: 'Competencias evaluadas',
      helper: 'Fortalezas',
      value: String(strengthsCount),
    },
    {
      label: 'Promedio actitudinal',
      helper: 'Escala 0-5',
      value: attitudinalAverage !== null ? attitudinalAverage.toFixed(2) : '—',
    },
    {
      label: 'Indicadores de salud',
      helper: 'Diagnóstico',
      value: String(diagnosticsCount),
    },
  ];
};

const mapToneClass = (color: string | null | undefined): string => {
  switch (color) {
    case 'text-red':
    case 'text-danger':
      return 'text-rose-500';
    case 'text-yellow':
    case 'text-warning':
      return 'text-amber-500';
    case 'text-green':
    case 'text-success':
      return 'text-emerald-500';
    case 'text-orange':
      return 'text-orange-500';
    case 'text-info':
      return 'text-sky-500';
    default:
      return 'text-slate-600';
  }
};

const buildBadgeClass = (color: string | null | undefined): string => {
  switch (color) {
    case 'text-red':
    case 'text-danger':
      return 'bg-rose-500 text-white';
    case 'text-yellow':
    case 'text-warning':
      return 'bg-amber-400 text-slate-900';
    case 'text-green':
    case 'text-success':
      return 'bg-emerald-500 text-white';
    case 'text-orange':
      return 'bg-orange-400 text-white';
    case 'text-info':
      return 'bg-sky-500 text-white';
    default:
      return 'bg-slate-600 text-white';
  }
};

const diagnosticStatusFromColor = (color: string | null | undefined): string => {
  switch (color) {
    case 'text-danger':
    case 'text-red':
      return 'Requiere atención';
    case 'text-warning':
    case 'text-orange':
      return 'Precaución';
    case 'text-success':
    case 'text-green':
      return 'Óptimo';
    case 'text-info':
      return 'Seguimiento';
    default:
      return 'Sin clasificación';
  }
};

const hasTestData = (tests: Record<string, TestResult | null>): boolean =>
  Object.values(tests).some((item) => Boolean(item));

export const InstrumentResults: React.FC = () => {
  const { token, user } = useAuth();
  const [results, setResults] = useState<PatientAggregatedResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchAggregatedResults = useCallback(async () => {
    if (!token) {
      setError('Debes iniciar sesión para visualizar tus resultados.');
      setResults(null);
      return;
    }

    if (resolvedUserId === null) {
      setError('No se encontró un paciente asociado al usuario actual.');
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${normalizedApiBase}/patient-instruments/results/user/${resolvedUserId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`No se pudieron obtener los resultados (${res.status})`);
      }

      const payload: PatientAggregatedResults = await res.json();
      setResults(payload);
    } catch (fetchError) {
      console.error('Error al obtener resultados de instrumentos', fetchError);
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar los resultados.';
      setError(message);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [normalizedApiBase, resolvedUserId, token]);

  useEffect(() => {
    if (token && resolvedUserId !== null) {
      void fetchAggregatedResults();
    }
  }, [fetchAggregatedResults, token, resolvedUserId]);

  const summaryMetrics = useMemo(() => buildSummaryMetrics(results), [results]);
  const attitudinalStrengths = results?.attitudinal.strengths ?? [];
  const attitudinalSummary = results?.attitudinal.summary ?? null;
  const healthDiagnostics = results?.health.diagnostics ?? [];
  const tests = results?.health.tests ?? {};
  const dailyReview = results?.dailyReview ?? [];

  const hasMeaningfulData = useMemo(() => {
    if (!results) {
      return false;
    }
    return (
      attitudinalStrengths.length > 0 ||
      Boolean(attitudinalSummary) ||
      healthDiagnostics.length > 0 ||
      dailyReview.length > 0 ||
      hasTestData(tests)
    );
  }, [results, attitudinalStrengths.length, attitudinalSummary, healthDiagnostics.length, dailyReview.length, tests]);

  const hasNoData = !hasMeaningfulData && !isLoading && !error;

  const handleRefresh = () => {
    void fetchAggregatedResults();
  };

  const attitudinalAccents = [
    'from-[#FDE68A]/80 via-white to-[#FBCFE8]/70',
    'from-[#fef08a]/80 via-white to-[#fda4af]/60',
    'from-[#fce7f3]/80 via-white to-[#c4b5fd]/70',
  ];

  const orderedTests: TestKey[] = ['stress', 'health', 'biologicalAge', 'codependency'];

  return (
    <section className="space-y-10 px-4 py-10 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/45 bg-gradient-to-r from-[#EEF5FF]/95 via-white/90 to-[#F5F3FF]/90 p-6 sm:p-10 shadow-[0_40px_90px_-65px_rgba(79,70,229,0.55)] backdrop-blur-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_60%)]"
        />
        <div aria-hidden="true" className="absolute -left-16 top-6 h-48 w-48 rounded-full bg-[#a5b4fc]/40 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-[#fbcfe8]/40 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.45em] text-[#4338CA]">
              Resultados
              <span className="h-1 w-1 rounded-full bg-[#4338CA]" />
              Vision
            </span>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                Panorama integral de tus instrumentos
              </h1>
              <p className="text-sm text-slate-600 sm:text-base">
                Visualiza cómo han evolucionado tus resultados y mantén el pulso de tus avances con paneles comparativos, tendencias y espacios listos para análisis cualitativos.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#C026D3] text-white shadow-[0_20px_45px_-25px_rgba(79,70,229,0.75)] hover:brightness-110"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border border-white/60 bg-white/60 text-[#4338CA] backdrop-blur hover:bg-white"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Explorar insights
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRefresh}
                className="border border-white/60 bg-white/60 text-[#4338CA] backdrop-blur hover:bg-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-3 lg:w-auto">
            {summaryMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-white/60 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">{metric.label}</p>
                <p className="text-3xl font-semibold text-slate-900">{metric.value}</p>
                <span className="text-xs text-slate-500">{metric.helper}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <Card className="rounded-[28px] border border-rose-100 bg-rose-50/90 p-6 text-sm text-rose-600 shadow-[0_25px_60px_-45px_rgba(244,63,94,0.45)]">
          {error}
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[28px] border border-white/35 bg-white/75 p-6 text-sm text-slate-500 shadow-[0_25px_70px_-55px_rgba(79,70,229,0.35)]">
          Cargando resultados personalizados...
        </Card>
      ) : null}

      <Card className="rounded-[28px] border border-white/35 bg-white/75 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.45)] backdrop-blur" padding="lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E0E7FF]/40 to-[#C7D2FE]/80 text-[#4338CA]">
              <Filter className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Filtros inteligentes</h2>
              <p className="text-sm text-slate-600">Configura cohortes, momentos del día y objetivos clínicos.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border border-white/60 bg-white/60 px-5 py-2 text-sm font-semibold text-slate-600"
            >
              Últimos 30 días
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border border-white/60 bg-white/60 px-5 py-2 text-sm font-semibold text-slate-600"
            >
              Todas las dimensiones
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border border-white/60 bg-white/60 px-5 py-2 text-sm font-semibold text-slate-600"
            >
              Comparativo histórico
            </Button>
          </div>
        </div>
      </Card>

      {attitudinalSummary ? (
        <Card className="rounded-[28px] border border-white/40 bg-white/80 shadow-[0_30px_70px_-55px_rgba(244,114,182,0.35)] backdrop-blur" padding="lg">
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">Competencia actitudinal</span>
                <h2 className="text-2xl font-semibold text-slate-900">Resumen general</h2>
              </div>
              <div
                className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-semibold ${buildBadgeClass(
                  attitudinalSummary.ponderation.colorTexto ?? attitudinalSummary.colorClass,
                )}`}
              >
                Estado: {attitudinalSummary.ponderation.holistica ?? 'Sin clasificación'}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/60 bg-white/80 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Promedio general</p>
                <p
                  className={`text-4xl font-semibold ${mapToneClass(
                    attitudinalSummary.colorClass ?? attitudinalSummary.ponderation.colorTexto,
                  )}`}
                >
                  {attitudinalSummary.average.toFixed(2)}
                </p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/80 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Ponderación</p>
                <p className="text-3xl font-semibold text-slate-900">{attitudinalSummary.percentage.toFixed(1)}%</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/80 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Enfoque académico</p>
                <p className="text-xl font-semibold text-slate-900">{attitudinalSummary.ponderation.academica ?? 'Sin dato'}</p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {attitudinalStrengths.length ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Fortalezas actitudinales</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {attitudinalStrengths.map((strength: AttitudinalStrengthResult, index) => {
              const accent = attitudinalAccents[index % attitudinalAccents.length];
              const toneClass = mapToneClass(strength.colorClass);
              const badgeClass = buildBadgeClass(strength.ponderation.colorTexto);
              return (
                <Card
                  key={`${strength.topicId ?? 'strength'}-${index}`}
                  className="relative overflow-hidden rounded-[28px] border border-white/35 bg-white/75 shadow-[0_34px_85px_-60px_rgba(244,114,182,0.4)] backdrop-blur"
                  padding="lg"
                >
                  <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Competencia</p>
                        <h3 className="text-lg font-semibold text-slate-900">{strength.topic ?? 'Competencia actitudinal'}</h3>
                      </div>
                      <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                        {strength.questionCount} preguntas
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Promedio</p>
                        <p className={`text-3xl font-semibold ${toneClass}`}>{strength.average.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Ponderación</p>
                        <p className="text-3xl font-semibold text-slate-900">{strength.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-sm text-slate-600">
                      <span className={`mb-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${badgeClass}`}>
                        {strength.ponderation.holistica ?? 'Sin clasificación'}
                      </span>
                      <p className="text-slate-600">Enfoque académico: {strength.ponderation.academica ?? 'Sin dato'}.</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasTestData(tests) ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Tests especializados</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {orderedTests.map((key) => {
              const meta = TEST_METADATA[key];
              const result = tests[key] ?? null;
              const toneClass = mapToneClass(result?.colorTexto ?? null);
              const badgeClass = result ? buildBadgeClass(result.colorTexto) : 'bg-slate-200 text-slate-700';
              return (
                <Card
                  key={key}
                  className="relative overflow-hidden rounded-[28px] border border-white/35 bg-white/75 shadow-[0_34px_85px_-60px_rgba(76,29,149,0.35)] backdrop-blur"
                  padding="lg"
                >
                  <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${meta.accent} opacity-60`} />
                  <div className="relative space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">{meta.helper}</p>
                        <h3 className="text-lg font-semibold text-slate-900">{meta.title}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${badgeClass}`}>
                        {result?.nivel ?? 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{meta.description}</p>
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
                      {result ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Total registrado</p>
                          <p className={`text-3xl font-semibold ${toneClass}`}>{result.total.toFixed(2)}</p>
                          {result.enunciado ? (
                            <p className="mt-2 text-sm text-slate-600">{result.enunciado}</p>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">Sin registros recientes para este test.</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {healthDiagnostics.length ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Diagnóstico de salud</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {healthDiagnostics.map((item: HealthDiagnosticResult, index) => {
              const badgeClass = buildBadgeClass(item.colorTexto);
              const toneClass = mapToneClass(item.colorTexto);
              const statusLabel = diagnosticStatusFromColor(item.colorTexto);
              return (
                <Card
                  key={`${item.id ?? 'diagnostic'}-${index}`}
                  className="relative overflow-hidden rounded-[28px] border border-white/35 bg-white/75 shadow-[0_34px_85px_-60px_rgba(59,130,246,0.35)] backdrop-blur"
                  padding="lg"
                >
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#BFDBFE]/70 via-white to-[#86EFAC]/60 opacity-60" />
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Indicador</p>
                        <h3 className="text-lg font-semibold text-slate-900">{item.diagnostic ?? 'Diagnóstico'}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {item.enunciado ? <p className="text-sm text-slate-600">{item.enunciado}</p> : null}
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Total</p>
                      <p className={`text-3xl font-semibold ${toneClass}`}>{item.total.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {dailyReview.length ? (
        <Card className="rounded-[28px] border border-white/40 bg-white/80 shadow-[0_30px_70px_-55px_rgba(79,70,229,0.35)] backdrop-blur" padding="lg">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#4338CA]">
                Seguimiento diario
              </span>
              <h2 className="text-xl font-semibold text-slate-900">Revista diaria</h2>
              <p className="text-sm text-slate-600">
                Promedios por tópicos con interpretación inmediata según las respuestas recientes.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dailyReview.map((entry: DailyReviewResult, index) => {
                const badgeClass = buildBadgeClass(entry.color);
                const toneClass = mapToneClass(entry.color);
                return (
                  <div
                    key={`${entry.topicId ?? 'topic'}-${index}`}
                    className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_45px_-35px_rgba(79,70,229,0.35)]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{entry.topic ?? `Tópico ${index + 1}`}</p>
                      {entry.enunciado ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${badgeClass}`}>
                          {entry.enunciado}
                        </span>
                      ) : null}
                    </div>
                    <p className={`mt-4 text-3xl font-semibold ${toneClass}`}>{entry.average.toFixed(2)}</p>
                    <p className="mt-2 text-xs text-slate-500">Promedio reportado</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      {hasNoData ? (
        <Card className="rounded-[28px] border border-dashed border-fuchsia-100 bg-white/85 p-10 text-center text-sm text-slate-500 shadow-[0_30px_75px_-55px_rgba(15,23,42,0.35)]">
          Aún no registramos resultados para tus instrumentos. Completa tus actividades para comenzar a visualizar tendencias personalizadas.
        </Card>
      ) : null}

      <Card className="rounded-[28px] border border-white/35 bg-white/75 shadow-[0_30px_75px_-55px_rgba(15,23,42,0.45)] backdrop-blur" padding="lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C7D2FE]/40 to-[#DBEAFE]/70 text-[#4338CA]">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Planes de evolución</h2>
              <p className="text-sm text-slate-600">
                Define escenarios y crea colecciones de métricas personalizadas para tus próximos seguimientos.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            className="bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#6D28D9] text-white shadow-[0_20px_45px_-28px_rgba(37,99,235,0.7)] hover:brightness-110"
          >
            Configurar tablero
          </Button>
        </div>
      </Card>

      <Card className="rounded-[28px] border border-white/35 bg-white/80 shadow-[0_30px_85px_-55px_rgba(15,23,42,0.45)] backdrop-blur" padding="lg">
        <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#4338CA]">
                Agenda
              </span>
              <h2 className="text-lg font-semibold text-slate-900">Seguimiento temporal</h2>
              <p className="text-sm text-slate-600">
                Mantén tu cronología de hallazgos, próximos encuentros y hitos destacados vinculados a cada instrumento respondido.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-6 w-max border border-white/60 bg-white/60 text-[#4338CA] backdrop-blur hover:bg-white"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Ver agenda completa
            </Button>
          </div>

          <div className="space-y-4">
            {timelineMilestones.map((milestone) => (
              <div
                key={milestone.title}
                className="rounded-2xl border border-white/60 bg-white/60 p-5 shadow-[0_18px_45px_-35px_rgba(79,70,229,0.45)]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">{milestone.title}</h3>
                  <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                    {milestone.tag}
                  </span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{milestone.date}</p>
                <p className="mt-2 text-sm text-slate-600">{milestone.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
};
