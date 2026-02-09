import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
  HeartPulse,
  Search,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Chart } from '../../components/Dashboard/Chart';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { InstrumentResults } from '../Results/InstrumentResults';
import type {
  Patient,
  PatientVitalsSummary,
  NumericVitalRecord,
  BloodPressureRecord,
} from '../../types';

type PatientEngagementStatus = 'en-tratamiento' | 'seguimiento' | 'alta';
type RiskLevel = 'Alto' | 'Moderado' | 'Bajo';

interface EnrichedPatientRow {
  base: Patient;
  id: string;
  fullName: string;
  identifier: string;
  programName: string;
  status: PatientEngagementStatus;
}

interface VitalAverages {
  weight: number | null;
  glycemia: number | null;
  pulse: number | null;
  systolic: number | null;
  diastolic: number | null;
}

interface ChartBlockConfig {
  key: string;
  title: string;
  data: any[];
  dataKey: string | string[];
  colors: string[];
  emptyHelper: string;
}

const STATUS_LABELS: Record<PatientEngagementStatus, { label: string; helper: string }> = {
  'en-tratamiento': { label: 'En tratamiento', helper: 'Sesiones activas' },
  seguimiento: { label: 'Seguimiento', helper: 'Monitor clínico' },
  alta: { label: 'Alta clínica', helper: 'Caso concluido' },
};

const STATUS_BADGE_CLASSES: Record<PatientEngagementStatus, string> = {
  'en-tratamiento': 'border-indigo-200 bg-indigo-50 text-indigo-600',
  seguimiento: 'border-sky-200 bg-sky-50 text-sky-600',
  alta: 'border-emerald-200 bg-emerald-50 text-emerald-600',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  Alto: 'bg-rose-100 text-rose-700 border-rose-200',
  Moderado: 'bg-amber-100 text-amber-700 border-amber-200',
  Bajo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const WEIGHT_COLOR = ['#6366f1'];
const BLOOD_PRESSURE_COLORS = ['#4f46e5', '#a855f7'];
const GLYCEMIA_COLOR = ['#f97316'];
const PULSE_COLOR = ['#14b8a6'];

const sanitizeApiBase = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'http://localhost:3000';
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return 'http://localhost:3000';
  }
  return trimmed.replace(/\/+$/g, '');
};

