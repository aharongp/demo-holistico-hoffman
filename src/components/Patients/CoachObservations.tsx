import { useEffect, useId, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';

type Observation = {
  id: number;
  date: string | null;
  reason: string | null;
  observation: string | null;
  coach: string | null;
};
const today = () => new Date().toLocaleDateString('en-CA');

export function CoachObservations({ patientId, canEdit }: { patientId: number; canEdit: boolean }) {
  const { token, user } = useAuth();
  const formId = useId();
  const [records, setRecords] = useState<Observation[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ date: today(), reason: '', observation: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
  const endpoint = `${apiBase}/patients/history/${patientId}/coach-consultations`;

  useEffect(() => {
    const controller = new AbortController();
    setRecords([]);
    setError(null);
    setSuccess(null);
    setEditing(null);
    setForm({ date: today(), reason: '', observation: '' });
    if (!token) return;
    setLoading(true);
    fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudieron cargar las observaciones del coach.');
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('El historial de observaciones no es válido.');
        if (!controller.signal.aborted) setRecords(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, token]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !canEdit || !token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(editing === null ? endpoint : `${endpoint}/${editing}`, {
        method: editing === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          coach: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'No se pudo guardar la observación.');
      if (!data?.id || data.observation !== form.observation.trim())
        throw new Error('No se pudo confirmar el guardado de la observación.');
      setRecords((previous) => [data, ...previous.filter((item) => item.id !== data.id)]);
      setEditing(null);
      setForm({ date: today(), reason: '', observation: '' });
      setSuccess('Observación del coach guardada correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la observación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-4 rounded-2xl bg-white/90">
      <h2 className="text-xl font-semibold text-slate-900">Observaciones generales del coach</h2>
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-emerald-700">
          {success}
        </p>
      )}
      {canEdit && (
        <form onSubmit={save} className="space-y-3">
          <div>
            <label htmlFor={`${formId}-date`} className="block text-sm font-medium">
              Fecha de la observación
            </label>
            <input
              id={`${formId}-date`}
              type="date"
              required
              value={form.date}
              disabled={saving}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              className="mt-1 block rounded-lg border p-2"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-reason`} className="block text-sm font-medium">
              Motivo de la observación
            </label>
            <input
              id={`${formId}-reason`}
              value={form.reason}
              disabled={saving}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              className="mt-1 block w-full rounded-lg border p-2"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-observation`} className="block text-sm font-medium">
              Observación del coach
            </label>
            <textarea
              id={`${formId}-observation`}
              required
              rows={4}
              value={form.observation}
              disabled={saving}
              onChange={(event) => setForm({ ...form, observation: event.target.value })}
              className="mt-1 block w-full rounded-lg border p-2"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving || loading}>
              {saving
                ? 'Guardando observación…'
                : editing === null
                  ? 'Guardar observación'
                  : 'Actualizar observación'}
            </Button>
            {editing !== null && (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEditing(null);
                  setForm({ date: today(), reason: '', observation: '' });
                }}
              >
                Cancelar edición
              </Button>
            )}
          </div>
        </form>
      )}
      {loading && <p>Cargando observaciones…</p>}
      {!loading && !records.length && (
        <p className="text-sm text-slate-500">
          Todavía no hay observaciones generales registradas.
        </p>
      )}
      {records.map((item) => (
        <article key={item.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="text-sm text-slate-500">
            {item.date?.slice(0, 10) || 'Sin fecha'} · {item.coach || 'Coach'}
          </p>
          {item.reason && <h3 className="font-medium">{item.reason}</h3>}
          <p className="whitespace-pre-wrap">{item.observation}</p>
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setEditing(item.id);
                setForm({
                  date: item.date?.slice(0, 10) || today(),
                  reason: item.reason || '',
                  observation: item.observation || '',
                });
                setSuccess(null);
              }}
            >
              Editar observación
            </Button>
          )}
        </article>
      ))}
    </Card>
  );
}
