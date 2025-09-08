import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Patient, Instrument, Assignment, Program, EvolutionEntry, DashboardStats } from '../types';

interface AppContextType {
  // State
  patients: Patient[];
  instruments: Instrument[];
  assignments: Assignment[];
  programs: Program[];
  evolutionEntries: EvolutionEntry[];
  dashboardStats: DashboardStats;
  
  // Actions
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  
  addInstrument: (instrument: Omit<Instrument, 'id' | 'createdAt'>) => void;
  updateInstrument: (id: string, instrument: Partial<Instrument>) => void;
  deleteInstrument: (id: string) => void;
  
  addAssignment: (assignment: Omit<Assignment, 'id' | 'assignedAt'>) => void;
  updateAssignment: (id: string, assignment: Partial<Assignment>) => void;
  
  addProgram: (program: Omit<Program, 'id' | 'createdAt'>) => void;
  updateProgram: (id: string, program: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  
  addEvolutionEntry: (entry: Omit<EvolutionEntry, 'id'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Mock data
const mockPatients: Patient[] = [
  {
    id: '1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@email.com',
    dateOfBirth: new Date('1990-05-15'),
    gender: 'female',
    phone: '+1234567890',
    assignedTherapists: [],
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '2',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    dateOfBirth: new Date('1985-10-20'),
    gender: 'male',
    phone: '+1234567891',
    assignedTherapists: [],
    createdAt: new Date('2024-01-02'),
    isActive: true,
  },
];

const mockInstruments: Instrument[] = [
  {
    id: '1',
    name: 'Anxiety Assessment',
    description: 'Comprehensive anxiety evaluation instrument',
    category: 'psychological',
    questions: [
      {
        id: '1',
        text: 'How often do you feel anxious?',
        type: 'scale',
        required: true,
        order: 1,
      },
      {
        id: '2',
        text: 'What triggers your anxiety the most?',
        type: 'text',
        required: false,
        order: 2,
      },
    ],
    estimatedDuration: 15,
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
];

const mockDashboardStats: DashboardStats = {
  totalPatients: 150,
  totalUsers: 25,
  totalInstruments: 12,
  pendingAssignments: 8,
  completedAssignments: 145,
  genderDistribution: {
    male: 75,
    female: 70,
    other: 5,
  },
  roleDistribution: {
    administrator: 2,
    trainer: 3,
    therapist: 8,
    doctor: 5,
    coach: 4,
    patient: 120,
    student: 30,
  },
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [instruments, setInstruments] = useState<Instrument[]>(mockInstruments);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const mockPrograms: Program[] = [
    {
      id: 'p1',
      name: 'Wellness Starter',
      description: 'Introductory program for new patients',
      instruments: ['1'],
      duration: 30,
      isActive: true,
      createdAt: new Date('2024-01-01'),
    },
  ];

  const [programs, setPrograms] = useState<Program[]>(mockPrograms);
  const [evolutionEntries, setEvolutionEntries] = useState<EvolutionEntry[]>([]);
  const [dashboardStats] = useState<DashboardStats>(mockDashboardStats);

  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';

  // Map backend paciente -> frontend Patient
  const mapPacienteToPatient = (p: any): Patient => ({
    id: String(p.id),
    firstName: p.nombres ?? '',
    lastName: p.apellidos ?? '',
    email: p.contacto_correo ?? p.contacto ?? '',
    dateOfBirth: p.fecha_nacimiento ? new Date(p.fecha_nacimiento) : new Date(),
    gender: (p.genero === 'male' || p.genero === 'female') ? p.genero : 'other',
    phone: p.telefono ?? p.contacto_telefono ?? undefined,
    address: p.direccion ?? undefined,
    assignedTherapists: [],
    programId: p.id_programa ? String(p.id_programa) : undefined,
    createdAt: p.created_at ? new Date(p.created_at) : new Date(),
    isActive: (typeof p.activo !== 'undefined') ? Boolean(p.activo) : true,
  });

  // Load patients from backend on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/patient`);
        if (!res.ok) throw new Error(`Failed to fetch patients: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const mapped = Array.isArray(data) ? data.map(mapPacienteToPatient) : [];
          // if API returns no patients, keep mocks so UI doesn't appear empty
          if (mapped.length > 0) {
            setPatients(mapped);
          } else {
            setPatients(mockPatients);
          }
      } catch (err) {
        // fallback to mocks on error
        setPatients(mockPatients);
        console.error('Error loading patients from API, using mock data.', err);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase]);

  // Load programs from backend on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/programs`);
        if (!res.ok) throw new Error(`Failed to fetch programs: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          // map backend program shape to frontend Program
          const mapped = data.map((p: any) => ({
            id: String(p.id),
            name: p.nombre ?? p.name ?? '',
            description: p.descripcion ?? p.description ?? '',
            instruments: Array.isArray(p.instruments) ? p.instruments.map(String) : (p.instrumentos ? p.instrumentos.map(String) : []),
            duration: p.duracion ?? p.duration ?? 0,
            isActive: typeof p.activo !== 'undefined' ? Boolean(p.activo) : (typeof p.isActive !== 'undefined' ? p.isActive : true),
            createdAt: p.created_at ? new Date(p.created_at) : (p.createdAt ? new Date(p.createdAt) : new Date()),
          }));
          setPrograms(mapped);
        }
      } catch (err) {
        console.error('Error loading programs from API, keeping mock programs.', err);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase]);

  // Load instruments from backend on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/instruments`);
        if (!res.ok) throw new Error(`Failed to fetch instruments: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          // Map backend instrumento -> frontend Instrument
          const mapped = data.map((ins: any) => ({
            id: String(ins.id),
            name: ins.descripcion ?? ins.nombre ?? `Instrument ${ins.id}`,
            description: ins.descripcion ?? '',
            category: (ins.categoria || ins.tipo || 'psychological') as any,
            questions: Array.isArray(ins.preguntas) ? ins.preguntas.map((q: any) => ({
              id: String(q.id),
              text: q.texto ?? q.text ?? '',
              type: (q.tipo === 'scale' || q.tipo === 'text' || q.tipo === 'boolean') ? q.tipo : 'text',
              options: q.opciones ?? q.options ?? undefined,
              required: typeof q.requerido !== 'undefined' ? Boolean(q.requerido) : (typeof q.required !== 'undefined' ? q.required : true),
              order: q.orden ?? q.order ?? 0,
            })) : [],
            estimatedDuration: ins.duracion_estimada ?? ins.estimatedDuration ?? 0,
            isActive: typeof ins.activo !== 'undefined' ? Boolean(ins.activo) : true,
            createdAt: ins.created_at ? new Date(ins.created_at) : new Date(),
          }));
          setInstruments(mapped);
        }
      } catch (err) {
        console.error('Error loading instruments from API, keeping mock instruments.', err);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase]);

  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    try {
      const payload = {
        nombres: patientData.firstName,
        apellidos: patientData.lastName,
        contacto_correo: patientData.email,
        fecha_nacimiento: patientData.dateOfBirth?.toISOString?.() ?? null,
        genero: patientData.gender,
        telefono: patientData.phone,
        direccion: patientData.address,
        id_programa: patientData.programId ? Number(patientData.programId) : null,
        activo: patientData.isActive ? 1 : 0,
      };
      const res = await fetch(`${apiBase}/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to create patient: ${res.status}`);
      const created = await res.json();
      setPatients(prev => [...prev, mapPacienteToPatient(created)]);
    } catch (err) {
      console.error('Create patient failed, applying locally', err);
      // fallback local create
      const newPatient: Patient = {
        ...patientData,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      setPatients(prev => [...prev, newPatient]);
    }
  }, [apiBase]);

  const updatePatient = useCallback(async (id: string, patientData: Partial<Patient>) => {
    try {
      const payload: any = {};
      if (patientData.firstName) payload.nombres = patientData.firstName;
      if (patientData.lastName) payload.apellidos = patientData.lastName;
      if (patientData.email) payload.contacto_correo = patientData.email;
      if (patientData.dateOfBirth) payload.fecha_nacimiento = (patientData.dateOfBirth as Date).toISOString();
      if (patientData.gender) payload.genero = patientData.gender;
      if (patientData.phone) payload.telefono = patientData.phone;
      if (patientData.address) payload.direccion = patientData.address;
      if (typeof patientData.isActive !== 'undefined') payload.activo = patientData.isActive ? 1 : 0;
      if (patientData.programId) {
        // If programId looks numeric, send number; otherwise send as-is (backend may accept string ids)
        const maybeNum = Number(patientData.programId);
        payload.id_programa = Number.isNaN(maybeNum) ? patientData.programId : maybeNum;
      }

      const res = await fetch(`${apiBase}/patient/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to update patient: ${res.status}`);
      const updated = await res.json();
      setPatients(prev => prev.map(p => p.id === id ? mapPacienteToPatient(updated) : p));
    } catch (err) {
      console.error('Update patient failed, applying locally', err);
      setPatients(prev => prev.map(p => p.id === id ? { ...p, ...patientData } as Patient : p));
    }
  }, [apiBase]);

  const deletePatient = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/patient/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete patient: ${res.status}`);
      setPatients(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete patient failed, removing locally', err);
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  }, [apiBase]);

  const addInstrument = (instrumentData: Omit<Instrument, 'id' | 'createdAt'>) => {
    const newInstrument: Instrument = {
      ...instrumentData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setInstruments(prev => [...prev, newInstrument]);
  };

  const updateInstrument = (id: string, instrumentData: Partial<Instrument>) => {
    setInstruments(prev => prev.map(i => i.id === id ? { ...i, ...instrumentData } : i));
  };

  const deleteInstrument = (id: string) => {
    setInstruments(prev => prev.filter(i => i.id !== id));
  };

  const addAssignment = (assignmentData: Omit<Assignment, 'id' | 'assignedAt'>) => {
    const newAssignment: Assignment = {
      ...assignmentData,
      id: Date.now().toString(),
      assignedAt: new Date(),
    };
    setAssignments(prev => [...prev, newAssignment]);
  };

  const updateAssignment = (id: string, assignmentData: Partial<Assignment>) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...assignmentData } : a));
  };

  const addProgram = (programData: Omit<Program, 'id' | 'createdAt'>) => {
    const newProgram: Program = {
      ...programData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setPrograms(prev => [...prev, newProgram]);
  };

  const updateProgram = (id: string, programData: Partial<Program>) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...programData } : p));
  };

  const deleteProgram = (id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
  };

  const addEvolutionEntry = (entryData: Omit<EvolutionEntry, 'id'>) => {
    const newEntry: EvolutionEntry = {
      ...entryData,
      id: Date.now().toString(),
    };
    setEvolutionEntries(prev => [...prev, newEntry]);
  };

  return (
    <AppContext.Provider value={{
      patients,
      instruments,
      assignments,
      programs,
      evolutionEntries,
      dashboardStats,
      addPatient,
      updatePatient,
      deletePatient,
      addInstrument,
      updateInstrument,
      deleteInstrument,
      addAssignment,
      updateAssignment,
      addProgram,
      updateProgram,
      deleteProgram,
      addEvolutionEntry,
    }}>
      {children}
    </AppContext.Provider>
  );
};