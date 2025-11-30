import React from 'react';
import { Users, ClipboardList, UserX, UserCheck, Sparkles, Activity, HeartPulse } from 'lucide-react';
import { StatsCard } from '../../components/Dashboard/StatsCard';
import { Chart } from '../../components/Dashboard/Chart';
import { Card } from '../../components/UI/Card';
import { useApp } from '../../context/AppContext';

export const AdminDashboard: React.FC = () => {
  const { dashboardStats } = useApp();

  const fallbackGenderTotal =
    dashboardStats.genderDistribution.male +
    dashboardStats.genderDistribution.female +
    dashboardStats.genderDistribution.other;

  const genderData = dashboardStats.genderDistribution.breakdown.length
    ? dashboardStats.genderDistribution.breakdown.map(slice => ({
        name: slice.label,
        value: slice.count,
        percentage: slice.percentage,
      }))
    : [
        {
          name: 'Masculino',
          value: dashboardStats.genderDistribution.male,
          percentage: fallbackGenderTotal ? (dashboardStats.genderDistribution.male / fallbackGenderTotal) * 100 : 0,
        },
        {
          name: 'Femenino',
          value: dashboardStats.genderDistribution.female,
          percentage: fallbackGenderTotal ? (dashboardStats.genderDistribution.female / fallbackGenderTotal) * 100 : 0,
        },
        {
          name: 'Otros',
          value: dashboardStats.genderDistribution.other,
          percentage: fallbackGenderTotal ? (dashboardStats.genderDistribution.other / fallbackGenderTotal) * 100 : 0,
        },
      ];

  const programData = (dashboardStats.patientsByProgram ?? []).map(program => ({
    name: program.name,
    value: program.count,
  }));

  const unassignedUsersCount = (dashboardStats.patientsByProgram ?? []).find(program => {
    const normalizedName = (program.name ?? '').toString().trim().toLowerCase();
    return program.programId === null || normalizedName === 'sin programa';
  })?.count ?? 0;

  const lastUpdatedLabel = dashboardStats.lastUpdated ? new Date(dashboardStats.lastUpdated).toLocaleString() : null;

  const monthlyData = [
    { name: 'Ene', value: 120 },
    { name: 'Feb', value: 135 },
    { name: 'Mar', value: 148 },
    { name: 'Abr', value: 150 },
    { name: 'May', value: 165 },
    { name: 'Jun', value: 180 },
  ];

  const insightTiles = [
    {
      label: 'Tiempo medio de ingreso',
      value: '3.2 días',
      trend: '+8% vs. semana previa',
      icon: Activity,
      accent: 'text-sky-500',
    },
    {
      label: 'Índice de adherencia',
      value: '92%',
      trend: 'Estable',
      icon: HeartPulse,
      accent: 'text-emerald-500',
    },
    {
      label: 'Programas activos',
      value: programData.length,
      trend: '+2 nuevos',
      icon: Sparkles,
      accent: 'text-violet-500',
    },
  ];

  return (
    <section className="space-y-10 bg-gradient-to-b from-slate-50 via-white to-blue-50/20 px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white via-sky-50 to-white shadow-2xl">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.5em] text-sky-500">
                <Sparkles className="h-3 w-3 text-sky-500" /> Panorama
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Monitoreo clínico en tiempo real
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Visualiza la salud integral de tus programas y pacientes con métricas claras, elegantes y listas para compartir con el equipo médico.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              {lastUpdatedLabel ? `Actualizado · ${lastUpdatedLabel}` : 'Pendiente de sincronizar'}
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-xs uppercase tracking-[0.3em] text-slate-500 sm:grid-cols-3">
            <span className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-center">
              {dashboardStats.totalPatients.toLocaleString()} pacientes activos
            </span>
            <span className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-center">
              {dashboardStats.totalUsers.toLocaleString()} usuarios registrados
            </span>
            <span className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-center">
              {dashboardStats.totalInstruments.toLocaleString()} instrumentos
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-white/60 via-sky-100/40 to-transparent md:block" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Pacientes"
          value={dashboardStats.totalPatients.toLocaleString()}
          icon={UserCheck}
          change={{ value: 12, positive: true }}
          color="blue"
        />
        <StatsCard
          title="Total Usuarios"
          value={dashboardStats.totalUsers.toLocaleString()}
          icon={Users}
          change={{ value: 8, positive: true }}
          color="green"
        />
        <StatsCard
          title="Total Instrumentos"
          value={dashboardStats.totalInstruments.toLocaleString()}
          icon={ClipboardList}
          change={{ value: 3, positive: true }}
          color="purple"
        />
        <StatsCard
          title="Sin programa"
          value={unassignedUsersCount.toLocaleString()}
          icon={UserX}
          color="yellow"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {insightTiles.map(tile => (
          <Card key={tile.label} className="h-full border border-slate-100 bg-white/90 shadow-lg">
            <div className="flex items-start gap-4">
              <div className={`rounded-2xl bg-slate-50 p-3 ${tile.accent}`}>
                <tile.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">{tile.label}</p>
                <p className="text-2xl font-semibold text-slate-900">{tile.value}</p>
                <p className="text-xs text-slate-500">{tile.trend}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Distribución</p>
              <h2 className="text-xl font-semibold text-slate-900">Género</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">{dashboardStats.totalPatients.toLocaleString()} pacientes activos</span>
          </div>
          <div className="mt-4">
            <Chart
              title=""
              data={genderData}
              type="pie"
              dataKey="value"
            />
          </div>
          <ul className="mt-4 space-y-3">
            {genderData.map(item => (
              <li key={item.name} className="flex items-center justify-between text-sm text-slate-700">
                <span className="text-slate-500">{item.name}</span>
                <span className="text-base font-semibold text-slate-900">
                  {item.value.toLocaleString()} · <span className="text-xs text-slate-400">{item.percentage.toFixed(1)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Programas</p>
              <h2 className="text-xl font-semibold text-slate-900">Pacientes por programa</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">{programData.length} programas</span>
          </div>
          <div className="mt-4">
            <Chart
              title=""
              data={programData}
              type="bar"
              dataKey="value"
              xAxisKey="name"
              layout="vertical"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Tendencia</p>
              <h2 className="text-xl font-semibold text-slate-900">Crecimiento mensual</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">Proyección estable</span>
          </div>
          <div className="mt-5">
            <Chart
              title=""
              data={monthlyData}
              type="line"
              dataKey="value"
              xAxisKey="name"
            />
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Pro tip médico</p>
            <h2 className="text-xl font-semibold text-slate-900">Comparte un snapshot con el equipo clínico</h2>
            <p className="text-sm text-slate-500">Exporta estos datos o integra la API en tu historia clínica electrónica en segundos.</p>
          </div>
          <button className="inline-flex items-center justify-center rounded-2xl border border-slate-900/10 bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800">
            Descargar reporte
          </button>
        </div>
      </Card>
    </section>
  );
};