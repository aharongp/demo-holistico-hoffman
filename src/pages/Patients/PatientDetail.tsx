import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Percent, AlertCircle, ListChecks, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Patient, Program, ProgramActivity, PatientPunctualityRecord, CreatePatientPunctualityInput } from '../../types';

type ActivitySelectionState = {
  punctuality: boolean;
  compliance: boolean;
  recordId: number | null;
};

type PunctualityFormState = {
  date: string;
  activitySelections: Record<string, ActivitySelectionState>;
};

const DAY_LABELS: Record<string, string> = {
  Mon: 'Lunes',
  Tue: 'Martes',
  Wed: 'Miércoles',
  Thu: 'Jueves',
  Fri: 'Viernes',
  Sat: 'Sábado',
  Sun: 'Domingo',
};

const DAY_CODE_SET = new Set(Object.keys(DAY_LABELS));

const DAY_CODE_MAP: Record<string, string> = {
  mon: 'Mon',
  monday: 'Mon',
  lunes: 'Mon',
  lun: 'Mon',
  tue: 'Tue',
  tuesday: 'Tue',
  martes: 'Tue',
  mar: 'Tue',
  wed: 'Wed',
  wednesday: 'Wed',
  miercoles: 'Wed',
  mie: 'Wed',
  thu: 'Thu',
  thursday: 'Thu',
  jueves: 'Thu',
  jue: 'Thu',
  fri: 'Fri',
  friday: 'Fri',
  viernes: 'Fri',
  vie: 'Fri',
  sat: 'Sat',
  saturday: 'Sat',
  sabado: 'Sat',
  sab: 'Sat',
  sun: 'Sun',
  sunday: 'Sun',
  domingo: 'Sun',
  dom: 'Sun',
};

