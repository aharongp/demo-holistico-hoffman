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
}

export interface DailyReviewResult {
  topicId: number | null;
  topic: string | null;
  average: number;
  enunciado: string | null;
  color: string | null;
  icono: string | null;
}

export interface PatientAggregatedResults {
  attitudinal: {
    strengths: AttitudinalStrengthResult[];
    summary: AttitudinalSummary | null;
  };
  health: {
    diagnostics: HealthDiagnosticResult[];
    tests: Record<string, TestResult | null>;
  };
  dailyReview: DailyReviewResult[];
}
