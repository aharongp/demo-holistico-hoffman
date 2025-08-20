import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Calendar } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp } from '../../context/AppContext';
import { Program } from '../../types';

export const ProgramManagement: React.FC = () => {
  const { programs, addProgram, updateProgram, deleteProgram, instruments } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    instruments: [] as string[],
  });

  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (program?: Program) => {
    if (program) {
      setEditingProgram(program);
      setFormData({
        name: program.name,
        description: program.description,
        duration: program.duration,
        instruments: program.instruments,
      });
    } else {
      setEditingProgram(null);
      setFormData({
        name: '',
        description: '',
        duration: 30,
        instruments: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const programData = {
      ...formData,
      isActive: true,
    };

    if (editingProgram) {
      updateProgram(editingProgram.id, programData);
    } else {
      addProgram(programData);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (programId: string) => {
    if (confirm('Are you sure you want to delete this program?')) {
      deleteProgram(programId);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
    },
    {
      key: 'description',
      header: 'Description',
      render: (program: Program) => (
        <span className="truncate max-w-xs">{program.description}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (program: Program) => `${program.duration} days`,
    },
    {
      key: 'instruments',
      header: 'Instruments',
      render: (program: Program) => program.instruments.length,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (program: Program) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenModal(program)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(program.id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Program Management</h1>
          <p className="text-gray-600">Create and manage treatment programs</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Program
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <Table data={filteredPrograms} columns={columns} />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProgram ? 'Edit Program' : 'Add New Program'}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instruments
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
              Cancel
            </Button>
            <Button type="submit">
              {editingProgram ? 'Update Program' : 'Create Program'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};