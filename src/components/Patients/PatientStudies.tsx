import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { prepareUpload, uploadError } from '../../utils/uploads';

type Study = { id: number; file: string | null; createdAt: string | null };

export function PatientStudies({ patientId }: { patientId: string | number }) {
  const { token } = useAuth();
  const api = (import.meta.env.VITE_API_BASE ?? 'http://localhost:3000').replace(/\/+$/, '');
  const [studies, setStudies] = useState<Study[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${api}/patient/${patientId}/attachments`, { headers: { Authorization: `Bearer ${token}` }, signal });
      if (!response.ok) throw new Error('No se pudieron consultar los estudios.');
      setStudies(await response.json());
    } catch (error) {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : 'No se pudieron consultar los estudios.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [api, patientId, token]);

  useEffect(() => {
    const controller = new AbortController();
    setStudies([]);
    setError(null);
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await fetch(`${api}/patient/${patientId}/attachments`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: await prepareUpload(data),
      });
      if (!response.ok) throw await uploadError(response);
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo subir el estudio.'); }
    finally { setUploading(false); if (input.current) input.current.value = ''; }
  };

  const download = async (study: Study) => {
    if (!token) return;
    setDownloading(study.id);
    setError(null);
    try {
      const response = await fetch(`${api}/patient/attachments/${study.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('No se pudo descargar el estudio.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = study.file?.split('/').pop() || `estudio-${study.id}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo descargar el estudio.'); }
    finally { setDownloading(null); }
  };

  return <Card className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-slate-900">Estudios del paciente</h2>
      <input ref={input} type="file" className="hidden" aria-label="Seleccionar estudio" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt" onChange={upload} />
      <Button type="button" disabled={uploading || !token} onClick={() => input.current?.click()}><Upload className="mr-2 h-4 w-4" />{uploading ? 'Subiendo…' : 'Subir estudio'}</Button>
    </div>
    <p className="text-sm text-slate-500">Consulta y descarga los estudios cargados por el paciente o su equipo médico. Máximo 4 MB por documento.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {loading ? <p>Cargando estudios…</p> : studies.length ? <ul className="divide-y divide-slate-100">
      {studies.map(study => <li key={study.id} className="flex items-center justify-between gap-3 py-3">
        <div><p className="break-all text-sm font-medium">{study.file?.split('/').pop() || `Estudio ${study.id}`}</p>
          <p className="text-xs text-slate-500">{study.createdAt ? study.createdAt.slice(0, 10).split('-').reverse().join('/') : 'Sin fecha'}</p></div>
        <Button variant="outline" disabled={downloading === study.id} onClick={() => download(study)}><Download className="mr-2 h-4 w-4" />Descargar</Button>
      </li>)}
    </ul> : <p className="text-sm text-slate-500">Todavía no hay estudios cargados.</p>}
  </Card>;
}
