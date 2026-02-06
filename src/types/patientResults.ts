export interface PonderationResult {
  holistica: string | null;
  academica: string | null;
  icono: string | null;
  colorTexto: string | null;
}

export interface AttitudinalStrengthResult {
  topicId: number | null;
  topic: string | null;
  sum: number;
  questionCount: number;
  average: number;
  percentage: number;
  colorClass: string | null;
  ponderation: PonderationResult;
}

export interface AttitudinalSummary {
  average: number;
  percentage: number;
  colorClass: string | null;
  ponderation: PonderationResult;
}

export interface TestResult {
  nivel: string | null;
  enunciado: string | null;
  colorTexto: string | null;
  icono: string | null;
  total: number;
}

export interface HealthDiagnosticResult {
  id: number | null;
  diagnostic: string | null;
  enunciado: string | null;
  colorTexto: string | null;
  icono: string | null;
  total: number;
  responses: HealthDiagnosticResponse[];
}

export interface HealthDiagnosticResponse {
  question: string | null;
  answer: string | null;
}

export interface DailyReviewResult {
  topicId: number | null;
  topic: string | null;
  average: number;
  enunciado: string | null;
  color: string | null;
  icono: string | null;
}

export interface WheelResult {
  topic: string | null;
  average: number;
}

export interface RegiflexEntry {
  topic: string | null;
  sum: number;
}

export interface RegiflexResult {
  entries: RegiflexEntry[];
  predominant: string | null;
}

export interface FirmnessAdaptabilityAxis {
  label: string | null;
  sum: number;
  percentage: number;
}

export type FirmnessAdaptabilityBalance = 'firmness' | 'adaptability' | 'balanced';

export interface FirmnessAdaptabilityResult {
  firmness: FirmnessAdaptabilityAxis;
  adaptability: FirmnessAdaptabilityAxis;
  total: number;
  difference: number;
  balance: FirmnessAdaptabilityBalance;
}

export interface PatientResultsSectionMetadata {
  availableDates: string[];
  selectedDate: string | null;
}

export interface PatientResultsMetadata {
  attitudinal: PatientResultsSectionMetadata;
  firmnessAdaptability: PatientResultsSectionMetadata;
  diagnostics: PatientResultsSectionMetadata;
  tests: PatientResultsSectionMetadata;
  dailyReview: PatientResultsSectionMetadata;
  wellnessLife: PatientResultsSectionMetadata;
  wellnessHealth: PatientResultsSectionMetadata;
  wellnessRegiflex: PatientResultsSectionMetadata;
}

export interface PatientAggregatedResults {
  attitudinal: {
    strengths: AttitudinalStrengthResult[];
    summary: AttitudinalSummary | null;
  };
  firmnessAdaptability: FirmnessAdaptabilityResult | null;
  health: {
    diagnostics: HealthDiagnosticResult[];
    tests: Record<string, TestResult | null>;
  };
  dailyReview: DailyReviewResult[];
  wellness: {
    wheelOfLife: WheelResult[];
    wheelOfHealth: WheelResult[];
    regiflex: RegiflexResult | null;
  };
  metadata: PatientResultsMetadata;
}
