import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Patient, Instrument, Assignment, Program, ProgramActivity, ProgramDetails, EvolutionEntry, DashboardStats, GenderDistributionSlice, PatientsByProgramSlice } from '../types';
import { useAuth } from './AuthContext';

type ProgramInput = {
  name: string;
  description: string;
  instruments: string[];
  isActive?: boolean;
};

type ProgramActivityInput = {
  name: string;
  description?: string;
  day?: string;
  time?: string;
};

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const mapProgramFromApi = (program: any, fallbackCreatedBy: string | null = null): Program => {
  const createdAt = parseDate(program?.created_at ?? program?.createdAt) ?? new Date();
  const updatedAt = parseDate(program?.updated_at ?? program?.updatedAt);

  let instruments: string[] = [];
  if (Array.isArray(program?.instruments)) {
    instruments = program.instruments.map((id: any) => String(id));
  } else if (Array.isArray(program?.instrumentos)) {
    instruments = program.instrumentos.map((id: any) => String(id));
  }

  return {
    id: String(program?.id ?? ''),
    name: program?.nombre ?? program?.name ?? '',
    description: program?.descripcion ?? program?.description ?? '',
    instruments,
    isActive: typeof program?.activo !== 'undefined'
      ? Boolean(program.activo)
      : (typeof program?.isActive !== 'undefined' ? Boolean(program.isActive) : true),
    createdAt,
    updatedAt,
    createdBy: program?.user_created ?? program?.userCreated ?? fallbackCreatedBy ?? null,
  };
};

const mapProgramActivityFromApi = (activity: any): ProgramActivity => {
  const createdAt = parseDate(activity?.created_at ?? activity?.createdAt);
  const updatedAt = parseDate(activity?.updated_at ?? activity?.updatedAt);

  const hora = activity?.hora ?? activity?.time ?? null;
  return {
    id: String(activity?.id ?? ''),
    name: activity?.nombre ?? activity?.name ?? '',
    description: activity?.descripcion ?? activity?.description ?? null,
    day: activity?.dia ?? activity?.day ?? null,
    time: typeof hora === 'string' ? hora : null,
    createdAt,
    updatedAt,
    createdBy: activity?.user_created ?? activity?.userCreated ?? null,
  };
};

const mapProgramDetailsFromApi = (program: any, fallbackCreatedBy: string | null = null): ProgramDetails => {
  const base = mapProgramFromApi(program, fallbackCreatedBy);
  const rawActivities = Array.isArray(program?.activities) ? program.activities : [];
  return {
    ...base,
    activities: rawActivities.map((activity: any) => mapProgramActivityFromApi(activity)),
  };
};

interface AppContextType {
  // State
  patients: Patient[];
  instruments: Instrument[];
  assignments: Assignment[];
  programs: Program[];
  instrumentTypes: any[];
  myInstrumentTypes: any[];
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
  
