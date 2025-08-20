import React, { useState } from 'react';
import { Upload, File, Download, Trash2, Plus } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<MedicalFile['category']>('other');

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
    </div>
  );
};