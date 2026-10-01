export type AssignmentInstruments = {
  instrumentId?: number;
  instruments?: Array<{ id: number; name: string; subjectId: number | null; completed: boolean }>;
};

/** Each assigned questionnaire keeps its own identity, questions and completion state. */
export function expandAssignedInstruments<T extends AssignmentInstruments & { topics: string[]; completed: boolean }>(assignment: T): T[] {
  if (!assignment.instruments?.length) return [assignment];
  return assignment.instruments.map(instrument => ({
    ...assignment,
    instrumentId: instrument.id,
    topics: [instrument.name],
    completed: instrument.completed,
  }));
}

export function assignedInstrumentId(assignment: AssignmentInstruments): number {
  const id = assignment.instrumentId ?? (assignment.instruments?.length === 1 ? assignment.instruments[0].id : null);
  if (!id) throw new Error('No se pudo determinar el cuestionario asignado. Revisa los temas de la asignación.');
  return id;
}
