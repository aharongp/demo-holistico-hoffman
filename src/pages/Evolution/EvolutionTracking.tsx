import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, TrendingUp, User, Heart, Scale, Droplets, RefreshCw } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Chart } from '../../components/Dashboard/Chart';
import { Modal } from '../../components/UI/Modal';
import { Table } from '../../components/UI/Table';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  Patient,
  PatientVitalsSummary,
  NumericVitalRecord,
  VitalSource,
} from '../../types';

const EMPTY_VALUE = 'N/A';

const SOURCE_LABELS: Record<VitalSource, string> = {
  consultation: 'Consulta',
  pulse: 'Pulso',
  glycemia: 'Glucemia',
  heart_rate: 'Frecuencia cardiaca',
};

const HEART_RATE_FIELDS = [
  { key: 'resting', label: 'Reposo' },
  { key: 'after5Minutes', label: '5 min' },
  { key: 'after10Minutes', label: '10 min' },
  { key: 'after15Minutes', label: '15 min' },
  { key: 'after30Minutes', label: '30 min' },
  { key: 'after45Minutes', label: '45 min' },
] as const;

const toNumeric = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveRecordedAt = (value: string | null): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const sortByRecordedAt = <T extends { recordedAt: string | null }>(records: T[]): T[] =>
  [...records].sort((a, b) => resolveRecordedAt(a.recordedAt) - resolveRecordedAt(b.recordedAt));

const formatDecimal = (value: number | null | undefined, digits = 0): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return EMPTY_VALUE;
  }
  return value.toFixed(digits);
};

const getBmiCategory = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return EMPTY_VALUE;
  }
  if (value < 18.5) return 'Bajo peso';
  if (value < 25) return 'Normal';
  if (value < 30) return 'Sobrepeso';
  return 'Obesidad';
};

