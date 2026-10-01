import { describe, expect, it } from 'vitest';
import { buildUpdatePayload, createInitialMedicalHistory, mapRemoteMedicalHistoryToState } from '../pages/MedicalHistory/MedicalHistory';
import { assignedInstrumentId, expandAssignedInstruments } from './assignedInstruments';
import { prepareUpload } from './uploads';

describe('Medical history round trip', () => {
  it('restores both positive and negative symptoms and all free text fields', () => {
    const data = createInitialMedicalHistory();
    data.alterations.tos = true;
    data.alterations.palpitaciones = true;
    data.diseases.otraVenerea = 'Detalle conservado';
    data.clinicalBackground.currentIllness = 'Descripción actual';
    data.clinicalBackground.otherAlteration = 'Observación adicional';
    const payload = buildUpdatePayload(data);
    const restored = mapRemoteMedicalHistoryToState({ ...payload, diseases: [{ disease: 'otraVenerea', status: payload.diseases.otraVenerea }] });
    expect(restored.alterations).toEqual(data.alterations);
    expect(restored.diseases.otraVenerea).toBe(data.diseases.otraVenerea);
    expect(restored.clinicalBackground).toEqual(data.clinicalBackground);
  });
  it.each(['Otra Venerea', 'otraVenerea', 'otravenera', 'Otras enfermedades venéreas'])('reads legacy label %s', disease => {
    expect(mapRemoteMedicalHistoryToState({ diseases: [{ disease, status: 'Detalle' }] }).diseases.otraVenerea).toBe('Detalle');
  });
});

describe('Assigned questionnaires', () => {
  it('preserves each questionnaire identity and independent completion', () => {
    const rows = expandAssignedInstruments({ id: 1, topics: ['A', 'B'], completed: false, instruments: [
      { id: 11, name: 'A', subjectId: 20, completed: true },
      { id: 12, name: 'B', subjectId: 21, completed: false },
    ] });
    expect(rows.map(assignedInstrumentId)).toEqual([11, 12]);
    expect(rows.map(row => row.completed)).toEqual([true, false]);
    expect(rows.map(row => row.topics)).toEqual([['A'], ['B']]);
  });
  it('does not silently select the first questionnaire of an ambiguous assignment', () => {
    expect(() => assignedInstrumentId({})).toThrow();
  });
});

describe('Vercel uploads', () => {
  it('rejects oversized documents before sending a request', async () => {
    const data = new FormData();
    data.append('file', new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }));
    await expect(prepareUpload(data)).rejects.toThrow('4 MB');
  });
  it('preserves document contents and recorded date', async () => {
    const data = new FormData();
    data.append('file', new File(['%PDF-test'], 'study.pdf', { type: 'application/pdf' }));
    data.append('fecha', '2026-09-24');
    const result = await prepareUpload(data);
    expect(result.get('fecha')).toBe('2026-09-24');
    expect(await (result.get('file') as File).text()).toBe('%PDF-test');
  });
});
