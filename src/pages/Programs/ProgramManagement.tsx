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
    const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
    fetch(`${base}/programs`)
      .then(res => res.json())
      .then((data) => {
        // map backend shape to frontend Program type if necessary
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
      })
      .catch(() => {
        // keep context programs as fallback
        setPrograms(ctxPrograms);
      });
  }, [ctxPrograms]);

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
      <div className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-[#fff7ed] via-white to-[#ffe4cc] shadow-xl">
        <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-500">Programas</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Centro de programas</h1>
            <p className="mt-3 text-sm text-slate-700 sm:text-base">
              Diseña, supervisa y conecta planes terapéuticos con instrumentos y equipos clínicos.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => handleOpenModal()}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200/60 hover:from-orange-600 hover:to-amber-600 focus:ring-orange-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo programa
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/instruments')}
                className="border-orange-200 text-orange-600 hover:bg-orange-50 focus:ring-orange-400"
              >
                Vincular instrumentos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-orange-500/80">Programas activos</p>
              <p className="text-3xl font-semibold text-slate-900">{totalPrograms}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-orange-500/80">Instrumentos vinculados</p>
              <p className="text-3xl font-semibold text-slate-900">{linkedInstrumentCount}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-orange-500/80">Última edición</p>
              <p className="text-2xl font-semibold text-slate-900">{lastUpdatedLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-orange-100/70 bg-white/95 shadow-xl ring-1 ring-orange-100/80" padding="lg">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
            <input
              type="text"
              placeholder="Buscar programas por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-orange-100 bg-white/80 pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-orange-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
              {filteredPrograms.length} coincidencias
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400">
              Total: {totalPrograms}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-orange-100/60 bg-white">
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
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrumentos
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {instruments.map((instrument) => (
                <label key={instrument.id} className="flex items-center">
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
                    className="mr-2"
                  />
                  <span className="text-sm">{instrument.name}</span>
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