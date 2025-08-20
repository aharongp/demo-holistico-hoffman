import React, { useState } from 'react';
import { Plus, TrendingUp, Calendar, FileText } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Chart } from '../../components/Dashboard/Chart';
import { Modal } from '../../components/UI/Modal';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const EvolutionTracking: React.FC = () => {
  const { user } = useAuth();
  const { evolutionEntries, addEvolutionEntry } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    mood: 5,
    energy: 5,
    notes: '',
  });

  const isPatient = user?.role === 'patient' || user?.role === 'student';

  // Mock data for evolution tracking
  const evolutionData = [
    { name: 'Week 1', mood: 6, energy: 5 },
    { name: 'Week 2', mood: 7, energy: 6 },
    { name: 'Week 3', mood: 6, energy: 7 },
    { name: 'Week 4', mood: 8, energy: 7 },
    { name: 'Week 5', mood: 7, energy: 8 },
    { name: 'Week 6', mood: 8, energy: 8 },
  ];

  const recentEntries = [
    { date: '2024-01-15', mood: 8, energy: 7, notes: 'Feeling much better today after the therapy session.' },
    { date: '2024-01-14', mood: 6, energy: 6, notes: 'Had some anxiety, but managed it well.' },
    { date: '2024-01-13', mood: 7, energy: 8, notes: 'Good day overall, completed all exercises.' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user) {
      addEvolutionEntry({
        patientId: user.id,
        date: new Date(),
        mood: formData.mood,
        energy: formData.energy,
        notes: formData.notes,
      });
    }
    
    setFormData({ mood: 5, energy: 5, notes: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evolution Tracking</h1>
          <p className="text-gray-600">
            {isPatient 
              ? 'Track your daily progress and wellbeing'
              : 'Monitor patient progress and evolution'
            }
          </p>
        </div>
        {isPatient && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        )}
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          title="Mood Tracking Over Time"
          data={evolutionData}
          type="line"
          dataKey="mood"
          xAxisKey="name"
          colors={['#3B82F6']}
        />
        <Chart
          title="Energy Levels Over Time"
          data={evolutionData}
          type="line"
          dataKey="energy"
          xAxisKey="name"
          colors={['#10B981']}
        />
      </div>

      {/* Recent Entries */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Entries</h3>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
        
        <div className="space-y-4">
          {recentEntries.map((entry, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{entry.date}</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="text-sm text-gray-600">Mood: {entry.mood}/10</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-gray-600">Energy: {entry.energy}/10</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700">{entry.notes}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Evolution Entry"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
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
      </Modal>
    </div>
  );
};