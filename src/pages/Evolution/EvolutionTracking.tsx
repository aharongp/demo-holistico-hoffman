import React, { useState } from 'react';
import { Plus, TrendingUp, Calendar, FileText, User, Activity, Heart, Scale, Droplets } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Chart } from '../../components/Dashboard/Chart';
import { Modal } from '../../components/UI/Modal';
import { Table } from '../../components/UI/Table';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Patient, EvolutionEntry } from '../../types';

export const EvolutionTracking: React.FC = () => {
  const { user } = useAuth();
  const { evolutionEntries, addEvolutionEntry, patients } = useApp();
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

  const isPatient = user?.role === 'patient' || user?.role === 'student';
  const isTherapist = ['administrator', 'trainer', 'therapist', 'doctor', 'coach'].includes(user?.role || '');

  // Mock evolution data for selected patient or current user
  const getEvolutionData = (patientId: string) => [
    { name: 'Week 1', mood: 6, energy: 5, weight: 70, bloodSugar: 95, heartRate: 72 },
    { name: 'Week 2', mood: 7, energy: 6, weight: 69.5, bloodSugar: 92, heartRate: 70 },
    { name: 'Week 3', mood: 6, energy: 7, weight: 69, bloodSugar: 88, heartRate: 68 },
    { name: 'Week 4', mood: 8, energy: 7, weight: 68.5, bloodSugar: 85, heartRate: 66 },
    { name: 'Week 5', mood: 7, energy: 8, weight: 68, bloodSugar: 87, heartRate: 67 },
    { name: 'Week 6', mood: 8, energy: 8, weight: 67.5, bloodSugar: 84, heartRate: 65 },
  ];

  const getRecentEntries = (patientId: string) => [
    { 
      date: '2024-01-15', 
      mood: 8, 
      energy: 7, 
      weight: 67.5,
      bloodSugar: 84,
      heartRate: 65,
      notes: 'Feeling much better today after the therapy session.' 
    },
    { 
      date: '2024-01-14', 
      mood: 6, 
      energy: 6, 
      weight: 67.8,
      bloodSugar: 87,
      heartRate: 67,
      notes: 'Had some anxiety, but managed it well.' 
    },
    { 
      date: '2024-01-13', 
      mood: 7, 
      energy: 8, 
      weight: 68,
      bloodSugar: 85,
      heartRate: 66,
      notes: 'Good day overall, completed all exercises.' 
    },
  ];

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

  const currentPatient = selectedPatient || (isPatient ? { id: user?.id || '', firstName: user?.firstName || '', lastName: user?.lastName || '' } : null);
  const evolutionData = currentPatient ? getEvolutionData(currentPatient.id) : [];
  const recentEntries = currentPatient ? getRecentEntries(currentPatient.id) : [];

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
        {isPatient && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        )}
      </div>

      {/* Progress Overview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <Chart
          title="Mood Tracking"
          data={evolutionData}
          type="line"
          dataKey="mood"
          xAxisKey="name"
          colors={['#3B82F6']}
        />
        <Chart
          title="Energy Levels"
          data={evolutionData}
          type="line"
          dataKey="energy"
          xAxisKey="name"
          colors={['#10B981']}
        />
        <Chart
          title="Weight Progress"
          data={evolutionData}
          type="line"
          dataKey="weight"
          xAxisKey="name"
          colors={['#F59E0B']}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Chart
          title="Blood Sugar Levels"
          data={evolutionData}
          type="line"
          dataKey="bloodSugar"
          xAxisKey="name"
          colors={['#EF4444']}
        />
        <Chart
          title="Heart Rate"
          data={evolutionData}
          type="line"
          dataKey="heartRate"
          xAxisKey="name"
          colors={['#8B5CF6']}
        />
      </div>

      {/* Recent Entries */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Recent Entries</h3>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
        
        <div className="space-y-4">
          {recentEntries.map((entry, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-2 sm:space-y-0">
                <span className="text-sm font-medium text-gray-900">{entry.date}</span>
                <div className="grid grid-cols-2 sm:flex sm:items-center sm:space-x-4 gap-2 sm:gap-0">
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="text-xs sm:text-sm text-gray-600">Mood: {entry.mood}/10</span>
                  </div>
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs sm:text-sm text-gray-600">Energy: {entry.energy}/10</span>
                  </div>
                  <div className="flex items-center">
                    <Scale className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-xs sm:text-sm text-gray-600">Weight: {entry.weight}kg</span>
                  </div>
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-xs sm:text-sm text-gray-600">HR: {entry.heartRate}bpm</span>
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-700">{entry.notes}</p>
            </div>
          ))}
        </div>
      </Card>

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