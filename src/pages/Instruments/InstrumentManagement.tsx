import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Instrument, Subject, Criterion, InstrumentType } from '../../types';

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

export const InstrumentManagement: React.FC = () => {
  const {
    instruments,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    instrumentTypes,
    createInstrumentType,
    updateInstrumentType,
    deleteInstrumentType,
  } = useApp();
  const { user: currentUser } = useAuth();
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

  const filteredInstruments = instruments.filter(instrument =>
    instrument.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instrument.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTypes = instrumentTypes.filter((type) =>
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
  }, []);

  const handleTypeSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (typeSaving) return;

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
    [closeTypeModal, createInstrumentType, editingInstrumentType, resourceAuthor, typeFormData, typeSaving, updateInstrumentType],
  );

  const handleDeleteType = useCallback(
    async (instrumentType: InstrumentType) => {
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
    [activeInstrumentType, deleteInstrumentType, getInstrumentFormDefaults],
  );

  const handleOpenSubjectModal = useCallback((subject?: Subject) => {
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
  }, []);

  const handleOpenCriterionModal = useCallback((criterion?: Criterion) => {
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
  }, []);

  const handleSubjectSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (subjectSaving) return;

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
  }, [apiBase, closeSubjectModal, editingSubject, mapSubjectFromApi, resourceAuthor, sortSubjects, subjectFormData, subjectSaving]);

  const handleCriterionSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (criterionSaving) return;

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
  }, [apiBase, closeCriterionModal, criterionFormData, criterionSaving, editingCriterion, mapCriterionFromApi, resourceAuthor, sortCriteria]);

  const handleDeleteSubject = useCallback(async (subject: Subject) => {
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
  }, [apiBase]);

  const handleDeleteCriterion = useCallback(async (criterion: Criterion) => {
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
  }, [apiBase]);

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
          </div>
        ),
      },
    ],
    [handleDeleteSubject, handleOpenSubjectModal],
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
      {
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
      },
    ],
    [handleDeleteCriterion, handleOpenCriterionModal],
  );

  const handleOpenModal = (instrument?: Instrument) => {
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
        </div>
      ),
    },
  ];
  const [showAllInstrumentsTable, setShowAllInstrumentsTable] = useState(false);
  const [selectedTypeInstruments, setSelectedTypeInstruments] = useState<Instrument[] | null>(null);
  const [loadingTypeInstruments, setLoadingTypeInstruments] = useState(false);

  // decide which instruments to show in the table: selectedTypeInstruments overrides filteredInstruments
  const instrumentsToShow = selectedTypeInstruments ?? filteredInstruments;

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
                value: instrumentTypes.length,
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
              <Button
                onClick={() => handleOpenTypeModal()}
                size="sm"
                className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo tipo
              </Button>
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
                <Button
                  onClick={() => handleOpenModal()}
                  disabled={subjects.length === 0}
                  className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar instrumento
                </Button>
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
              <Button
                onClick={() => handleOpenSubjectModal()}
                size="sm"
                className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo tema
              </Button>
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
              <Button onClick={() => handleOpenCriterionModal()} size="sm" className="rounded-full bg-gradient-to-r from-[#1F2937] via-[#303A4A] to-[#4B5563] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:translate-y-0.5">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo criterio
              </Button>
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
        isOpen={isModalOpen}
        onClose={closeInstrumentModal}
        title={editingInstrument ? 'Editar instrumento' : 'Agregar instrumento'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" disabled={instrumentSaving}>
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

          {typeError && (
            <div className="text-sm text-red-600">{typeError}</div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={closeTypeModal} disabled={typeSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={typeSaving}>
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
              {instrumentTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name || `Tipo ${type.id}`}
                </option>
              ))}
            </select>
          </div>

          {subjectsError && (
            <div className="text-sm text-red-600">{subjectsError}</div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={closeSubjectModal} disabled={subjectSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={subjectSaving}>
              {subjectSaving ? 'Guardando...' : editingSubject ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};