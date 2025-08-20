import React, { useState } from 'react';
import { Upload, File, Download, Trash2, Plus, Edit } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';

interface MedicalHistoryData {
  // Identificación
  birthPlace: string;
  birthTime: string;
  birthDate: string;
  maritalStatus: string;
  profession: string;
  occupation: string;
  phone: string;
  address: string;
  companyAddress: string;
  
  // Contacto familiar
  closeFamily: string;
  relationship: string;
  familyPhone: string;
  emergencyContact: string;
  emergencyEmail: string;
  emergencyPhone: string;
  
  // Médico tratante
  treatingDoctor: string;
  specialty: string;
  currentMedication: string;
  
  // Antecedentes familiares
  familyHistory: {
    cancer: string;
    tuberculosis: string;
    diabetes: string;
    asthma: string;
    highBloodPressure: string;
    epilepsy: string;
    mentalIllness: string;
    suicide: string;
    bloodDisease: string;
    vascularDisease: string;
    arthritis: string;
    syphilis: string;
    others: string;
  };
  
  // Información familiar
  fatherAge: string;
  motherAge: string;
  fatherDeathDate: string;
  fatherDeathCause: string;
  motherDeathDate: string;
  motherDeathCause: string;
  numberOfSiblings: string;
  siblingPosition: string;
  numberOfChildren: string;
  livesWith: string;
}

interface MedicalFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  category: 'lab_results' | 'imaging' | 'prescription' | 'consultation' | 'other';
}

const mockFiles: MedicalFile[] = [
  {
    id: '1',
    name: 'Blood_Test_Results_2024.pdf',
    type: 'application/pdf',
    size: 245000,
    uploadedAt: new Date('2024-01-15'),
    category: 'lab_results',
  },
  {
    id: '2',
    name: 'X_Ray_Chest_January.jpg',
    type: 'image/jpeg',
    size: 1200000,
    uploadedAt: new Date('2024-01-10'),
    category: 'imaging',
  },
  {
    id: '3',
    name: 'Prescription_Dr_Smith.pdf',
    type: 'application/pdf',
    size: 180000,
    uploadedAt: new Date('2024-01-08'),
    category: 'prescription',
  },
];

