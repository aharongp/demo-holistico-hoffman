import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { BarChart3, Calendar, Download, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useAuth } from '../../context/AuthContext';
import {
  AttitudinalStrengthResult,
  DailyReviewResult,
  HealthDiagnosticResult,
  HealthDiagnosticResponse,
  FirmnessAdaptabilityBalance,
  FirmnessAdaptabilityResult,
  PatientAggregatedResults,
  PatientResultsSectionMetadata,
  TestResult,
  WheelResult,
} from '../../types/patientResults';
import type { TooltipProps } from 'recharts';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RadarTooltip,
  PieChart,
  Pie,
  Cell,
  Tooltip as PieTooltip,
} from 'recharts';

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

const FIRMNESS_BALANCE_METADATA: Record<
  FirmnessAdaptabilityBalance,
  { title: string; description: string; accent: string; tone: string }
> = {
  firmness: {
    title: 'Predomina la firmeza',
    description: 'Las respuestas recientes se inclinan mayormente hacia la firmeza.',
    accent: 'from-[#fecdd3]/75 via-white to-[#fda4af]/60',
    tone: 'text-rose-500',
  },
  adaptability: {
    title: 'Predomina la adaptabilidad',
    description: 'Las respuestas recientes favorecen la adaptabilidad frente a la firmeza.',
    accent: 'from-[#bfdbfe]/75 via-white to-[#93c5fd]/60',
    tone: 'text-sky-500',
  },
  balanced: {
    title: 'Equilibrio observado',
    description: 'Se mantiene un balance porcentual entre ambos ejes.',
    accent: 'from-[#fde68a]/75 via-white to-[#bbf7d0]/60',
    tone: 'text-emerald-600',
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

type InstrumentResultsProps = {
  patientUserId?: number;
  titleOverride?: string;
  subtitleOverride?: string;
  className?: string;
};

const sanitizeApiBase = (value: string): string => value.replace(/\/+$/g, '');

const parseNumericId = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const wheelValueToPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const percent = (value / 10) * 100;
  return Math.min(Math.max(percent, 0), 100);
};

const REGIFLEX_COLORS = ['#a5b4fc', '#6366f1', '#22d3ee', '#38bdf8', '#34d399'];

type RegiflexAggregatedEntry = {
  topicLabel: string;
  value: number;
};

const wrapWheelLabel = (value: string, maxChars = 14): string[] => {
  if (!value) {
    return [''];
  }

  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current.length) {
      current = word;
      continue;
    }

    if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines.slice(0, 3) : [''];
};

