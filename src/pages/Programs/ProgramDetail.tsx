import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Edit, FileText, Loader2, Plus, Trash2, User } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { Table } from '../../components/UI/Table';
import { useApp } from '../../context/AppContext';
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

  const handleOpenModal = (activity?: ProgramActivity) => {
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
  };

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
    if (!program || !programId) return;

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

  const handleDeleteActivity = async (activity: ProgramActivity) => {
    if (!programId || !program) return;

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
  };

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

  const formatDateTime = (value?: Date | null) => {
    if (!value) return '—';
    try {
      return value.toLocaleString();
    } catch {
      return '—';
    }
  };

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

  const activityColumns = [
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
    {
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
    },
  ];

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
      <div className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-[#fff7ed] via-white to-[#ffe4cc] shadow-xl">
        <div className="flex flex-col gap-6 px-6 py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/programs')}
                className="border-orange-200 text-orange-600 hover:bg-orange-50 focus:ring-orange-400"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a programas
              </Button>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
                Programa activo
              </span>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200/60 hover:from-orange-600 hover:to-amber-600 focus:ring-orange-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir actividad
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-500">{program.createdBy ?? 'Equipo'}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{program.name}</h1>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">{program.description || 'Sin descripción'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-inner">
                <p className="text-xs uppercase tracking-wide text-orange-500/80">Actividades totales</p>
                <p className="text-3xl font-semibold text-slate-900">{activityStats.total}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-inner">
                <p className="text-xs uppercase tracking-wide text-orange-500/80">Días con agenda</p>
                <p className="text-3xl font-semibold text-slate-900">{activityStats.scheduledDays}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-inner">
                <p className="text-xs uppercase tracking-wide text-orange-500/80">Próxima actividad</p>
                <p className="text-base font-semibold text-slate-900">{activityStats.nextActivity}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <FileText className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="font-semibold text-slate-900">Ficha del programa</p>
                    <p className="text-slate-600">{program.description || 'Sin descripción disponible.'}</p>
                  </div>
                </div>
                <div className="grid gap-2 text-xs uppercase tracking-[0.2em] text-orange-500 sm:text-right">
                  <span>Creado: {formatDateTime(program.createdAt)}</span>
                  <span>Actualizado: {formatDateTime(program.updatedAt ?? null)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-orange-100/70 bg-white/95 shadow-xl ring-1 ring-orange-100/80" padding="lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Actividades</h2>
            <p className="text-sm text-slate-600">Organiza y programa las sesiones asociadas al plan.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => handleOpenModal()}
            className="border-orange-200 text-orange-600 hover:bg-orange-50 focus:ring-orange-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva actividad
          </Button>
        </div>

        {sortedActivities.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 px-6 py-10 text-center text-sm text-orange-600">
            No hay actividades registradas para este programa.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-orange-100/60">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la actividad
            </label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={handleInputChange('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
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
