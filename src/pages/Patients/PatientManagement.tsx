import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Eye, Stethoscope, HeartPulse, Activity, ClipboardList, ListChecks } from 'lucide-react';
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
  const { patients, addPatient, updatePatient, assignProgramToPatient, deletePatient, programs } = useApp();
  const { token } = useAuth();
  const { isAdmin } = usePermissions();
  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
  const navigate = useNavigate();
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
    cedula: '',
  });
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | Patient['gender']>('all');

  const programNameById = useMemo(() => {
    const lookup: Record<string, string> = {};
    programs.forEach((program) => {
      lookup[program.id] = program.name;
    });
    return lookup;
  }, [programs]);

  const programOptions = useMemo(() => {
    const sortedPrograms = [...programs]
      .map((program) => ({ value: program.id, label: program.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return [
      { value: 'all', label: 'Todos los programas' },
      { value: 'no-program', label: 'Sin programa asignado' },
      ...sortedPrograms,
    ];
  }, [programs]);

  const filteredPatients = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const matchesTerm = !normalizedTerm
        || fullName.includes(normalizedTerm)
        || patient.firstName.toLowerCase().includes(normalizedTerm)
        || patient.lastName.toLowerCase().includes(normalizedTerm)
        || patient.email.toLowerCase().includes(normalizedTerm)
        || (patient.cedula?.toLowerCase().includes(normalizedTerm) ?? false);

      if (!matchesTerm) {
        return false;
      }

      const matchesProgram = selectedProgram === 'all'
        ? true
        : selectedProgram === 'no-program'
          ? !patient.programId
          : patient.programId === selectedProgram;

      if (!matchesProgram) {
        return false;
      }

      const matchesStatus = statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? patient.isActive
          : !patient.isActive;

      if (!matchesStatus) {
        return false;
      }

      const matchesAssignment = assignmentFilter === 'all'
        ? true
        : assignmentFilter === 'assigned'
          ? Boolean(patient.programId)
          : !patient.programId;

      if (!matchesAssignment) {
        return false;
      }

      const matchesGender = genderFilter === 'all' ? true : patient.gender === genderFilter;

      return matchesGender;
    });
  }, [patients, searchTerm, selectedProgram, statusFilter, assignmentFilter, genderFilter]);

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
  const { filteredProgramsCount } = useMemo(() => {
    const base = new Set<string>();
    filteredPatients.forEach((patient) => {
      if (patient.programId) {
        base.add(patient.programId);
      }
    });
    return {
      filteredProgramsCount: base.size,
    };
  }, [filteredPatients]);

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
        cedula: patient.cedula ?? '',
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
        cedula: '',
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
      await assignProgramToPatient(selectedPatientForAssign.id, programId);
      setIsAssignModalOpen(false);
    } catch (error) {
      console.error('No se pudo asignar el programa al paciente', error);
    }
  };

  const handleRemoveProgram = async () => {
    if (!selectedPatientForAssign) return;
    try {
      await assignProgramToPatient(selectedPatientForAssign.id, null);
      setIsAssignModalOpen(false);
    } catch (error) {
      console.error('No se pudo quitar el programa del paciente', error);
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
      cedula: formData.cedula ? formData.cedula.trim() : undefined,
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
      key: 'cedula',
      header: 'Cédula',
      render: (patient: Patient) => patient.cedula ?? 'Sin registro',
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
      key: 'program',
      header: 'Programa',
      render: (patient: Patient) => {
        if (!patient.programId) {
          return <span className="text-xs text-slate-400">Sin asignar</span>;
        }
        const programLabel = programNameById[patient.programId] ?? 'Programa sin nombre';
        return <span className="text-xs font-medium text-violet-600">{programLabel}</span>;
      },
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
            onClick={() => navigate(`/patients/${patient.id}`)}
            title="Actividades del paciente"
          >
            <ListChecks className="w-4 h-4" />
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
    <section className="space-y-9 from-slate-50 via-white to-violet-50/25 px-4 py-8 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-br from-white/90 via-violet-50/80 to-white/90 shadow-[0_35px_90px_-65px_rgba(109,40,217,0.7)] backdrop-blur-xl">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_60%)]" />
        <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-violet-500">
              <Stethoscope className="h-3.5 w-3.5" /> Custodia Clínica
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/80">Panel de Pacientes</p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Seguimiento integral de expedientes
              </h1>
              <p className="max-w-2xl text-base text-slate-500">
                Observa la evolución clínica, asigna programas y mantén cada registro actualizado desde un entorno claro y confiable.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="whitespace-nowrap rounded-full border border-violet-500/30 bg-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-500/25 transition hover:bg-violet-400"
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo paciente
          </Button>
        </div>
        <div className="relative z-10 grid gap-3 border-t border-white/40 px-6 py-4 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500 sm:grid-cols-3">
          {[
            { label: 'En seguimiento', value: totalPatients.toLocaleString() },
            { label: 'Coincidencias', value: filteredPatientCount.toLocaleString() },
            { label: 'Con programa activo', value: assignedProgramCount.toLocaleString() },
            { label: 'Programas filtrados', value: filteredProgramsCount.toLocaleString() },
          ].map((item) => (
            <span key={item.label} className="rounded-2xl border border-white/60 bg-white/80 px-3 py-3 text-center text-slate-600">
              <strong className="block text-2xl font-semibold tracking-normal text-slate-900">{item.value}</strong>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {[{
          label: 'Pacientes activos',
          value: activePatients.toLocaleString(),
          detail: 'Con seguimiento vigente',
          icon: HeartPulse,
          accent: 'text-violet-400',
        },
        {
          label: 'Con programa asignado',
          value: assignedProgramCount.toLocaleString(),
          detail: 'Participando en protocolos',
          icon: Activity,
          accent: 'text-violet-500',
        },
        {
          label: 'Pendientes por asignar',
          value: awaitingAssignmentCount.toLocaleString(),
          detail: 'Listos para plan personalizado',
          icon: ClipboardList,
          accent: 'text-fuchsia-500',
        }].map(tile => (
          <Card
            key={tile.label}
            className="border border-white/50 bg-white/85 backdrop-blur-xl"
          >
            <div className="flex items-start gap-5">
              <div className={`rounded-3xl bg-slate-900/5 p-3 ${tile.accent}`}>
                <tile.icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.5em] text-slate-400">{tile.label}</p>
                <p className="text-3xl font-semibold text-slate-900">{tile.value}</p>
                <p className="text-xs text-slate-500">{tile.detail}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border border-white/40 bg-white/85 shadow-[0_30px_80px_-65px_rgba(109,40,217,0.75)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="grid w-full gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))] xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Busca por nombre, cédula o correo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 pl-10 pr-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                {programOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="all">Estado: todos</option>
                <option value="active">Solo activos</option>
                <option value="inactive">Solo inactivos</option>
              </select>
            </div>
            <div>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as typeof assignmentFilter)}
                className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="all">Asignación: todas</option>
                <option value="assigned">Con programa</option>
                <option value="unassigned">Sin programa</option>
              </select>
            </div>
            <div className="hidden xl:block">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as typeof genderFilter)}
                className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="all">Género: todos</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro / no binario</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
            <div className="xl:hidden">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as typeof genderFilter)}
                className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 px-4 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="all">Género: todos</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro / no binario</option>
              </select>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400 text-center sm:text-right">
              {filteredPatientCount.toLocaleString()} resultados
            </p>
          </div>
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
            {selectedPatientForAssign.programId && (
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Programa actual</p>
                  <p className="font-semibold text-amber-800">{programNameById[selectedPatientForAssign.programId] ?? 'Programa sin nombre'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRemoveProgram}>
                  Quitar programa
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {programs.map((program) => (
                <div key={program.id} className="flex items-start justify-between rounded-2xl border border-white/60 bg-white/70 p-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Cédula / Documento
              </label>
              <input
                type="text"
                value={formData.cedula}
                onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value }))}
                placeholder="Ej: V-12345678"
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