const formatDisplayDate = (isoDate: string) => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin registro';
  }
  return parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatChartDateFromTimestamp = (timestamp: number) => {
  const parsed = new Date(timestamp);
  return parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const buildInitials = (name: string) => {
  return name
    .split(' ')
    .map(segment => segment.slice(0, 1).toUpperCase())
    .slice(0, 2)
    .join('');
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const determineEngagementStatus = (patient: Patient): PatientEngagementStatus => {
  if (!patient.isActive) {
    return 'alta';
  }
  return patient.programId ? 'en-tratamiento' : 'seguimiento';
};

const formatIdentifier = (patient: Patient): string => {
  if (typeof patient.cedula === 'string' && patient.cedula.trim().length) {
    return patient.cedula.trim();
  }
  return `ID-${patient.id}`;
};

const parseTimestamp = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const deriveRiskLevel = (averages: VitalAverages): { level: RiskLevel; score: number } => {
  let score = 0;

  if (averages.systolic !== null) {
    if (averages.systolic >= 150) {
      score += 30;
    } else if (averages.systolic >= 135) {
      score += 20;
    } else if (averages.systolic >= 120) {
      score += 10;
    }
  }

  if (averages.diastolic !== null) {
    if (averages.diastolic >= 95) {
      score += 20;
    } else if (averages.diastolic >= 85) {
      score += 10;
    }
  }

  if (averages.glycemia !== null) {
    if (averages.glycemia >= 180) {
      score += 30;
    } else if (averages.glycemia >= 140) {
      score += 20;
    } else if (averages.glycemia >= 110) {
      score += 10;
    }
  }

  if (averages.pulse !== null) {
    if (averages.pulse >= 110 || averages.pulse <= 50) {
      score += 20;
    } else if (averages.pulse >= 90) {
      score += 10;
    }
  }

  const level: RiskLevel = score >= 70 ? 'Alto' : score >= 40 ? 'Moderado' : 'Bajo';
  return { level, score: Math.min(Math.round(score), 100) };
};

const calculateAdherenceRatio = (totalMeasurements: number, uniqueObservationDays: number): number => {
  if (!uniqueObservationDays) {
    return 0;
  }
  const expected = uniqueObservationDays * 4;
  if (!expected) {
    return 0;
  }
  return Math.min(totalMeasurements / expected, 1);
};
export const ReportsManagement: React.FC = () => {
  const { patients, programs } = useApp();
  const { token } = useAuth();
  const apiBase = useMemo(
    () => sanitizeApiBase((import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000'),
    []
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | Patient['gender']>('all');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [vitalsSummary, setVitalsSummary] = useState<PatientVitalsSummary | null>(null);
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const programNameById = useMemo(() => {
    const lookup: Record<string, string> = {};
    programs.forEach(program => {
      lookup[program.id] = program.name;
    });
    return lookup;
  }, [programs]);

  const programOptions = useMemo(() => {
    const sorted = [...programs]
      .map(program => ({ value: program.id, label: program.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return [
      { value: 'all', label: 'Todos los programas' },
      { value: 'no-program', label: 'Sin programa asignado' },
      ...sorted,
    ];
  }, [programs]);

  const enrichedPatients = useMemo<EnrichedPatientRow[]>(() => {
    return patients.map(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.trim();
      const status = determineEngagementStatus(patient);
      const programName = patient.programId ? programNameById[patient.programId] ?? 'Programa sin nombre' : 'Sin programa';

      return {
        base: patient,
        id: patient.id,
        fullName,
        identifier: formatIdentifier(patient),
        programName,
        status,
      };
    });
  }, [patients, programNameById]);

  const statusCounters = useMemo(() => {
    return enrichedPatients.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.status] += 1;
        return acc;
      },
      { total: 0, 'en-tratamiento': 0, seguimiento: 0, alta: 0 } as Record<'total' | PatientEngagementStatus, number>
    );
  }, [enrichedPatients]);

  const filteredPatients = useMemo(() => {
    const normalizedTerm = normalize(searchTerm.trim());

    return enrichedPatients
      .filter(row => {
        const { base } = row;

        const matchesTerm =
          !normalizedTerm ||
          normalize(row.fullName).includes(normalizedTerm) ||
          normalize(base.email).includes(normalizedTerm) ||
          normalize(row.identifier).includes(normalizedTerm) ||
          normalize(row.programName).includes(normalizedTerm);

        if (!matchesTerm) {
          return false;
        }

        const matchesProgram =
          selectedProgram === 'all'
            ? true
            : selectedProgram === 'no-program'
              ? !base.programId
              : base.programId === selectedProgram;

        if (!matchesProgram) {
          return false;
        }

        const matchesStatus =
          statusFilter === 'all'
            ? true
            : statusFilter === 'active'
              ? base.isActive
              : !base.isActive;

        if (!matchesStatus) {
          return false;
        }

        const matchesAssignment =
          assignmentFilter === 'all'
            ? true
            : assignmentFilter === 'assigned'
              ? Boolean(base.programId)
              : !base.programId;

        if (!matchesAssignment) {
          return false;
        }

        const matchesGender = genderFilter === 'all' ? true : base.gender === genderFilter;
        return matchesGender;
      })
      .sort((a, b) => b.base.createdAt.getTime() - a.base.createdAt.getTime());
  }, [enrichedPatients, searchTerm, selectedProgram, statusFilter, assignmentFilter, genderFilter]);

  useEffect(() => {
    setSelectedPatientId(prev => {
      if (!filteredPatients.length) {
        return null;
      }
      if (prev && filteredPatients.some(item => item.id === prev)) {
        return prev;
      }
      return filteredPatients[0]?.id ?? null;
    });
  }, [filteredPatients]);

  const selectedRow = useMemo(
    () => filteredPatients.find(item => item.id === selectedPatientId) ?? null,
    [filteredPatients, selectedPatientId]
  );
  const selectedPatient = selectedRow?.base ?? null;
  const selectedPatientFullName = selectedRow?.fullName ?? null;
  const selectedProgramName = selectedRow?.programName ?? 'Sin programa';

  const selectedPatientUserId = useMemo(() => {
    if (!selectedPatient?.userId) {
      return null;
    }
    const numeric = Number(selectedPatient.userId);
    return Number.isFinite(numeric) ? numeric : null;
  }, [selectedPatient?.userId]);

  const dateRange = useMemo(() => {
    const from = dateFilter.from ? new Date(dateFilter.from).getTime() : null;
    const to = dateFilter.to ? new Date(dateFilter.to).getTime() : null;

    if (from !== null && to !== null) {
      return { start: Math.min(from, to), end: Math.max(from, to) };
    }
    return { start: from, end: to };
  }, [dateFilter]);

  useEffect(() => {
    if (!selectedPatient || !token) {
      setVitalsSummary(null);
      setVitalsError(null);
      setIsLoadingVitals(false);
      return;
    }

    const resolveVitalsEndpoint = (patient: Patient | null): string | null => {
      if (!patient) {
        return null;
      }
      if (patient.userId && patient.userId.trim().length) {
        return `${apiBase}/vitals/user/${patient.userId}`;
      }
      if (patient.id) {
        return `${apiBase}/vitals/patient/${patient.id}`;
      }
      return null;
    };

    const endpoint = resolveVitalsEndpoint(selectedPatient);
    if (!endpoint) {
      setVitalsSummary(null);
      setVitalsError('No se pudo determinar el origen de los signos vitales para este paciente.');
      setIsLoadingVitals(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingVitals(true);
    setVitalsError(null);

    const fetchVitals = async () => {
      try {
        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 404) {
            if (!controller.signal.aborted) {
              setVitalsSummary(null);
            }
            return;
          }

          const message =
            res.status === 401
              ? 'Sesión expirada al obtener los signos vitales.'
              : `Error ${res.status} al obtener los signos vitales.`;
          throw new Error(message);
        }

        const data = (await res.json()) as PatientVitalsSummary;
        if (!controller.signal.aborted) {
          setVitalsSummary(data);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('No se pudieron obtener los signos vitales', error);
        setVitalsSummary(null);
        setVitalsError(error instanceof Error ? error.message : 'No se pudieron obtener los signos vitales.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingVitals(false);
        }
      }
    };

    fetchVitals();

    return () => {
      controller.abort();
    };
  }, [apiBase, selectedPatient, token]);

  const detailData = useMemo(() => {
    const defaults = {
      weightSeries: [] as Array<{ fecha: string; peso: number }>,
      pressureSeries: [] as Array<{ fecha: string; systolic: number; diastolic: number }>,
      glycemiaSeries: [] as Array<{ fecha: string; glucosa: number }>,
      pulseSeries: [] as Array<{ fecha: string; pulso: number }>,
      averages: {
        weight: null as number | null,
        glycemia: null as number | null,
        pulse: null as number | null,
        systolic: null as number | null,
        diastolic: null as number | null,
      },
      lastMeasurement: null as string | null,
      totalMeasurements: 0,
      uniqueObservationDays: 0,
    };

    if (!vitalsSummary) {
      return defaults;
    }

    const { start, end } = dateRange;
    const observationDays = new Set<string>();
    let totalMeasurements = 0;
    let latestTimestamp: number | null = null;

    const withinRange = (timestamp: number) => {
      if (start !== null && timestamp < start) {
        return false;
      }
      if (end !== null && timestamp > end + 86_399_999) {
        return false;
      }
      return true;
    };

    const processNumericRecords = <Key extends string>(
      records: NumericVitalRecord[] | undefined,
      valueKey: Key
    ) => {
      const points: Array<{ timestamp: number; value: number }> = [];

      (records ?? []).forEach(record => {
        if (record.value === null) {
          return;
        }
        const timestamp = parseTimestamp(record.recordedAt);
        if (timestamp === null || !withinRange(timestamp)) {
          return;
        }
        points.push({ timestamp, value: record.value });
      });

      points.sort((a, b) => a.timestamp - b.timestamp);

      points.forEach(point => {
        const dayKey = new Date(point.timestamp).toISOString().slice(0, 10);
        observationDays.add(dayKey);
        totalMeasurements += 1;
        if (!latestTimestamp || point.timestamp > latestTimestamp) {
          latestTimestamp = point.timestamp;
        }
      });

      const sum = points.reduce((acc, point) => acc + point.value, 0);
      const average = points.length ? Number((sum / points.length).toFixed(1)) : null;

      const series = points.map(point => ({
        fecha: formatChartDateFromTimestamp(point.timestamp),
        [valueKey]: Number(point.value.toFixed(1)),
      })) as Array<{ fecha: string } & Record<Key, number>>;

      return { series, average };
    };

    const processPressureRecords = (records: BloodPressureRecord[] | undefined) => {
      const points: Array<{ timestamp: number; systolic: number; diastolic: number }> = [];

      (records ?? []).forEach(record => {
        if (record.systolic === null || record.diastolic === null) {
          return;
        }
        const timestamp = parseTimestamp(record.recordedAt);
        if (timestamp === null || !withinRange(timestamp)) {
          return;
        }
        points.push({
          timestamp,
          systolic: record.systolic,
          diastolic: record.diastolic,
        });
      });

      points.sort((a, b) => a.timestamp - b.timestamp);

      points.forEach(point => {
        const dayKey = new Date(point.timestamp).toISOString().slice(0, 10);
        observationDays.add(dayKey);
        totalMeasurements += 1;
        if (!latestTimestamp || point.timestamp > latestTimestamp) {
          latestTimestamp = point.timestamp;
        }
      });

      const systolicSum = points.reduce((acc, point) => acc + point.systolic, 0);
      const diastolicSum = points.reduce((acc, point) => acc + point.diastolic, 0);
      const averageSystolic = points.length ? Number((systolicSum / points.length).toFixed(1)) : null;
      const averageDiastolic = points.length ? Number((diastolicSum / points.length).toFixed(1)) : null;

      const series = points.map(point => ({
        fecha: formatChartDateFromTimestamp(point.timestamp),
        systolic: Number(point.systolic.toFixed(1)),
        diastolic: Number(point.diastolic.toFixed(1)),
      }));

      return {
        series,
        averageSystolic,
        averageDiastolic,
      };
    };

    const weightData = processNumericRecords(vitalsSummary.weight, 'peso');
    const glycemiaData = processNumericRecords(vitalsSummary.glycemia, 'glucosa');
    const pulseData = processNumericRecords(vitalsSummary.pulse, 'pulso');
    const pressureData = processPressureRecords(vitalsSummary.bloodPressure);

    const lastMeasurementTimestamp = latestTimestamp;
    const lastMeasurement = lastMeasurementTimestamp
      ? new Date(lastMeasurementTimestamp).toISOString()
      : null;

    return {
      weightSeries: weightData.series,
      pressureSeries: pressureData.series,
      glycemiaSeries: glycemiaData.series,
      pulseSeries: pulseData.series,
      averages: {
        weight: weightData.average,
        glycemia: glycemiaData.average,
        pulse: pulseData.average,
        systolic: pressureData.averageSystolic,
        diastolic: pressureData.averageDiastolic,
      },
      lastMeasurement,
      totalMeasurements,
      uniqueObservationDays: observationDays.size,
    };
  }, [vitalsSummary, dateRange]);
  const risk = useMemo(() => deriveRiskLevel(detailData.averages), [detailData]);
  const adherenceRatio = useMemo(
    () => calculateAdherenceRatio(detailData.totalMeasurements, detailData.uniqueObservationDays),
    [detailData.totalMeasurements, detailData.uniqueObservationDays]
  );
  const lastMeasurementLabel = detailData.lastMeasurement
    ? formatDisplayDate(detailData.lastMeasurement)
    : 'Sin registros';

  const totalPatients = patients.length;
  const filteredPatientCount = filteredPatients.length;
  const activePatients = useMemo(
    () => enrichedPatients.filter(row => row.base.isActive).length,
    [enrichedPatients]
  );
  const assignedProgramCount = useMemo(
    () => enrichedPatients.filter(row => Boolean(row.base.programId)).length,
    [enrichedPatients]
  );
  const awaitingAssignmentCount = Math.max(totalPatients - assignedProgramCount, 0);
  const filteredProgramsCount = useMemo(() => {
    const base = new Set<string>();
    filteredPatients.forEach(row => {
      if (row.base.programId) {
        base.add(row.base.programId);
      }
    });
    return base.size;
  }, [filteredPatients]);

  const handleExportPdf = async () => {
    if (!selectedPatient || !reportRef.current) {
      return;
    }

    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const sanitizedName = (selectedPatientFullName ?? 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Reporte_${sanitizedName}.pdf`);
    } catch (error) {
      console.error('Error al exportar el PDF', error);
    } finally {
      setIsExporting(false);
    }
  };

  const clearDateFilter = () => setDateFilter({ from: '', to: '' });

  const columns = useMemo(
    () => [
      {
        key: 'fullName',
        header: 'Paciente',
        className: 'min-w-[220px]',
        render: (row: EnrichedPatientRow) => (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
              {buildInitials(row.fullName)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-slate-900">{row.fullName}</span>
              <span className="truncate text-xs text-slate-500">{row.base.email}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'identifier',
        header: 'Identificador',
        className: 'min-w-[140px]',
        render: (row: EnrichedPatientRow) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-700">{row.identifier}</span>
            {row.base.cedula ? (
              <span className="text-xs text-slate-400">Cédula {row.base.cedula}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'programName',
        header: 'Programa',
        className: 'min-w-[160px]',
        render: (row: EnrichedPatientRow) => (
          row.base.programId ? (
            <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">
              {row.programName}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Sin programa</span>
          )
        ),
      },
      {
        key: 'status',
        header: 'Estado clínico',
        className: 'min-w-[150px]',
        render: (row: EnrichedPatientRow) => {
          const meta = STATUS_LABELS[row.status];
          return (
            <div className="flex flex-col gap-1">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[row.status]}`}>
                <Stethoscope className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <span className="text-[11px] text-slate-400">{meta.helper}</span>
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        header: 'Ingreso',
        className: 'min-w-[120px]',
        render: (row: EnrichedPatientRow) => (
          <span className="text-sm text-slate-600">
            {row.base.createdAt.toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ),
      },
    ],
    []
  );

  const chartBlocks = useMemo<ChartBlockConfig[]>(() => {
    const weightAverageLabel =
      detailData.averages.weight !== null ? `${detailData.averages.weight} kg` : 'sin datos';
    const glycemiaAverageLabel =
      detailData.averages.glycemia !== null ? `${detailData.averages.glycemia} mg/dL` : 'sin datos';
    const pulseAverageLabel =
      detailData.averages.pulse !== null ? `${detailData.averages.pulse} bpm` : 'sin datos';
    const pressureAverageLabel =
      detailData.averages.systolic !== null && detailData.averages.diastolic !== null
        ? `${detailData.averages.systolic}/${detailData.averages.diastolic} mmHg`
        : 'sin datos';

    return [
      {
        key: 'weight',
        title: `Peso corporal · promedio ${weightAverageLabel}`,
        data: detailData.weightSeries,
        dataKey: 'peso',
        colors: WEIGHT_COLOR,
        emptyHelper: 'No se han registrado pesos en el rango seleccionado.',
      },
      {
        key: 'pressure',
        title: `Presión arterial · promedio ${pressureAverageLabel}`,
        data: detailData.pressureSeries,
        dataKey: ['systolic', 'diastolic'],
        colors: BLOOD_PRESSURE_COLORS,
        emptyHelper: 'No se han registrado presiones arteriales en el rango seleccionado.',
      },
      {
        key: 'glycemia',
        title: `Glicemia · promedio ${glycemiaAverageLabel}`,
        data: detailData.glycemiaSeries,
        dataKey: 'glucosa',
        colors: GLYCEMIA_COLOR,
        emptyHelper: 'No se han registrado glicemias en el rango seleccionado.',
      },
      {
        key: 'pulse',
        title: `Pulso · promedio ${pulseAverageLabel}`,
        data: detailData.pulseSeries,
        dataKey: 'pulso',
        colors: PULSE_COLOR,
        emptyHelper: 'No se han registrado pulsos en el rango seleccionado.',
      },
    ];
  }, [detailData]);

  const renderSeriesCard = (block: ChartBlockConfig) => {
    if (!block.data.length) {
      return (
        <Card
          key={block.key}
          className="flex h-full flex-col items-center justify-center border-dashed border-slate-200 bg-slate-50/80 text-center text-sm text-slate-500"
        >
          <span className="font-semibold text-slate-600">{block.title}</span>
          <span className="mt-2 text-xs text-slate-500">{block.emptyHelper}</span>
        </Card>
      );
    }

    return (
      <Chart
        key={block.key}
        title={block.title}
        data={block.data}
        type="line"
        dataKey={block.dataKey}
        xAxisKey="fecha"
        colors={block.colors}
      />
    );
  };

  return (
    <section className="space-y-8 px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/30 bg-gradient-to-br from-[#EEF5FF] via-white to-[#FDF4FF] p-6 sm:p-8 shadow-[0_35px_85px_rgba(15,23,42,0.12)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.28),_transparent_60%)]"
        />
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#C7D2FE] opacity-40 blur-3xl" />
        <div aria-hidden="true" className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[#FBCFE8] opacity-30 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.55em] text-[#4F46E5]">
              Reportes clínicos
              <span className="h-1 w-1 rounded-full bg-[#4F46E5]" />
              Quantum
            </span>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Explora métricas reales de pacientes con filtros compartidos.
            </h1>
            <p className="text-sm text-slate-600 sm:text-base">
              Conecta el listado de pacientes con sus signos vitales, resultados instrumentales y exporta un resumen clínico con un clic.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1">
                <Users2 className="h-3.5 w-3.5 text-indigo-500" />
                {statusCounters.total}
                {' '}
                expedientes activos
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1">
                <HeartPulse className="h-3.5 w-3.5 text-sky-500" />
                Señales vitales conectadas
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                Reportes listos para exportar
              </span>
            </div>
          </div>
          <div className="grid w-full max-w-sm gap-4 sm:grid-cols-3 lg:max-w-xs">
            <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Activos</p>
              <p className="text-3xl font-semibold">{statusCounters['en-tratamiento']}</p>
              <span className="text-xs text-slate-500">Con programa vigente</span>
            </div>
            <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Seguimiento</p>
              <p className="text-3xl font-semibold">{statusCounters.seguimiento}</p>
              <span className="text-xs text-slate-500">Monitoreo clínico</span>
            </div>
            <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Alta</p>
              <p className="text-3xl font-semibold">{statusCounters.alta}</p>
              <span className="text-xs text-slate-500">Casos concluidos</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="space-y-6 border border-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-slate-800">
          <Filter className="h-4 w-4 text-indigo-500" />
          <h2 className="text-lg font-semibold text-slate-900">Filtros compartidos</h2>
          <p className="text-sm text-slate-500">
            Reutiliza los criterios de PatientManagement para analizar la misma cohorte de pacientes.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Búsqueda
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Nombre, correo o cédula"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
              />
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Programa
            <select
              value={selectedProgram}
              onChange={event => setSelectedProgram(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            >
              {programOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Estado
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Asignación
            <select
              value={assignmentFilter}
              onChange={event => setAssignmentFilter(event.target.value as typeof assignmentFilter)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">Todos</option>
              <option value="assigned">Con programa</option>
              <option value="unassigned">Sin programa</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Género
            <select
              value={genderFilter}
              onChange={event => setGenderFilter(event.target.value as typeof genderFilter)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">Todos</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Desde
            <input
              type="date"
              value={dateFilter.from}
              onChange={event => setDateFilter(prev => ({ ...prev, from: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Hasta
            <input
              type="date"
              value={dateFilter.to}
              onChange={event => setDateFilter(prev => ({ ...prev, to: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
            <Users2 className="h-3.5 w-3.5 text-indigo-500" />
            {filteredPatientCount}
            {' '}
            pacientes visibles
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Rango personalizado
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearDateFilter}
            disabled={!dateFilter.from && !dateFilter.to}
            className="ml-auto"
          >
            Limpiar fechas
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)]">
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pacientes</h2>
                <p className="text-sm text-slate-500">
                  {filteredPatientCount}
                  {' '}
                  de
                  {' '}
                  {totalPatients}
                  {' '}
                  registros visibles tras aplicar filtros.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  <Stethoscope className="h-3.5 w-3.5 text-indigo-500" />
                  {filteredProgramsCount}
                  {' '}
                  programas filtrados
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  <Activity className="h-3.5 w-3.5 text-emerald-500" />
                  {assignedProgramCount}
                  {' '}
                  con programa
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                  {awaitingAssignmentCount}
                  {' '}
                  por asignar
                </span>
              </div>
            </div>
            <div className="-mx-6 -mb-6">
              <Table
                data={filteredPatients}
                columns={columns}
                className="shadow-none ring-0 border border-slate-200"
                rowKey={row => row.id}
                onRowClick={row => setSelectedPatientId(row.id)}
                rowClassName={row => (row.id === selectedPatientId ? 'bg-indigo-50/70' : undefined)}
                initialRows={15}
              />
            </div>
          </Card>
        </div>
        <div ref={reportRef} className="space-y-6">
          {selectedPatient && selectedRow ? (
            <>
              <Card className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold text-indigo-600">
                      {selectedPatientFullName ? buildInitials(selectedPatientFullName) : '—'}
                    </span>
                    <div className="space-y-2">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{selectedPatientFullName}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{selectedPatient.email}</span>
                          {selectedPatient.cedula ? <span>· Cédula {selectedPatient.cedula}</span> : null}
                          <span>· {selectedProgramName}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[selectedRow.status]}`}>
                          <Stethoscope className="h-3.5 w-3.5" />
                          {STATUS_LABELS[selectedRow.status].label}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Último registro
                          {' '}
                          {lastMeasurementLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      void handleExportPdf();
                    }}
                    disabled={isExporting || isLoadingVitals || !detailData.totalMeasurements}
                    className="inline-flex items-center gap-2"
                  >
                    {isExporting ? (
                      <Sparkles className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isExporting ? 'Exportando…' : 'Exportar PDF'}
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Registros</p>
                    <p className="text-xl font-semibold text-slate-900">{detailData.totalMeasurements}</p>
                    <p className="text-xs text-slate-500">Observaciones totales</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Días con mediciones</p>
                    <p className="text-xl font-semibold text-slate-900">{detailData.uniqueObservationDays}</p>
                    <p className="text-xs text-slate-500">Actividad registrada</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Adherencia estimada</p>
                    <p className="text-xl font-semibold text-slate-900">{formatPercent(adherenceRatio)}</p>
                    <p className="text-xs text-slate-500">Lecturas registradas vs esperadas</p>
                  </div>
                  <div className={`rounded-xl border px-4 py-3 ${RISK_COLORS[risk.level]}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em]">Riesgo estimado</p>
                    <p className="text-xl font-semibold">{risk.level}</p>
                    <p className="text-xs font-medium">Puntaje {risk.score}/100</p>
                  </div>
                </div>

                {vitalsError ? (
                  <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    <AlertTriangle className="h-4 w-4" />
                    {vitalsError}
                  </div>
                ) : null}

                {isLoadingVitals ? (
                  <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
                    Cargando signos vitales del paciente…
                  </div>
                ) : null}

                {!isLoadingVitals && !vitalsError && detailData.totalMeasurements === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
                    No hay registros de signos vitales dentro del rango seleccionado.
                  </div>
                ) : null}

                <div className="grid gap-6 lg:grid-cols-2">
                  {chartBlocks.map(block => renderSeriesCard(block))}
                </div>
              </Card>

              {selectedPatientUserId !== null ? (
                <InstrumentResults
                  patientUserId={selectedPatientUserId}
                  titleOverride={selectedPatientFullName ? `Resultados instrumentales de ${selectedPatientFullName}` : undefined}
                  subtitleOverride="Integra los instrumentos clínicos completados para este expediente."
                  className="px-0 sm:px-0 lg:px-0"
                />
              ) : (
                <Card className="border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-600">
                  No se pudo determinar el usuario vinculado al paciente. Actualiza su ficha para consultar los resultados instrumentales.
                </Card>
              )}
            </>
          ) : (
            <Card className="flex h-full flex-col items-center justify-center border-dashed border-slate-200 bg-slate-50/70 text-center text-sm text-slate-600">
              Selecciona un paciente de la tabla para revisar sus signos vitales, riesgo clínico e instrumentos completados.
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};
