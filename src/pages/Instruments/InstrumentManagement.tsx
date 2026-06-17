import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp, InstrumentType } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
// import { usePermissions } from '../../hooks/usePermissions';
import { Instrument, Subject, Criterion } from '../../types';

type ResultDeliveryOption = 'sistema' | 'programado' | null;

type InstrumentFormState = {
  instrumentTypeId: string;
  subjectId: string;
  description: string;
  resource: string;
  availability: string;
  isActive: boolean;
  resultDelivery: ResultDeliveryOption;
  colorResponse: 0 | 1;
};

const RESOURCE_OPTIONS = ['Web/Movil', 'Web', 'Movil'] as const;
const AUDIENCE_OPTIONS = ['paciente', 'coach', 'terapeuta', 'coach-terapeuta'] as const;
const RESULT_DELIVERY_OPTIONS: { value: ResultDeliveryOption; label: string }[] = [
  { value: null, label: 'Ninguno' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'programado', label: 'Programado' },
];
const COLOR_RESPONSE_OPTIONS = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Sí' },
] as const;

const createEmptyInstrumentForm = (instrumentTypeId = '', subjectId = ''): InstrumentFormState => ({
  instrumentTypeId,
  subjectId,
  description: '',
  resource: RESOURCE_OPTIONS[0],
  availability: AUDIENCE_OPTIONS[0],
  isActive: true,
  resultDelivery: null,
  colorResponse: 0,
});

const TAB_ITEMS: Array<{ id: 'all' | 'themes' | 'criteria'; label: string; helper: string }> = [
  { id: 'all', label: 'Instrumentos', helper: 'Catálogo y plantillas' },
  { id: 'themes', label: 'Temas', helper: 'Organiza contenidos' },
  { id: 'criteria', label: 'Criterios', helper: 'Reglas de evaluación' },
];

const RESTRICTED_INSTRUMENT_TYPE_NAME = 'cuestionarios de la vieja medicina del futuro';

const normalizeInstrumentTypeName = (value: string) => value.trim().toLowerCase();

