import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useAuth } from '../../context/AuthContext';

interface ConsultationDetailData {
  id: number;
  dateLabel: string;
  reason: string;
  weight: string;
  bodyMassIndex: string;
  bodyFat: string;
  pulse: string;
  maxHeartRate: string;
  bloodPressure: string;
  arm: string;
  thigh: string;
  waist: string;
  hip: string;
  chest: string;
  neck: string;
  finding: string;
  recommendation: string;
  observation: string;
  diagnosis: string;
  breathing: string;
  evolution: string;
  coachRecommendation: string;
  indications: string;
  createdAtLabel: string;
  updatedAtLabel: string;
}

const consultationDateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
});

const timestampFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatConsultationDate = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return consultationDateFormatter.format(parsed);
};

const formatTimestamp = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return timestampFormatter.format(parsed);
};

const sanitize = (value: unknown): string => {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value).trim();
};

const toDisplay = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
};

export const ConsultationDetail: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { consultationId } = useParams<{ consultationId: string }>();
  const apiBase = useMemo(() => {
    const raw = (import.meta as any).env?.VITE_API_BASE;
    const normalized = typeof raw === 'string' ? raw.trim() : '';
    return normalized.length > 0 ? normalized : 'http://localhost:3000';
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConsultationDetailData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const loadDetail = async () => {
      if (!consultationId) {
        setErrorMessage('Identificador de consulta inválido.');
        return;
      }

      const numericId = Number(consultationId);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        setErrorMessage('Identificador de consulta inválido.');
        return;
      }

      if (!token) {
        setErrorMessage('Debes iniciar sesión para ver la consulta.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`${apiBase}/consultation/${numericId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (res.status === 404) {
          setErrorMessage('La consulta solicitada no existe.');
          setDetail(null);
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch consultation (${res.status})`);
        }

        const payload = await res.json();
        const mapToDetail = (record: Record<string, unknown>): ConsultationDetailData => {
          const dateValue = sanitize(record['date']);
          return {
            id: Number(record['id']) || numericId,
            dateLabel: formatConsultationDate(dateValue),
            reason: sanitize(record['reason'] ?? record['motivo']),
            weight: sanitize(record['weight'] ?? record['peso']),
            bodyMassIndex: sanitize(record['bodyMassIndex'] ?? record['imc']),
            bodyFat: sanitize(record['bodyFat'] ?? record['gc']),
            pulse: sanitize(record['pulse'] ?? record['pulso']),
            maxHeartRate: sanitize(record['maxHeartRate'] ?? record['fcm']),
            bloodPressure: sanitize(record['bloodPressure'] ?? record['tension']),
            arm: sanitize(record['arm'] ?? record['brazo']),
            thigh: sanitize(record['thigh'] ?? record['muslo']),
            waist: sanitize(record['waist'] ?? record['cintura']),
            hip: sanitize(record['hip'] ?? record['cadera']),
            chest: sanitize(record['chest'] ?? record['busto_pecho']),
            neck: sanitize(record['neck'] ?? record['cuello']),
            finding: sanitize(record['finding'] ?? record['hallazgo']),
            recommendation: sanitize(record['recommendation'] ?? record['recomendacion']),
            observation: sanitize(record['observation'] ?? record['observacion']),
            diagnosis: sanitize(record['diagnosis'] ?? record['diagnostico']),
            breathing: sanitize(record['breathing'] ?? record['respiracion']),
            evolution: sanitize(record['evolution'] ?? record['evolucion']),
            coachRecommendation: sanitize(
              record['coachRecommendation'] ?? record['recomendacion_coach'],
            ),
            indications: sanitize(record['indications']),
            createdAtLabel: formatTimestamp(
              sanitize(record['createdAt'] ?? record['created_at']) || null,
            ),
            updatedAtLabel: formatTimestamp(
              sanitize(record['updatedAt'] ?? record['updated_at']) || null,
            ),
          };
        };

        const record = payload && typeof payload === 'object' ? payload : {};
        setDetail(mapToDetail(record as Record<string, unknown>));
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }

        console.error('Failed to load consultation detail', error);
        setErrorMessage('No se pudo cargar la consulta. Intenta nuevamente.');
        setDetail(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadDetail();

    return () => {
      abortController.abort();
    };
  }, [apiBase, consultationId, token]);

  return (
    <section className="relative space-y-6 px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white via-white/80 to-transparent" />
        <div className="absolute -left-10 top-16 h-72 w-72 rounded-full bg-[#c7d2fe]/40 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#e0f2fe]/70 blur-[140px]" />
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Consulta médica</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Detalle de la consulta</h1>
          <p className="mt-2 text-sm text-slate-500">
            Revisa la información registrada durante la evaluación clínica seleccionada.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="bg-white/80 text-slate-700 shadow-sm hover:bg-white"
          >
            Volver
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="relative rounded-2xl border border-slate-100/80 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-lg shadow-slate-200/60 backdrop-blur">
          Cargando consulta...
        </div>
      )}

      {errorMessage && !isLoading && (
        <div className="relative rounded-2xl border border-rose-100 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-lg shadow-rose-100/60">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && detail && (
        <div className="relative space-y-6">
          <Card className="rounded-[24px] border-white/60 bg-white/80 shadow-xl shadow-slate-200/70 backdrop-blur">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem label="Fecha" value={detail.dateLabel} />
                <DetailItem label="Motivo" value={toDisplay(detail.reason)} />
                <DetailItem label="Peso" value={toDisplay(detail.weight)} />
                <DetailItem label="IMC" value={toDisplay(detail.bodyMassIndex)} />
                <DetailItem label="% Grasa corporal" value={toDisplay(detail.bodyFat)} />
                <DetailItem label="Pulso" value={toDisplay(detail.pulse)} />
                <DetailItem
                  label="Frecuencia cardíaca máxima"
                  value={toDisplay(detail.maxHeartRate)}
                />
                <DetailItem label="Tensión arterial" value={toDisplay(detail.bloodPressure)} />
                <DetailItem label="Brazo" value={toDisplay(detail.arm)} />
                <DetailItem label="Muslo" value={toDisplay(detail.thigh)} />
                <DetailItem label="Cintura" value={toDisplay(detail.waist)} />
                <DetailItem label="Cadera" value={toDisplay(detail.hip)} />
                <DetailItem label="Busto/pecho" value={toDisplay(detail.chest)} />
                <DetailItem label="Cuello" value={toDisplay(detail.neck)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem label="Diagnóstico" value={toDisplay(detail.diagnosis)} />
                <DetailItem label="Hallazgo" value={toDisplay(detail.finding)} />
                <DetailItem label="Evolución" value={toDisplay(detail.evolution)} />
                <DetailItem label="Recomendación" value={toDisplay(detail.recommendation)} />
                <DetailItem label="Observaciones" value={toDisplay(detail.observation)} />
                <DetailItem label="Respiración" value={toDisplay(detail.breathing)} />
                <DetailItem
                  label="Recomendación del coach"
                  value={toDisplay(detail.coachRecommendation)}
                />
                <DetailItem label="Indicaciones" value={toDisplay(detail.indications)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem label="Creada" value={detail.createdAtLabel} />
                <DetailItem label="Actualizada" value={detail.updatedAtLabel} />
              </div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
};

interface DetailItemProps {
  label: string;
  value: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm shadow-slate-100">
    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm text-slate-700">{value}</p>
  </div>
);

export default ConsultationDetail;
