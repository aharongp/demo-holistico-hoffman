export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export type UserRole = 'administrator' | 'trainer' | 'therapist' | 'doctor' | 'coach' | 'patient' | 'student';

export interface Patient {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  cedula?: string | null;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  assignedTherapists: User[];
  programId?: string; // optional assigned program
  ribbonId?: number | null;
  createdAt: Date;
  isActive: boolean;
}

export interface Instrument {
  id: string;
  name: string;
  description: string;
  category: 'attitudinal' | 'health' | 'psychological';
  questions: Question[];
  estimatedDuration: number; // in minutes
  isActive: boolean;
  createdAt: Date;
  instrumentTypeId?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  availability?: string | null;
  resource?: string | null;
  resultDelivery?: 'sistema' | 'programado' | null;
  colorResponse?: 0 | 1;
  createdBy?: string | null;
  updatedAt?: Date | null;
}

export interface InstrumentType {
  id: string;
  name: string;
  description?: string | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  criterionId?: string | null;
}

export interface QuestionAnswer {
  id: string;
  label: string;
  value?: string | null;
  color?: string | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'scale' | 'text' | 'boolean' | 'radio' | 'select';
  options?: QuestionOption[];
  answers?: QuestionAnswer[];
  required: boolean;
  order: number;
}

export interface Assignment {
  id: string;
  patientId: string;
  instrumentId: string;
  assignedBy: string;
  assignedAt: Date;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  responses?: Response[];
  completedAt?: Date;
}

export interface Response {
  questionId: string;
  value: string | number | boolean;
  answeredAt: Date;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  instruments: string[]; // instrument IDs
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date | null;
  createdBy?: string | null;
}

export interface ProgramActivity {
  id: string;
  name: string;
  description?: string | null;
  day?: string | null;
  time?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  createdBy?: string | null;
}

export interface ProgramDetails extends Program {
  activities: ProgramActivity[];
}

export interface PatientPunctualityRecord {
  id: number;
  patientId: number | null;
  date: Date | null;
  activity: string | null;
  punctuality: number | null;
  effectiveness: number | null;
  compliance: number | null;
  roleEffectiveness: number | null;
  evaluated: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreatePatientPunctualityInput {
  patientId: string;
  activity?: string | null;
  date?: string | Date | null;
  punctuality?: number | string | null;
  effectiveness?: number | string | null;
  compliance?: number | string | null;
  roleEffectiveness?: number | string | null;
  evaluated?: boolean | number | null;
}

export interface UpdatePatientPunctualityInput extends CreatePatientPunctualityInput {
  id: number;
}

export interface EvolutionEntry {
  id: string;
  patientId: string;
  date: Date;
  mood: number; // 1-10 scale
  energy: number; // 1-10 scale
  notes: string;
  weight?: number; // in kg
  bloodSugar?: number; // mg/dL
  bloodPressureSystolic?: number; // mmHg
  bloodPressureDiastolic?: number; // mmHg
  pulse?: number; // bpm
  bodyMassIndex?: number; // calculated
  heartRate?: number; // bpm
  attachments?: FileAttachment[];
}

export type VitalSource =
  | 'consultation'
  | 'pulse'
  | 'glycemia'
  | 'heart_rate'
  | 'weight'
  | 'body_mass'
  | 'blood_pressure';

export interface BaseVitalRecord {
  id: number;
  recordedAt: string | null;
  source: VitalSource;
}

export interface NumericVitalRecord extends BaseVitalRecord {
  value: number | null;
  rawValue: string | null;
  unit: string | null;
}

export interface BloodPressureRecord extends BaseVitalRecord {
  systolic: number | null;
  diastolic: number | null;
  rawValue: string | null;
}

export interface HeartRateRecoveryRecord extends BaseVitalRecord {
  resting: number | null;
  after5Minutes: number | null;
  after10Minutes: number | null;
  after15Minutes: number | null;
  after30Minutes: number | null;
  after45Minutes: number | null;
  sessionType: string | null;
}

export interface PatientVitalsSummary {
  weight: NumericVitalRecord[];
  pulse: NumericVitalRecord[];
  bloodPressure: BloodPressureRecord[];
  bodyMassIndex: NumericVitalRecord[];
  glycemia: NumericVitalRecord[];
  heartRateRecovery: HeartRateRecoveryRecord[];
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface GenderDistributionSlice {
  label: string;
  count: number;
  percentage: number;
}

export interface PatientsByProgramSlice {
  programId: number | null;
  name: string;
  count: number;
}

export interface DashboardStats {
  totalPatients: number;
  totalUsers: number;
  totalInstruments: number;
  pendingAssignments: number;
  completedAssignments: number;
  genderDistribution: {
    male: number;
    female: number;
    other: number;
    breakdown: GenderDistributionSlice[];
  };
  patientsByProgram: PatientsByProgramSlice[];
  lastUpdated?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  instrumentType?: string | null;
  ribbonId?: number | null;
}

export interface Criterion {
  id: string;
  name: string;
  description?: string | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Ribbon {
  id: number;
  name: string | null;
  color: string | null;
  order: number | null;
  description: string | null;
  userCreated: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  bgColor: string | null;
  nextRibbonId: number | null;
  hexColor: string | null;
  thread: string | null;
  layer: number | null;
}