export const InstrumentManagement: React.FC = () => {
  const {
    instruments,
    patients,
    programs,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    instrumentTypes,
    assignInstrumentsBulk,
    createInstrumentType,
    updateInstrumentType,
    deleteInstrumentType,
  } = useApp();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'administrator';
  // const { user: currentUser, token } = useAuth();
  // const {
  //   canViewInstruments,
  //   canCreateInstruments,
  //   canUpdateInstruments,
  //   canDeleteInstruments,
  //   canAssignInstruments,
  // } = usePermissions();
  // const hasInstrumentManagementActions =
  //   canCreateInstruments || canUpdateInstruments || canDeleteInstruments || canAssignInstruments;
  // const isAdmin = currentUser?.role === 'administrator' || hasInstrumentManagementActions;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'themes' | 'criteria'>('all');
  const [searchTerm] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
  const [activeInstrumentType, setActiveInstrumentType] = useState<InstrumentType | null>(null);
  const [formData, setFormData] = useState<InstrumentFormState>(() => createEmptyInstrumentForm());
  const [instrumentError, setInstrumentError] = useState<string | null>(null);
  const [instrumentSaving, setInstrumentSaving] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [editingInstrumentType, setEditingInstrumentType] = useState<InstrumentType | null>(null);
  const [typeFormData, setTypeFormData] = useState<{ name: string; description: string; criterionId: string }>(() => ({
    name: '',
    description: '',
    criterionId: '',
  }));
  const [typeError, setTypeError] = useState<string | null>(null);
  const [typeSaving, setTypeSaving] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const getInstrumentFormDefaults = useCallback(
    (subjectId = '') =>
      createEmptyInstrumentForm(
        activeInstrumentType ? activeInstrumentType.id : '',
        subjectId,
      ),
    [activeInstrumentType],
  );

  const currentInstrumentTypeName = useMemo(() => {
    if (formData.instrumentTypeId) {
      const found = instrumentTypes.find((type) => type.id === formData.instrumentTypeId);
      if (found?.name) {
        return found.name;
      }
    }

    if (activeInstrumentType?.name) {
      return activeInstrumentType.name;
    }

    return null;
  }, [formData.instrumentTypeId, instrumentTypes, activeInstrumentType]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectFormData, setSubjectFormData] = useState<{ name: string; description: string; instrumentType: string }>(() => ({
    name: '',
    description: '',
    instrumentType: '',
  }));
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [criterionFormData, setCriterionFormData] = useState<{ name: string; description: string }>(() => ({
    name: '',
    description: '',
  }));
  const [criterionSaving, setCriterionSaving] = useState(false);
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
  const [bulkAssignError, setBulkAssignError] = useState<string | null>(null);
  const [bulkAssignResult, setBulkAssignResult] = useState<{
    requestedPairs: number;
    createdCount: number;
    failedCount: number;
    results: Array<{
      patientId: number | null;
      instrumentTypeId: number | null;
      status: 'created' | 'failed';
      assignmentId?: number;
      error?: string;
    }>;
  } | null>(null);
  const [bulkSelectedPatientIds, setBulkSelectedPatientIds] = useState<string[]>([]);
  const [bulkSelectedInstrumentIds, setBulkSelectedInstrumentIds] = useState<string[]>([]);
  const [bulkPatientSearch, setBulkPatientSearch] = useState('');
  const [bulkPatientProgram, setBulkPatientProgram] = useState<'all' | 'no-program' | string>('all');
  const [bulkPatientStatus, setBulkPatientStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [bulkPatientAssignment, setBulkPatientAssignment] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [bulkPatientGender, setBulkPatientGender] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [bulkThemeSearch, setBulkThemeSearch] = useState('');
  const [bulkInstrumentTypeFilter, setBulkInstrumentTypeFilter] = useState<'all' | string>('all');

  const restrictedInstrumentTypeIds = useMemo(() => {
    const ids = new Set<string>();
    instrumentTypes.forEach((type) => {
      if (normalizeInstrumentTypeName(type.name) === RESTRICTED_INSTRUMENT_TYPE_NAME) {
        ids.add(type.id);
      }
    });
    return ids;
  }, [instrumentTypes]);

  const visibleInstrumentTypes = useMemo(() => {
    if (isAdmin) return instrumentTypes;
    return instrumentTypes.filter((type) => !restrictedInstrumentTypeIds.has(type.id));
  }, [instrumentTypes, isAdmin, restrictedInstrumentTypeIds]);

  const visibleInstruments = useMemo(() => {
    if (isAdmin) return instruments;
    return instruments.filter((instrument) => !restrictedInstrumentTypeIds.has(instrument.instrumentTypeId ?? ''));
  }, [instruments, isAdmin, restrictedInstrumentTypeIds]);

  const filteredInstruments = visibleInstruments.filter((instrument) =>
    instrument.name.toLowerCase().includes(searchTerm.toLowerCase())
    || instrument.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTypes = visibleInstrumentTypes.filter((type) =>
    type.name.toLowerCase().includes(typeSearch.toLowerCase()),
  );

  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';

  const resourceAuthor = useMemo(() => {
    if (!currentUser) return null;
    const fullName = [currentUser.firstName, currentUser.lastName]
      .map((part) => (part ?? '').toString().trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) return fullName;
    return (currentUser.username ?? currentUser.email ?? '').toString().trim() || null;
  }, [currentUser]);

  const sortSubjects = useCallback((list: Subject[]) => {
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, []);

  const subjectNameById = useMemo(() => {
    const entries = new Map<string, string>();
    subjects.forEach((subject) => {
      entries.set(subject.id, subject.name);
    });
    return entries;
  }, [subjects]);

  const mapSubjectFromApi = useCallback((raw: any): Subject => ({
    id: String(raw?.id ?? ''),
    name: (raw?.nombre ?? raw?.name ?? '').toString(),
    description: raw?.descripcion ?? raw?.description ?? null,
    createdBy: raw?.user_created ?? raw?.userCreated ?? null,
    createdAt: raw?.created_at ? new Date(raw.created_at) : null,
    updatedAt: raw?.updated_at ? new Date(raw.updated_at) : null,
    instrumentType: raw?.tipo_instrumento ?? raw?.instrumentType ?? null,
    ribbonId: typeof raw?.id_cinta === 'number' ? raw.id_cinta : null,
  }), []);

  const sortCriteria = useCallback((list: Criterion[]) => {
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, []);

  const mapCriterionFromApi = useCallback((raw: any): Criterion => ({
    id: String(raw?.id ?? ''),
    name: (raw?.nombre ?? raw?.name ?? '').toString(),
    description: raw?.descripcion ?? raw?.description ?? null,
    createdBy: raw?.user_created ?? raw?.userCreated ?? null,
    createdAt: raw?.created_at ? new Date(raw.created_at) : null,
    updatedAt: raw?.updated_at ? new Date(raw.updated_at) : null,
  }), []);

  const criterionNameById = useMemo(() => {
    const entries = new Map<string, string>();
    criteria.forEach((criterion) => {
      entries.set(criterion.id, criterion.name);
    });
    return entries;
  }, [criteria]);

  const instrumentTypeNameById = useMemo(() => {
    const lookup = new Map<string, string>();
    visibleInstrumentTypes.forEach((item) => {
      lookup.set(item.id, item.name);
    });
    return lookup;
  }, [visibleInstrumentTypes]);

  const programOptions = useMemo(() => {
    const sortedPrograms = [...programs]
      .map((program) => ({ value: program.id, label: program.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));

    return [
      { value: 'all', label: 'Todos los programas' },
      { value: 'no-program', label: 'Sin programa asignado' },
      ...sortedPrograms,
    ];
  }, [programs]);

  const patientNameById = useMemo(() => {
    const lookup = new Map<string, string>();
    patients.forEach((patient) => {
      lookup.set(patient.id, `${patient.firstName} ${patient.lastName}`.trim());
    });
    return lookup;
  }, [patients]);

  const bulkFilteredPatients = useMemo(() => {
    const normalizedTerm = bulkPatientSearch.trim().toLowerCase();

    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const matchesTerm = !normalizedTerm
        || fullName.includes(normalizedTerm)
        || patient.firstName.toLowerCase().includes(normalizedTerm)
        || patient.lastName.toLowerCase().includes(normalizedTerm)
        || patient.email.toLowerCase().includes(normalizedTerm)
        || (patient.cedula?.toLowerCase().includes(normalizedTerm) ?? false);

      if (!matchesTerm) {
        return false;
      }

      const matchesProgram = bulkPatientProgram === 'all'
        ? true
        : bulkPatientProgram === 'no-program'
          ? !patient.programId
          : patient.programId === bulkPatientProgram;

      if (!matchesProgram) {
        return false;
      }

      const matchesStatus = bulkPatientStatus === 'all'
        ? true
        : bulkPatientStatus === 'active'
          ? patient.isActive
          : !patient.isActive;

      if (!matchesStatus) {
        return false;
      }

      const matchesAssignment = bulkPatientAssignment === 'all'
        ? true
        : bulkPatientAssignment === 'assigned'
          ? Boolean(patient.programId)
          : !patient.programId;

      if (!matchesAssignment) {
        return false;
      }

      const matchesGender = bulkPatientGender === 'all' ? true : patient.gender === bulkPatientGender;

      return matchesGender;
    });
  }, [patients, bulkPatientSearch, bulkPatientProgram, bulkPatientStatus, bulkPatientAssignment, bulkPatientGender]);

  const getInstrumentThemeName = useCallback((instrument: Instrument): string => {
    const themeFromSubject = instrument.subjectId ? subjectNameById.get(instrument.subjectId) : null;
    const fallbackTheme = instrument.subjectName ?? instrument.name ?? '';
    return (themeFromSubject ?? fallbackTheme ?? '').toString().trim();
  }, [subjectNameById]);

  const bulkFilteredInstruments = useMemo(() => {
    const normalizedTheme = bulkThemeSearch.trim().toLowerCase();
    const normalizedType = bulkInstrumentTypeFilter === 'all' ? '' : bulkInstrumentTypeFilter.trim().toLowerCase();

    return visibleInstruments.filter((instrument) => {
      const instrumentTypeId = instrument.instrumentTypeId ?? '';
      const instrumentTypeName = instrumentTypeNameById.get(instrumentTypeId) ?? '';
      const matchesType = !normalizedType || instrumentTypeName.toLowerCase().includes(normalizedType);
      if (!matchesType) {
        return false;
      }

      const themeName = getInstrumentThemeName(instrument).toLowerCase();
      const matchesTheme = !normalizedTheme || themeName.includes(normalizedTheme);
      return matchesTheme;
    });
  }, [visibleInstruments, instrumentTypeNameById, getInstrumentThemeName, bulkThemeSearch, bulkInstrumentTypeFilter]);

  const selectedInstrumentTypeIdsForBulk = useMemo(() => {
    return bulkSelectedInstrumentIds
      .map((instrumentId) => visibleInstruments.find((item) => item.id === instrumentId)?.instrumentTypeId ?? '')
      .filter((instrumentTypeId) => instrumentTypeId.length > 0);
  }, [bulkSelectedInstrumentIds, visibleInstruments]);

  const clearBulkAssignState = useCallback(() => {
    setBulkAssignLoading(false);
    setBulkAssignError(null);
    setBulkAssignResult(null);
    setBulkSelectedPatientIds([]);
    setBulkSelectedInstrumentIds([]);
    setBulkPatientSearch('');
    setBulkPatientProgram('all');
    setBulkPatientStatus('all');
    setBulkPatientAssignment('all');
    setBulkPatientGender('all');
    setBulkThemeSearch('');
    setBulkInstrumentTypeFilter('all');
  }, []);

  const toggleBulkPatient = useCallback((patientId: string) => {
    setBulkSelectedPatientIds((prev) => (
      prev.includes(patientId)
        ? prev.filter((id) => id !== patientId)
        : [...prev, patientId]
    ));
  }, []);

  const toggleBulkInstrument = useCallback((instrumentId: string) => {
    setBulkSelectedInstrumentIds((prev) => (
      prev.includes(instrumentId)
        ? prev.filter((id) => id !== instrumentId)
        : [...prev, instrumentId]
    ));
  }, []);

  const handleBulkAssignSubmit = useCallback(async () => {
    //     if (!isAdmin) {
    //   setBulkAssignError('Solo los administradores pueden asignar instrumentos por lote.');
    // if (!(currentUser?.role === 'administrator' || canAssignInstruments)) {
    //   setBulkAssignError('No tienes permisos para asignar instrumentos por lote.');
    //   return;
    // }

    if (!bulkSelectedPatientIds.length) {
      setBulkAssignError('Selecciona al menos un paciente.');
      return;
    }

    if (!bulkSelectedInstrumentIds.length) {
      setBulkAssignError('Selecciona al menos un instrumento.');
      return;
    }

    setBulkAssignError(null);
    setBulkAssignLoading(true);
    setBulkAssignResult(null);

    try {
      const result = await assignInstrumentsBulk({
        patientIds: bulkSelectedPatientIds,
        instrumentTypeIds: selectedInstrumentTypeIdsForBulk,
      });

      setBulkAssignResult(result);
    } catch (error: any) {
      setBulkAssignError(error?.message ?? 'No se pudo completar la asignación por lote.');
    } finally {
      setBulkAssignLoading(false);
    }
    }, [assignInstrumentsBulk, bulkSelectedInstrumentIds, bulkSelectedPatientIds, selectedInstrumentTypeIdsForBulk]);

    // }, [assignInstrumentsBulk, bulkSelectedInstrumentIds, bulkSelectedPatientIds, isAdmin, selectedInstrumentTypeIdsForBulk]);
  // }, [
  //   assignInstrumentsBulk,
  //   bulkSelectedInstrumentIds,
  //   bulkSelectedPatientIds,
  //   canAssignInstruments,
  //   currentUser?.role,
  //   selectedInstrumentTypeIdsForBulk,
  // ]);

  useEffect(() => {
    let cancelled = false;

    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      setSubjectsError(null);
      try {
        const res = await fetch(`${apiBase}/subjects`);
        if (!res.ok) {
          const message = `Failed to fetch subjects (status ${res.status})`;
          throw new Error(message);
        }

        const payload = await res.json();
        if (cancelled) return;

        const parsed = Array.isArray(payload)
          ? payload.map((item) => mapSubjectFromApi(item)).filter((item) => item.name)
          : [];
        setSubjects(sortSubjects(parsed));
      } catch (error: any) {
        if (cancelled) return;
        setSubjectsError(error?.message ?? 'Error loading subjects');
      } finally {
        if (!cancelled) {
          setSubjectsLoading(false);
        }
      }
    };

    fetchSubjects();

    return () => {
      cancelled = true;
    };
  }, [apiBase, mapSubjectFromApi, sortSubjects]);

  useEffect(() => {
    let cancelled = false;

    const fetchCriteria = async () => {
      setCriteriaLoading(true);
      setCriteriaError(null);
      try {
        const res = await fetch(`${apiBase}/criteria`);
        if (!res.ok) {
          const message = `Failed to fetch criteria (status ${res.status})`;
          throw new Error(message);
        }

        const payload = await res.json();
        if (cancelled) return;

        const parsed = Array.isArray(payload)
          ? payload.map((item) => mapCriterionFromApi(item)).filter((item) => item.name)
          : [];
        setCriteria(sortCriteria(parsed));
      } catch (error: any) {
        if (cancelled) return;
        setCriteriaError(error?.message ?? 'Error loading criteria');
      } finally {
        if (!cancelled) {
          setCriteriaLoading(false);
        }
      }
    };

    fetchCriteria();

    return () => {
      cancelled = true;
    };
  }, [apiBase, mapCriterionFromApi, sortCriteria]);

  const closeSubjectModal = useCallback(() => {
    setIsSubjectModalOpen(false);
    setEditingSubject(null);
    setSubjectFormData({ name: '', description: '', instrumentType: '' });
    setSubjectSaving(false);
    setSubjectsError(null);
  }, []);

  const closeCriterionModal = useCallback(() => {
    setIsCriterionModalOpen(false);
    setEditingCriterion(null);
    setCriterionFormData({ name: '', description: '' });
    setCriterionSaving(false);
    setCriteriaError(null);
  }, []);

  const closeInstrumentModal = useCallback(() => {
    setInstrumentSaving(false);
    setIsModalOpen(false);
    setEditingInstrument(null);
    setFormData(getInstrumentFormDefaults());
    setInstrumentError(null);
  }, [getInstrumentFormDefaults]);

  const closeTypeModal = useCallback(() => {
    setIsTypeModalOpen(false);
    setEditingInstrumentType(null);
    setTypeFormData({ name: '', description: '', criterionId: '' });
    setTypeError(null);
    setTypeSaving(false);
  }, []);

  const handleOpenTypeModal = useCallback((instrumentType?: InstrumentType) => {
    if (!isAdmin) {
      setTypeError('Solo los administradores pueden gestionar tipos de instrumento.');
      return;
    }
    if (instrumentType) {
      setEditingInstrumentType(instrumentType);
      setTypeFormData({
        name: instrumentType.name,
        description: instrumentType.description ?? '',
        criterionId: instrumentType.criterionId ?? '',
      });
    } else {
      setEditingInstrumentType(null);
      setTypeFormData({ name: '', description: '', criterionId: '' });
    }
    setTypeError(null);
    setIsTypeModalOpen(true);
  }, [isAdmin]);

  const handleTypeSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (typeSaving) return;
      if (!isAdmin) {
        setTypeError('Solo los administradores pueden gestionar tipos de instrumento.');
        return;
      }

      const trimmedName = typeFormData.name.trim();
      if (!trimmedName) {
        setTypeError('El nombre del tipo de instrumento es obligatorio');
        return;
      }

      const descriptionValue = typeFormData.description.trim();
      const criterionValue = typeFormData.criterionId.trim();

      const payload: {
        name: string;
        description: string | null;
        criterionId: string | null;
        createdBy?: string | null;
      } = {
        name: trimmedName,
        description: descriptionValue ? descriptionValue : null,
        criterionId: criterionValue ? criterionValue : null,
      };

      if (!editingInstrumentType && resourceAuthor) {
        payload.createdBy = resourceAuthor;
      }

      setTypeSaving(true);
      setTypeError(null);

      try {
        let result: InstrumentType;
        if (editingInstrumentType) {
          result = await updateInstrumentType(editingInstrumentType.id, payload);
        } else {
          result = await createInstrumentType(payload);
        }

        setActiveInstrumentType(result);
        setFormData((prev) => ({ ...prev, instrumentTypeId: result.id }));
        closeTypeModal();
      } catch (error: any) {
        setTypeError(error?.message ?? 'Error guardando el tipo de instrumento');
      } finally {
        setTypeSaving(false);
      }
    },
    [closeTypeModal, createInstrumentType, editingInstrumentType, isAdmin, resourceAuthor, typeFormData, typeSaving, updateInstrumentType],
  );

  const handleDeleteType = useCallback(
    async (instrumentType: InstrumentType) => {
      if (!isAdmin) {
        setTypeError('Solo los administradores pueden gestionar tipos de instrumento.');
        return;
      }
      if (!confirm(`¿Eliminar el tipo de instrumento "${instrumentType.name}"?`)) {
        return;
      }

      setTypeError(null);
      setDeletingTypeId(instrumentType.id);

      try {
        await deleteInstrumentType(instrumentType.id);
        if (activeInstrumentType?.id === instrumentType.id) {
          setActiveInstrumentType(null);
          setSelectedTypeInstruments(null);
          setShowAllInstrumentsTable(false);
          setFormData(getInstrumentFormDefaults());
        }
      } catch (error: any) {
        setTypeError(error?.message ?? 'Error eliminando el tipo de instrumento');
      } finally {
        setDeletingTypeId(null);
      }
    },
    [activeInstrumentType, deleteInstrumentType, getInstrumentFormDefaults, isAdmin],
  );

  const handleOpenSubjectModal = useCallback((subject?: Subject) => {
    if (!isAdmin) {
      setSubjectsError('Solo los administradores pueden gestionar temas.');
      return;
    }
    if (subject) {
      setEditingSubject(subject);
      setSubjectFormData({
        name: subject.name,
        description: subject.description ?? '',
        instrumentType: subject.instrumentType ?? '',
      });
    } else {
      setEditingSubject(null);
      setSubjectFormData({ name: '', description: '', instrumentType: '' });
    }
    setSubjectsError(null);
    setIsSubjectModalOpen(true);
  }, [isAdmin]);

  const handleOpenCriterionModal = useCallback((criterion?: Criterion) => {
    if (!isAdmin) {
      setCriteriaError('Solo los administradores pueden gestionar criterios.');
      return;
    }
    if (criterion) {
      setEditingCriterion(criterion);
      setCriterionFormData({
        name: criterion.name,
        description: criterion.description ?? '',
      });
    } else {
      setEditingCriterion(null);
      setCriterionFormData({ name: '', description: '' });
    }
    setCriteriaError(null);
    setIsCriterionModalOpen(true);
  }, [isAdmin]);

  const handleSubjectSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (subjectSaving) return;
    if (!isAdmin) {
      setSubjectsError('Solo los administradores pueden gestionar temas.');
      return;
    }

    const trimmedName = subjectFormData.name.trim();
    if (!trimmedName) {
      setSubjectsError('El nombre del tema es obligatorio');
      return;
    }

    const payload: Record<string, unknown> = {
      nombre: trimmedName,
      descripcion: subjectFormData.description.trim() ? subjectFormData.description.trim() : null,
      tipo_instrumento: subjectFormData.instrumentType ? subjectFormData.instrumentType : null,
    };

    if (!editingSubject && resourceAuthor) {
      payload.user_created = resourceAuthor;
    }

    setSubjectSaving(true);
    setSubjectsError(null);

    try {
      const endpoint = editingSubject ? `${apiBase}/subjects/${editingSubject.id}` : `${apiBase}/subjects`;
      const res = await fetch(endpoint, {
        method: editingSubject ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message = errorBody?.message ?? `No se pudo ${editingSubject ? 'actualizar' : 'crear'} el tema (status ${res.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const result = await res.json();
      const mapped = mapSubjectFromApi(result);

      setSubjects((prev) => {
        if (editingSubject) {
          const updated = prev.map((subject) => (subject.id === mapped.id ? mapped : subject));
          return sortSubjects(updated);
        }
        return sortSubjects([...prev, mapped]);
      });

      closeSubjectModal();
    } catch (error: any) {
      setSubjectsError(error?.message ?? 'Error guardando el tema');
    } finally {
      setSubjectSaving(false);
    }
  }, [apiBase, closeSubjectModal, editingSubject, isAdmin, mapSubjectFromApi, resourceAuthor, sortSubjects, subjectFormData, subjectSaving]);

  const handleCriterionSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (criterionSaving) return;
    if (!isAdmin) {
      setCriteriaError('Solo los administradores pueden gestionar criterios.');
      return;
    }

    const trimmedName = criterionFormData.name.trim();
    if (!trimmedName) {
      setCriteriaError('El nombre del criterio es obligatorio');
      return;
    }

    const payload: Record<string, unknown> = {
      nombre: trimmedName,
      descripcion: criterionFormData.description.trim() ? criterionFormData.description.trim() : null,
    };

    if (!editingCriterion && resourceAuthor) {
      payload.user_created = resourceAuthor;
    }

    setCriterionSaving(true);
    setCriteriaError(null);

    try {
      const endpoint = editingCriterion ? `${apiBase}/criteria/${editingCriterion.id}` : `${apiBase}/criteria`;
      const res = await fetch(endpoint, {
        method: editingCriterion ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message = errorBody?.message ?? `No se pudo ${editingCriterion ? 'actualizar' : 'crear'} el criterio (status ${res.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const result = await res.json();
      const mapped = mapCriterionFromApi(result);

      setCriteria((prev) => {
        if (editingCriterion) {
          const updated = prev.map((criterion) => (criterion.id === mapped.id ? mapped : criterion));
          return sortCriteria(updated);
        }
        return sortCriteria([...prev, mapped]);
      });

      closeCriterionModal();
    } catch (error: any) {
      setCriteriaError(error?.message ?? 'Error guardando el criterio');
    } finally {
      setCriterionSaving(false);
    }
  }, [apiBase, closeCriterionModal, criterionFormData, criterionSaving, editingCriterion, isAdmin, mapCriterionFromApi, resourceAuthor, sortCriteria]);

  const handleDeleteSubject = useCallback(async (subject: Subject) => {
    if (!isAdmin) {
      setSubjectsError('Solo los administradores pueden gestionar temas.');
      return;
    }
    if (!confirm(`¿Eliminar el tema "${subject.name}"?`)) {
      return;
    }

    setSubjectsError(null);
    try {
      const res = await fetch(`${apiBase}/subjects/${subject.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message = errorBody?.message ?? `No se pudo eliminar el tema (status ${res.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      setSubjects((prev) => prev.filter((item) => item.id !== subject.id));
    } catch (error: any) {
      setSubjectsError(error?.message ?? 'Error eliminando el tema');
    }
  }, [apiBase, isAdmin]);

  const handleDeleteCriterion = useCallback(async (criterion: Criterion) => {
    if (!isAdmin) {
      setCriteriaError('Solo los administradores pueden gestionar criterios.');
      return;
    }
    if (!confirm(`¿Eliminar el criterio "${criterion.name}"?`)) {
      return;
    }

    setCriteriaError(null);
    try {
      const res = await fetch(`${apiBase}/criteria/${criterion.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message = errorBody?.message ?? `No se pudo eliminar el criterio (status ${res.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      setCriteria((prev) => prev.filter((item) => item.id !== criterion.id));
    } catch (error: any) {
      setCriteriaError(error?.message ?? 'Error eliminando el criterio');
    }
  }, [apiBase, isAdmin]);

  const subjectColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        render: (subject: Subject) => (
          <span className="block max-w-[240px] whitespace-normal break-words leading-tight text-sm text-gray-900">
            {subject.name}
          </span>
        ),
      },
      {
        key: 'description',
        header: 'Descripción',
        render: (subject: Subject) => (
          <span className="block max-w-[240px] whitespace-normal break-words leading-tight text-sm text-gray-700">
            {subject.description ?? '—'}
          </span>
        ),
      },
      {
        key: 'instrumentType',
        header: 'Tipo de instrumento',
        render: (subject: Subject) => subject.instrumentType ?? '—',
      },
      {
        key: 'createdAt',
        header: 'Creado',
        render: (subject: Subject) =>
          subject.createdAt ? subject.createdAt.toLocaleDateString() : '—',
      },
      {
        key: 'createdBy',
        header: 'Creado por',
        render: (subject: Subject) => subject.createdBy ?? '—',
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (subject: Subject) => (
          <div className="flex space-x-2">
            {isAdmin ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleOpenSubjectModal(subject);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDeleteSubject(subject);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [handleDeleteSubject, handleOpenSubjectModal, isAdmin],
  );

  const criteriaColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Nombre',
      },
      {
        key: 'description',
        render: (criterion: Criterion) => criterion.description ?? '—',
      },
      {
        key: 'createdAt',
        header: 'Creado',
        render: (criterion: Criterion) =>
          criterion.createdAt ? criterion.createdAt.toLocaleDateString() : '—',
      },
      {
        key: 'createdBy',
        header: 'Creado por',
        render: (criterion: Criterion) => criterion.createdBy ?? '—',
      },
      isAdmin
        ? {
            key: 'actions',
            header: 'Acciones',
            render: (criterion: Criterion) => (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleOpenCriterionModal(criterion);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDeleteCriterion(criterion);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ),
          }
        : null,
    ].filter(Boolean),
    [handleDeleteCriterion, handleOpenCriterionModal, isAdmin],
  );

  const handleOpenModal = (instrument?: Instrument) => {
    if (!isAdmin) {
      return;
    }
    setInstrumentSaving(false);
    if (instrument) {
      setEditingInstrument(instrument);
      setFormData({
        instrumentTypeId: instrument.instrumentTypeId ?? (activeInstrumentType ? String(activeInstrumentType.id) : ''),
        subjectId: instrument.subjectId ?? '',
        description: instrument.description ?? '',
        resource: instrument.resource ?? 'Web/Movil',
        availability: instrument.availability ?? 'paciente',
        isActive: typeof instrument.isActive === 'boolean' ? instrument.isActive : true,
        resultDelivery: (instrument.resultDelivery ?? null) as ResultDeliveryOption,
        colorResponse: typeof instrument.colorResponse === 'number' ? (instrument.colorResponse === 1 ? 1 : 0) : 0,
      });
    } else {
      setEditingInstrument(null);
      setFormData(getInstrumentFormDefaults());
    }
    setInstrumentError(null);
    setIsModalOpen(true);
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (instrumentSaving) return;
    if (!isAdmin) {
      setInstrumentError('Solo los administradores pueden crear o editar instrumentos.');
      return;
    }

    setInstrumentError(null);

    const instrumentTypeId = formData.instrumentTypeId.trim();
    if (!instrumentTypeId) {
      setInstrumentError('Selecciona un tipo de instrumento.');
      return;
    }

    const subjectId = formData.subjectId.trim();
    if (!subjectId) {
      setInstrumentError('Selecciona un tema para asignar al instrumento.');
      return;
    }

    const subject = subjects.find((item) => item.id === subjectId);
    const nameFromSubject = subject?.name ?? editingInstrument?.name ?? 'Instrumento sin tema';

    const trimmedDescription = formData.description.trim();

    const payload: Omit<Instrument, 'id' | 'createdAt'> = {
      name: nameFromSubject,
      description: trimmedDescription || (editingInstrument?.description ?? ''),
      category: editingInstrument?.category ?? 'psychological',
      questions: editingInstrument?.questions ?? [],
      estimatedDuration: editingInstrument?.estimatedDuration ?? 0,
      isActive: formData.isActive,
      subjectId,
      availability: formData.availability,
      resource: formData.resource,
      instrumentTypeId,
      resultDelivery: formData.resultDelivery,
      colorResponse: formData.colorResponse,
    };

    setInstrumentSaving(true);
    try {
      if (editingInstrument) {
        await updateInstrument(editingInstrument.id, payload);
      } else {
        await addInstrument(payload);
      }
      closeInstrumentModal();
    } catch (error: any) {
      const message = error?.message ?? 'No se pudo guardar el instrumento. Inténtalo nuevamente.';
      setInstrumentError(message);
    } finally {
      setInstrumentSaving(false);
    }
  };

  const handleDelete = async (instrumentId: string) => {
    if (!isAdmin) {
      return;
    }
    if (!confirm('¿Seguro que deseas eliminar este instrumento?')) {
      return;
    }

    try {
      await deleteInstrument(instrumentId);
    } catch (error: any) {
      const message = error?.message ?? 'No se pudo eliminar el instrumento.';
      alert(message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (instrument: Instrument) => (
        <span className="block max-w-[240px] whitespace-normal break-words leading-tight text-sm text-gray-900">
          {instrument.name}
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Disponible',
      render: (instrument: Instrument) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-[#CBD5F5] to-[#A5B4FC] text-slate-800">
          {(instrument.availability ?? '').toString().trim() || (instrument.isActive ? 'Sí' : 'No')}
        </span>
      ),
    },
    {
      key: 'resource',
      header: 'Recurso',
      render: (instrument: Instrument) => (
        <span className="block max-w-[200px] whitespace-normal break-words text-sm text-gray-700">
          {instrument.resource ?? instrument.description ?? '—'}
        </span>
      ),
    },
    {
      key: 'questions',
      header: 'Questions',
      render: (instrument: Instrument) => instrument.questions.length,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (instrument: Instrument) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/instruments/${instrument.id}`);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {isAdmin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenModal(instrument);
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(instrument.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];
  const [showAllInstrumentsTable, setShowAllInstrumentsTable] = useState(false);
  const [selectedTypeInstruments, setSelectedTypeInstruments] = useState<Instrument[] | null>(null);
  const [loadingTypeInstruments, setLoadingTypeInstruments] = useState(false);

  // if (!canViewInstruments) {
  //   return (
  //     <section className="space-y-6 px-4 py-8 sm:px-8">
  //       <Card className="border border-red-200 bg-red-50" padding="lg">
  //         <p className="text-sm text-red-700">No tienes permisos para ver instrumentos.</p>
  //       </Card>
  //     </section>
  //   );
  // }

  useEffect(() => {
    if (isAdmin) return;

    if (activeInstrumentType && restrictedInstrumentTypeIds.has(activeInstrumentType.id)) {
      setActiveInstrumentType(null);
      setSelectedTypeInstruments(null);
      setFormData((prev) => ({ ...prev, instrumentTypeId: '' }));
    }

    if (
      bulkInstrumentTypeFilter !== 'all'
      && normalizeInstrumentTypeName(bulkInstrumentTypeFilter) === RESTRICTED_INSTRUMENT_TYPE_NAME
    ) {
      setBulkInstrumentTypeFilter('all');
    }

    setBulkSelectedInstrumentIds((prev) => {
      const visibleIds = new Set(visibleInstruments.map((instrument) => instrument.id));
      return prev.filter((id) => visibleIds.has(id));
    });
  }, [
    isAdmin,
    activeInstrumentType,
    restrictedInstrumentTypeIds,
    bulkInstrumentTypeFilter,
    visibleInstruments,
  ]);

  // decide which instruments to show in the table: selectedTypeInstruments overrides filteredInstruments
  const instrumentsToShow = useMemo(() => {
    const source = selectedTypeInstruments ?? filteredInstruments;
    const roleFilteredSource = isAdmin
      ? source
      : source.filter((instrument) => !restrictedInstrumentTypeIds.has(instrument.instrumentTypeId ?? ''));

    return [...roleFilteredSource].sort((a, b) => {
      const left = (a.subjectName ?? a.name ?? '').toString().trim();
      const right = (b.subjectName ?? b.name ?? '').toString().trim();
      return left.localeCompare(right, 'es', { sensitivity: 'base' });
    });
  }, [selectedTypeInstruments, filteredInstruments, isAdmin, restrictedInstrumentTypeIds]);

  return (
    <>
      <section className="space-y-8 from-[#E8ECF8] via-[#F7F8FD] to-[#DDE3F7] px-4 py-8 sm:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-white/50 bg-gradient-to-br from-[#FAF3CA] via-white to-[#8A8484] shadow-[0_35px_90px_rgba(15,23,42,0.16)]">
          <div aria-hidden className="absolute -top-10 right-6 h-52 w-52 rounded-full bg-[#E6E0DF]/80 blur-3xl" />
          <div aria-hidden className="absolute -bottom-12 left-8 h-52 w-52 rounded-full bg-[#E6E0DF]/70 blur-3xl" />
          <div className="relative flex flex-col gap-8 px-6 py-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-slate-700">
                Instrumentos
                <span className="h-1 w-1 rounded-full bg-slate-400" />
                Nexus
              </span>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">Centro de instrumentos inteligentes</h1>
                <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
                  Orquesta plantillas, criterios y temas en una consola translúcida que mantiene tu biblioteca diagnóstica precisa y lista para desplegarse.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1">Colaborativo</span>
                <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1">Modular</span>
                <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1">En tiempo real</span>
              </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
              {[{
                label: 'Tipos registrados',
                value: visibleInstrumentTypes.length,
                accent: 'from-[#1F2937] via-[#334155] to-[#475569]',
              },
              {
                label: 'Temas disponibles',
                value: subjects.length,
                accent: 'from-[#273449] via-[#39445A] to-[#6B7280]',
              },
              {
                label: 'Criterios activos',
                value: criteria.length,
                accent: 'from-[#111827] via-[#1F2937] to-[#475569]',
              }].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/60 bg-white/75 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                  <span className={`mt-2 inline-flex items-center rounded-full bg-gradient-to-r ${stat.accent} px-3 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white`}>Activo</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 border-t border-white/60 px-6 pb-6 pt-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Asigna uno o varios instrumentos a múltiples pacientes en un solo paso.
              </p>
              {/* {isAdmin ? ( */}
                <Button
                  onClick={() => {
                    clearBulkAssignState();
                    setIsBulkAssignModalOpen(true);
                  }}
                  className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Asignación por lote
                </Button>
              {/* ) : (
                <span className="text-xs text-slate-500">Solo administradores pueden usar asignación por lote.</span>
              )} */}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/50 bg-white/80 px-6 py-5 shadow-[0_25px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Vistas rápidas</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {TAB_ITEMS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={isActive}
                    className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40 ${
                      isActive
                        ? 'border-transparent bg-gradient-to-r from-[#1F2937] via-[#2F3B4C] to-[#4B5563] text-white shadow-lg shadow-[#1F2937]/35'
                        : 'border-white/60 bg-white/60 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-sm font-semibold">{tab.label}</span>
                    <span className={`block text-xs ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {tab.helper}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

  <Card className="border border-white/50 bg-white/85 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur" padding="lg">
        {!isAdmin && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Solo los administradores pueden crear, editar o eliminar instrumentos, tipos y temas.
          </div>
        )}
        {/* Tab content switch */}
  {activeTab === 'all' && (
          <div className="py-4">
            <h2 className="text-lg font-semibold mb-4">Tipos de instrumento</h2>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-xs w-full sm:w-auto">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar tipos..."
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  className="w-full rounded-3xl border border-white/60 bg-white/70 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              {isAdmin ? (
                <Button
                  onClick={() => handleOpenTypeModal()}
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo tipo
                </Button>
              ) : (
                <span className="text-xs text-slate-500">Acceso de solo lectura para tipos registrados.</span>
              )}
            </div>
            {typeError && !isTypeModalOpen && (
              <div className="mb-4 text-sm text-red-600">{typeError}</div>
            )}
            {filteredTypes.length === 0 ? (
              <p className="text-sm text-gray-600">No se encontraron tipos de instrumento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTypes.map((type) => {
                  const isSelected = activeInstrumentType?.id === type.id;
                  const criterionLabel = type.criterionId
                    ? criterionNameById.get(type.criterionId) ?? `Criterio ${type.criterionId}`
                    : null;

                  return (
                    <button
                      key={type.id}
                      type="button"
                      className={`group rounded-3xl border bg-white/70 p-4 text-left shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(15,23,42,0.18)] ${
                        isSelected ? 'border-transparent ring-2 ring-[#D1D5DB]' : 'border-white/60'
                      }`}
                      onClick={async () => {
                        setTypeError(null);
                        setActiveInstrumentType(type);
                        setFormData((prev) => ({
                          ...prev,
                          instrumentTypeId: type.id,
                        }));
                        setLoadingTypeInstruments(true);
                        try {
                          // const headers: Record<string, string> = {};
                          // if (token) {
                          //   headers.Authorization = `Bearer ${token}`;
                          // }

                          // const res = await fetch(`${(import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000'}/instruments/by-type/${type.id}`, { headers });
                          const res = await fetch(`${(import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000'}/instruments/by-type/${type.id}`);
                          const data = await res.json();
                          // map backend instrument -> frontend Instrument minimal mapping
                          const mapped: Instrument[] = Array.isArray(data)
                            ? data.map((ins: any) => {
                              const subjectId =
                                ins.id_tema ?? ins.tema_id ?? ins.temaId ?? ins.tema?.id ?? null;
                              const subjectNameFromList =
                                subjectId !== null && typeof subjectId !== 'undefined'
                                  ? subjectNameById.get(String(subjectId)) ?? null
                                  : null;
                              const subjectNameFromPayload =
                                ins.tema?.nombre ?? ins.tema?.name ?? ins.tema_nombre ?? null;
                              const themeName =
                                subjectNameFromList ??
                                (typeof subjectNameFromPayload === 'string'
                                  ? subjectNameFromPayload.trim()
                                  : null);

                              return {
                                id: String(ins.id),
                                name: themeName && themeName.length ? themeName : ins.descripcion ?? `Instrument ${ins.id}`,
                                description: ins.descripcion ?? '',
                                category: 'psychological',
                                questions: [],
                                estimatedDuration: Number.isFinite(Number(ins.duracion_estimada)) ? Number(ins.duracion_estimada) : 0,
                                isActive: typeof ins.activo !== 'undefined' ? Boolean(ins.activo) : true,
                                createdAt: ins.created_at ? new Date(ins.created_at) : new Date(),
                                instrumentTypeId: type.id,
                                subjectName: themeName && themeName.length ? themeName : null,
                                availability: ins.disponible ?? null,
                                resource: ins.recurso ?? null,
                                subjectId: subjectId !== null && typeof subjectId !== 'undefined' ? String(subjectId) : null,
                                resultDelivery: (ins.resultados ?? ins.resultados_por ?? ins.resultadosPor ?? null) as 'sistema' | 'programado' | null,
                                colorResponse: typeof ins.color_respuesta === 'number' ? (ins.color_respuesta === 1 ? 1 : 0) : 0,
                                createdBy: typeof ins.user_created === 'string' ? ins.user_created : null,
                                updatedAt: ins.updated_at ? new Date(ins.updated_at) : null,
                              };
                            })
                            : [];
                          setSelectedTypeInstruments(mapped);
                          setShowAllInstrumentsTable(true);
                        } catch (err) {
                          console.error('Failed to load instruments for type', err);
                          setSelectedTypeInstruments([]);
                          setShowAllInstrumentsTable(true);
                        } finally {
                          setLoadingTypeInstruments(false);
                        }
                      }}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                            {type.name || `Tipo ${type.id}`}
                          </h3>
                          {criterionLabel && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-gray-900/5 px-2 py-0.5 text-xs text-gray-600">
                              {criterionLabel}
                            </span>
                          )}
                        </div>
                        {isAdmin ? (
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleOpenTypeModal(type);
                              }}
                              disabled={typeSaving || deletingTypeId === type.id}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleDeleteType(type);
                              }}
                              disabled={deletingTypeId === type.id || typeSaving}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <p className="min-h-[48px] break-words text-sm text-slate-600">
                        {type.description ?? 'Sin descripción'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Creado por: {type.createdBy ?? 'system'}</span>
                        {type.createdAt ? (
                          <span>{type.createdAt.toLocaleDateString()}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                onClick={() => setShowAllInstrumentsTable((state) => !state)}
                className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5"
              >
                {showAllInstrumentsTable ? 'Ocultar tabla de instrumentos' : 'Ver tabla de instrumentos'}
              </Button>
              {activeInstrumentType ? (
                isAdmin ? (
                  <Button
                    onClick={() => handleOpenModal()}
                    disabled={subjects.length === 0}
                    className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar instrumento
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500">Solo los administradores pueden agregar instrumentos.</span>
                )
              ) : (
                <span className="text-xs text-gray-500">
                  Selecciona un tipo de instrumento para habilitar la creación.
                </span>
              )}
            </div>
            {showAllInstrumentsTable && (
              <div className="mt-4">
                {loadingTypeInstruments ? (
                  <div className="text-sm text-gray-600">Cargando instrumentos...</div>
                ) : (
                  <Table
                    data={instrumentsToShow}
                    columns={columns}
                    onRowClick={(instrument) => navigate(`/instruments/${instrument.id}`)}
                    rowKey={(instrument) => instrument.id}
                  />
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'themes' && (
          <div className="py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold">Temas</h2>
                <p className="text-sm text-gray-600">Listado de todos los temas disponibles en la plataforma.</p>
              </div>
              {isAdmin ? (
                <Button
                  onClick={() => handleOpenSubjectModal()}
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo tema
                </Button>
              ) : (
                <span className="text-xs text-slate-500">Solo lectura: contacta a un administrador para crear nuevos temas.</span>
              )}
            </div>
            {subjectsLoading && (
              <div className="text-sm text-gray-600 mb-4">Cargando temas...</div>
            )}
            {subjectsError && (
              <div className="text-sm text-red-600 mb-4">{subjectsError}</div>
            )}
            {!subjectsLoading && !subjectsError && subjects.length === 0 && (
              <div className="text-sm text-gray-600">No se encontraron temas registrados.</div>
            )}
            {subjects.length > 0 && (
              <Table
                data={subjects}
                columns={subjectColumns as any}
                rowKey={(subject) => subject.id}
              />
            )}
          </div>
        )}

        {activeTab === 'criteria' && (
          <div className="py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold">Criterios</h2>
                <p className="text-sm text-gray-600">Administración de criterios asociados a instrumentos y preguntas.</p>
              </div>
              {isAdmin ? (
                <Button onClick={() => handleOpenCriterionModal()} size="sm" className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo criterio
                </Button>
              ) : (
                <span className="text-xs text-slate-500">Solo los administradores pueden crear criterios.</span>
              )}
            </div>
            {criteriaLoading && (
              <div className="text-sm text-gray-600 mb-4">Cargando criterios...</div>
            )}
            {criteriaError && (
              <div className="text-sm text-red-600 mb-4">{criteriaError}</div>
            )}
            {!criteriaLoading && !criteriaError && criteria.length === 0 && (
              <div className="text-sm text-gray-600">No se encontraron criterios registrados.</div>
            )}
            {criteria.length > 0 && (
              <Table
                data={criteria}
                columns={criteriaColumns as any}
                rowKey={(criterion) => criterion.id}
              />
            )}
          </div>
        )}
      </Card>
      </section>

      <Modal
        isOpen={isBulkAssignModalOpen}
        onClose={() => {
          setIsBulkAssignModalOpen(false);
          clearBulkAssignState();
        }}
        title="Asignación por lote"
        size="xl"
      >
        <div className="space-y-6">
          {/* {!isAdmin && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              No tienes permisos para asignar instrumentos por lote.
            </div>
          )} */}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Pacientes</h3>
                <span className="text-xs text-slate-500">
                  Seleccionados: {bulkSelectedPatientIds.length}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bulkPatientSearch}
                    onChange={(event) => setBulkPatientSearch(event.target.value)}
                    placeholder="Buscar por nombre, correo o cédula"
                    className="w-full rounded-2xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <select
                  value={bulkPatientProgram}
                  onChange={(event) => setBulkPatientProgram(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {programOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkPatientStatus}
                  onChange={(event) => setBulkPatientStatus(event.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>

                <select
                  value={bulkPatientAssignment}
                  onChange={(event) => setBulkPatientAssignment(event.target.value as 'all' | 'assigned' | 'unassigned')}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">Todos (asignación)</option>
                  <option value="assigned">Con programa</option>
                  <option value="unassigned">Sin programa</option>
                </select>

                <select
                  value={bulkPatientGender}
                  onChange={(event) => setBulkPatientGender(event.target.value as 'all' | 'male' | 'female' | 'other')}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">Todos los géneros</option>
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Coincidencias: {bulkFilteredPatients.length}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkSelectedPatientIds(Array.from(new Set([...bulkSelectedPatientIds, ...bulkFilteredPatients.map((item) => item.id)])))}
                  >
                    Seleccionar filtro
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkSelectedPatientIds((prev) => prev.filter((id) => !bulkFilteredPatients.some((item) => item.id === id)))}
                  >
                    Limpiar filtro
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white">
                {bulkFilteredPatients.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">No hay pacientes que coincidan con los filtros.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {bulkFilteredPatients.map((patient) => {
                      const checked = bulkSelectedPatientIds.includes(patient.id);
                      return (
                        <li key={patient.id} className="px-4 py-3">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleBulkPatient(patient.id)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                            />
                            <span className="space-y-0.5">
                              <span className="block text-sm font-medium text-slate-900">
                                {patient.firstName} {patient.lastName}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {patient.email} · {patient.cedula ? `Cédula ${patient.cedula}` : 'Sin cédula'}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Instrumentos</h3>
                <span className="text-xs text-slate-500">
                  Seleccionados: {bulkSelectedInstrumentIds.length}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bulkThemeSearch}
                    onChange={(event) => setBulkThemeSearch(event.target.value)}
                    placeholder="Buscar por nombre de tema"
                    className="w-full rounded-2xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <select
                  value={bulkInstrumentTypeFilter}
                  onChange={(event) => setBulkInstrumentTypeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:col-span-2"
                >
                  <option value="all">Todos los tipos</option>
                  {visibleInstrumentTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Coincidencias: {bulkFilteredInstruments.length}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkSelectedInstrumentIds(Array.from(new Set([...bulkSelectedInstrumentIds, ...bulkFilteredInstruments.map((item) => item.id)])))}
                  >
                    Seleccionar filtro
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkSelectedInstrumentIds((prev) => prev.filter((id) => !bulkFilteredInstruments.some((item) => item.id === id)))}
                  >
                    Limpiar filtro
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white">
                {bulkFilteredInstruments.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">No hay instrumentos que coincidan con los filtros.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {bulkFilteredInstruments.map((instrument) => {
                      const checked = bulkSelectedInstrumentIds.includes(instrument.id);
                      const themeName = getInstrumentThemeName(instrument) || `Instrumento ${instrument.id}`;
                      const typeName = instrument.instrumentTypeId
                        ? (instrumentTypeNameById.get(instrument.instrumentTypeId) ?? `Tipo ${instrument.instrumentTypeId}`)
                        : 'Sin tipo';
                      return (
                        <li key={instrument.id} className="px-4 py-3">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleBulkInstrument(instrument.id)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                            />
                            <span className="space-y-1">
                              <span className="block text-sm font-medium text-slate-900">
                                {themeName}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {typeName}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Se crearán hasta {bulkSelectedPatientIds.length * bulkSelectedInstrumentIds.length} asignaciones
            ({bulkSelectedPatientIds.length} paciente(s) × {bulkSelectedInstrumentIds.length} instrumento(s)).
          </div>

          {bulkAssignError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {bulkAssignError}
            </div>
          )}

          {bulkAssignResult && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Solicitadas: <strong>{bulkAssignResult.requestedPairs}</strong>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
                  Creadas: <strong>{bulkAssignResult.createdCount}</strong>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Fallidas: <strong>{bulkAssignResult.failedCount}</strong>
                </div>
              </div>

              {bulkAssignResult.results.some((item) => item.status === 'failed') && (
                <div className="max-h-40 overflow-auto rounded-xl border border-red-100 bg-red-50/50 p-3 text-xs text-red-700">
                  {bulkAssignResult.results
                    .filter((item) => item.status === 'failed')
                    .map((item, index) => {
                      const patientId = item.patientId !== null ? String(item.patientId) : '';
                      const instrumentTypeId = item.instrumentTypeId !== null ? String(item.instrumentTypeId) : '';
                      const patientLabel = patientNameById.get(patientId) ?? `Paciente ${patientId || 'N/A'}`;
                      const instrumentLabel = instrumentTypeNameById.get(instrumentTypeId) ?? `Instrumento ${instrumentTypeId || 'N/A'}`;
                      return (
                        <p key={`${index}-${patientId}-${instrumentTypeId}`}>
                          {patientLabel} · {instrumentLabel}: {item.error ?? 'Error desconocido'}
                        </p>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBulkAssignModalOpen(false);
                clearBulkAssignState();
              }}
              disabled={bulkAssignLoading}
            >
              Cerrar
            </Button>
            {!bulkAssignResult && (
              <Button
                type="button"
                onClick={handleBulkAssignSubmit}
                disabled={ bulkAssignLoading}

                // disabled={!isAdmin || bulkAssignLoading}
                // disabled={!(currentUser?.role === 'administrator' || canAssignInstruments) || bulkAssignLoading}
              >
                {bulkAssignLoading ? 'Asignando...' : 'Asignar en lote'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeInstrumentModal}
        title={editingInstrument ? 'Editar instrumento' : 'Agregar instrumento'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAdmin && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              No tienes permisos para modificar instrumentos.
            </div>
          )}
          <fieldset disabled={!isAdmin || instrumentSaving} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tema asociado</label>
              <select
                required
                value={formData.subjectId}
                onChange={(event) => setFormData((prev) => ({ ...prev, subjectId: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="">Selecciona un tema</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {currentInstrumentTypeName && (
                <p className="mt-2 text-xs text-gray-500">
                  Tipo de instrumento seleccionado: {currentInstrumentTypeName}
                </p>
              )}
              {subjects.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">Debes crear al menos un tema antes de registrar un instrumento.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-gray-300 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Describe brevemente el instrumento"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disponible en</label>
              <select
                value={formData.resource}
                onChange={(event) => setFormData((prev) => ({ ...prev, resource: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {RESOURCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disponible para:</label>
              <select
                value={formData.availability}
                onChange={(event) => setFormData((prev) => ({ ...prev, availability: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Los resultados serán por:</label>
              <select
                value={formData.resultDelivery ?? ''}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    resultDelivery: event.target.value ? (event.target.value as Exclude<ResultDeliveryOption, null>) : null,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {RESULT_DELIVERY_OPTIONS.map((option) => (
                  <option key={option.value ?? 'none'} value={option.value ?? ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">¿Colores en la respuesta del instrumento?</label>
              <select
                value={String(formData.colorResponse)}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    colorResponse: event.target.value === '1' ? 1 : 0,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {COLOR_RESPONSE_OPTIONS.map((option) => (
                  <option key={option.value} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 bg-white/70 text-gray-600 focus:ring-gray-400"
                />
                <span>Activo</span>
              </label>
            </div>
          </fieldset>

          {instrumentError && (
            <div className="text-sm text-red-600">{instrumentError}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeInstrumentModal}
              disabled={instrumentSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isAdmin || instrumentSaving}>
              {instrumentSaving
                ? 'Guardando...'
                : editingInstrument
                  ? 'Actualizar instrumento'
                  : 'Crear instrumento'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isTypeModalOpen}
        onClose={closeTypeModal}
        title={editingInstrumentType ? 'Editar tipo de instrumento' : 'Nuevo tipo de instrumento'}
      >
        <form onSubmit={handleTypeSubmit} className="space-y-4">
          {!isAdmin && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              No tienes permisos para modificar tipos de instrumento.
            </div>
          )}
          <fieldset disabled={!isAdmin || typeSaving} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
              <input
                type="text"
                required
                value={typeFormData.name}
                onChange={(event) => setTypeFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Ingresa el nombre del tipo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={typeFormData.description}
                onChange={(event) => setTypeFormData((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Describe brevemente el tipo de instrumento"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Criterio asociado</label>
              <select
                value={typeFormData.criterionId}
                onChange={(event) => setTypeFormData((prev) => ({ ...prev, criterionId: event.target.value }))}
                className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="">Sin criterio</option>
                {criteria.map((criterion) => (
                  <option key={criterion.id} value={criterion.id}>
                    {criterion.name}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {typeError && (
            <div className="text-sm text-red-600">{typeError}</div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={closeTypeModal} disabled={typeSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isAdmin || typeSaving}>
              {typeSaving ? 'Guardando...' : editingInstrumentType ? 'Actualizar tipo' : 'Crear tipo'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCriterionModalOpen}
        onClose={closeCriterionModal}
        title={editingCriterion ? 'Editar criterio' : 'Agregar criterio'}
      >
        <form onSubmit={handleCriterionSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
            <input
              type="text"
              required
              value={criterionFormData.name}
              onChange={(event) => setCriterionFormData((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="Ingresa el nombre del criterio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <textarea
              value={criterionFormData.description}
              onChange={(event) => setCriterionFormData((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="Descripción breve del criterio"
            />
          </div>

          {criteriaError && (
            <div className="text-sm text-red-600">{criteriaError}</div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={closeCriterionModal} disabled={criterionSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criterionSaving}>
              {criterionSaving ? 'Guardando...' : editingCriterion ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isSubjectModalOpen}
        onClose={closeSubjectModal}
        title={editingSubject ? 'Editar tema' : 'Agregar tema'}
      >
        <form onSubmit={handleSubjectSubmit} className="space-y-4">
          {!isAdmin && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              No tienes permisos para modificar temas.
            </div>
          )}
          <fieldset disabled={!isAdmin || subjectSaving} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
              <input
                type="text"
                required
                value={subjectFormData.name}
                onChange={(event) => setSubjectFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Ingresa el nombre del tema"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={subjectFormData.description}
                onChange={(event) => setSubjectFormData((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Descripción breve del tema"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de instrumento</label>
              <select
                value={subjectFormData.instrumentType}
                onChange={(event) => setSubjectFormData((prev) => ({ ...prev, instrumentType: event.target.value }))}
                className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="">Selecciona un tipo (opcional)</option>
                {visibleInstrumentTypes.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name || `Tipo ${type.id}`}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {subjectsError && (
            <div className="text-sm text-red-600">{subjectsError}</div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={closeSubjectModal} disabled={subjectSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isAdmin || subjectSaving}>
              {subjectSaving ? 'Guardando...' : editingSubject ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};