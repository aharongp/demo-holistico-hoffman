import React, { createContext, useContext, useState, ReactNode } from 'react';
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
  const [programs, setPrograms] = useState<Program[]>([]);
  const [evolutionEntries, setEvolutionEntries] = useState<EvolutionEntry[]>([]);
  const [dashboardStats] = useState<DashboardStats>(mockDashboardStats);

  const addPatient = (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    const newPatient: Patient = {
      ...patientData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setPatients(prev => [...prev, newPatient]);
  };

  const updatePatient = (id: string, patientData: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...patientData } : p));
  };

  const deletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  };

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