  addProgram: (program: ProgramInput) => Promise<Program>;
  updateProgram: (id: string, program: Partial<ProgramInput>) => Promise<Program | null>;
  deleteProgram: (id: string) => Promise<boolean>;
  getProgramDetails: (id: string) => Promise<ProgramDetails | null>;
  addProgramActivity: (programId: string, activity: ProgramActivityInput) => Promise<ProgramActivity>;
  
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
    breakdown: [
      { label: 'Femenino', count: 70, percentage: 46.67 },
      { label: 'Masculino', count: 75, percentage: 50 },
      { label: 'Otros', count: 5, percentage: 3.33 },
    ],
  },
  patientsByProgram: [
    { programId: 1, name: 'Bienestar Integral', count: 80 },
    { programId: 2, name: 'Salud Preventiva', count: 45 },
    { programId: 3, name: 'Mindfulness', count: 25 },
  ],
  lastUpdated: undefined,
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
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'system',
    },
  ];

  const [programs, setPrograms] = useState<Program[]>(mockPrograms);
  const [instrumentTypes, setInstrumentTypes] = useState<any[]>([]);
  const [myInstrumentTypes, setMyInstrumentTypes] = useState<any[]>([]);
  const [evolutionEntries, setEvolutionEntries] = useState<EvolutionEntry[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(mockDashboardStats);

  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
  const { user } = useAuth();

  const currentUserDisplayName = useMemo(() => {
    if (!user) return null;
    const parts = [user.firstName, user.lastName].map(part => (part ?? '').trim()).filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
    return user.username?.trim() || null;
  }, [user]);

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
          const mapped = data.map((p: any) => mapProgramFromApi(p, currentUserDisplayName));
          setPrograms(mapped);
        }
      } catch (err) {
        console.error('Error loading programs from API, keeping mock programs.', err);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase, currentUserDisplayName]);

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
            raw: ins,
            mapped: {
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
            } as Instrument,
          }));

          // fetch topic names for instruments that reference an id_tema
          const topicCache: Record<number, string | null> = {};
          const temaIds = Array.from(new Set(data.map((ins: any) => ins.id_tema).filter((id: any) => typeof id !== 'undefined' && id !== null)));
          for (const temaId of temaIds) {
            try {
              const r = await fetch(`${apiBase}/topics/${temaId}`);
              if (!r.ok) {
                topicCache[temaId] = null;
                continue;
              }
              const t = await r.json();
              topicCache[temaId] = t ? (t.nombre ?? null) : null;
            } catch (err) {
              console.error('Failed to fetch topic', temaId, err);
              topicCache[temaId] = null;
            }
          }

          // apply topic names to mapped instruments
          const final = mapped.map((entry: any) => {
            const insRaw = entry.raw;
            const ins: Instrument = { ...entry.mapped };
            const temaId = insRaw?.id_tema;
            if (temaId && topicCache[temaId]) {
              ins.name = topicCache[temaId] as string;
            }
            return ins;
          });

          setInstruments(final);
        }
      } catch (err) {
        console.error('Error loading instruments from API, keeping mock instruments.', err);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase]);

  // Load instrument types (all) and types created by current user
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/instruments/types`);
        if (!res.ok) throw new Error(`Failed to fetch instrument types: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data)) setInstrumentTypes(data);
      } catch (err) {
        console.error('Error loading instrument types', err);
      }
    })();

    // fetch types by user if available
    (async () => {
      if (!user) return;
      try {
        // use email as identifier for user_created field
        const res = await fetch(`${apiBase}/instruments/types/user/${encodeURIComponent(user.email)}`);
        if (!res.ok) throw new Error(`Failed to fetch user's instrument types: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data)) setMyInstrumentTypes(data);
      } catch (err) {
        console.error('Error loading my instrument types', err);
      }
    })();

    return () => { mounted = false; };
  }, [apiBase, user]);

  useEffect(() => {
    let mounted = true;

    const normalizeGenderLabel = (value: string | null | undefined): 'male' | 'female' | 'other' => {
      const normalized = (value ?? '').toString().trim().toLowerCase();
      if (['male', 'masculino', 'hombre', 'm'].includes(normalized)) return 'male';
      if (['female', 'femenino', 'mujer', 'f'].includes(normalized)) return 'female';
      if (['other', 'otro', 'otros', 'otras', 'sin especificar', 'no especificado', 'n/a', ''].includes(normalized)) return 'other';
      return 'other';
    };

    (async () => {
      try {
        const res = await fetch(`${apiBase}/dashboard/summary`);
        if (!res.ok) throw new Error(`Failed to fetch dashboard summary: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;

        const rawBreakdown = Array.isArray(data?.patientGenderDistribution)
          ? data.patientGenderDistribution
          : [];

        const breakdown: GenderDistributionSlice[] = rawBreakdown
          .map((item: any) => ({
            label: item?.gender ?? 'Sin especificar',
            count: Number(item?.count ?? 0),
            percentage: Number(item?.percentage ?? 0),
          }))
          .filter((slice: GenderDistributionSlice) => Number.isFinite(slice.count));

        const totals = data?.totals ?? {};
        const parsedPatients = Number.isFinite(Number(totals.patients)) ? Number(totals.patients) : undefined;
        const parsedUsers = Number.isFinite(Number(totals.users)) ? Number(totals.users) : undefined;
        const parsedInstruments = Number.isFinite(Number(totals.instruments)) ? Number(totals.instruments) : undefined;
        const rawProgramDistribution = Array.isArray(data?.patientsByProgram) ? data.patientsByProgram : [];
        const patientsByProgram: PatientsByProgramSlice[] = rawProgramDistribution
          .map((item: any) => ({
            programId: typeof item?.programId === 'number' ? item.programId : null,
            name: item?.programName ?? item?.name ?? (typeof item?.programId === 'number' ? `Programa ${item.programId}` : 'Sin programa'),
            count: Number(item?.count ?? 0),
          }))
          .filter((entry: PatientsByProgramSlice) => Number.isFinite(entry.count));

        const sums = breakdown.reduce<Record<'male' | 'female' | 'other', number>>(
          (acc, slice) => {
            const normalized = normalizeGenderLabel(slice.label);
            acc[normalized] += slice.count;
            return acc;
          },
          { male: 0, female: 0, other: 0 }
        );

        const withPercentages = (list: GenderDistributionSlice[]): GenderDistributionSlice[] => {
          const total = list.reduce((acc, item) => acc + item.count, 0);
          if (total === 0) {
            return list.map(item => ({ ...item, percentage: 0 }));
          }
          return list.map(item => ({
            ...item,
            percentage: Number(((item.count / total) * 100).toFixed(2)),
          }));
        };

        const fallbackBreakdown = withPercentages([
          { label: 'Masculino', count: sums.male, percentage: 0 },
          { label: 'Femenino', count: sums.female, percentage: 0 },
          { label: 'Sin especificar', count: sums.other, percentage: 0 },
        ]);

        const finalBreakdown = breakdown.length ? breakdown : fallbackBreakdown;
        const maleCount = sums.male;
        const femaleCount = sums.female;
        const otherCount = sums.other;

        setDashboardStats(prev => ({
          ...prev,
          totalPatients: typeof parsedPatients === 'number' && !Number.isNaN(parsedPatients) ? parsedPatients : prev.totalPatients,
          totalUsers: typeof parsedUsers === 'number' && !Number.isNaN(parsedUsers) ? parsedUsers : prev.totalUsers,
          totalInstruments: typeof parsedInstruments === 'number' && !Number.isNaN(parsedInstruments) ? parsedInstruments : prev.totalInstruments,
          genderDistribution: {
            male: maleCount,
            female: femaleCount,
            other: otherCount,
            breakdown: finalBreakdown.length ? finalBreakdown : prev.genderDistribution.breakdown,
          },
          patientsByProgram: patientsByProgram.length ? patientsByProgram : prev.patientsByProgram,
          lastUpdated: new Date().toISOString(),
        }));
      } catch (err) {
        console.error('Error loading dashboard summary, keeping cached stats.', err);
      }
    })();

    return () => {
      mounted = false;
    };
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

  const addProgram = useCallback(async (programData: ProgramInput): Promise<Program> => {
    const payload = {
      nombre: programData.name?.trim?.() ?? programData.name,
      descripcion: programData.description?.trim?.() ?? programData.description,
      user_created: currentUserDisplayName,
    };

    try {
      const res = await fetch(`${apiBase}/programs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Request failed with status ${res.status}`);
      }

      const response = await res.json();
      const createdAt = response.created_at ? new Date(response.created_at) : new Date();
      const updatedAt = response.updated_at ? new Date(response.updated_at) : (response.updatedAt ? new Date(response.updatedAt) : createdAt);
      const created: Program = {
        id: String(response.id ?? Date.now()),
        name: response.nombre ?? response.name ?? programData.name,
        description: response.descripcion ?? response.description ?? programData.description,
        instruments: Array.isArray(programData.instruments) ? [...programData.instruments] : [],
        isActive: typeof programData.isActive === 'boolean' ? programData.isActive : true,
        createdAt,
        updatedAt,
        createdBy: response.user_created ?? response.userCreated ?? currentUserDisplayName,
      };

      setPrograms(prev => [...prev, created]);
      return created;
    } catch (error) {
      console.error('Failed to create program', error);
      throw error instanceof Error ? error : new Error('Unknown error creating program');
    }
  }, [apiBase, currentUserDisplayName]);

  const updateProgram = useCallback(async (id: string, programData: Partial<ProgramInput>): Promise<Program | null> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      let normalized: Program | null = null;
      setPrograms(prev => prev.map(p => {
        if (p.id !== id) return p;
        normalized = {
          ...p,
          name: programData.name ?? p.name,
          description: programData.description ?? p.description,
          instruments: Array.isArray(programData.instruments) ? [...programData.instruments] : p.instruments,
          isActive: typeof programData.isActive === 'boolean' ? programData.isActive : p.isActive,
        };
        return normalized;
      }));
      return normalized;
    }

    const payload = {
      nombre: programData.name?.trim?.(),
      descripcion: programData.description?.trim?.(),
    };

    try {
      const res = await fetch(`${apiBase}/programs/${numericId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Update failed with status ${res.status}`);
      }

      const response = await res.json();

      let normalized: Program | null = null;
      setPrograms(prev => prev.map(p => {
  if (p.id !== id) return p;

        const createdAt = response.created_at ? new Date(response.created_at) : p.createdAt;
        const updatedAt = response.updated_at ? new Date(response.updated_at) : (response.updatedAt ? new Date(response.updatedAt) : p.updatedAt ?? createdAt);

        normalized = {
          ...p,
          name: response.nombre ?? response.name ?? programData.name ?? p.name,
          description: response.descripcion ?? response.description ?? programData.description ?? p.description,
          instruments: Array.isArray(programData.instruments) ? [...programData.instruments] : p.instruments,
          isActive: typeof programData.isActive === 'boolean' ? programData.isActive : p.isActive,
          createdAt,
          updatedAt,
          createdBy: response.user_created ?? response.userCreated ?? p.createdBy ?? currentUserDisplayName ?? null,
        };

        return normalized;
      }));

      return normalized;
    } catch (error) {
      console.error(`Failed to update program ${id}`, error);
      throw error instanceof Error ? error : new Error('Unknown error updating program');
    }
  }, [apiBase, currentUserDisplayName]);

  const deleteProgram = useCallback(async (id: string): Promise<boolean> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setPrograms(prev => prev.filter(p => p.id !== id));
      return true;
    }
    try {
      const res = await fetch(`${apiBase}/programs/${numericId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Delete failed with status ${res.status}`);
      }

      const body = await res.json().catch(() => null);
      const wasDeleted = Boolean(body?.deleted ?? true);
      if (wasDeleted) {
        const removedId = body?.id ?? numericId;
        setPrograms(prev => prev.filter(p => p.id !== String(removedId)));
      }
      return wasDeleted;
    } catch (error) {
      console.error(`Failed to delete program ${id}`, error);
      throw error instanceof Error ? error : new Error('Unknown error deleting program');
    }
  }, [apiBase]);

  const getProgramDetails = useCallback(async (id: string): Promise<ProgramDetails | null> => {
    const numericId = Number(id);

    if (Number.isNaN(numericId)) {
      const program = programs.find(p => p.id === id);
      if (!program) {
        return null;
      }
      return {
        ...program,
        activities: [],
      };
    }

    try {
      const res = await fetch(`${apiBase}/programs/${numericId}`);
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to fetch program details: ${res.status}`);
      }
      const data = await res.json();
      return mapProgramDetailsFromApi(data, currentUserDisplayName);
    } catch (error) {
      console.error(`Failed to load program ${id}`, error);
      return null;
    }
  }, [apiBase, currentUserDisplayName, programs]);

  const addProgramActivity = useCallback(async (programId: string, activity: ProgramActivityInput): Promise<ProgramActivity> => {
    const normalizedName = activity.name?.trim?.() ?? activity.name;
    if (!normalizedName) {
      throw new Error('El nombre de la actividad es obligatorio');
    }

    const numericId = Number(programId);
    if (Number.isNaN(numericId)) {
      const mockActivity: ProgramActivity = {
        id: Date.now().toString(),
        name: normalizedName,
        description: activity.description?.trim?.() ?? activity.description ?? null,
        day: activity.day?.trim?.() || null,
        time: activity.time?.trim?.() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: currentUserDisplayName ?? null,
      };
      return mockActivity;
    }

    const payload = {
      nombre: normalizedName,
      descripcion: activity.description?.trim?.() ?? activity.description ?? null,
      dia: activity.day?.trim?.() || null,
      hora: activity.time?.trim?.() || null,
      user_created: currentUserDisplayName,
    };

    try {
      const res = await fetch(`${apiBase}/programs/${numericId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to create activity: ${res.status}`);
      }

      const data = await res.json();
      return mapProgramActivityFromApi(data);
    } catch (error) {
      console.error(`Failed to create activity for program ${programId}`, error);
      throw error instanceof Error ? error : new Error('Unknown error creating activity');
    }
  }, [apiBase, currentUserDisplayName]);

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
  instrumentTypes,
  myInstrumentTypes,
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
      getProgramDetails,
      addProgramActivity,
      addEvolutionEntry,
    }}>
      {children}
    </AppContext.Provider>
  );
};