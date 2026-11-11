import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import type { BackendInstrumentResponse } from '../../types/patientInstruments';

type ResultChart = {
  title: string;
  kind: 'bar' | 'radar' | 'pie' | 'line';
  unit: string;
  points: Array<{ label: string; value: number }>;
};
type InstrumentResult = {
  resultKey?: string;
  assignmentId: number;
  instrumentId: number | null;
  name: string;
  assignedAt: string | null;
  status: string;
  charts: ResultChart[];
};
const colors = ['#7c3aed', '#0284c7', '#059669', '#d97706', '#db2777'];
const resultKey = (item: InstrumentResult) =>
  item.resultKey || `${item.assignmentId}:${item.instrumentId}`;

export function ResultChartView({ chart }: { chart: ResultChart }) {
  const height = chart.kind === 'bar' ? Math.max(260, chart.points.length * 35) : 340;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-800">{chart.title}</h4>
      <div style={{ height }} role="img" aria-label={`${chart.title}: ${chart.unit}`}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === 'radar' ? (
            <RadarChart data={chart.points} outerRadius="65%">
              <PolarGrid />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
              <Radar
                isAnimationActive={false}
                dataKey="value"
                name={chart.unit}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.3}
              />
              <Tooltip />
            </RadarChart>
          ) : chart.kind === 'pie' ? (
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={chart.points}
                dataKey="value"
                nameKey="label"
                label={({ name }) => name}
                outerRadius="65%"
              >
                {chart.points.map((point, index) => (
                  <Cell key={point.label} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : chart.kind === 'line' ? (
            <LineChart data={chart.points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line isAnimationActive={false} dataKey="value" name={chart.unit} stroke={colors[0]} />
            </LineChart>
          ) : (
            <BarChart data={chart.points} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={chart.unit !== 'Respuestas'} />
              <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar isAnimationActive={false} dataKey="value" name={chart.unit} fill={colors[0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm text-slate-600">
        <summary className="cursor-pointer">Ver datos del gráfico</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr>
              <th className="text-left">Área / pregunta</th>
              <th>{chart.unit}</th>
            </tr>
          </thead>
          <tbody>
            {chart.points.map((point, index) => (
              <tr key={index}>
                <td className="whitespace-pre-wrap py-1">{point.label}</td>
                <td className="text-center">{point.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

export function AssignedInstrumentResults({
  patientId,
  patientUserId,
  responses,
  refreshKey = 0,
}: {
  patientId?: number;
  patientUserId?: number;
  responses?: BackendInstrumentResponse[];
  refreshKey?: number;
}) {
  const { token } = useAuth();
  const [results, setResults] = useState<InstrumentResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('all');
  const [statusFilter, setStatusFilter] = useState('answered');
  const [page, setPage] = useState(0);
  const actualPatientId = patientId ?? responses?.find((row) => row.patientId)?.patientId;
  const assignmentId = responses?.[0]?.patientInstrumentId;
  const instrumentId = responses?.[0]?.instrumentId;
  const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');

  useEffect(() => {
    if (!token || (!actualPatientId && !patientUserId)) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setResults([]);
    setSelected('all');
    setPage(0);
    fetch(
      `${apiBase}/patient-instruments/charts/${actualPatientId ? `patient/${actualPatientId}` : `user/${patientUserId}`}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudieron cargar los gráficos de los instrumentos.');
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('La respuesta de gráficos no es válida.');
        if (!controller.signal.aborted) setResults(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [actualPatientId, patientUserId, apiBase, token, refreshKey]);

  const scoped = results.filter(
    (item) =>
      !responses || (item.assignmentId === assignmentId && item.instrumentId === instrumentId),
  );
  const filtered = scoped.filter(
    (item) =>
      responses ||
      statusFilter === 'all' ||
      (statusFilter === 'answered' ? item.charts.length > 0 : item.charts.length === 0),
  );
  const matching = filtered.filter((item) => selected === 'all' || resultKey(item) === selected);
  const visible = matching.slice(page * 6, (page + 1) * 6);
  return (
    <div className="space-y-4" data-testid="assigned-instrument-results">
      {!responses && (
        <h3 className="text-xl font-semibold text-slate-900">
          Resultados de cada instrumento asignado
        </h3>
      )}
      {loading && <p role="status">Cargando gráficos de los tests…</p>}
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}
      {!responses && scoped.length > 0 && (
        <label className="block text-sm font-medium">
          Mostrar instrumentos
          <select
            className="mt-2 block rounded-lg border p-2"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setSelected('all');
              setPage(0);
            }}
          >
            <option value="answered">
              Con resultados ({scoped.filter((item) => item.charts.length).length})
            </option>
            <option value="all">Todas las asignaciones ({scoped.length})</option>
            <option value="pending">
              Sin datos para graficar ({scoped.filter((item) => !item.charts.length).length})
            </option>
          </select>
        </label>
      )}
      {!loading && !error && !filtered.length && (
        <p className="text-sm text-slate-500">No hay resultados de instrumentos disponibles.</p>
      )}
      {!responses && filtered.length > 1 && (
        <label className="block text-sm font-medium">
          Instrumento y asignación
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setPage(0);
            }}
            className="mt-2 block w-full rounded-lg border p-2"
          >
            <option value="all">Todos los instrumentos</option>
            {filtered.map((item) => (
              <option key={resultKey(item)} value={resultKey(item)}>
                {item.name} · {item.assignedAt?.slice(0, 10) || 'Sin fecha'} · Asignación{' '}
                {item.assignmentId}
              </option>
            ))}
          </select>
        </label>
      )}
      {visible.map((item) => (
        <article
          data-pdf-page={`instrument-${resultKey(item)}`}
          key={resultKey(item)}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4"
        >
          <h4 className="font-semibold text-slate-900">{item.name}</h4>
          <p className="text-xs text-slate-500">
            Asignación {item.assignmentId} · {item.assignedAt?.slice(0, 10) || 'Sin fecha'}
          </p>
          {!item.charts.length && (
            <p className="text-sm text-slate-500">
              {item.status === 'completed'
                ? 'Las respuestas guardadas no contienen valores para graficar.'
                : 'Pendiente de respuestas finalizadas. El gráfico aparecerá al completar este test.'}
            </p>
          )}
          {item.charts.map((chart, index) => (
            <ResultChartView key={index} chart={chart} />
          ))}
        </article>
      ))}
      {matching.length > 6 && (
        <nav
          aria-label="Páginas de resultados de instrumentos"
          className="flex items-center gap-3 text-sm"
        >
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
            Anteriores
          </button>
          <span>
            Página {page + 1} de {Math.ceil(matching.length / 6)} · {matching.length} instrumentos
          </span>
          <button
            type="button"
            disabled={(page + 1) * 6 >= matching.length}
            onClick={() => setPage((value) => value + 1)}
          >
            Siguientes
          </button>
        </nav>
      )}
    </div>
  );
}
