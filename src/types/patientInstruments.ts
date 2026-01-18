export type BackendInstrumentResponse = {
  id: number;
  patientInstrumentId?: number | null;
  instrumentTypeId?: number | null;
  instrumentId?: number | null;
  questionId: number | null;
  question: string | null;
  answer: string | null;
  competence: string | null;
  order: number | null;
  saved: boolean;
  evaluated: boolean;
  answerDate?: string | null;
  theme?: string | null;
  topic?: string | null;
  type?: string | null;
  patientId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PreparedInstrumentAnswer = {
  questionId: string;
  questionNumericId: number | null;
  questionText: string;
  value: string;
  label: string;
  selections?: string[];
  order?: number | null;
  theme?: string | null;
  topic?: string | null;
};

export type CoachDiagnosticObservation = {
  id: number;
  patientId: number | null;
  instrumentId: number | null;
  topicId: number | null;
  appliedAt: string | null;
  comment: string | null;
  coach: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
