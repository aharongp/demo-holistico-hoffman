import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ArrowRight } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp } from '../../context/AppContext';
import { Program } from '../../types';
// useState and useEffect imported from React above

export const ProgramManagement: React.FC = () => {
  const { programs: ctxPrograms, addProgram, updateProgram, deleteProgram, instruments } = useApp();
  const [programs, setPrograms] = useState<Program[]>(ctxPrograms);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instruments: [] as string[],
  });
  const navigate = useNavigate();
  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';

  const filteredPrograms = programs.filter(program =>
    (program.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (program.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (program?: Program) => {
    if (program) {
      setEditingProgram(program);
      setFormData({
        name: program.name,
        description: program.description,
        instruments: Array.isArray(program.instruments) ? [...program.instruments] : [],
      });
    } else {
      setEditingProgram(null);
      setFormData({
        name: '',
        description: '',
        instruments: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const programPayload = {
      ...formData,
      isActive: true,
    };

    try {
      if (editingProgram) {
        const updated = await updateProgram(editingProgram.id, programPayload);
        if (updated) {
          setPrograms(prev => prev.map(p =>
            p.id === editingProgram.id
              ? { ...p, ...updated, instruments: programPayload.instruments }
              : p
          ));
          alert('Programa actualizado correctamente.');
        } else {
          alert('No se pudo actualizar el programa.');
          return;
        }
      } else {
        const created = await addProgram(programPayload);
        setPrograms(prev => [...prev, { ...created, instruments: programPayload.instruments }]);
        alert('Programa creado correctamente.');
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('No se pudo guardar el programa', error);
      alert('No se pudo guardar el programa. Intenta nuevamente.');
    }
  };

  const handleDelete = async (programId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este programa?')) {
      return;
    }

    try {
      const deleted = await deleteProgram(programId);
      if (deleted) {
        setPrograms(prev => prev.filter(p => p.id !== programId));
        alert('Programa eliminado correctamente.');
      } else {
        alert('El programa no se pudo eliminar.');
      }
    } catch (error) {
      console.error('No se pudo eliminar el programa', error);
      alert('No se pudo eliminar el programa.');
    }
  };

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await fetch(`${apiBase}/programs`);
        if (!res.ok) {
          throw new Error(`Failed to fetch programs (${res.status})`);
        }

        const data = await res.json();
        const mapped: Program[] = (data || []).map((p: any) => {
          const createdAt = p.created_at ? new Date(p.created_at) : new Date();
          const updatedAt = p.updated_at ? new Date(p.updated_at) : (p.updatedAt ? new Date(p.updatedAt) : createdAt);
          return {
            id: String(p.id),
            name: p.nombre ?? p.name ?? '',
            description: p.descripcion ?? p.description ?? '',
            instruments: Array.isArray(p.instruments) ? p.instruments.map(String) : [],
            isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
            createdAt,
            updatedAt,
            createdBy: p.user_created ?? p.userCreated ?? null,
          };
        });
        setPrograms(mapped);
      } catch (error) {
        console.error('Failed to load programs from API, using context fallback.', error);
        setPrograms(ctxPrograms);
      }
    };

    void loadPrograms();
  }, [apiBase, ctxPrograms]);

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (program: Program) => (
        <span className="truncate max-w-xs">{program.description}</span>
      ),
    },
    {
      key: 'instruments',
      header: 'Instrumentos',
      render: (program: Program) => program.instruments.length,
    },
    {
      key: 'createdBy',
      header: 'Creado por',
      render: (program: Program) => program.createdBy ?? '—',
    },
    {
      key: 'updatedAt',
      header: 'Última actualización',
      render: (program: Program) => program.updatedAt ? program.updatedAt.toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (program: Program) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenModal(program);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(program.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleRowClick = (program: Program) => {
    navigate(`/programs/${program.id}`);
  };

  const totalPrograms = programs.length;
  const linkedInstrumentCount = instruments.length;
  const lastUpdatedLabel = useMemo(() => {
    const timestamps = programs
      .map(program => program.updatedAt?.getTime() ?? program.createdAt?.getTime())
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (!timestamps.length) {
      return 'Sin registros';
    }
    return new Date(Math.max(...timestamps)).toLocaleDateString();
  }, [programs]);

  return (
    <section className="space-y-6 px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/35 bg-gradient-to-br from-[#E0F2FE] via-white to-[#F5F3FF] shadow-[0_40px_95px_rgba(15,23,42,0.18)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
        <div aria-hidden className="absolute -top-10 right-6 h-48 w-48 rounded-full bg-[#C7D2FE] opacity-50 blur-3xl" />
        <div aria-hidden className="absolute -bottom-12 left-4 h-56 w-56 rounded-full bg-[#99F6E4] opacity-40 blur-3xl" />
        <div className="relative flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.5em] text-[#0F172A]">
              Programas
              <span className="h-1 w-1 rounded-full bg-[#22D3EE]" />
              Orbital
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-900">Centro de programas</h1>
              <p className="text-sm text-slate-600 sm:text-base">
                Diseña, supervisa y conecta planes terapéuticos con instrumentos y escuadras clínicas desde un tablero ligero y envolvente.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleOpenModal()}
                className="rounded-full bg-gradient-to-r from-[#06B6D4] via-[#3B82F6] to-[#8B5CF6] px-6 py-2 text-sm font-semibold text-white shadow-[0_20px_55px_rgba(59,130,246,0.35)] hover:opacity-95"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo programa
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/instruments')}
                className="rounded-full border border-white/60 bg-white/40 px-4 py-2 text-sm font-semibold text-slate-600 backdrop-blur hover:text-slate-900"
              >
                Vincular instrumentos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Programas activos</p>
              <p className="text-3xl font-semibold text-slate-900">{totalPrograms}</p>
            </div>
            <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Instrumentos vinculados</p>
              <p className="text-3xl font-semibold text-slate-900">{linkedInstrumentCount}</p>
            </div>
            <div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Última edición</p>
              <p className="text-2xl font-semibold text-slate-900">{lastUpdatedLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-[28px] border border-white/40 bg-white/80 shadow-[0_30px_85px_rgba(15,23,42,0.12)] backdrop-blur" padding="lg">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600" />
            <input
              type="text"
              placeholder="Buscar programas por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-3xl border border-gray/50 bg-white/70 pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 focus:border-[#67E8F9] focus:ring-2 focus:ring-[#C7D2FE]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/60 bg-white/50 px-3 py-1 text-sm font-semibold text-[#0F172A]">
              {filteredPrograms.length} coincidencias
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/40">
          <Table
            data={filteredPrograms}
            columns={columns}
            onRowClick={handleRowClick}
            rowKey={(program) => program.id}
          />
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProgram ? 'Editar programa' : 'Crear nuevo programa'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              required
              value={formData.name}
              placeholder='Ingresa el nombre del programa'
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              required
              value={formData.description}
              placeholder='Ingresa la descripción del programa'
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrumentos
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {instruments.map((instrument) => (
                <label key={instrument.id} className="flex items-center rounded-2xl border border-white/40 bg-white/60 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.instruments.includes(instrument.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          instruments: [...prev.instruments, instrument.id]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          instruments: prev.instruments.filter(id => id !== instrument.id)
                        }));
                      }
                    }}
                    className="mr-2 accent-[#38BDF8]"
                  />
                  <span>{instrument.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingProgram ? 'Actualizar programa' : 'Crear programa'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};