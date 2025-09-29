import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Instrument, Question } from '../../types';

export const InstrumentManagement: React.FC = () => {
  const { instruments, addInstrument, updateInstrument, deleteInstrument, instrumentTypes, myInstrumentTypes } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'themes' | 'criteria'>('all');
  const [searchTerm] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'psychological' as 'attitudinal' | 'health' | 'psychological',
    estimatedDuration: 15,
    questions: [] as Question[],
  });

  const filteredInstruments = instruments.filter(instrument =>
    instrument.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instrument.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTypes = (instrumentTypes || []).filter((t: any) => (t.nombre ?? '').toLowerCase().includes(typeSearch.toLowerCase()));

  const handleOpenModal = (instrument?: Instrument) => {
    if (instrument) {
      setEditingInstrument(instrument);
      setFormData({
        name: instrument.name,
        description: instrument.description,
        category: instrument.category,
        estimatedDuration: instrument.estimatedDuration,
        questions: instrument.questions,
      });
    } else {
      setEditingInstrument(null);
      setFormData({
        name: '',
        description: '',
        category: 'psychological',
        estimatedDuration: 15,
        questions: [],
      });
    }
    setIsModalOpen(true);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const instrumentData = {
      ...formData,
      isActive: true,
    };

    if (editingInstrument) {
      updateInstrument(editingInstrument.id, instrumentData);
    } else {
      addInstrument(instrumentData);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (instrumentId: string) => {
    if (confirm('Are you sure you want to delete this instrument?')) {
      deleteInstrument(instrumentId);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
    },
    {
      key: 'category',
      header: 'Category',
      render: (instrument: Instrument) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
          {instrument.category}
        </span>
      ),
    },
    {
      key: 'estimatedDuration',
      header: 'Duration',
      render: (instrument: Instrument) => `${instrument.estimatedDuration} min`,
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
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenModal(instrument)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(instrument.id)}
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instrument Management</h1>
          <p className="text-gray-600">Manage assessment instruments and questionnaires</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setActiveTab('all')}
            aria-pressed={activeTab === 'all'}
          >
            Todos los instrumentos
          </button>

          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'mine' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setActiveTab('mine')}
            aria-pressed={activeTab === 'mine'}
          >
            Mis instrumentos
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'themes' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setActiveTab('themes')}
            aria-pressed={activeTab === 'themes'}
          >
            Temas
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'criteria' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setActiveTab('criteria')}
            aria-pressed={activeTab === 'criteria'}
          >
            Criterios
          </button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Instrument
          </Button>
        </div>
      </div>

      <Card>
        {/* Tab content switch */}
  {activeTab === 'all' && (
          <div className="py-4">
            <h2 className="text-lg font-semibold mb-4">Tipos de instrumento</h2>
            <div className="mb-4">
              <div className="relative max-w-xs">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar tipos..."
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
                />
              </div>
            </div>
            {filteredTypes.length === 0 ? (
              <p className="text-sm text-gray-600">No se encontraron tipos de instrumento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTypes.map((t: any) => (
                  <button
                    key={t.id}
                    className="p-4 border rounded-md text-left hover:shadow-md"
                    onClick={async () => {
                      setLoadingTypeInstruments(true);
                      try {
                        const res = await fetch(`${(import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000'}/instruments/by-type/${t.id}`);
                        const data = await res.json();
                        // map backend instrument -> frontend Instrument minimal mapping
                        const mapped: Instrument[] = Array.isArray(data) ? data.map((ins: any) => ({
                          id: String(ins.id),
                          name: ins.descripcion ?? `Instrument ${ins.id}`,
                          description: ins.descripcion ?? '',
                          category: 'psychological',
                          questions: [],
                          estimatedDuration: 0,
                          isActive: typeof ins.activo !== 'undefined' ? Boolean(ins.activo) : true,
                          createdAt: ins.created_at ? new Date(ins.created_at) : new Date(),
                        })) : [];
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
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{t.nombre ?? `Tipo ${t.id}`}</h3>
                      <span className="text-xs text-gray-500">{t.id_criterio ? `Criterio ${t.id_criterio}` : ''}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{t.descripcion ?? ''}</p>
                    <div className="text-xs text-gray-400">Creado por: {t.user_created ?? 'system'}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button onClick={() => setShowAllInstrumentsTable(s => !s)}>
                {showAllInstrumentsTable ? 'Ocultar tabla de instrumentos' : 'Ver tabla de instrumentos'}
              </Button>
            </div>
            {showAllInstrumentsTable && (
              <div className="mt-4">
                {loadingTypeInstruments ? (
                  <div className="text-sm text-gray-600">Cargando instrumentos...</div>
                ) : (
                  <Table data={instrumentsToShow} columns={columns} />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mine' && (
          <div className="py-4">
            <h2 className="text-lg font-semibold mb-4">Mis tipos de instrumento</h2>
            {user && <p className="text-sm text-gray-600 mb-4">Mostrando tipos creados por: {user.email}</p>}
            {myInstrumentTypes.length === 0 ? (
              <p className="text-sm text-gray-600">No tienes tipos de instrumento creados.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myInstrumentTypes.map((t: any) => (
                  <div key={t.id} className="p-4 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{t.nombre ?? `Tipo ${t.id}`}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{t.descripcion ?? ''}</p>
                    <div className="text-xs text-gray-400">Creado: {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'themes' && (
          <div className="py-8">
            <h2 className="text-lg font-semibold mb-4">Temas</h2>
            <p className="text-sm text-gray-600">Aquí irán los temas (topics) relacionados con los instrumentos. Muestra una lista de `tema` cuando esté disponible.</p>
          </div>
        )}

        {activeTab === 'criteria' && (
          <div className="py-8">
            <h2 className="text-lg font-semibold mb-4">Criterios</h2>
            <p className="text-sm text-gray-600">Aquí irán los criterios (criteria) usados por instrumentos y preguntas. Se puede listar `criterio` desde la API.</p>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingInstrument ? 'Edit Instrument' : 'Add New Instrument'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
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
              Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as 'attitudinal' | 'health' | 'psychological' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="psychological">Psychological</option>
                <option value="health">Health</option>
                <option value="attitudinal">Attitudinal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
              {editingInstrument ? 'Update Instrument' : 'Create Instrument'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};