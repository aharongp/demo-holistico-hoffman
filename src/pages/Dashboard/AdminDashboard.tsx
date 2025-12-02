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
    <section className="space-y-12 from-slate-900/5 via-white to-cyan-50/40 px-4 py-8 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-r from-white/90 via-cyan-50/70 to-white/90 shadow-[0_40px_80px_-60px_rgba(15,23,42,0.6)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.2),_transparent_55%)]" aria-hidden />
        <div className="relative z-10 flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-cyan-500">
              <Sparkles className="h-3 w-3" /> Matriz Ejecutiva
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/70">Panel de Control</p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Inteligencia operativa en tiempo real
              </h1>
              <p className="max-w-2xl text-base text-slate-500">
                Supervisa pacientes, programas e instrumentos desde un lienzo minimalista, diseñado para decisiones rápidas en entornos clínicos digitales.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 rounded-3xl border border-white/60 bg-white/80 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 shadow-inner shadow-white/40 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:flex-col">
            <span>{lastUpdatedLabel ? 'Actualizado' : 'Sincronización'}</span>
            <span className="text-base tracking-[0.1em] text-slate-900">{lastUpdatedLabel ?? 'Pendiente'}</span>
          </div>
        </div>
        <div className="relative z-10 grid gap-3 border-t border-white/40 px-6 py-4 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500 sm:grid-cols-3">
          {[{
            label: 'Pacientes activos',
            value: dashboardStats.totalPatients.toLocaleString(),
          },
          {
            label: 'Usuarios registrados',
            value: dashboardStats.totalUsers.toLocaleString(),
          },
          {
            label: 'Instrumentos vivos',
            value: dashboardStats.totalInstruments.toLocaleString(),
          }].map((item) => (
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
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {insightTiles.map(tile => (
          <Card
            key={tile.label}
            className="h-full overflow-hidden border border-white/50 bg-gradient-to-br from-white/90 via-slate-50/70 to-white/90 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.9)] backdrop-blur-lg"
          >
            <div className="flex items-start gap-5">
              <div className={`rounded-3xl bg-slate-900/5 p-3 ${tile.accent}`}>
                <tile.icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.5em] text-slate-500/70">{tile.label}</p>
                <p className="text-3xl font-semibold text-slate-900">{tile.value}</p>
                <p className="text-xs text-slate-500">{tile.trend}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border border-white/40 bg-white/85 shadow-[0_30px_60px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/50 pb-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-400">Distribución</p>
              <h2 className="text-xl font-semibold text-slate-900">Género</h2>
            </div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-400">{dashboardStats.totalPatients.toLocaleString()} activos</span>
          </div>
          <div className="mt-4">
            <Chart
              title=""
              data={genderData}
              type="pie"
              dataKey="value"
            />
          </div>
          <ul className="mt-6 space-y-3">
            {genderData.map(item => (
              <li key={item.name} className="flex items-center justify-between text-sm text-slate-600">
                <span className="text-slate-500/80">{item.name}</span>
                <span className="text-base font-semibold text-slate-900">
                  {item.value.toLocaleString()} · <span className="text-xs text-slate-400">{item.percentage.toFixed(1)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="overflow-hidden border border-white/40 bg-white/85 shadow-[0_30px_60px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/50 pb-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-400">Programas</p>
              <h2 className="text-xl font-semibold text-slate-900">Pacientes por programa</h2>
            </div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-400">{programData.length} programas</span>
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

      <div className="grid gap-6">
        <Card className="lg:col-span-2 overflow-hidden border border-white/40 bg-white/85 shadow-[0_30px_60px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/50 pb-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-400">Tendencia</p>
              <h2 className="text-xl font-semibold text-slate-900">Crecimiento mensual</h2>
            </div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-400">Proyección estable</span>
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

      <Card className="border border-white/40 bg-white/85 shadow-[0_35px_70px_-55px_rgba(15,23,42,0.95)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-400">Pro tip médico</p>
            <h2 className="text-xl font-semibold text-slate-900">Comparte un snapshot con el equipo clínico</h2>
            <p className="text-sm text-slate-500">Exporta estos datos o integra la API en tu historia clínica electrónica en segundos.</p>
          </div>
          <button className="inline-flex items-center justify-center rounded-2xl border border-slate-900/5 bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-900/20 transition hover:bg-slate-800">
            Descargar reporte
          </button>
        </div>
      </Card>
    </section>
  );
};