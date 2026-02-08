import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Edit, FileText, Loader2, Plus, Trash2, User } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { Table } from '../../components/UI/Table';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ProgramActivity, ProgramDetails } from '../../types';

const DAY_OPTIONS = [
  { value: 'Mon', label: 'Lunes' },
  { value: 'Tue', label: 'Martes' },
  { value: 'Wed', label: 'Miércoles' },
  { value: 'Thu', label: 'Jueves' },
  { value: 'Fri', label: 'Viernes' },
  { value: 'Sat', label: 'Sábado' },
  { value: 'Sun', label: 'Domingo' },
];

const DAY_LABEL_MAP = DAY_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const DAY_ORDER = DAY_OPTIONS.map(option => option.value);

const initialFormState = {
  name: '',
  description: '',
  day: '',
  time: '',
};

type ActivityFormState = typeof initialFormState;

export const ProgramDetail: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { getProgramDetails, addProgramActivity, updateProgramActivity, deleteProgramActivity } = useApp();
  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';

  const [program, setProgram] = useState<ProgramDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<ProgramActivity | null>(null);
  const [formState, setFormState] = useState<ActivityFormState>(initialFormState);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const loadProgram = async () => {
      if (!programId) {
        setError('Identificador de programa inválido.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const details = await getProgramDetails(programId);
      if (cancelled) return;

      if (!details) {
        setError('No se encontró el programa solicitado.');
        setProgram(null);
      } else {
        setProgram(details);
        setError(null);
      }
      setIsLoading(false);
    };

    loadProgram();
    return () => {
      cancelled = true;
    };
  }, [programId, getProgramDetails]);

  const handleOpenModal = useCallback((activity?: ProgramActivity) => {
    if (!isAdmin) {
      return;
    }
    if (activity) {
      setEditingActivity(activity);
      setFormState({
        name: activity.name,
        description: activity.description ?? '',
        day: activity.day ?? '',
        time: activity.time ?? '',
      });
    } else {
      setEditingActivity(null);
      setFormState(initialFormState);
    }
    setIsModalOpen(true);
  }, [isAdmin]);

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingActivity(null);
  };

  const handleInputChange = (field: keyof ActivityFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!program || !programId || !isAdmin) return;

    if (!formState.day) {
      alert('Selecciona un día para la actividad.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingActivity) {
        const updated = await updateProgramActivity(programId, editingActivity.id, formState);
        setProgram(prev => (
          prev
            ? {
                ...prev,
                activities: prev.activities.map(activity =>
                  activity.id === editingActivity.id ? updated : activity
                ),
              }
            : prev
        ));
        alert('Actividad actualizada correctamente.');
      } else {
        const created = await addProgramActivity(programId, formState);
        setProgram(prev => (
          prev
            ? {
                ...prev,
                activities: [...prev.activities, created],
              }
            : prev
        ));
        alert('Actividad añadida correctamente.');
      }
      setIsModalOpen(false);
      setEditingActivity(null);
      setFormState(initialFormState);
    } catch (err) {
      console.error('No se pudo guardar la actividad', err);
      const message = editingActivity ? 'No se pudo actualizar la actividad. Intenta nuevamente.' : 'No se pudo crear la actividad. Intenta nuevamente.';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActivity = useCallback(async (activity: ProgramActivity) => {
    if (!programId || !isAdmin) return;

    if (!confirm(`¿Seguro que deseas eliminar la actividad "${activity.name}"?`)) {
      return;
    }

    try {
      const success = await deleteProgramActivity(programId, activity.id);
      if (success) {
        setProgram(prev => (
          prev
            ? {
                ...prev,
                activities: prev.activities.filter(item => item.id !== activity.id),
              }
            : prev
        ));
        alert('Actividad eliminada correctamente.');
      } else {
        alert('No se pudo eliminar la actividad.');
      }
    } catch (error) {
      console.error('No se pudo eliminar la actividad', error);
      alert('No se pudo eliminar la actividad. Intenta nuevamente.');
    }
  }, [deleteProgramActivity, isAdmin, programId]);

  const sortedActivities = useMemo(() => {
    if (!program) return [] as ProgramActivity[];
    return [...program.activities].sort((a, b) => {
      const indexA = a.day ? DAY_ORDER.indexOf(a.day) : -1;
      const indexB = b.day ? DAY_ORDER.indexOf(b.day) : -1;
      if (indexA !== indexB) {
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }

      const timeA = a.time ?? '';
      const timeB = b.time ?? '';
      if (timeA && !timeB) return -1;
      if (!timeA && timeB) return 1;
      return timeA.localeCompare(timeB);
    });
  }, [program]);

  const formatDateTime = useCallback((value?: Date | null) => {
    if (!value) return '—';
    try {
      return value.toLocaleString();
    } catch {
      return '—';
    }
  }, []);

  const activityStats = useMemo(() => {
    if (!program) {
      return {
        total: 0,
        scheduledDays: 0,
        nextActivity: 'Sin agenda',
      };
    }

    const total = program.activities.length;
    const days = new Set(
      program.activities
        .map((activity) => activity.day)
        .filter((day): day is string => Boolean(day))
    );
    const nextActivity = sortedActivities[0];
    const nextActivityLabel = nextActivity
      ? `${DAY_LABEL_MAP[nextActivity.day ?? ''] ?? 'Sin día'} · ${nextActivity.time ?? 'Sin hora'}`
      : 'Sin agenda';

    return {
      total,
      scheduledDays: days.size,
      nextActivity: nextActivityLabel,
    };
  }, [program, sortedActivities]);

  const activityColumns = useMemo(() => {
    const base = [
      {
        key: 'name',
        header: 'Actividad',
        render: (activity: ProgramActivity) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{activity.name}</span>
            {activity.description && (
              <span className="text-sm text-gray-600">{activity.description}</span>
            )}
          </div>
        ),
      },
      {
        key: 'schedule',
        header: 'Horario',
        render: (activity: ProgramActivity) => (
          <div className="flex flex-col text-sm text-gray-700">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              {activity.day ? DAY_LABEL_MAP[activity.day] ?? activity.day : 'Sin día'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              {activity.time ?? 'Sin hora'}
            </span>
          </div>
        ),
      },
      {
        key: 'meta',
        header: 'Meta',
        render: (activity: ProgramActivity) => (
          <div className="flex flex-col text-sm text-gray-700">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4 text-gray-400" />
              {activity.createdBy ?? '—'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              {formatDateTime(activity.createdAt)}
            </span>
          </div>
        ),
      },
    ];

    if (isAdmin) {
      base.push({
        key: 'actions',
        header: 'Acciones',
        className: 'text-right',
        render: (activity: ProgramActivity) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenModal(activity)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteActivity(activity)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ),
      });
    }

    return base;
  }, [formatDateTime, handleDeleteActivity, handleOpenModal, isAdmin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/programs')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a programas
        </Button>
        <Card>
          <div className="p-6 text-center text-red-600 font-medium">{error}</div>
        </Card>
      </div>
    );
  }

  if (!program) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/35 bg-gradient-to-br from-[#ECFEFF] via-white to-[#F5F3FF] shadow-[0_35px_90px_rgba(15,23,42,0.2)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_60%)]" />
        <div aria-hidden className="absolute -top-10 right-4 h-52 w-52 rounded-full bg-[#C7D2FE] opacity-40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-12 left-0 h-48 w-48 rounded-full bg-[#A5F3FC] opacity-40 blur-3xl" />
        <div className="relative flex flex-col gap-6 px-6 py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/programs')}
                className="rounded-full border border-white/60 bg-white/50 px-4 py-2 text-sm font-semibold text-slate-700 backdrop-blur hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a programas
              </Button>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.45em] text-[#0E7490]">
                Programa
                <span className="h-1 w-1 rounded-full bg-[#22D3EE]" />
                Cuántico
              </span>
            </div>
            {isAdmin ? (
              <Button
                onClick={() => handleOpenModal()}
                className="rounded-full bg-gradient-to-r from-[#0EA5E9] via-[#6366F1] to-[#A855F7] px-6 py-2 text-sm font-semibold text-white shadow-[0_20px_55px_rgba(14,165,233,0.35)] hover:opacity-95"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir actividad
              </Button>
            ) : null}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#0EA5E9]">{program.createdBy ?? 'Equipo'}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{program.name}</h1>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">{program.description || 'Sin descripción'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Actividades</p>
                <p className="text-3xl font-semibold text-slate-900">{activityStats.total}</p>
              </div>
              <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Días con agenda</p>
                <p className="text-3xl font-semibold text-slate-900">{activityStats.scheduledDays}</p>
              </div>
              <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Próxima actividad</p>
                <p className="text-base font-semibold text-slate-900">{activityStats.nextActivity}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <FileText className="w-5 h-5 text-[#38BDF8]" />
                  <div>
                    <p className="font-semibold text-slate-900">Ficha del programa</p>
                    <p className="text-slate-600">{program.description || 'Sin descripción disponible.'}</p>
                  </div>
                </div>
                <div className="grid gap-2 text-xs uppercase tracking-[0.2em] text-[#0EA5E9] sm:text-right">
                  <span>Creado: {formatDateTime(program.createdAt)}</span>
                  <span>Actualizado: {formatDateTime(program.updatedAt ?? null)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-[28px] border border-white/40 bg-white/75 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur" padding="lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Actividades</h2>
            <p className="text-sm text-slate-600">Organiza y programa las sesiones asociadas al plan.</p>
          </div>
          {isAdmin ? (
            <Button
              variant="outline"
              onClick={() => handleOpenModal()}
              className="rounded-full border border-white/60 bg-white/50 px-5 py-2 text-sm font-semibold text-slate-600 backdrop-blur hover:text-slate-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva actividad
            </Button>
          ) : null}
        </div>

        {sortedActivities.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#C7D2FE]/70 bg-[#EFF6FF]/80 px-6 py-10 text-center text-sm text-[#4C1D95]">
            No hay actividades registradas para este programa.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/40">
            <Table
              data={sortedActivities}
              columns={activityColumns}
              rowKey={(activity) => activity.id}
            />
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingActivity ? 'Editar actividad' : 'Añadir actividad'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAdmin ? (
            <p className="text-sm text-slate-500">
              Solo los administradores pueden crear o modificar actividades.
            </p>
          ) : null}
          <fieldset disabled={!isAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la actividad
              </label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={handleInputChange('name')}
                className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#A5B4FC] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formState.description}
                onChange={handleInputChange('description')}
                rows={3}
                className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#A5B4FC] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Día sugerido
                </label>
                <select
                  required
                  value={formState.day}
                  onChange={event => setFormState(prev => ({ ...prev, day: event.target.value }))}
                  className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#A5B4FC] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                >
                  <option value="" disabled>
                    Selecciona un día
                  </option>
                  {DAY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora sugerida
                </label>
                <input
                  type="time"
                  value={formState.time}
                  onChange={handleInputChange('time')}
                  className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#A5B4FC] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                />
              </div>
            </div>
          </fieldset>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isAdmin || isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </span>
              ) : editingActivity ? 'Actualizar actividad' : 'Guardar actividad'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
