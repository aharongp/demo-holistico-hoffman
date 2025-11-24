import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
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

  const filteredPatients = patients.filter(patient =>
    patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      console.error('Failed to assign program to patient', error);
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
        throw new Error(`Failed to fetch medical history (${res.status})`);
      }

      const payload = await res.json() as RemotePatientMedicalHistory | null;
      const mappedHistory = mapRemoteMedicalHistoryToState(payload);
      setHistoryData(mappedHistory);
    } catch (error) {
      console.error('Failed to load medical history for patient', error);
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
      console.error('Failed to save patient', error);
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el paciente. Intenta nuevamente.',
      );
    }
  };

  const handleDelete = async (patientId: string) => {
    if (confirm('Are you sure you want to delete this patient?')) {
      try {
        await deletePatient(patientId);
      } catch (error) {
        console.error('Failed to delete patient', error);
      }
    }
  };

  const columns = [
    {
      key: 'firstName',
      header: 'Name',
      render: (patient: Patient) => `${patient.firstName} ${patient.lastName}`,
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'dateOfBirth',
      header: 'Age',
      render: (patient: Patient) => {
        const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return `${age} years`;
      },
    },
    {
      key: 'gender',
      header: 'Gender',
      render: (patient: Patient) => (
        <span className="capitalize">{patient.gender}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (patient: Patient) => patient.phone || 'N/A',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (patient: Patient) => (
        <div className="flex space-x-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAssignModal(patient)}
              title={patient.programId ? 'Change program' : 'Assign program'}
            >
              {patient.programId ? (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Change
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Assign
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-600">Manage patient records and information</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <Table data={filteredPatients} columns={columns} />
      </Card>

      {/* Assign Program Modal for Admins */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={selectedPatientForAssign ? `Assign Program to ${selectedPatientForAssign.firstName}` : 'Assign Program'}
        size="md"
      >
        {selectedPatientForAssign && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">Select a program to assign to the patient.</p>
            <div className="space-y-2">
              {/** using programs from context */}
              {programs.map((program) => (
                <div key={program.id} className="flex items-center justify-between border p-2 rounded">
                  <div>
                    <div className="font-medium">{program.name}</div>
                    <div className="text-sm text-gray-500">{program.description}</div>
                  </div>
                  <div>
                    <Button onClick={() => handleAssignProgram(program.id)}>Assign</Button>
                  </div>
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
        title={editingPatient ? 'Edit Patient' : 'Add New Patient'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingPatient ? 'Update Patient' : 'Create Patient'}
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
    </div>
  );
};