const WheelAxisTick: React.FC<{ x?: number; y?: number; payload?: { value: string } }> = ({ x = 0, y = 0, payload }) => {
  const lines = wrapWheelLabel(payload?.value ?? '');

  return (
    <text x={x} y={y} textAnchor="middle" fill="#475569" fontSize={11} fontWeight={500}>
      {lines.map((line, index) => (
        <tspan key={`${payload?.value ?? 'tick'}-${index}`} x={x} dy={index === 0 ? 0 : 12}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

const renderWheelTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const item = payload[0];
  const topic = String(item.payload?.topicLabel ?? item.name ?? 'Dimensión');
  const value = Number(item.payload?.average ?? item.value ?? 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-700">{topic}</p>
      <p className="text-slate-500">{value.toFixed(2)} / 10</p>
    </div>
  );
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

const formatDisplayDate = (value: string | null, fallback = 'Más reciente'): string => {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  } catch (error) {
    console.warn('No fue posible formatear la fecha seleccionada', error);
    return value;
  }
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

type SectionKey =
  | 'diagnostics'
  | 'tests'
  | 'firmnessAdaptability'
  | 'dailyReview'
  | 'wellnessLife'
  | 'wellnessHealth'
  | 'wellnessRegiflex';
const SECTION_KEYS: SectionKey[] = [
  'diagnostics',
  'tests',
  'firmnessAdaptability',
  'dailyReview',
  'wellnessLife',
  'wellnessHealth',
  'wellnessRegiflex',
];
type SectionDateState = Record<SectionKey, string | null>;
const EMPTY_SECTION_METADATA: PatientResultsSectionMetadata = {
  availableDates: [],
  selectedDate: null,
};

const createEmptySectionFilters = (): SectionDateState => ({
  diagnostics: null,
  tests: null,
  firmnessAdaptability: null,
  dailyReview: null,
  wellnessLife: null,
  wellnessHealth: null,
  wellnessRegiflex: null,
});

export const InstrumentResults: React.FC<InstrumentResultsProps> = ({
  patientUserId,
  titleOverride,
  subtitleOverride,
  className,
}) => {
  const { token, user } = useAuth();
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [results, setResults] = useState<PatientAggregatedResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SectionDateState>(() => createEmptySectionFilters());
  const [metadata, setMetadata] = useState<PatientAggregatedResults['metadata'] | null>(null);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const baseFilterId = useId();
  const filterIds = useMemo<Record<SectionKey, string>>(
    () =>
      SECTION_KEYS.reduce((acc, section) => {
        acc[section] = `${baseFilterId}-${section}`;
        return acc;
      }, {} as Record<SectionKey, string>),
    [baseFilterId],
  );

  type ImportMetaWithEnv = { env?: Record<string, string | undefined> };
  const apiBase = ((import.meta as unknown as ImportMetaWithEnv).env?.VITE_API_BASE ?? 'http://localhost:3000');
  const normalizedApiBase = useMemo(() => sanitizeApiBase(apiBase), [apiBase]);
  const storedUserId = useMemo(() => readStoredUserId(), []);
  const resolvedUserId = useMemo(() => {
    if (typeof patientUserId === 'number' && Number.isFinite(patientUserId)) {
      return patientUserId;
    }
    const fallbackUser = user as { id?: number; userId?: number } | null;
    const contextId = parseNumericId(user?.id ?? fallbackUser?.userId);
    if (contextId !== null) {
      return contextId;
    }
    return storedUserId;
  }, [patientUserId, storedUserId, user]);

  useEffect(() => {
    const resetFilters = createEmptySectionFilters();
    filtersRef.current = resetFilters;
    setFilters(resetFilters);
    setMetadata(null);
    setResults(null);
    setError(null);
  }, [resolvedUserId]);

  const fetchAggregatedResults = useCallback(
    async (customFilters?: SectionDateState) => {
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

      const activeFilters = customFilters ?? filtersRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (activeFilters.diagnostics) {
          params.set('diagnosticsDate', activeFilters.diagnostics);
        }
        if (activeFilters.tests) {
          params.set('testsDate', activeFilters.tests);
        }
        if (activeFilters.firmnessAdaptability) {
          params.set('firmnessAdaptabilityDate', activeFilters.firmnessAdaptability);
        }
        if (activeFilters.dailyReview) {
          params.set('dailyReviewDate', activeFilters.dailyReview);
        }
        if (activeFilters.wellnessLife) {
          params.set('wellnessLifeDate', activeFilters.wellnessLife);
        }
        if (activeFilters.wellnessHealth) {
          params.set('wellnessHealthDate', activeFilters.wellnessHealth);
        }
        if (activeFilters.wellnessRegiflex) {
          params.set('wellnessRegiflexDate', activeFilters.wellnessRegiflex);
        }

        const query = params.toString();
        const endpoint = `${normalizedApiBase}/patient-instruments/results/user/${resolvedUserId}${
          query ? `?${query}` : ''
        }`;

        const res = await fetch(endpoint, {
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
        setMetadata(payload.metadata ?? null);

        const nextFilters: SectionDateState = {
          diagnostics: payload.metadata?.diagnostics?.selectedDate ?? null,
          tests: payload.metadata?.tests?.selectedDate ?? null,
          firmnessAdaptability: payload.metadata?.firmnessAdaptability?.selectedDate ?? null,
          dailyReview: payload.metadata?.dailyReview?.selectedDate ?? null,
          wellnessLife: payload.metadata?.wellnessLife?.selectedDate ?? null,
          wellnessHealth: payload.metadata?.wellnessHealth?.selectedDate ?? null,
          wellnessRegiflex: payload.metadata?.wellnessRegiflex?.selectedDate ?? null,
        };

        filtersRef.current = nextFilters;
        setFilters(nextFilters);
      } catch (fetchError) {
        console.error('Error al obtener resultados de instrumentos', fetchError);
        const message = fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar los resultados.';
        setError(message);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    },
    [normalizedApiBase, resolvedUserId, token],
  );

  const handleSectionDateChange = useCallback(
    (section: SectionKey, value: string) => {
      const nextValue = value === '' ? null : value;
      const nextFilters = { ...filtersRef.current, [section]: nextValue } as SectionDateState;
      filtersRef.current = nextFilters;
      setFilters(nextFilters);
      void fetchAggregatedResults(nextFilters);
    },
    [fetchAggregatedResults],
  );

  const getSectionFilterState = useCallback(
    (section: SectionKey) => {
      const meta = metadata?.[section] ?? EMPTY_SECTION_METADATA;
      const selected = filters[section] ?? meta.selectedDate ?? null;
      return { meta, selected };
    },
    [filters, metadata],
  );

  const renderSectionDateSelect = useCallback(
    (section: SectionKey, title: string, helper?: string) => {
      const { meta, selected } = getSectionFilterState(section);
      if (!meta.availableDates.length) {
        return null;
      }

      const options = meta.availableDates.map((date) => ({
        value: date,
        label: formatDisplayDate(date),
      }));

      return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">{title}</span>
            {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
          </div>
          <div className="relative">
            <select
              id={filterIds[section]}
              aria-label={title}
              value={selected ?? ''}
              onChange={(event) => handleSectionDateChange(section, event.target.value)}
              disabled={isLoading}
              className="appearance-none rounded-2xl border border-white/60 bg-white/80 py-2 pl-4 pr-10 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] focus:border-[#4338CA]/70 focus:outline-none focus:ring-2 focus:ring-[#4338CA]/30 disabled:cursor-wait"
            >
              <option value="">{formatDisplayDate(null)}</option>
              {options.map((option) => (
                <option key={`${section}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      );
    },
    [filterIds, getSectionFilterState, handleSectionDateChange, isLoading],
  );

  useEffect(() => {
    if (token && resolvedUserId !== null) {
      void fetchAggregatedResults();
    }
  }, [fetchAggregatedResults, token, resolvedUserId]);

  const summaryMetrics = useMemo(() => buildSummaryMetrics(results), [results]);
  const attitudinalStrengths = results?.attitudinal.strengths ?? [];
  const attitudinalSummary = results?.attitudinal.summary ?? null;
  const firmnessAdaptability: FirmnessAdaptabilityResult | null = results?.firmnessAdaptability ?? null;
  const healthDiagnostics = results?.health.diagnostics ?? [];
  const tests = useMemo<Record<string, TestResult | null>>(
    () => results?.health.tests ?? {},
    [results],
  );
  const hasTestsData = useMemo(() => hasTestData(tests), [tests]);
  const dailyReview = results?.dailyReview ?? [];
  const wheelOfLife = results?.wellness?.wheelOfLife ?? [];
  const wheelOfHealth = results?.wellness?.wheelOfHealth ?? [];
  const regiflex = results?.wellness?.regiflex ?? null;
  const hasWellnessData = wheelOfLife.length > 0 || wheelOfHealth.length > 0 || Boolean(regiflex);
  const firmnessAdaptabilityAxes = useMemo(
    () => {
      if (!firmnessAdaptability) {
        return [] as Array<{
          key: 'firmness' | 'adaptability';
          label: string;
          sum: number;
          percentage: number;
          tone: string;
          barClass: string;
        }>;
      }
      return [
        {
          key: 'firmness' as const,
          label: firmnessAdaptability.firmness.label ?? 'Firmeza',
          sum: firmnessAdaptability.firmness.sum,
          percentage: firmnessAdaptability.firmness.percentage,
          tone: 'text-rose-500',
          barClass: 'from-[#fda4af]/80 to-[#fb7185]/80',
        },
        {
          key: 'adaptability' as const,
          label: firmnessAdaptability.adaptability.label ?? 'Adaptabilidad',
          sum: firmnessAdaptability.adaptability.sum,
          percentage: firmnessAdaptability.adaptability.percentage,
          tone: 'text-sky-500',
          barClass: 'from-[#93c5fd]/80 to-[#60a5fa]/80',
        },
      ];
    },
    [firmnessAdaptability]
  );
  const firmnessBalanceMeta = useMemo(
    () => (firmnessAdaptability ? FIRMNESS_BALANCE_METADATA[firmnessAdaptability.balance] : null),
    [firmnessAdaptability]
  );
  const lifeRadarIdSource = useId();
  const lifeRadarGradientId = useMemo(
    () => `${lifeRadarIdSource}-life-fill`.replace(/[:]/g, '-'),
    [lifeRadarIdSource]
  );
  const healthRadarIdSource = useId();
  const healthRadarGradientId = useMemo(
    () => `${healthRadarIdSource}-health-fill`.replace(/[:]/g, '-'),
    [healthRadarIdSource]
  );
  const sortedWheelOfLife = useMemo(
    () => [...wheelOfLife].sort((a, b) => b.average - a.average),
    [wheelOfLife]
  );
  const lifeRadarData = useMemo(
    () =>
      wheelOfLife.map((item, index) => {
        const average = Number.isFinite(item.average) ? Number(item.average) : 0;
        const topicLabel = item.topic?.trim().length ? item.topic.trim() : `Dimensión ${index + 1}`;
        return {
          topic: item.topic ?? null,
          topicLabel,
          average,
        };
      }),
    [wheelOfLife]
  );
  const lifeRadarTooltip = useCallback(
    (props: TooltipProps<number, string>) => renderWheelTooltip(props),
    []
  );
  const aggregatedRegiflexEntries = useMemo<RegiflexAggregatedEntry[]>(() => {
    if (!regiflex) {
      return [];
    }

    const buckets = new Map<string, RegiflexAggregatedEntry>();

    regiflex.entries.forEach((entry, index) => {
      const value = Number.isFinite(entry.sum) ? Number(entry.sum) : 0;
      const rawLabel = entry.topic?.trim() ?? '';
      const topicLabel = rawLabel.length ? rawLabel : `Tendencia ${index + 1}`;
      const key = rawLabel.length ? rawLabel.toLowerCase() : `__fallback_${index}`;

      const existing = buckets.get(key);
      if (existing) {
        existing.value += value;
      } else {
        buckets.set(key, {
          topicLabel,
          value,
        });
      }
    });

    return Array.from(buckets.values()).filter((entry) => entry.value > 0);
  }, [regiflex]);
  const regiflexTotal = useMemo(
    () => aggregatedRegiflexEntries.reduce((acc, entry) => acc + entry.value, 0),
    [aggregatedRegiflexEntries]
  );
  const regiflexPieData = aggregatedRegiflexEntries;
  const sortedRegiflexEntries = useMemo(
    () => [...aggregatedRegiflexEntries].sort((a, b) => b.value - a.value),
    [aggregatedRegiflexEntries]
  );
  const regiflexPieTooltip = useCallback(
    ({ active, payload }: TooltipProps<number, string>) => {
      if (!active || !payload || !payload.length) {
        return null;
      }

      const item = payload[0];
      const topicLabel = String(item.payload?.topicLabel ?? item.name ?? 'Tendencia');
      const value = Number(item.value ?? item.payload?.value ?? 0);
      const percentage = regiflexTotal > 0 ? (value / regiflexTotal) * 100 : 0;

      return (
        <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl">
          <p className="font-semibold text-slate-700">{topicLabel}</p>
          <p className="text-slate-500">{value.toFixed(2)} puntos · {percentage.toFixed(1)}%</p>
        </div>
      );
    },
    [regiflexTotal]
  );
  const sortedWheelOfHealth = useMemo(
    () => [...wheelOfHealth].sort((a, b) => b.average - a.average),
    [wheelOfHealth]
  );
  const healthRadarData = useMemo(
    () =>
      wheelOfHealth.map((item, index) => {
        const average = Number.isFinite(item.average) ? Number(item.average) : 0;
        const topicLabel = item.topic?.trim().length ? item.topic.trim() : `Dimensión ${index + 1}`;
        return {
          topic: item.topic ?? null,
          topicLabel,
          average,
        };
      }),
    [wheelOfHealth]
  );
  const healthRadarTooltip = useCallback(
    (props: TooltipProps<number, string>) => renderWheelTooltip(props),
    []
  );

  const hasMeaningfulData = useMemo(() => {
    if (!results) {
      return false;
    }
    return (
      attitudinalStrengths.length > 0 ||
      Boolean(attitudinalSummary) ||
      Boolean(firmnessAdaptability) ||
      healthDiagnostics.length > 0 ||
      dailyReview.length > 0 ||
      hasTestsData ||
      hasWellnessData
    );
  }, [
    results,
    attitudinalStrengths.length,
    attitudinalSummary,
    firmnessAdaptability,
    healthDiagnostics.length,
    dailyReview.length,
    hasTestsData,
    hasWellnessData,
  ]);

  const hasNoData = !hasMeaningfulData && !isLoading && !error;

  const handleExportPdf = useCallback(async () => {
    const contentElement = resultsRef.current;
    if (!contentElement) {
      return;
    }

    setExportError(null);
    setIsExporting(true);

    const previousStyles = {
      maxHeight: contentElement.style.maxHeight,
      height: contentElement.style.height,
      overflow: contentElement.style.overflow,
      overflowY: contentElement.style.overflowY,
    };

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      contentElement.style.maxHeight = 'none';
      contentElement.style.height = 'auto';
      contentElement.style.overflow = 'visible';
      contentElement.style.overflowY = 'visible';

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(contentElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowWidth: contentElement.scrollWidth,
        windowHeight: contentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usablePageHeight = pageHeight - margin * 2;

      let heightLeft = pdfHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, pdfHeight);
      heightLeft -= usablePageHeight;

      while (heightLeft > 0) {
        position = margin - (pdfHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, pdfHeight);
        heightLeft -= usablePageHeight;
      }

      const ISO_DATE_LENGTH = 10;
      const timestamp = new Date().toISOString().slice(0, ISO_DATE_LENGTH).replace(/-/g, '');
      const filename = timestamp ? `resultados-instrumentos-${timestamp}.pdf` : 'resultados-instrumentos.pdf';

      pdf.save(filename);
    } catch (exportException) {
      console.error('Error exporting instrument results PDF', exportException);
      setExportError('No se pudo exportar el PDF. Intenta nuevamente.');
    } finally {
      contentElement.style.maxHeight = previousStyles.maxHeight;
      contentElement.style.height = previousStyles.height;
      contentElement.style.overflow = previousStyles.overflow;
      contentElement.style.overflowY = previousStyles.overflowY;
      setIsExporting(false);
    }
  }, [resultsRef]);

  const handleRefresh = () => {
    void fetchAggregatedResults();
  };

  const attitudinalAccents = [
    'from-[#FDE68A]/80 via-white to-[#FBCFE8]/70',
    'from-[#fef08a]/80 via-white to-[#fda4af]/60',
    'from-[#fce7f3]/80 via-white to-[#c4b5fd]/70',
  ];

  const orderedTests: TestKey[] = ['stress', 'health', 'biologicalAge', 'codependency'];
  const resolvedTitle = titleOverride ?? 'Panorama integral de tus instrumentos';
  const resolvedSubtitle =
    subtitleOverride ??
    'Visualiza cómo han evolucionado tus resultados y mantén el pulso de tus avances con paneles comparativos, tendencias y espacios listos para análisis cualitativos.';
  const sectionClassName = className
    ? `space-y-10 px-4 py-10 sm:px-8 ${className}`
    : 'space-y-10 px-4 py-10 sm:px-8';

  return (
    <section ref={resultsRef} className={sectionClassName}>
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
                {resolvedTitle}
              </h1>
              <p className="text-sm text-slate-600 sm:text-base">
                {resolvedSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  void handleExportPdf();
                }}
                disabled={isExporting}
                className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#C026D3] text-white shadow-[0_20px_45px_-25px_rgba(79,70,229,0.75)] hover:brightness-110 disabled:cursor-wait disabled:opacity-80"
              >
                {isExporting ? (
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isExporting ? 'Generando...' : 'Exportar PDF'}
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
            {exportError ? (
              <p className="text-sm font-medium text-rose-500">
                {exportError}
              </p>
            ) : null}
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

      {firmnessAdaptability ? (
        <Card
          className="relative overflow-hidden rounded-[28px] border border-white/35 bg-white/80 shadow-[0_34px_85px_-60px_rgba(79,70,229,0.3)] backdrop-blur"
          padding="lg"
        >
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-gradient-to-br ${firmnessBalanceMeta?.accent ?? 'from-[#E0E7FF]/70 via-white to-[#FBCFE8]/60'} opacity-60`}
          />
          <div className="relative space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Balance actitudinal</span>
                <h2 className="text-xl font-semibold text-slate-900">Firmeza vs Adaptabilidad</h2>
                <p className="text-sm text-slate-600">
                  Comparativo porcentual del instrumento de salud (tema 139) que pondera la relación entre firmeza y adaptabilidad.
                </p>
              </div>
              {firmnessBalanceMeta ? (
                <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-right shadow-[0_18px_45px_-40px_rgba(79,70,229,0.35)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Balance actual</p>
                  <p className={`text-base font-semibold ${firmnessBalanceMeta.tone}`}>{firmnessBalanceMeta.title}</p>
                </div>
              ) : null}
            </div>
            {renderSectionDateSelect(
              'firmnessAdaptability',
              'Corte firmeza/adaptabilidad',
              'Selecciona la fecha de referencia para este balance.',
            )}
            <div className="grid gap-5 md:grid-cols-2">
              {firmnessAdaptabilityAxes.map((axis) => (
                <div
                  key={axis.key}
                  className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_45px_-40px_rgba(79,70,229,0.35)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{axis.label}</p>
                    <span className={`text-sm font-semibold ${axis.tone}`}>{axis.percentage.toFixed(1)}%</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Total acumulado: {axis.sum.toFixed(2)}</p>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${axis.barClass}`}
                      style={{ width: `${Math.min(Math.max(axis.percentage, 0), 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Diferencia porcentual</p>
                <p className={`text-3xl font-semibold ${firmnessBalanceMeta?.tone ?? 'text-slate-900'}`}>
                  {firmnessAdaptability.difference.toFixed(1)}%
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {firmnessBalanceMeta?.description ?? 'Comparativo entre ambos ejes actitudinales.'}
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-white/60 bg-white/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Total de puntos</p>
                <p className="text-2xl font-semibold text-slate-900">{firmnessAdaptability.total.toFixed(2)}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Los porcentajes se calculan sobre la suma combinada de respuestas para ambos ejes.
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {hasTestsData ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">Tests especializados</h2>
            {renderSectionDateSelect('tests', 'Corte de tests', 'Selecciona la fecha que deseas revisar.')}
          </div>
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
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">Diagnóstico de salud</h2>
            {renderSectionDateSelect('diagnostics', 'Corte de diagnósticos', 'Explora mediciones previas en esta sección.')}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {healthDiagnostics.map((item: HealthDiagnosticResult, index) => {
              const badgeClass = buildBadgeClass(item.colorTexto);
              const toneClass = mapToneClass(item.colorTexto);
              const statusLabel = diagnosticStatusFromColor(item.colorTexto);
              const answers = item.responses ?? [];
              const visibleAnswers = answers.filter((response) => {
                const answerLabel = response?.answer ?? '';
                return answerLabel.trim().length > 0;
              });
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
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-5 space-y-5">
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Respuestas registradas</p>
                        {visibleAnswers.length ? (
                          <ul className="space-y-2">
                            {visibleAnswers.map((response: HealthDiagnosticResponse, responseIndex) => {
                              const questionLabel = response.question?.trim();
                              const answerLabel = response.answer?.trim() ?? '';
                              return (
                                <li
                                  key={`${questionLabel ?? 'respuesta'}-${responseIndex}-${answerLabel}`}
                                  className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 shadow-[0_18px_45px_-40px_rgba(59,130,246,0.45)]"
                                >
                                  {questionLabel ? (
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                                      {questionLabel}
                                    </p>
                                  ) : null}
                                  <p className="text-sm text-slate-700">{answerLabel}</p>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">Sin respuestas registradas.</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Total</p>
                        <p className={`text-3xl font-semibold ${toneClass}`}>{item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasWellnessData ? (
        <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">Bienestar integral</h2>
            </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {wheelOfLife.length ? (
              <Card
                className="relative overflow-hidden rounded-[28px] border border-white/35 bg-white/75 shadow-[0_34px_85px_-60px_rgba(251,146,60,0.35)] backdrop-blur"
                padding="lg"
              >
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#FDE68A]/70 via-white to-[#FB7185]/60 opacity-60" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Rueda</p>
                      <h3 className="text-lg font-semibold text-slate-900">Dimensiones de vida</h3>
                    </div>
                    <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                      {wheelOfLife.length} tópicos
                    </span>
                  </div>
                  {renderSectionDateSelect('wellnessLife', 'Corte rueda de vida', 'Selecciona la fecha de referencia para esta rueda.')}
                  <p className="text-sm text-slate-600">Promedios generales por dimensión con escala 0-10.</p>
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                    <div className="space-y-6">
                      <div className="h-72">
                        {lifeRadarData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                              data={lifeRadarData}
                              outerRadius="75%"
                              startAngle={90}
                              endAngle={-270}
                            >
                              <defs>
                                <linearGradient id={lifeRadarGradientId} x1="50%" y1="0%" x2="50%" y2="100%">
                                  <stop offset="0%" stopColor="#fb7185" stopOpacity={0.85} />
                                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.45} />
                                </linearGradient>
                              </defs>
                              <PolarGrid gridType="polygon" stroke="#e2e8f0" radialLines={false} />
                              <PolarAngleAxis dataKey="topicLabel" tick={<WheelAxisTick />} />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 10]}
                                tickCount={6}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                              />
                              <Radar
                                name="Promedio"
                                dataKey="average"
                                stroke="#fb7185"
                                strokeWidth={2}
                                fill={`url(#${lifeRadarGradientId})`}
                                fillOpacity={0.8}
                              />
                              <RadarTooltip content={lifeRadarTooltip} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
                            No hay datos suficientes para graficar.
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {sortedWheelOfLife.length ? (
                          <ul className="space-y-3">
                            {sortedWheelOfLife.map((item: WheelResult, index) => {
                              const width = wheelValueToPercent(item.average);
                              const label = item.topic?.trim().length ? item.topic.trim() : `Dimensión ${index + 1}`;
                              return (
                                <li key={`${label}-${index}`} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">{label}</span>
                                    <span className="text-lg font-semibold text-slate-900">{item.average.toFixed(2)}</span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#FB7185]/70 to-[#F97316]/80"
                                      style={{ width: `${width}%` }}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">Sin registros suficientes para la tabla.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            {wheelOfHealth.length ? (
              <Card
                className="relative overflow-hidden rounded-[28px] border border-white/35 bg-white/75 shadow-[0_34px_85px_-60px_rgba(16,185,129,0.35)] backdrop-blur"
                padding="lg"
              >
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#BBF7D0]/70 via-white to-[#34D399]/60 opacity-60" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Rueda</p>
                      <h3 className="text-lg font-semibold text-slate-900">Dimensiones de salud</h3>
                    </div>
                    <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                      {wheelOfHealth.length} tópicos
                    </span>
                  </div>
                  {renderSectionDateSelect('wellnessHealth', 'Corte rueda de salud', 'Selecciona la fecha de referencia para esta rueda.')}
                  <p className="text-sm text-slate-600">Referencias promediadas por dimensión de bienestar físico.</p>
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                    <div className="space-y-6">
                      <div className="h-72">
                        {healthRadarData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                              data={healthRadarData}
                              outerRadius="75%"
                              startAngle={90}
                              endAngle={-270}
                            >
                              <defs>
                                <linearGradient id={healthRadarGradientId} x1="50%" y1="0%" x2="50%" y2="100%">
                                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.85} />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.45} />
                                </linearGradient>
                              </defs>
                              <PolarGrid gridType="polygon" stroke="#d1fae5" radialLines={false} />
                              <PolarAngleAxis dataKey="topicLabel" tick={<WheelAxisTick />} />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 10]}
                                tickCount={6}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6ee7b7', fontSize: 11 }}
                              />
                              <Radar
                                name="Promedio"
                                dataKey="average"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill={`url(#${healthRadarGradientId})`}
                                fillOpacity={0.8}
                              />
                              <RadarTooltip content={healthRadarTooltip} cursor={{ stroke: '#34d399', strokeDasharray: '4 4' }} />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
                            No hay datos suficientes para graficar.
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {sortedWheelOfHealth.length ? (
                          <ul className="space-y-3">
                            {sortedWheelOfHealth.map((item, index) => {
                              const width = wheelValueToPercent(item.average);
                              const label = item.topic?.trim().length ? item.topic.trim() : `Dimensión ${index + 1}`;
                              return (
                                <li key={`${label}-${index}`} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">{label}</span>
                                    <span className="text-lg font-semibold text-slate-900">{item.average.toFixed(2)}</span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#34D399]/70 to-[#10B981]/80"
                                      style={{ width: `${width}%` }}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">Sin registros suficientes para la tabla.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            {regiflex ? (
              <Card
                className="relative overflow-hidden rounded-[28px] border border-white/35 bg-white/75 shadow-[0_34px_85px_-60px_rgba(79,70,229,0.35)] backdrop-blur"
                padding="lg"
              >
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#C7D2FE]/70 via-white to-[#818CF8]/60 opacity-60" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Regiflex</p>
                      <h3 className="text-lg font-semibold text-slate-900">Flexibilidad corporal</h3>
                    </div>
                    <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                      {regiflex.predominant ?? 'Sin dato'}
                    </span>
                  </div>
                  {renderSectionDateSelect('wellnessRegiflex', 'Corte Regiflex', 'Selecciona la fecha de referencia para este análisis.')}
                  <p className="text-sm text-slate-600">Comparativo entre flexibilidad y rigidez según respuestas recientes.</p>
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                    <div className="space-y-6">
                      <div className="h-72">
                        {regiflexPieData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={regiflexPieData}
                                dataKey="value"
                                nameKey="topicLabel"
                                innerRadius="45%"
                                outerRadius="75%"
                                paddingAngle={4}
                                stroke="#ffffff"
                                strokeWidth={1.5}
                              >
                                {regiflexPieData.map((_, index) => (
                                  <Cell key={`regiflex-slice-${index}`} fill={REGIFLEX_COLORS[index % REGIFLEX_COLORS.length]} />
                                ))}
                              </Pie>
                              <PieTooltip content={regiflexPieTooltip} cursor={{ stroke: '#6366f1', strokeDasharray: '4 4' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
                            No hay datos suficientes para graficar.
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {sortedRegiflexEntries.length ? (
                          <ul className="space-y-3">
                            {sortedRegiflexEntries.map((entry, index) => {
                              const denominator = regiflexTotal > 0 ? regiflexTotal : 1;
                              const width = Math.min(Math.max((entry.value / denominator) * 100, 0), 100);
                              const label = entry.topicLabel?.trim().length ? entry.topicLabel.trim() : `Tendencia ${index + 1}`;
                              return (
                                <li key={`${label}-${index}`} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">{label}</span>
                                    <span className="text-lg font-semibold text-slate-900">{entry.value.toFixed(2)}</span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#818CF8]/70 to-[#6366F1]/80"
                                      style={{ width: `${width}%` }}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">Sin registros suficientes para la tabla.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}
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
            {renderSectionDateSelect('dailyReview', 'Corte de seguimiento diario', 'Explora diferentes jornadas registradas.')}
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

    
    </section>
  );
};
