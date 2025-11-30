import React, { useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Search, Eye, Stethoscope, HeartPulse, Activity, ClipboardList } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Patient } from '../../types';
import { format } from 'date-fns';
import {
  MedicalHistoryData,
  MedicalHistoryViewModal,
  RemotePatientMedicalHistory,
  createInitialMedicalHistory,
  mapRemoteMedicalHistoryToState,
} from '../MedicalHistory/MedicalHistory';

export const PatientManagement: React.FC = () => {
  const { patients, addPatient, updatePatient, deletePatient, programs } = useApp();
  const { token } = useAuth();
  const { isAdmin } = usePermissions();
  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatientForAssign, setSelectedPatientForAssign] = useState<Patient | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);
  const [historyData, setHistoryData] = useState<MedicalHistoryData>(createInitialMedicalHistory());
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    gender: 'female' as 'male' | 'female' | 'other',
    phone: '',
    address: '',
  });

  const filteredPatients = useMemo(() => {
    const normalizedTerm = searchTerm.toLowerCase();
    return patients.filter((patient) =>
      patient.firstName.toLowerCase().includes(normalizedTerm) ||
      patient.lastName.toLowerCase().includes(normalizedTerm) ||
      patient.email.toLowerCase().includes(normalizedTerm),
    );
  }, [patients, searchTerm]);

  const { totalPatients, activePatients, assignedProgramCount } = useMemo(() => {
    let active = 0;
    let assigned = 0;
    for (const patient of patients) {
      if (patient.isActive) {
        active += 1;
      }
      if (patient.programId) {
        assigned += 1;
      }
    }
    return {
      totalPatients: patients.length,
      activePatients: active,
      assignedProgramCount: assigned,
    };
  }, [patients]);

  const filteredPatientCount = filteredPatients.length;
  const awaitingAssignmentCount = Math.max(totalPatients - assignedProgramCount, 0);

  const handleOpenModal = (patient?: Patient) => {
    setFormError(null);
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        dateOfBirth: format(patient.dateOfBirth, 'yyyy-MM-dd'),
        gender: patient.gender,
        phone: patient.phone || '',
        address: patient.address || '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        dateOfBirth: '',
        gender: 'female',
        phone: '',
        address: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenAssignModal = (patient: Patient) => {
    setSelectedPatientForAssign(patient);
    setIsAssignModalOpen(true);
  };

  const handleAssignProgram = async (programId: string) => {
    if (!selectedPatientForAssign) return;
    try {
      await updatePatient(selectedPatientForAssign.id, { programId });
      setIsAssignModalOpen(false);
    } catch (error) {
      console.error('No se pudo asignar el programa al paciente', error);
    }
  };

  const handleOpenHistoryModal = async (patient: Patient) => {
    setSelectedPatientForHistory(patient);
    setIsHistoryModalOpen(true);
    setHistoryError(null);
    setHistoryData(createInitialMedicalHistory());

    if (!patient.userId) {
      setHistoryError('El paciente no tiene un usuario vinculado para consultar la historia médica.');
      return;
    }

    if (!token) {
      setHistoryError('No se pudo autenticar la solicitud. Intenta iniciar sesión nuevamente.');
      return;
    }

    setIsHistoryLoading(true);

    try {
      const res = await fetch(`${apiBase}/patient/user/${patient.userId}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) {
        setHistoryError('El paciente aún no registra una historia médica.');
        return;
      }

  if (!res.ok) {
    throw new Error(`No se pudo obtener la historia médica (${res.status})`);
      }

      const payload = await res.json() as RemotePatientMedicalHistory | null;
      const mappedHistory = mapRemoteMedicalHistoryToState(payload);
      setHistoryData(mappedHistory);
    } catch (error) {
      console.error('No se pudo cargar la historia médica del paciente', error);
      setHistoryError('No se pudo cargar la historia médica. Intenta nuevamente.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedPatientForHistory(null);
    setHistoryError(null);
    setIsHistoryLoading(false);
    setHistoryData(createInitialMedicalHistory());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const patientData = {
      ...formData,
      dateOfBirth: new Date(formData.dateOfBirth),
      assignedTherapists: editingPatient?.assignedTherapists || [],
      isActive: true,
    };

    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, patientData);
      } else {
        await addPatient(patientData);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('No se pudo guardar el paciente', error);
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el paciente. Intenta nuevamente.',
      );
    }
  };

  const handleDelete = async (patientId: string) => {
    if (confirm('¿Estás seguro de eliminar a este paciente?')) {
      try {
        await deletePatient(patientId);
      } catch (error) {
        console.error('No se pudo eliminar al paciente', error);
      }
    }
  };

  const columns = [
    {
      key: 'firstName',
      header: 'Nombre completo',
      render: (patient: Patient) => `${patient.firstName} ${patient.lastName}`,
    },
    {
      key: 'dateOfBirth',
      header: 'Edad',
      render: (patient: Patient) => {
        const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return `${age} años`;
      },
    },
    {
      key: 'gender',
      header: 'Género',
      render: (patient: Patient) => {
        const genderMap: Record<string, string> = {
          male: 'Masculino',
          female: 'Femenino',
          other: 'Otro',
        };
        return <span className="capitalize">{genderMap[patient.gender] ?? 'Sin registrar'}</span>;
      },
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (patient: Patient) => patient.phone || 'Sin registro',
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'whitespace-normal',
      render: (patient: Patient) => (
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAssignModal(patient)}
              title={patient.programId ? 'Cambiar programa' : 'Asignar programa'}
            >
              {patient.programId ? (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Cambiar
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Asignar
                </span>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenHistoryModal(patient)}
            title={patient.userId ? 'Ver historia médica' : 'Paciente sin usuario vinculado'}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenModal(patient)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(patient.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-8 bg-gradient-to-b from-slate-50 via-white to-violet-50/20 px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-violet-50 to-white shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.5em] text-violet-500">
                <Stethoscope className="h-3.5 w-3.5" /> Pacientes
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Seguimiento integral de expedientes
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Observa la evolución clínica, asigna programas y mantén cada registro actualizado desde un ambiente claro y confiable.
              </p>
            </div>
            <Button onClick={() => handleOpenModal()} className="whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" /> Nuevo paciente
            </Button>
          </div>
          <div className="mt-6 grid gap-3 text-xs uppercase tracking-[0.3em] text-slate-500 sm:grid-cols-3">
            <span className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-center">
              {totalPatients.toLocaleString()} pacientes en seguimiento
            </span>
            <span className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-center">
              {filteredPatientCount.toLocaleString()} coinciden con la búsqueda
            </span>
            <span className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-center">
              {assignedProgramCount.toLocaleString()} con programa activo
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-slate-100 bg-white/90 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-50 p-3 text-violet-500">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Pacientes activos</p>
              <p className="text-2xl font-semibold text-slate-900">{activePatients.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Con seguimiento vigente</p>
            </div>
          </div>
        </Card>
        <Card className="border border-slate-100 bg-white/90 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-50 p-3 text-purple-500">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Con programa asignado</p>
              <p className="text-2xl font-semibold text-slate-900">{assignedProgramCount.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Participando en protocolos</p>
            </div>
          </div>
        </Card>
        <Card className="border border-slate-100 bg-white/90 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-50 p-3 text-fuchsia-500">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Pendientes por asignar</p>
              <p className="text-2xl font-semibold text-slate-900">{awaitingAssignmentCount.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Listos para plan personalizado</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtra por nombre, correo o programa"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{filteredPatientCount.toLocaleString()} resultados</p>
        </div>

        <Table data={filteredPatients} columns={columns} />
      </Card>

      {/* Assign Program Modal for Admins */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={selectedPatientForAssign ? `Asignar programa a ${selectedPatientForAssign.firstName}` : 'Asignar programa'}
        size="md"
      >
        {selectedPatientForAssign && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Selecciona el protocolo más adecuado para {selectedPatientForAssign.firstName}.</p>
            <div className="space-y-3">
              {programs.map((program) => (
                <div key={program.id} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="pr-3">
                    <div className="text-sm font-semibold text-slate-900">{program.name}</div>
                    <div className="text-xs text-slate-500">{program.description}</div>
                  </div>
                  <Button size="sm" onClick={() => handleAssignProgram(program.id)}>Asignar</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormError(null);
        }}
        title={editingPatient ? 'Editar paciente' : 'Registrar paciente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Género
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingPatient ? 'Actualizar paciente' : 'Crear paciente'}
            </Button>
          </div>
        </form>
      </Modal>

      <MedicalHistoryViewModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        data={historyData}
        isLoading={isHistoryLoading}
        errorMessage={historyError}
        title={selectedPatientForHistory ? `Historia médica de ${selectedPatientForHistory.firstName} ${selectedPatientForHistory.lastName}` : 'Historia médica'}
      />
    </section>
  );
};