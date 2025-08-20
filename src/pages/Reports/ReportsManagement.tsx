import React, { useState } from 'react';
import { Download, FileText, Filter, Calendar } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Report {
  id: string;
  title: string;
  description: string;
  type: 'patient' | 'instrument' | 'program' | 'system';
  createdAt: Date;
  createdBy: string;
}

const mockReports: Report[] = [
  {
    id: '1',
    title: 'Patient Progress Report - Jane Doe',
    description: 'Comprehensive progress analysis for the last 3 months',
    type: 'patient',
    createdAt: new Date('2024-01-15'),
    createdBy: 'Dr. Smith',
  },
  {
    id: '2',
    title: 'Anxiety Assessment Analytics',
    description: 'Statistical analysis of anxiety assessment results',
    type: 'instrument',
    createdAt: new Date('2024-01-14'),
    createdBy: 'Dr. Johnson',
  },
  {
    id: '3',
    title: 'Monthly System Usage Report',
    description: 'Platform usage statistics and user engagement metrics',
    type: 'system',
    createdAt: new Date('2024-01-13'),
    createdBy: 'Admin',
  },
];

export const ReportsManagement: React.FC = () => {
  const [reports] = useState<Report[]>(mockReports);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredReports = reports.filter(report => 
    selectedType === 'all' || report.type === selectedType
  );

  const generatePDF = async (report: Report) => {
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF();
      
      // Add title
      pdf.setFontSize(20);
      pdf.text(report.title, 20, 30);
      
      // Add date
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 50);
      pdf.text(`Created by: ${report.createdBy}`, 20, 60);
      
      // Add content
      pdf.setFontSize(14);
      pdf.text('Report Content:', 20, 80);
      
      pdf.setFontSize(12);
      const content = `
This is a sample report content for ${report.title}.

${report.description}

Key Findings:
• Patient shows significant improvement in anxiety management
• Compliance with treatment protocol is excellent (95%)
• Mood tracking shows consistent positive trend
• Energy levels have increased by 30% over the reporting period

Recommendations:
• Continue current treatment approach
• Increase session frequency if needed
• Monitor for any regression signs
• Schedule follow-up assessment in 4 weeks

Summary:
Overall progress is very positive with clear indicators of improvement
across all measured parameters. Patient engagement remains high.
      `;
      
      const lines = pdf.splitTextToSize(content, 170);
      pdf.text(lines, 20, 100);
      
      // Save the PDF
      pdf.save(`${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'patient': return 'bg-blue-100 text-blue-800';
      case 'instrument': return 'bg-green-100 text-green-800';
      case 'program': return 'bg-purple-100 text-purple-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Management</h1>
          <p className="text-gray-600">Generate and manage system reports</p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Generate New Report
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="patient">Patient Reports</option>
            <option value="instrument">Instrument Analytics</option>
            <option value="program">Program Reports</option>
            <option value="system">System Reports</option>
          </select>
        </div>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.id}>
            <div className="flex items-start justify-between mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeColor(report.type)}`}>
                {report.type}
              </span>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">{report.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{report.description}</p>
            
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                <span>{report.createdAt.toLocaleDateString()}</span>
              </div>
              <span>By {report.createdBy}</span>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="primary" 
                className="flex-1" 
                size="sm"
                onClick={() => generatePDF(report)}
                disabled={isGenerating}
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-600">
              No reports match your current filter criteria.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};