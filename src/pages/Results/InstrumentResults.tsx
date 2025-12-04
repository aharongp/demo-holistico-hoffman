import React from 'react';
import { BarChart3, PieChart, LineChart, Target, Sparkles, Calendar, Download, Filter } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';

const metricHighlights = [
  {
    label: 'Instrumentos completados',
    value: '24',
    helper: 'Histórico',
  },
  {
    label: 'Promedio de cumplimiento',
    value: '92%',
    helper: 'Últimos 30 días',
  },
  {
    label: 'Evaluaciones pendientes',
    value: '3',
    helper: 'Revisión clínica',
  },
];

const insightCards = [
  {
    title: 'Balance emocional',
    description: 'Promedio ponderado de respuestas positivas versus negativas durante el último seguimiento semanal.',
    icon: PieChart,
    tone:
      'border-[#F2E7FF]/80 bg-gradient-to-br from-[#FCF9FF] to-[#F2E7FF]/60 text-[#6B21A8]',
  },
  {
    title: 'Energía vital',
    description: 'Comparativa de energía reportada antes y después de las sesiones respiratorias.',
    icon: LineChart,
    tone:
      'border-[#DBEAFE]/80 bg-gradient-to-br from-[#F8FBFF] to-[#DBEAFE]/60 text-[#1E3A8A]',
  },
  {
    title: 'Adherencia terapéutica',
    description: 'Porcentaje de cumplimiento en instrumentos de seguimiento diario durante los últimos 15 días.',
    icon: Target,
    tone:
      'border-[#DCFCE7]/80 bg-gradient-to-br from-[#F5FFF8] to-[#DCFCE7]/55 text-[#166534]',
  },
];

const chartPlaceholders = [
  {
    title: 'Tendencia de estados emocionales',
    description: 'Gráfico de líneas semanal comparando estados declarados vs. objetivos clínicos.',
    accent: 'from-[#DBEAFE] via-white to-[#C7D2FE]',
  },
  {
    title: 'Distribución de respuestas por dimensión',
    description: 'Diagrama de tipo radar segmentando respuestas por competencias clave.',
    accent: 'from-[#FDE68A] via-white to-[#FECACA]',
  },
  {
    title: 'Mapa de calor de hábitos',
    description: 'Heatmap mensual para visualizar frecuencia de rituales y hábitos saludables.',
    accent: 'from-[#BBF7D0] via-white to-[#86EFAC]',
  },
];

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

export const InstrumentResults: React.FC = () => {
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
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-3 lg:w-auto">
            {metricHighlights.map((metric) => (
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {insightCards.map((insight) => {
          const Icon = insight.icon;
          return (
            <Card
              key={insight.title}
              className={`group relative overflow-hidden rounded-[28px] border ${insight.tone} shadow-[0_28px_70px_-48px_rgba(76,29,149,0.35)] backdrop-blur-lg transition`}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-white/20 opacity-0 transition group-hover:opacity-100"
              />
              <div className="relative flex items-start justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-current">
                    Insight
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900">{insight.title}</h3>
                  <p className="text-sm text-slate-600">{insight.description}</p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/60 text-current shadow-inner">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div className="relative mt-6 rounded-2xl border border-white/50 bg-white/40 p-4 text-xs text-slate-500">
                Placeholder de gráfico. Aquí vivirá un componente visual dinámico.
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {chartPlaceholders.map((chart) => (
          <Card
            key={chart.title}
            className="relative overflow-hidden rounded-[28px] border border-white/35 bg-white/75 shadow-[0_34px_85px_-60px_rgba(15,23,42,0.5)] backdrop-blur"
            padding="lg"
          >
            <div
              aria-hidden="true"
              className={`absolute inset-0 bg-gradient-to-br ${chart.accent} opacity-60`}
            />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Visual</p>
                  <h3 className="text-lg font-semibold text-slate-900">{chart.title}</h3>
                </div>
                <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                  Próximamente
                </span>
              </div>
              <p className="text-sm text-slate-600">{chart.description}</p>
              <div className="rounded-3xl border border-white/60 bg-white/60 p-8 text-center text-sm text-slate-500">
                Área reservada para componente gráfico.
              </div>
            </div>
          </Card>
        ))}
      </div>

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
