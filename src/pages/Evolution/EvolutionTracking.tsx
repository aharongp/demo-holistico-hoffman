import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { User, EvolutionEntry } from '../../types';
import { 
  TrendingUp, 
  Calendar, 
  Heart, 
  Activity, 
  Weight, 
  Droplets,
  Gauge,
  BarChart3,
  Ruler,
  Plus,
  Eye
} from 'lucide-react';

const EvolutionTracking: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { patients, evolutionEntries, addEvolutionEntry } = useContext(AppContext);
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('mood');
  const [formData, setFormData] = useState({
    mood: 5,
    energy: 5,
    notes: '',
    weight: '',
    bloodSugar: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    pulse: '',
    bmi: '',
    waistMeasurement: '',
    chestMeasurement: '',
    hipMeasurement: '',
    heartRate: ''
  });

  const isPatient = user?.role === 'patient' || user?.role === 'student';
  const canViewAllPatients = user?.role === 'admin' || user?.role === 'doctor';

  const getPatientEvolution = (patientId: string) => {
    return evolutionEntries
      .filter(entry => entry.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEntry: EvolutionEntry = {
      id: Date.now().toString(),
      patientId: isPatient ? user!.id : selectedPatient!.id,
      date: new Date().toISOString().split('T')[0],
      mood: formData.mood,
      energy: formData.energy,
      notes: formData.notes,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      bloodSugar: formData.bloodSugar ? parseFloat(formData.bloodSugar) : undefined,
      bloodPressureSystolic: formData.bloodPressureSystolic ? parseInt(formData.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: formData.bloodPressureDiastolic ? parseInt(formData.bloodPressureDiastolic) : undefined,
      pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
      bmi: formData.bmi ? parseFloat(formData.bmi) : undefined,
      waistMeasurement: formData.waistMeasurement ? parseFloat(formData.waistMeasurement) : undefined,
      chestMeasurement: formData.chestMeasurement ? parseFloat(formData.chestMeasurement) : undefined,
      hipMeasurement: formData.hipMeasurement ? parseFloat(formData.hipMeasurement) : undefined,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
    };

    addEvolutionEntry(newEntry);
    setShowAddModal(false);
    setFormData({
      mood: 5,
      energy: 5,
      notes: '',
      weight: '',
      bloodSugar: '',
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      pulse: '',
      bmi: '',
      waistMeasurement: '',
      chestMeasurement: '',
      hipMeasurement: '',
      heartRate: ''
    });
  };

  const tabs = [
    { id: 'mood', label: 'Mood & Energy', icon: Heart },
    { id: 'weight', label: 'Weight & BMI', icon: Weight },
    { id: 'vitals', label: 'Vital Signs', icon: Activity },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'notes', label: 'Notes', icon: BarChart3 }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mood':
        return (
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
                onChange={(e) => setFormData({ ...formData, mood: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Very Low</span>
                <span className="font-medium">{formData.mood}</span>
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
                onChange={(e) => setFormData({ ...formData, energy: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Very Low</span>
                <span className="font-medium">{formData.energy}</span>
                <span>Very High</span>
              </div>
            </div>
          </div>
        );

      case 'weight':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter weight in kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body Mass Index (BMI)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bmi}
                onChange={(e) => setFormData({ ...formData, bmi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter BMI"
              />
            </div>
          </div>
        );

      case 'vitals':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Pressure - Systolic
                </label>
                <input
                  type="number"
                  value={formData.bloodPressureSystolic}
                  onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Pressure - Diastolic
                </label>
                <input
                  type="number"
                  value={formData.bloodPressureDiastolic}
                  onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="80"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="72"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pulse (bpm)
                </label>
                <input
                  type="number"
                  value={formData.pulse}
                  onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="72"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Sugar Level (mg/dL)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bloodSugar}
                onChange={(e) => setFormData({ ...formData, bloodSugar: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100"
              />
            </div>
          </div>
        );

      case 'measurements':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waist Measurement (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.waistMeasurement}
                onChange={(e) => setFormData({ ...formData, waistMeasurement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter waist measurement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chest Measurement (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.chestMeasurement}
                onChange={(e) => setFormData({ ...formData, chestMeasurement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter chest measurement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hip Measurement (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.hipMeasurement}
                onChange={(e) => setFormData({ ...formData, hipMeasurement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter hip measurement"
              />
            </div>
          </div>
        );

      case 'notes':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="How are you feeling today? Any observations or notes..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (isPatient) {
    const myEvolution = getPatientEvolution(user!.id);
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Evolution</h1>
            <p className="text-gray-600">Track your daily health metrics and progress</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Today's Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Heart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Latest Mood</p>
                <p className="text-xl font-semibold">{myEvolution[0]?.mood || 'N/A'}/10</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Latest Energy</p>
                <p className="text-xl font-semibold">{myEvolution[0]?.energy || 'N/A'}/10</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Weight className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Latest Weight</p>
                <p className="text-xl font-semibold">{myEvolution[0]?.weight || 'N/A'} kg</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Gauge className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Blood Pressure</p>
                <p className="text-xl font-semibold">
                  {myEvolution[0]?.bloodPressureSystolic && myEvolution[0]?.bloodPressureDiastolic 
                    ? `${myEvolution[0].bloodPressureSystolic}/${myEvolution[0].bloodPressureDiastolic}`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Entries</h2>
          <div className="space-y-4">
            {myEvolution.slice(0, 5).map((entry) => (
              <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-4">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{new Date(entry.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Mood: {entry.mood}/10</span>
                    <span>Energy: {entry.energy}/10</span>
                    {entry.weight && <span>Weight: {entry.weight}kg</span>}
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-gray-600 mt-2 text-sm">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Today's Health Data"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="py-4">
              {renderTabContent()}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
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
  }

  // Admin/Doctor view - Patient selection and evolution viewing
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Evolution Tracking</h1>
        <p className="text-gray-600">Monitor patient progress and health metrics</p>
      </div>

      {!selectedPatient ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Select a Patient</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => {
              const patientEvolution = getPatientEvolution(patient.id);
              const latestEntry = patientEvolution[0];
              
              return (
                <Card key={patient.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{patient.name}</h3>
                      <p className="text-sm text-gray-600">{patient.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedPatient(patient)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Entries:</span>
                      <span className="font-medium">{patientEvolution.length}</span>
                    </div>
                    {latestEntry && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Entry:</span>
                          <span className="font-medium">{new Date(latestEntry.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Latest Mood:</span>
                          <span className="font-medium">{latestEntry.mood}/10</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{selectedPatient.name}'s Evolution</h2>
              <p className="text-gray-600">{selectedPatient.email}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedPatient(null)}
            >
              Back to Patient List
            </Button>
          </div>

          {(() => {
            const patientEvolution = getPatientEvolution(selectedPatient.id);
            const latestEntry = patientEvolution[0];

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Heart className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Latest Mood</p>
                        <p className="text-xl font-semibold">{latestEntry?.mood || 'N/A'}/10</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Activity className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Latest Energy</p>
                        <p className="text-xl font-semibold">{latestEntry?.energy || 'N/A'}/10</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Weight className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Latest Weight</p>
                        <p className="text-xl font-semibold">{latestEntry?.weight || 'N/A'} kg</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Gauge className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Blood Pressure</p>
                        <p className="text-xl font-semibold">
                          {latestEntry?.bloodPressureSystolic && latestEntry?.bloodPressureDiastolic 
                            ? `${latestEntry.bloodPressureSystolic}/${latestEntry.bloodPressureDiastolic}`
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Evolution History</h3>
                  <div className="space-y-4">
                    {patientEvolution.map((entry) => (
                      <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{new Date(entry.date).toLocaleDateString()}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Mood:</span>
                              <span className="ml-1 font-medium">{entry.mood}/10</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Energy:</span>
                              <span className="ml-1 font-medium">{entry.energy}/10</span>
                            </div>
                            {entry.weight && (
                              <div>
                                <span className="text-gray-600">Weight:</span>
                                <span className="ml-1 font-medium">{entry.weight}kg</span>
                              </div>
                            )}
                            {entry.heartRate && (
                              <div>
                                <span className="text-gray-600">HR:</span>
                                <span className="ml-1 font-medium">{entry.heartRate}bpm</span>
                              </div>
                            )}
                            {entry.bloodPressureSystolic && entry.bloodPressureDiastolic && (
                              <div>
                                <span className="text-gray-600">BP:</span>
                                <span className="ml-1 font-medium">{entry.bloodPressureSystolic}/{entry.bloodPressureDiastolic}</span>
                              </div>
                            )}
                            {entry.bloodSugar && (
                              <div>
                                <span className="text-gray-600">Blood Sugar:</span>
                                <span className="ml-1 font-medium">{entry.bloodSugar}mg/dL</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {entry.notes && (
                          <p className="text-gray-600 mt-2 text-sm italic">{entry.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default EvolutionTracking;