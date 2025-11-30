import React, { useMemo, useState } from 'react';
import { Download, FileText, Filter, Calendar, ArrowRight, BarChart3 } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import jsPDF from 'jspdf';

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

const FILTER_OPTIONS: Array<{ value: 'all' | Report['type']; label: string; helper: string }> = [
  { value: 'all', label: 'Todos', helper: 'Resumen general' },
  { value: 'patient', label: 'Pacientes', helper: 'Seguimiento clínico' },
  { value: 'instrument', label: 'Instrumentos', helper: 'Analítica de instrumentos' },
  { value: 'program', label: 'Programas', helper: 'Cobertura y desempeño' },
  { value: 'system', label: 'Sistema', helper: 'Uso de la plataforma' },
];

export const ReportsManagement: React.FC = () => {
  const [reports] = useState<Report[]>(mockReports);
  const [selectedType, setSelectedType] = useState<'all' | Report['type']>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredReports = reports.filter(report => 
    selectedType === 'all' || report.type === selectedType
  );

  const totalReports = reports.length;
  const filteredCount = filteredReports.length;
  const lastGeneratedLabel = useMemo(() => {
    if (!reports.length) {
      return 'Sin registros';
    }
    const newest = [...reports].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    try {
      return newest.createdAt.toLocaleDateString();
    } catch {
      return 'Sin registros';
    }
  }, [reports]);

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

  const getTypeColor = (type: Report['type']) => {
    switch (type) {
      case 'patient':
        return 'border-[#E2D2C1] bg-[#F8EEE2] text-[#6F4E35]';
      case 'instrument':
        return 'border-[#DCC8B4] bg-[#F4E6D7] text-[#6A4A32]';
      case 'program':
        return 'border-[#E7D3C2] bg-[#FBF1E4] text-[#735237]';
      case 'system':
        return 'border-[#DECDBA] bg-[#F6EBDE] text-[#6B4C33]';
      default:
        return 'border-[#E5D6C4] bg-[#F7EEE3] text-[#715339]';
    }
  };

  return (
    <section className="space-y-6 px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-[#E6D8C7] bg-gradient-to-br from-[#f8f1ea] via-white to-[#eadfce] shadow-xl">
        <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-[#7E573C]">Reportes</span>
            <h1 className="text-3xl font-bold text-slate-900">Centro de reportes clínicos</h1>
            <p className="text-sm text-slate-700 sm:text-base">
              Genera, descarga y comparte reportes personalizados de pacientes, programas e instrumentos.
              Visualiza métricas clave antes de exportar para mantener un control ejecutivo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                className="bg-[#7F5B3E] hover:bg-[#6D4F34] focus:ring-[#d6c2ac] shadow-lg shadow-[#eadbca]"
              >
                <FileText className="w-4 h-4 mr-2" />
                Nuevo reporte
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border border-[#E5D5C4] text-[#7F5B3E] hover:bg-[#f7eee4] focus:ring-[#d9c6b3]"
              >
                Ver historial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-[#A07C5A]/80">Reportes totales</p>
              <p className="text-3xl font-semibold text-slate-900">{totalReports}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-[#A07C5A]/80">Resultados filtrados</p>
              <p className="text-3xl font-semibold text-slate-900">{filteredCount}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-[#A07C5A]/80">Última generación</p>
              <p className="text-2xl font-semibold text-slate-900">{lastGeneratedLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-xl" padding="lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2E4D4] text-[#7A563C]">
              <Filter className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Filtros inteligentes</h2>
              <p className="text-sm text-slate-600">Elige el tipo de reporte para ajustar el tablero.</p>
            </div>
          </div>
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {FILTER_OPTIONS.map(option => {
              const isActive = selectedType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedType(option.value)}
                  aria-pressed={isActive}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1bda9]/60 ${
                    isActive
                      ? 'bg-[#7F5B3E] text-white shadow-lg shadow-[#eadbca]'
                      : 'border border-[#E5D6C4] bg-white text-[#7F5B3E] hover:bg-[#f7eee4]'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`block text-xs ${isActive ? 'text-[#F5E9DD]/90' : 'text-[#C8AA8E]'}`}>
                    {option.helper}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredReports.map((report) => (
          <Card
            key={report.id}
            className="rounded-3xl border border-slate-200 bg-white shadow-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${getTypeColor(report.type)}`}
              >
                {report.type}
              </span>
              <span className="rounded-xl border border-[#E5D5C4] bg-[#F4E7D7] p-2 text-[#7A563C]">
                <BarChart3 className="w-4 h-4" />
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{report.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{report.description}</p>
            
            <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-[#B08462]" />
                <span>{report.createdAt.toLocaleDateString()}</span>
              </div>
              <span>Por {report.createdBy}</span>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="primary" 
                className="flex-1 bg-[#7F5B3E] hover:bg-[#6D4F34] focus:ring-[#d6c2ac]" 
                size="sm"
                onClick={() => generatePDF(report)}
                disabled={isGenerating}
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generando...' : 'Descargar PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border border-[#E5D5C4] text-[#7F5B3E] hover:bg-[#f7eee4] focus:ring-[#d9c6b3]"
              >
                Ver detalle
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-[#D4BBA3] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay reportes</h3>
            <p className="text-slate-600">
              Ajusta los filtros para visualizar otros conjuntos de informes.
            </p>
          </div>
        </Card>
      )}
    </section>
  );
};