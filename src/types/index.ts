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
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  assignedTherapists: User[];
  programId?: string; // optional assigned program
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
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'scale' | 'text' | 'boolean';
  options?: string[];
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
  duration: number; // in days
  isActive: boolean;
  createdAt: Date;
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

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
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
  };
  roleDistribution: Record<UserRole, number>;
}