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
      console.error('Failed to create activity', err);
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
      console.error('Failed to delete activity', error);
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/programs')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{program.name}</h1>
            <p className="text-gray-600">Gestión de actividades del programa</p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Añadir actividad
        </Button>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 text-gray-700">
              <FileText className="w-5 h-5 mt-1 text-gray-400" />
              <p>{program.description || 'Sin descripción'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span><span className="font-medium">Creado por:</span> {program.createdBy ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span><span className="font-medium">Creado:</span> {formatDateTime(program.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span><span className="font-medium">Actualizado:</span> {formatDateTime(program.updatedAt ?? null)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Actividades</h2>
              <p className="text-gray-600 text-sm">Listado de actividades asociadas a este programa</p>
            </div>
            <Button variant="outline" onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva actividad
            </Button>
          </div>

          {sortedActivities.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No hay actividades registradas para este programa.
            </div>
          ) : (
            <Table
              data={sortedActivities}
              columns={activityColumns}
              rowKey={(activity) => activity.id}
            />
          )}
        </div>
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