const parseDateInput = (value: string, endOfDay: boolean): number | null => {
  if (!value) {
    return null;
  }
  const base = new Date(`${value}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  if (endOfDay) {
    base.setHours(23, 59, 59, 999);
  }
  return base.getTime();
};

export const EvolutionTracking: React.FC = () => {
  const { user, token } = useAuth();
  const { addEvolutionEntry, patients } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState('mood');
  const [formData, setFormData] = useState({
    mood: 5,
    energy: 5,
    weight: '',
    bloodSugar: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    pulse: '',
    heartRate: '',
    notes: '',
  });
  const [vitals, setVitals] = useState<PatientVitalsSummary | null>(null);
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const apiBase = useMemo(() => (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000', []);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
    []
  );
  const formatRecordedAt = useCallback(
    (value: string | null, index: number) => {
      if (value) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return dateFormatter.format(parsed);
        }
      }
      return `Registro ${index + 1}`;
    },
    [dateFormatter]
  );

  type SingleValuePoint = { label: string; value: number };
  type BloodPressurePoint = { label: string; systolic: number | null; diastolic: number | null };
  type BmiRow = { id: number; label: string; bmi: number | null; category: string; source: VitalSource };
  type HeartRateRow = {
    id: number;
    label: string;
    sessionType: string | null;
  } & {
    [K in (typeof HEART_RATE_FIELDS)[number]['key']]: number | null;
  };

  const isPatient = user?.role === 'patient' || user?.role === 'student';
  const isTherapist = ['administrator', 'trainer', 'therapist', 'doctor', 'coach'].includes(user?.role || '');

  const vitalsUrl = useMemo(() => {
    if (!token) {
      return null;
    }

    if (!isPatient && isTherapist && !selectedPatient) {
      return null;
    }

    if (selectedPatient) {
      if (selectedPatient.id) {
        return `${apiBase}/vitals/patient/${selectedPatient.id}`;
      }
      if (selectedPatient.userId) {
        return `${apiBase}/vitals/user/${selectedPatient.userId}`;
      }
      return null;
    }

    if (user?.id) {
      return `${apiBase}/vitals/user/${user.id}`;
    }

    return null;
  }, [apiBase, isPatient, isTherapist, selectedPatient?.id, selectedPatient?.userId, token, user?.id]);

  const dateFromTimestamp = useMemo(() => parseDateInput(dateFrom, false), [dateFrom]);
  const dateToTimestamp = useMemo(() => parseDateInput(dateTo, true), [dateTo]);

  const clearDateFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
  }, []);

  const fetchVitals = useCallback(
    async ({ signal }: { signal?: AbortSignal } = {}) => {
      if (!token || !vitalsUrl) {
        setVitals(null);
        setIsLoadingVitals(false);
        setVitalsError(null);
        return;
      }

      setIsLoadingVitals(true);
      setVitalsError(null);

      try {
        const res = await fetch(vitalsUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        if (!res.ok) {
          if (res.status === 404) {
            if (!signal?.aborted) {
              setVitals(null);
            }
            return;
          }

          const message =
            res.status === 401
              ? 'No autorizado para obtener los signos vitales.'
              : `Error ${res.status} al obtener los signos vitales.`;
          throw new Error(message);
        }

        const data = (await res.json()) as PatientVitalsSummary;
        if (!signal?.aborted) {
          setVitals(data);
        }
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        console.error('Failed to fetch vitals', error);
        setVitalsError(
          error instanceof Error
            ? error.message
            : 'No se pudieron obtener los signos vitales.'
        );
        setVitals(null);
      } finally {
        if (!signal?.aborted) {
          setIsLoadingVitals(false);
        }
      }
    },
    [token, vitalsUrl]
  );

  useEffect(() => {
    if (!vitalsUrl || !token) {
      setVitals(null);
      setIsLoadingVitals(false);
      return;
    }

    const controller = new AbortController();
    fetchVitals({ signal: controller.signal }).catch(error => {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Unexpected error fetching vitals', error);
    });

    return () => {
      controller.abort();
    };
  }, [fetchVitals, token, vitalsUrl]);

  const filterRecordsByDate = useCallback(
    <T extends { recordedAt: string | null }>(records: T[] | undefined): T[] => {
      if (!records?.length) {
        return [];
      }

      return records.filter(record => {
        const timestamp = resolveRecordedAt(record.recordedAt);

        if (dateFromTimestamp !== null && timestamp !== Number.NEGATIVE_INFINITY && timestamp < dateFromTimestamp) {
          return false;
        }

        if (dateToTimestamp !== null && timestamp !== Number.NEGATIVE_INFINITY && timestamp > dateToTimestamp) {
          return false;
        }

        return true;
      });
    },
    [dateFromTimestamp, dateToTimestamp]
  );

  const buildSingleSeries = useCallback(
    (records: NumericVitalRecord[] | undefined): SingleValuePoint[] => {
      if (!records?.length) {
        return [];
      }

      return sortByRecordedAt(records)
        .map((record, index) => {
          const value = toNumeric(record.value);
          if (value === null) {
            return null;
          }
          return {
            label: formatRecordedAt(record.recordedAt, index),
            value,
          };
        })
        .filter((item): item is SingleValuePoint => item !== null);
    },
    [formatRecordedAt]
  );

  const filteredWeightRecords = useMemo(() => filterRecordsByDate(vitals?.weight), [filterRecordsByDate, vitals?.weight]);
  const filteredPulseRecords = useMemo(() => filterRecordsByDate(vitals?.pulse), [filterRecordsByDate, vitals?.pulse]);
  const filteredGlycemiaRecords = useMemo(() => filterRecordsByDate(vitals?.glycemia), [filterRecordsByDate, vitals?.glycemia]);
  const filteredBloodPressureRecords = useMemo(
    () => filterRecordsByDate(vitals?.bloodPressure),
    [filterRecordsByDate, vitals?.bloodPressure]
  );
  const filteredBmiRecords = useMemo(() => filterRecordsByDate(vitals?.bodyMassIndex), [filterRecordsByDate, vitals?.bodyMassIndex]);
  const filteredHeartRateRecords = useMemo(
    () => filterRecordsByDate(vitals?.heartRateRecovery),
    [filterRecordsByDate, vitals?.heartRateRecovery]
  );

  const weightChartData = useMemo(() => buildSingleSeries(filteredWeightRecords), [buildSingleSeries, filteredWeightRecords]);
  const pulseChartData = useMemo(() => buildSingleSeries(filteredPulseRecords), [buildSingleSeries, filteredPulseRecords]);
  const glycemiaChartData = useMemo(() => buildSingleSeries(filteredGlycemiaRecords), [buildSingleSeries, filteredGlycemiaRecords]);

  const bloodPressureChartData = useMemo<BloodPressurePoint[]>(() => {
    if (!filteredBloodPressureRecords.length) {
      return [];
    }

    return sortByRecordedAt(filteredBloodPressureRecords)
      .map((record, index) => {
        const systolic = toNumeric(record.systolic);
        const diastolic = toNumeric(record.diastolic);
        if (systolic === null && diastolic === null) {
          return null;
        }
        return {
          label: formatRecordedAt(record.recordedAt, index),
          systolic,
          diastolic,
        };
      })
      .filter((item): item is BloodPressurePoint => item !== null);
  }, [filteredBloodPressureRecords, formatRecordedAt]);

  const bmiRows = useMemo<BmiRow[]>(() => {
    if (!filteredBmiRecords.length) {
      return [];
    }

    return sortByRecordedAt(filteredBmiRecords).map((record, index) => {
      const value = toNumeric(record.value);
      return {
        id: record.id,
        label: formatRecordedAt(record.recordedAt, index),
        bmi: value,
        category: getBmiCategory(value),
        source: record.source,
      };
    });
  }, [filteredBmiRecords, formatRecordedAt]);

  const heartRateRows = useMemo<HeartRateRow[]>(() => {
    if (!filteredHeartRateRecords.length) {
      return [];
    }

    return sortByRecordedAt(filteredHeartRateRecords).map((record, index) => ({
      id: record.id,
      label: formatRecordedAt(record.recordedAt, index),
      sessionType: record.sessionType,
      resting: toNumeric(record.resting),
      after5Minutes: toNumeric(record.after5Minutes),
      after10Minutes: toNumeric(record.after10Minutes),
      after15Minutes: toNumeric(record.after15Minutes),
      after30Minutes: toNumeric(record.after30Minutes),
      after45Minutes: toNumeric(record.after45Minutes),
    }));
  }, [filteredHeartRateRecords, formatRecordedAt]);

  const hasVitalsData = useMemo(
    () =>
      Boolean(
        weightChartData.length ||
          pulseChartData.length ||
          bloodPressureChartData.length ||
          glycemiaChartData.length ||
          bmiRows.length ||
          heartRateRows.length
      ),
    [
      bloodPressureChartData.length,
      bmiRows.length,
      glycemiaChartData.length,
      heartRateRows.length,
      pulseChartData.length,
      weightChartData.length,
    ]
  );

  const bmiColumns = useMemo(
    () => [
      { key: 'label', header: 'Fecha' },
      {
        key: 'bmi',
        header: 'BMI',
        render: (row: BmiRow) => formatDecimal(row.bmi, 1),
      },
  { key: 'category', header: 'Clasificacion' },
      {
        key: 'source',
        header: 'Origen',
        render: (row: BmiRow) => SOURCE_LABELS[row.source] ?? row.source,
      },
    ],
    []
  );

  const heartRateColumns = useMemo(() => {
    const metricColumns = HEART_RATE_FIELDS.map(field => ({
      key: field.key,
      header: field.label,
      render: (row: HeartRateRow) => formatDecimal(row[field.key], 0),
    }));

    return [
      { key: 'label', header: 'Fecha' },
      ...metricColumns,
      {
        key: 'sessionType',
  header: 'Tipo de sesion',
        render: (row: HeartRateRow) => row.sessionType || EMPTY_VALUE,
      },
    ];
  }, []);

  const calculateBMI = (weight: number, height: number = 1.7) => {
    return (weight / (height * height)).toFixed(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user) {
      const weight = parseFloat(formData.weight) || undefined;
      const bmi = weight ? parseFloat(calculateBMI(weight)) : undefined;
      
      addEvolutionEntry({
        patientId: user.id,
        date: new Date(),
        mood: formData.mood,
        energy: formData.energy,
        weight,
        bloodSugar: parseFloat(formData.bloodSugar) || undefined,
        bloodPressureSystolic: parseFloat(formData.bloodPressureSystolic) || undefined,
        bloodPressureDiastolic: parseFloat(formData.bloodPressureDiastolic) || undefined,
        pulse: parseFloat(formData.pulse) || undefined,
        bodyMassIndex: bmi,
        heartRate: parseFloat(formData.heartRate) || undefined,
        notes: formData.notes,
      });
    }
    
    setFormData({ 
      mood: 5, 
      energy: 5, 
      weight: '',
      bloodSugar: '',
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      pulse: '',
      heartRate: '',
      notes: '' 
    });
    setIsModalOpen(false);
  };

  const patientColumns = [
    {
      key: 'firstName',
      header: 'Patient Name',
      render: (patient: Patient) => `${patient.firstName} ${patient.lastName}`,
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'lastEntry',
      header: 'Last Entry',
      render: () => '2024-01-15', // Mock data
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (patient: Patient) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setSelectedPatient(patient)}
        >
          View Evolution
        </Button>
      ),
    },
  ];

  const healthTabs = [
    { id: 'mood', label: 'Mood & Energy', icon: TrendingUp },
    { id: 'weight', label: 'Weight', icon: Scale },
    { id: 'blood', label: 'Blood Metrics', icon: Droplets },
    { id: 'vitals', label: 'Vital Signs', icon: Heart },
  ];

  if (isTherapist && !selectedPatient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Patient Evolution Tracking</h1>
            <p className="text-sm sm:text-base text-gray-600">Monitor patient progress and evolution</p>
          </div>
        </div>

        <Card>
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Select Patient</h3>
          </div>
          <Table data={patients} columns={patientColumns} />
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            {selectedPatient && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPatient(null)}
              >
                ← Back to Patients
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {selectedPatient 
                ? `${selectedPatient.firstName} ${selectedPatient.lastName} - Evolution`
                : 'Evolution Tracking'
              }
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            {isPatient 
              ? 'Track your daily progress and wellbeing'
              : `Monitor ${selectedPatient?.firstName}'s progress and evolution`
            }
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end space-y-3">
          <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600" htmlFor="evolution-date-from">
                Desde
              </label>
              <input
                id="evolution-date-from"
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600" htmlFor="evolution-date-to">
                Hasta
              </label>
              <input
                id="evolution-date-to"
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearDateFilters}
              disabled={!dateFrom && !dateTo}
              className="self-end"
            >
              Limpiar
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchVitals()}
              disabled={!vitalsUrl || isLoadingVitals}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isLoadingVitals ? 'Actualizando' : 'Actualizar'}
            </Button>
            {isPatient && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            )}
          </div>
        </div>
      </div>

      {vitalsError && (
        <Card>
          <p className="text-sm text-red-600">{vitalsError}</p>
        </Card>
      )}

      {!vitalsError && !isLoadingVitals && !hasVitalsData && (
        <Card>
          <p className="text-sm text-gray-600">
            {selectedPatient
              ? 'No hay registros de signos vitales para este paciente.'
              : 'Todavia no hay registros de signos vitales.'}
          </p>
        </Card>
      )}

      {hasVitalsData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Chart
              title="Peso"
              data={weightChartData}
              type="line"
              dataKey="value"
              xAxisKey="label"
              colors={['#F59E0B']}
            />
            <Chart
              title="Pulso"
              data={pulseChartData}
              type="line"
              dataKey="value"
              xAxisKey="label"
              colors={['#EF4444']}
            />
            <Chart
              title="Presion arterial"
              data={bloodPressureChartData}
              type="line"
              dataKey={['systolic', 'diastolic']}
              xAxisKey="label"
              colors={['#2563EB', '#10B981']}
            />
            <Chart
              title="Glucemia"
              data={glycemiaChartData}
              type="line"
              dataKey="value"
              xAxisKey="label"
              colors={['#8B5CF6']}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <Card padding="sm" className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Indice de masa corporal (BMI)</h3>
                <p className="text-sm text-gray-600">Historial calculado desde los signos vitales registrados.</p>
              </div>
              {bmiRows.length ? (
                <Table
                  data={bmiRows}
                  columns={bmiColumns}
                  rowKey={(row) => row.id}
                  className="shadow-none ring-0 border border-gray-200"
                />
              ) : (
                <p className="text-sm text-gray-600">No hay calculos de BMI disponibles.</p>
              )}
            </Card>

            <Card padding="sm" className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Recuperacion de frecuencia cardiaca</h3>
                <p className="text-sm text-gray-600">Comparativo de la respuesta cardiaca durante las sesiones.</p>
              </div>
              {heartRateRows.length ? (
                <Table
                  data={heartRateRows}
                  columns={heartRateColumns}
                  rowKey={(row) => row.id}
                  className="shadow-none ring-0 border border-gray-200"
                />
              ) : (
                <p className="text-sm text-gray-600">No hay registros de recuperacion cardiaca disponibles.</p>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Add Entry Modal for Patients */}
      {isPatient && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Health Entry"
          size="lg"
        >
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
                {healthTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mood & Energy Tab */}
              {activeTab === 'mood' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mood Level (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.mood}
                      onChange={(e) => setFormData(prev => ({ ...prev, mood: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Very Low</span>
                      <span className="font-medium">Current: {formData.mood}</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Energy Level (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.energy}
                      onChange={(e) => setFormData(prev => ({ ...prev, energy: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Very Low</span>
                      <span className="font-medium">Current: {formData.energy}</span>
                      <span>High Energy</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Weight Tab */}
              {activeTab === 'weight' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="Enter your weight"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {formData.weight && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>BMI:</strong> {calculateBMI(parseFloat(formData.weight))} 
                        <span className="text-xs ml-2">(Based on average height of 1.7m)</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Blood Metrics Tab */}
              {activeTab === 'blood' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blood Sugar Level (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={formData.bloodSugar}
                      onChange={(e) => setFormData(prev => ({ ...prev, bloodSugar: e.target.value }))}
                      placeholder="Enter blood sugar level"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blood Pressure - Systolic (mmHg)
                      </label>
                      <input
                        type="number"
                        value={formData.bloodPressureSystolic}
                        onChange={(e) => setFormData(prev => ({ ...prev, bloodPressureSystolic: e.target.value }))}
                        placeholder="120"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blood Pressure - Diastolic (mmHg)
                      </label>
                      <input
                        type="number"
                        value={formData.bloodPressureDiastolic}
                        onChange={(e) => setFormData(prev => ({ ...prev, bloodPressureDiastolic: e.target.value }))}
                        placeholder="80"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vital Signs Tab */}
              {activeTab === 'vitals' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pulse (bpm)
                    </label>
                    <input
                      type="number"
                      value={formData.pulse}
                      onChange={(e) => setFormData(prev => ({ ...prev, pulse: e.target.value }))}
                      placeholder="Enter pulse rate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heart Rate (bpm)
                    </label>
                    <input
                      type="number"
                      value={formData.heartRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, heartRate: e.target.value }))}
                      placeholder="Enter heart rate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Notes - Available in all tabs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="How are you feeling today? Any significant events or observations..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};