const stripDiacritics = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeDayCode = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const base = stripDiacritics(trimmed).toLowerCase();
  if (!base) {
    return null;
  }

  if (DAY_CODE_MAP[base]) {
    return DAY_CODE_MAP[base];
  }

  const short = base.slice(0, 3);
  if (DAY_CODE_MAP[short]) {
    return DAY_CODE_MAP[short];
  }

  const canonical = `${base.charAt(0).toUpperCase()}${base.slice(1, 3)}`;
  if (DAY_CODE_SET.has(canonical)) {
    return canonical;
  }

  const fallback = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1, 3).toLowerCase()}`;
  if (DAY_CODE_SET.has(fallback)) {
    return fallback;
  }

  return null;
};

const getDayCodeFromDate = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const formatted = format(parsed, 'EEE');
  return normalizeDayCode(formatted);
};

const getActivityKey = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const getDateKey = (value: Date | string | null | undefined): string | null => {
  const parsed = toDateOrNull(value);
  if (!parsed) {
    return null;
  }
  return format(parsed, 'yyyy-MM-dd');
};

const resolveDayLabel = (code: string | null | undefined): string => {
  if (!code) {
    return 'Sin día asignado';
  }
  const normalized = code.trim();
  return DAY_LABELS[normalized as keyof typeof DAY_LABELS] ?? normalized;
};

const getRecordTimestamp = (record: PatientPunctualityRecord): number => {
  const candidate = record.date ?? record.createdAt ?? record.updatedAt;
  if (candidate instanceof Date) {
    const time = candidate.getTime();
    if (!Number.isNaN(time)) {
      return time;
    }
  }
  return 0;
};

const sortPunctualityRecords = (records: PatientPunctualityRecord[]): PatientPunctualityRecord[] =>
  [...records].sort((a, b) => {
    const diff = getRecordTimestamp(b) - getRecordTimestamp(a);
    if (diff !== 0) {
      return diff;
    }
    return (b.id ?? 0) - (a.id ?? 0);
  });

const formatRecordDate = (record: PatientPunctualityRecord): string => {
  const candidate = record.date ?? record.createdAt ?? record.updatedAt;
  if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
    return format(candidate, 'dd/MM/yyyy');
  }
  return 'Sin fecha';
};

export const PatientDetail: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const {
    patients,
    programs,
    getProgramDetails,
    getPatientPunctuality,
    createPatientPunctuality,
    updatePatientPunctuality,
  } = useApp();
  const { user } = useAuth();

  const isSelfService = user?.role === 'patient' || user?.role === 'student';

  const ownPatientRecord = useMemo(() => {
    if (!isSelfService || !user?.id) {
      return null;
    }
    return patients.find((candidate) => candidate.userId === user.id || candidate.id === user.id) ?? null;
  }, [isSelfService, patients, user?.id]);

  useEffect(() => {
    if (!isSelfService || !ownPatientRecord) {
      return;
    }

    if (!patientId || patientId !== ownPatientRecord.id) {
      navigate(`/patients/${ownPatientRecord.id}`, { replace: true });
    }
  }, [isSelfService, navigate, ownPatientRecord, patientId]);

  const patient: Patient | null = useMemo(() => {
    if (!patientId) {
      return null;
    }
    return patients.find((item) => item.id === patientId) ?? null;
  }, [patientId, patients]);

  const assignedProgram: Program | null = useMemo(() => {
    if (!patient?.programId) {
      return null;
    }
    return programs.find((program) => program.id === patient.programId) ?? null;
  }, [patient?.programId, programs]);

  const [programActivities, setProgramActivities] = useState<ProgramActivity[]>([]);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  const [punctualityRecords, setPunctualityRecords] = useState<PatientPunctualityRecord[]>([]);
  const [isLoadingPunctuality, setIsLoadingPunctuality] = useState(false);
  const [punctualityError, setPunctualityError] = useState<string | null>(null);

  const [formState, setFormState] = useState<PunctualityFormState>(() => ({
    date: format(new Date(), 'yyyy-MM-dd'),
    activitySelections: {},
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!patient?.programId) {
      setProgramActivities([]);
      setActivitiesError(null);
      return;
    }

    let cancelled = false;
    const loadProgramActivities = async () => {
      setIsLoadingActivities(true);
      setActivitiesError(null);
      try {
        const details = await getProgramDetails(patient.programId!);
        if (cancelled) return;
        setProgramActivities(details?.activities ?? []);
      } catch (error) {
        if (cancelled) return;
        console.error('No se pudieron cargar las actividades del programa', error);
        setActivitiesError('No se pudieron cargar las actividades asignadas. Intenta nuevamente.');
        setProgramActivities([]);
      } finally {
        if (!cancelled) {
          setIsLoadingActivities(false);
        }
      }
    };

    loadProgramActivities();

    return () => {
      cancelled = true;
    };
  }, [patient?.programId, getProgramDetails]);

  useEffect(() => {
    if (!patientId) {
      setPunctualityRecords([]);
      return;
    }

    let cancelled = false;
    const loadPunctualityRecords = async () => {
      setIsLoadingPunctuality(true);
      setPunctualityError(null);
      try {
        const records = await getPatientPunctuality(patientId);
        if (cancelled) return;
        setPunctualityRecords(sortPunctualityRecords(records));
      } catch (error) {
        if (cancelled) return;
        console.error('No se pudieron cargar los registros de puntualidad', error);
        setPunctualityError('No fue posible cargar la puntualidad registrada. Intenta nuevamente.');
      } finally {
        if (!cancelled) {
          setIsLoadingPunctuality(false);
        }
      }
    };

    loadPunctualityRecords();

    return () => {
      cancelled = true;
    };
  }, [patientId, getPatientPunctuality]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }),
    [],
  );

  const recordsByActivity = useMemo(() => {
    const map = new Map<string, PatientPunctualityRecord[]>();
    punctualityRecords.forEach((record) => {
      const key = getActivityKey(record.activity);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(record);
    });

    map.forEach((records, key) => {
      map.set(key, sortPunctualityRecords(records));
    });

    return map;
  }, [punctualityRecords]);

  const recordsByActivityDate = useMemo(() => {
    const map = new Map<string, PatientPunctualityRecord>();

    punctualityRecords.forEach((record) => {
      const activityKey = getActivityKey(record.activity);
      if (!activityKey) {
        return;
      }

      const dateKey = getDateKey(record.date ?? record.createdAt ?? record.updatedAt);
      if (!dateKey) {
        return;
      }

      const composedKey = `${activityKey}__${dateKey}`;
      const existing = map.get(composedKey);
      if (!existing || getRecordTimestamp(record) > getRecordTimestamp(existing)) {
        map.set(composedKey, record);
      }
    });

    return map;
  }, [punctualityRecords]);

  const selectedDayCode = useMemo(() => getDayCodeFromDate(formState.date), [formState.date]);

  const activitiesForSelectedDay = useMemo(() => {
    if (!programActivities.length || !selectedDayCode) {
      return [] as ProgramActivity[];
    }
    return programActivities.filter((activity) => normalizeDayCode(activity.day) === selectedDayCode);
  }, [programActivities, selectedDayCode]);

  const selectedDayLabel = selectedDayCode ? resolveDayLabel(selectedDayCode) : null;

  useEffect(() => {
    setFormState((prev) => {
      const nextSelections: Record<string, ActivitySelectionState> = {};
      let hasDifference = false;

      const targetDateKey = getDateKey(prev.date);
      const allowedIds = new Set<string>();

      activitiesForSelectedDay.forEach((activity) => {
        allowedIds.add(activity.id);
        const activityKey = getActivityKey(activity.name);
        const recordKey = targetDateKey ? `${activityKey}__${targetDateKey}` : null;
        const relatedRecord = recordKey ? recordsByActivityDate.get(recordKey) ?? null : null;
        const nextState: ActivitySelectionState = {
          punctuality: relatedRecord ? typeof relatedRecord.punctuality === 'number' && relatedRecord.punctuality >= 5 : false,
          compliance: relatedRecord ? typeof relatedRecord.compliance === 'number' && relatedRecord.compliance >= 5 : false,
          recordId: relatedRecord?.id ?? null,
        };

        nextSelections[activity.id] = nextState;

        const previousState = prev.activitySelections[activity.id];
        if (!previousState
          || previousState.recordId !== nextState.recordId
          || previousState.punctuality !== nextState.punctuality
          || previousState.compliance !== nextState.compliance) {
          hasDifference = true;
        }
      });

      const prevKeys = Object.keys(prev.activitySelections);
      if (!hasDifference) {
        if (prevKeys.length !== allowedIds.size) {
          hasDifference = true;
        } else {
          for (const key of prevKeys) {
            if (!allowedIds.has(key)) {
              hasDifference = true;
              break;
            }
          }
        }
      }

      if (!hasDifference) {
        return prev;
      }

      return {
        ...prev,
        activitySelections: nextSelections,
      };
    });
  }, [activitiesForSelectedDay, recordsByActivityDate, formState.date]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      date: value,
    }));
    setFormError(null);
    setFormSuccess(null);
  };

  const handleActivityToggle = (activityId: string, field: 'punctuality' | 'compliance') => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const checked = event.target.checked;
    setFormState((prev) => {
      const current = prev.activitySelections[activityId] ?? { punctuality: false, compliance: false, recordId: null };
      return {
        ...prev,
        activitySelections: {
          ...prev.activitySelections,
          [activityId]: {
            ...current,
            [field]: checked,
          },
        },
      };
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!patient || !patientId) {
      setFormError('Debes seleccionar un paciente válido.');
      return;
    }

    if (!formState.date.trim()) {
      setFormError('Selecciona la fecha de la actividad.');
      return;
    }

    const targetDateKey = getDateKey(formState.date);
    if (!targetDateKey) {
      setFormError('Selecciona una fecha válida.');
      return;
    }
    const operations: Array<
      | { kind: 'create'; payload: CreatePatientPunctualityInput }
      | { kind: 'update'; payload: CreatePatientPunctualityInput & { id: number } }
    > = [];

    activitiesForSelectedDay.forEach((activity) => {
      const selection = formState.activitySelections[activity.id] ?? {
        punctuality: false,
        compliance: false,
        recordId: null,
      };

      const activityKey = getActivityKey(activity.name);
      const recordKey = targetDateKey ? `${activityKey}__${targetDateKey}` : null;
      const existingRecord = recordKey ? recordsByActivityDate.get(recordKey) ?? null : null;

      const desiredPunctuality = selection.punctuality ? 5 : 0;
      const desiredCompliance = selection.compliance ? 5 : 0;

      if (existingRecord) {
        const currentPunctuality = typeof existingRecord.punctuality === 'number' ? existingRecord.punctuality : 0;
        const currentCompliance = typeof existingRecord.compliance === 'number' ? existingRecord.compliance : 0;

        if (currentPunctuality !== desiredPunctuality || currentCompliance !== desiredCompliance) {
          operations.push({
            kind: 'update',
            payload: {
              id: existingRecord.id,
              patientId: patient.id,
              activity: existingRecord.activity ?? activity.name,
              date: formState.date,
              punctuality: desiredPunctuality,
              compliance: desiredCompliance,
              evaluated: 0,
            },
          });
        }
      } else if (selection.punctuality || selection.compliance) {
        operations.push({
          kind: 'create',
          payload: {
            patientId: patient.id,
            activity: activity.name,
            date: formState.date,
            punctuality: desiredPunctuality,
            compliance: desiredCompliance,
            evaluated: 0,
          },
        });
      }
    });

    if (!operations.length) {
      setFormError('No hay cambios para registrar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdRecords: PatientPunctualityRecord[] = [];
      const updatedRecords: PatientPunctualityRecord[] = [];

      for (const operation of operations) {
        if (operation.kind === 'create') {
          const createdRecord = await createPatientPunctuality(operation.payload);
          createdRecords.push(createdRecord);
        } else {
          const updatedRecord = await updatePatientPunctuality(operation.payload);
          updatedRecords.push(updatedRecord);
        }
      }

      setPunctualityRecords((prev) => {
        const next = [...prev];

        updatedRecords.forEach((record) => {
          const index = next.findIndex((item) => item.id === record.id);
          if (index >= 0) {
            next[index] = record;
          } else {
            next.push(record);
          }
        });

        if (createdRecords.length) {
          next.push(...createdRecords);
        }

        return sortPunctualityRecords(next);
      });

      const successParts: string[] = [];
      if (createdRecords.length) {
        successParts.push(createdRecords.length === 1 ? '1 registro creado' : `${createdRecords.length} registros creados`);
      }
      if (updatedRecords.length) {
        successParts.push(updatedRecords.length === 1 ? '1 registro actualizado' : `${updatedRecords.length} registros actualizados`);
      }

      setFormSuccess(`Cambios guardados: ${successParts.join(' · ')}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo registrar la puntualidad. Intenta nuevamente.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!patientId || !patient) {
    if (isSelfService) {
      return (
        <section className="px-4 py-8 sm:px-8">
          <Card className="border border-amber-100 bg-white text-sm text-slate-600">
            <p>No pudimos localizar tu expediente de puntualidad. Solicita asistencia al equipo de soporte.</p>
          </Card>
        </section>
      );
    }

    return (
      <section className="px-4 py-8 sm:px-8">
        <Card className="border border-red-100 bg-white">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-semibold">Paciente no encontrado</p>
            </div>
            <p className="text-sm text-slate-600">
              No pudimos localizar la ficha del paciente solicitada. Verifica el enlace e intenta nuevamente.
            </p>
            <div>
              <Button variant="outline" onClick={() => navigate('/patients')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a pacientes
              </Button>
            </div>
          </div>
        </Card>
      </section>
    );
  }
  const punctualityColumns = useMemo(() => ([
    {
      key: 'activity',
      header: 'Actividad',
      render: (record: PatientPunctualityRecord) => record.activity ?? 'Sin actividad registrada',
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (record: PatientPunctualityRecord) => formatRecordDate(record),
    },
    {
      key: 'punctuality',
      header: 'Puntualidad',
      render: (record: PatientPunctualityRecord) => (typeof record.punctuality === 'number' && record.punctuality >= 5
        ? (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle className="h-4 w-4" /> Sí
          </span>
        )
        : (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <CheckCircle className="h-4 w-4 opacity-40" /> No
          </span>
        )),
    },
    {
      key: 'compliance',
      header: 'Cumplimiento',
      render: (record: PatientPunctualityRecord) => (typeof record.compliance === 'number' && record.compliance >= 5
        ? (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle className="h-4 w-4" /> Sí
          </span>
        )
        : (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <CheckCircle className="h-4 w-4 opacity-40" /> No
          </span>
        )),
    },
  ]), []);

  return (
    <section className="space-y-8 px-4 py-8 sm:px-8">
      {!isSelfService && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Button variant="outline" onClick={() => navigate('/patients')} className="border-none px-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a pacientes
          </Button>
          <span className="text-slate-400">/</span>
          <span className="font-medium text-slate-600">Ficha del paciente</span>
        </div>
      )}

      <Card className="border border-white/50 bg-white/90 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/80">Paciente</p>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-slate-500">
              {patient.email}
              {patient.cedula ? ` • ${patient.cedula}` : ''}
            </p>
          </div>
          {assignedProgram ? (
            <div className="rounded-3xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-violet-500">Programa asignado</p>
              <p className="text-base font-semibold text-violet-700">{assignedProgram.name}</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-amber-500">Programa pendiente</p>
              <p className="text-base font-semibold text-amber-700">Este paciente aún no tiene un programa asignado.</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="border border-white/50 bg-white/85 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/70">Registrar puntualidad</p>
            <h2 className="text-2xl font-semibold text-slate-900">Control diario</h2>
            <p className="text-sm text-slate-500">
              Selecciona la fecha y marca las actividades correspondientes para capturar puntualidad y cumplimiento del paciente.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            {patient.programId ? (
              <span className="font-semibold text-slate-700">ID del programa: {patient.programId}</span>
            ) : (
              <span>Asigna un programa para habilitar las actividades.</span>
            )}
          </div>
        </div>

        {activitiesError ? (
          <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{activitiesError}</span>
          </div>
        ) : isLoadingActivities ? (
          <p className="mt-6 text-sm text-slate-500">Cargando actividades...</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Fecha</label>
                <input
                  type="date"
                  value={formState.date}
                  onChange={handleDateChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
              <div className="flex h-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {selectedDayLabel
                  ? activitiesForSelectedDay.length
                    ? `Actividades para ${selectedDayLabel}: ${activitiesForSelectedDay.length}`
                    : `No hay actividades programadas para ${selectedDayLabel}.`
                  : 'Selecciona una fecha para ver las actividades del programa.'}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,auto)_auto_auto] items-center gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="flex h-full items-center">Actividad</span>
                <span className="flex h-full items-center justify-center">Hora</span>
                <span className="flex h-full items-center justify-center">Puntualidad</span>
                <span className="flex h-full items-center justify-center">Cumplimiento</span>
              </div>
              {activitiesForSelectedDay.length ? (
                activitiesForSelectedDay.map((activity) => {
                  const selection = formState.activitySelections[activity.id] ?? { punctuality: false, compliance: false, recordId: null };
                  return (
                    <div
                      key={activity.id}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(120px,auto)_auto_auto] items-center gap-20 border-t border-slate-200 pr-20 pl-4 py-3 text-sm text-slate-600"
                    >
                      <div className="flex min-h-[2.75rem] flex-col justify-center gap-1">
                        <p className="font-medium text-slate-800">{activity.name}</p>
                        {activity.description ? (
                          <p className="text-xs text-slate-500">{activity.description}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-center text-sm font-medium text-slate-700">
                        {activity.time ?? 'Sin hora'}
                      </div>
                      <label className="flex items-center justify-center">
                        <span className="sr-only">Puntualidad {activity.name}</span>
                        <input
                          type="checkbox"
                          checked={selection.punctuality}
                          onChange={handleActivityToggle(activity.id, 'punctuality')}
                          className="h-4 w-4 rounded border-slate-300 text-violet-500 focus:ring-violet-400 mr-4"
                        />
                      </label>
                      <label className="flex items-center justify-center">
                        <span className="sr-only">Cumplimiento {activity.name}</span>
                        <input
                          type="checkbox"
                          checked={selection.compliance}
                          onChange={handleActivityToggle(activity.id, 'compliance')}
                          className="h-4 w-4 rounded border-slate-300 text-violet-500 focus:ring-violet-400"
                        />
                      </label>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">
                  {selectedDayLabel
                    ? `No hay actividades programadas para ${selectedDayLabel}.`
                    : 'Selecciona una fecha para ver las actividades del programa.'}
                </div>
              )}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {formSuccess && <p className="text-sm text-emerald-600">{formSuccess}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !activitiesForSelectedDay.length}>
                {isSubmitting ? 'Guardando...' : 'Registrar puntualidad'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="border border-white/50 bg-white/85 backdrop-blur-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/70">Historial de puntualidad</p>
            <h2 className="text-2xl font-semibold text-slate-900">Registros guardados</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            {punctualityRecords.length === 1
              ? '1 registro total'
              : `${punctualityRecords.length} registros totales`}
          </div>
        </div>

        {punctualityError && (
          <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{punctualityError}</span>
          </div>
        )}

        {isLoadingPunctuality ? (
          <p className="mt-6 text-sm text-slate-500">Cargando registros de puntualidad...</p>
        ) : punctualityRecords.length ? (
          <div className="mt-6">
            <Table
              data={punctualityRecords}
              columns={punctualityColumns}
              rowKey={(record) => record.id}
              initialRows={10}
              loadMoreStep={10}
            />
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Aún no se registran puntualidades para este paciente. Usa el formulario para crear el primer registro.
          </div>
        )}
      </Card>

      <Card className="border border-white/50 bg-white/85 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/70">Actividades del programa</p>
            <h2 className="text-2xl font-semibold text-slate-900">Detalle de actividades</h2>
            <p className="text-sm text-slate-500">
              Consulta un resumen de cada actividad con su información programada y el estado de cumplimiento registrado.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            {patient.programId ? (
              <span className="font-semibold text-slate-700">Programa {patient.programId}</span>
            ) : (
              <span>Asigna un programa para ver la lista de actividades.</span>
            )}
          </div>
        </div>

        {activitiesError ? (
          <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{activitiesError}</span>
          </div>
        ) : isLoadingActivities ? (
          <p className="mt-6 text-sm text-slate-500">Cargando actividades...</p>
        ) : programActivities.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {programActivities.map((activity) => {
              const activityKey = getActivityKey(activity.name);
              const records = recordsByActivity.get(activityKey) ?? [];
              const latestRecord = records[0] ?? null;
              const punctualCount = records.filter((record) => typeof record.punctuality === 'number' && record.punctuality >= 5).length;
              const punctualRate = records.length ? Math.round((punctualCount / records.length) * 100) : null;

              return (
                <div key={activity.id} className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900">{activity.name}</h3>
                    <p className="text-sm text-slate-500">{activity.description || 'Sin descripción registrada.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {activity.day && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                        <Calendar className="h-3.5 w-3.5" /> {resolveDayLabel(activity.day)}
                      </span>
                    )}
                    {activity.time && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                        <Clock className="h-3.5 w-3.5" /> {activity.time}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                      <ListChecks className="h-3.5 w-3.5" />
                      {records.length === 1 ? '1 registro' : `${records.length} registros`}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 text-xs text-slate-500">
                    {latestRecord ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${typeof latestRecord.punctuality === 'number' && latestRecord.punctuality >= 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Clock className="h-3.5 w-3.5" /> Último registro: {typeof latestRecord.punctuality === 'number' && latestRecord.punctuality >= 5 ? 'Puntual' : 'No puntual'} · {formatRecordDate(latestRecord)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">Sin registros de puntualidad</span>
                    )}
                    {latestRecord && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${typeof latestRecord.compliance === 'number' && latestRecord.compliance >= 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <CheckCircle className="h-3.5 w-3.5" /> Cumplimiento: {typeof latestRecord.compliance === 'number' && latestRecord.compliance >= 5 ? 'Sí' : 'No'}
                      </span>
                    )}
                    {records.length ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-violet-600">
                        <Percent className="h-3.5 w-3.5" /> Puntuales: {punctualCount}/{records.length}{typeof punctualRate === 'number' ? ` (${numberFormatter.format(punctualRate)}%)` : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            {patient.programId
              ? 'Este programa aún no tiene actividades configuradas.'
              : 'Asigna un programa para visualizar las actividades.'}
          </div>
        )}
      </Card>
    </section>
  );
};
