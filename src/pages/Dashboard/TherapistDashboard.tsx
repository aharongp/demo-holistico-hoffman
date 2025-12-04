import React from 'react';
import { Clock, Users, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useApp } from '../../context/AppContext';
import { Assignment } from '../../types';

export const TherapistDashboard: React.FC = () => {
  const { patients, assignments } = useApp();

  const myPatients = patients.slice(0, 3); // Mock assigned patients
  const pendingAssignments = assignments.filter(a => a.status === 'pending').slice(0, 5);
  const pendingCount = pendingAssignments.length || 5;

  const overviewTiles = [
    {
      label: 'Pacientes activos',
      value: myPatients.length,
      detail: 'en seguimiento semanal',
      icon: Users,
      accent: 'from-purple-200 via-white to-white',
    },
    {
      label: 'Evaluaciones pendientes',
      value: pendingCount,
      detail: 'próximas 72 horas',
      icon: Clock,
      accent: 'from-cyan-200 via-white to-white',
    },
    {
      label: 'Completadas esta semana',
      value: 12,
      detail: 'instrumentos cerrados',
      icon: CheckCircle,
      accent: 'from-emerald-200 via-white to-white',
    },
    {
      label: 'Alertas',
      value: 2,
      detail: 'casos requieren atención',
      icon: AlertCircle,
      accent: 'from-rose-100 via-white to-white',
    },
  ];

  const assignmentsToRender: Assignment[] = pendingAssignments.length
    ? pendingAssignments
    : Array.from({ length: 3 }, (_, index) => ({
        id: `placeholder-${index}`,
        patientId: `Paciente ${index + 1}`,
        instrumentId: `Eval-${index + 1}`,
        assignedBy: 'Sistema',
        assignedAt: new Date(),
        dueDate: undefined,
        status: 'pending' as const,
      }));

  const formatDueDate = (date?: Date | null) => {
    if (!date) return 'Sin fecha asignada';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  return (
    <section className="relative space-y-8 px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-[#dff7ff] via-white to-[#F2D8E7] p-6 sm:p-10 shadow-2xl">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-sky-700/80 blur-3xl" aria-hidden />
        <div className="absolute -left-8 bottom-0 h-40 w-40 rounded-full bg-cyan-700/70 blur-3xl" aria-hidden />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.4em] text-slate-500">Vision Care</p>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-[2.5rem]">Panel del terapeuta</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Gestiona tus pacientes, revisa evaluaciones críticas y mantén un pulso constante de tu consulta.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center sm:text-left">
            <div className="rounded-2xl border border-white/70 bg-white/60 px-5 py-4 backdrop-blur">
              <span className="text-xs uppercase tracking-tight text-slate-800">Pacientes activos</span>
              <p className="text-3xl font-semibold text-slate-900">{myPatients.length}</p>
              <p className="text-xs text-slate-500">en seguimiento</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/60 px-5 py-4 backdrop-blur">
              <span className="text-xs uppercase tracking-tight text-slate-500">Evaluaciones</span>
              <p className="text-3xl font-semibold text-slate-900">{pendingCount}</p>
              <p className="text-xs text-slate-500">por resolver</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewTiles.map((tile) => (
          <div
            key={tile.label}
            className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/70 backdrop-blur"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tile.accent} opacity-60`} aria-hidden />
            <div className="relative z-10 flex items-start gap-3">
              <div className="rounded-2xl bg-white/70 p-3 text-slate-700 shadow-inner shadow-white/60">
                <tile.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
                <p className="text-2xl font-semibold text-slate-900">{tile.value}</p>
                <p className="text-xs text-slate-500">{tile.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          padding="lg"
          className="relative overflow-hidden rounded-[28px] border-white/70 bg-white/80 shadow-xl shadow-sky-200/60 backdrop-blur"
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Equipo clínico</p>
              <h3 className="text-xl font-semibold text-slate-900">Mis pacientes</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-transparent bg-gradient-to-r from-white to-slate-50 text-slate-700 shadow-sm"
            >
              Ver todos
            </Button>
          </div>
          <div className="space-y-3">
            {myPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-sky-50/70 p-4 text-sm text-slate-600 shadow-inner shadow-sky-100/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{patient.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-transparent bg-white/80 text-slate-700 hover:bg-white sm:w-auto"
                >
                  Ver caso
                </Button>
              </div>
            ))}
            {!myPatients.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-sm text-slate-500">
                No hay pacientes asignados por ahora.
              </div>
            )}
          </div>
        </Card>

        <Card
          padding="lg"
          className="relative overflow-hidden rounded-[28px] border-white/70 bg-gradient-to-b from-white/90 via-white to-slate-50 shadow-xl shadow-sky-100/70 backdrop-blur"
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Evaluaciones</p>
              <h3 className="text-xl font-semibold text-slate-900">Pendientes inmediatos</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-transparent bg-sky-500/10 text-sky-700 hover:bg-sky-500/20"
            >
              Revisar lista
            </Button>
          </div>
          <div className="space-y-3">
            {assignmentsToRender.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 shadow-inner shadow-sky-100/70"
              >
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-sky-600">
                    <Activity className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {assignment.instrumentId ? `Instrumento ${assignment.instrumentId}` : 'Evaluación en curso'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Paciente: {assignment.patientId ?? 'Sin asignar'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Entrega: <span className="text-slate-600">{formatDueDate(assignment.dueDate)}</span>
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm shadow-cyan-200/60 hover:opacity-95 sm:w-auto"
                  >
                    Evaluar ahora
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
};