import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BackendInstrumentResponse } from '../../types/patientInstruments';

export function InstrumentResponseChart({ responses }: { responses: BackendInstrumentResponse[] }) {
  const data = responses.flatMap((response, index) => {
    const raw = response.answer?.trim().replace(',', '.');
    if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) return [];
    const value = Number(raw);
    if (!Number.isFinite(value)) return [];
    return [{ label: `P${response.order ?? index + 1}`, question: response.question ?? `Pregunta ${index + 1}`, value }];
  });
  if (!data.length) return null;
  return <div className="rounded-xl border border-slate-200 bg-white p-4">
    <h4 className="mb-3 text-sm font-semibold text-slate-800">Valores registrados por pregunta</h4>
    <div className="h-64" aria-label="Gráfico de las respuestas numéricas del test">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" /><YAxis />
          <Tooltip labelFormatter={(_, entries) => entries[0]?.payload?.question ?? ''} />
          <Bar dataKey="value" name="Valor registrado" fill="#7c3aed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>;
}
