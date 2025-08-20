import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp } from '../../context/AppContext';
import { Instrument, Question } from '../../types';

export const InstrumentManagement: React.FC = () => {
  const { instruments, addInstrument, updateInstrument, deleteInstrument } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instrument Management</h1>
          <p className="text-gray-600">Manage assessment instruments and questionnaires</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Instrument
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search instruments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <Table data={filteredInstruments} columns={columns} />
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