export const MedicalHistory: React.FC = () => {
  const [files, setFiles] = useState<MedicalFile[]>(mockFiles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<MedicalFile['category']>('other');
  const [medicalHistoryData, setMedicalHistoryData] = useState<MedicalHistoryData>({
    birthPlace: '',
    birthTime: '',
    birthDate: '',
    maritalStatus: '',
    profession: '',
    occupation: '',
    phone: '',
    address: '',
    companyAddress: '',
    closeFamily: '',
    relationship: '',
    familyPhone: '',
    emergencyContact: '',
    emergencyEmail: '',
    emergencyPhone: '',
    treatingDoctor: '',
    specialty: '',
    currentMedication: '',
    familyHistory: {
      cancer: '',
      tuberculosis: '',
      diabetes: '',
      asthma: '',
      highBloodPressure: '',
      epilepsy: '',
      mentalIllness: '',
      suicide: '',
      bloodDisease: '',
      vascularDisease: '',
      arthritis: '',
      syphilis: '',
      others: '',
    },
    fatherAge: '',
    motherAge: '',
    fatherDeathDate: '',
    fatherDeathCause: '',
    motherDeathDate: '',
    motherDeathCause: '',
    numberOfSiblings: '',
    siblingPosition: '',
    numberOfChildren: '',
    livesWith: '',
  });

  const filteredFiles = files.filter(file => 
    selectedCategory === 'all' || file.category === selectedCategory
  );

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      setIsModalOpen(true);
    }
  };

  const handleUploadSubmit = () => {
    if (uploadingFile) {
      const newFile: MedicalFile = {
        id: Date.now().toString(),
        name: uploadingFile.name,
        type: uploadingFile.type,
        size: uploadingFile.size,
        uploadedAt: new Date(),
        category: uploadCategory,
      };
      
      setFiles(prev => [...prev, newFile]);
      setUploadingFile(null);
      setIsModalOpen(false);
    }
  };

  const handleDelete = (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  const handleHistorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would save the medical history data
    console.log('Medical History Data:', medicalHistoryData);
    setIsHistoryModalOpen(false);
    // Show success message
  };

  const updateHistoryField = (field: string, value: string) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateFamilyHistory = (condition: string, value: string) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      familyHistory: {
        ...prev.familyHistory,
        [condition]: value
      }
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'lab_results': return 'Lab Results';
      case 'imaging': return 'Medical Imaging';
      case 'prescription': return 'Prescriptions';
      case 'consultation': return 'Consultations';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lab_results': return 'bg-blue-100 text-blue-800';
      case 'imaging': return 'bg-green-100 text-green-800';
      case 'prescription': return 'bg-purple-100 text-purple-800';
      case 'consultation': return 'bg-yellow-100 text-yellow-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
          <p className="text-gray-600">Manage your medical documents and files</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="secondary"
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Update Medical History
          </Button>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <Button onClick={() => document.getElementById('file-upload')?.click()}>
              <Plus className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Medical Files</h3>
          <p className="text-gray-600">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
          </p>
        </div>
      </Card>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex items-center space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="lab_results">Lab Results</option>
            <option value="imaging">Medical Imaging</option>
            <option value="prescription">Prescriptions</option>
            <option value="consultation">Consultations</option>
            <option value="other">Other</option>
          </select>
        </div>
      </Card>

      {/* Files List */}
      <div className="space-y-4">
        {filteredFiles.map((file) => (
          <Card key={file.id} padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <File className="w-8 h-8 text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{file.name}</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.uploadedAt.toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${getCategoryColor(file.category)}`}>
                      {getCategoryLabel(file.category)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => handleDelete(file.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600">
              {selectedCategory === 'all' 
                ? 'Upload your first medical document to get started.'
                : `No files found in the ${getCategoryLabel(selectedCategory)} category.`
              }
            </p>
          </div>
        </Card>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Medical File"
      >
        {uploadingFile && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">File to upload:</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{uploadingFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(uploadingFile.size)} • {uploadingFile.type}
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as MedicalFile['category'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="lab_results">Lab Results</option>
                <option value="imaging">Medical Imaging</option>
                <option value="prescription">Prescriptions</option>
                <option value="consultation">Consultations</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUploadSubmit}>
                Upload File
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Medical History Update Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Update Medical History"
        size="xl"
      >
        <form onSubmit={handleHistorySubmit} className="space-y-6">
          {/* Identificación */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Identificación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lugar de nacimiento
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.birthPlace}
                  onChange={(e) => updateHistoryField('birthPlace', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora de nacimiento
                </label>
                <input
                  type="time"
                  value={medicalHistoryData.birthTime}
                  onChange={(e) => updateHistoryField('birthTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={medicalHistoryData.birthDate}
                  onChange={(e) => updateHistoryField('birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado civil
                </label>
                <select
                  value={medicalHistoryData.maritalStatus}
                  onChange={(e) => updateHistoryField('maritalStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="soltero">Soltero/a</option>
                  <option value="casado">Casado/a</option>
                  <option value="divorciado">Divorciado/a</option>
                  <option value="viudo">Viudo/a</option>
                  <option value="union_libre">Unión libre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profesión
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.profession}
                  onChange={(e) => updateHistoryField('profession', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ocupación
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.occupation}
                  onChange={(e) => updateHistoryField('occupation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={medicalHistoryData.phone}
                  onChange={(e) => updateHistoryField('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <textarea
                value={medicalHistoryData.address}
                onChange={(e) => updateHistoryField('address', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa y dirección
              </label>
              <textarea
                value={medicalHistoryData.companyAddress}
                onChange={(e) => updateHistoryField('companyAddress', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Contacto Familiar */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto Familiar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Familiar cercano
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.closeFamily}
                  onChange={(e) => updateHistoryField('closeFamily', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parentesco
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.relationship}
                  onChange={(e) => updateHistoryField('relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={medicalHistoryData.familyPhone}
                  onChange={(e) => updateHistoryField('familyPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contacto
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.emergencyContact}
                  onChange={(e) => updateHistoryField('emergencyContact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo de contacto
                </label>
                <input
                  type="email"
                  value={medicalHistoryData.emergencyEmail}
                  onChange={(e) => updateHistoryField('emergencyEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono de contacto
                </label>
                <input
                  type="tel"
                  value={medicalHistoryData.emergencyPhone}
                  onChange={(e) => updateHistoryField('emergencyPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Médico Tratante */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Médico Tratante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Médico tratante
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.treatingDoctor}
                  onChange={(e) => updateHistoryField('treatingDoctor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialidad
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.specialty}
                  onChange={(e) => updateHistoryField('specialty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medicación que recibe
              </label>
              <textarea
                value={medicalHistoryData.currentMedication}
                onChange={(e) => updateHistoryField('currentMedication', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Antecedentes Familiares */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Antecedentes Familiares</h3>
            <p className="text-sm text-gray-600 mb-4">
              De las enfermedades siguientes, escriba al lado el parentesco del familiar directo que la haya padecido
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries({
                cancer: 'Cáncer',
                tuberculosis: 'Tuberculosis',
                diabetes: 'Diabetes',
                asthma: 'Asma',
                highBloodPressure: 'Tensión alta',
                epilepsy: 'Epilepsia',
                mentalIllness: 'Enfermedad mental',
                suicide: 'Suicidio',
                bloodDisease: 'Enfermedad sangre',
                vascularDisease: 'Enfermedad vasos',
                arthritis: 'Artritis',
                syphilis: 'Sífilis'
              }).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={medicalHistoryData.familyHistory[key as keyof typeof medicalHistoryData.familyHistory]}
                    onChange={(e) => updateFamilyHistory(key, e.target.value)}
                    placeholder="Parentesco (ej: padre, madre, hermano)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Otras
                </label>
                <textarea
                  value={medicalHistoryData.familyHistory.others}
                  onChange={(e) => updateFamilyHistory('others', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Información Familiar */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Familiar</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Si sus padres viven: ¿Qué edad tienen?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Padre
                    </label>
                    <input
                      type="number"
                      value={medicalHistoryData.fatherAge}
                      onChange={(e) => updateHistoryField('fatherAge', e.target.value)}
                      placeholder="Edad del padre"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Madre
                    </label>
                    <input
                      type="number"
                      value={medicalHistoryData.motherAge}
                      onChange={(e) => updateHistoryField('motherAge', e.target.value)}
                      placeholder="Edad de la madre"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Si ha muerto: ¿Cuándo y cuál fue la causa?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha muerte del padre
                    </label>
                    <input
                      type="date"
                      value={medicalHistoryData.fatherDeathDate}
                      onChange={(e) => updateHistoryField('fatherDeathDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Causa muerte del padre
                    </label>
                    <input
                      type="text"
                      value={medicalHistoryData.fatherDeathCause}
                      onChange={(e) => updateHistoryField('fatherDeathCause', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha muerte de la madre
                    </label>
                    <input
                      type="date"
                      value={medicalHistoryData.motherDeathDate}
                      onChange={(e) => updateHistoryField('motherDeathDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Causa muerte de la madre
                    </label>
                    <input
                      type="text"
                      value={medicalHistoryData.motherDeathCause}
                      onChange={(e) => updateHistoryField('motherDeathCause', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de hermanos
                  </label>
                  <input
                    type="number"
                    value={medicalHistoryData.numberOfSiblings}
                    onChange={(e) => updateHistoryField('numberOfSiblings', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posición que ocupa usted
                  </label>
                  <input
                    type="text"
                    value={medicalHistoryData.siblingPosition}
                    onChange={(e) => updateHistoryField('siblingPosition', e.target.value)}
                    placeholder="ej: 1ro, 2do, último"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de hijos
                  </label>
                  <input
                    type="number"
                    value={medicalHistoryData.numberOfChildren}
                    onChange={(e) => updateHistoryField('numberOfChildren', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Con quién vive?
                  </label>
                  <input
                    type="text"
                    value={medicalHistoryData.livesWith}
                    onChange={(e) => updateHistoryField('livesWith', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHistoryModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Historia Médica
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};