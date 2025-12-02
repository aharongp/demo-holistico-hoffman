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
        return 'border-[#C7D2FE]/80 bg-[#EEF2FF]/80 text-[#3730A3]';
      case 'instrument':
        return 'border-[#BFDBFE]/80 bg-[#E0F2FE]/80 text-[#1D4ED8]';
      case 'program':
        return 'border-[#DDD6FE]/80 bg-[#EDE9FE]/80 text-[#5B21B6]';
      case 'system':
        return 'border-[#A5F3FC]/80 bg-[#ECFEFF]/80 text-[#0F766E]';
      default:
        return 'border-white/50 bg-white/70 text-slate-700';
    }
  };

  return (
    <section className="space-y-8 px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/25 bg-gradient-to-br from-[#EEF5FF] via-white to-[#FDF4FF] p-6 sm:p-8 shadow-[0_35px_85px_rgba(15,23,42,0.12)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.28),_transparent_60%)]"
        />
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#C7D2FE] opacity-40 blur-3xl" />
        <div aria-hidden="true" className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[#FBCFE8] opacity-30 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/40 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.55em] text-[#4F46E5]">
              Reportes
              <span className="h-1 w-1 rounded-full bg-[#4F46E5]" />
              Quantum
            </span>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Observatorio de reportes inteligentes
            </h1>
            <p className="text-sm text-slate-600 sm:text-base">
              Monitoriza el pulso clínico con paneles predictivos y exporta narrativas ejecutivas en segundos. Cada reporte se nutre de métricas actualizadas y trazabilidad total.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                className="bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#D946EF] text-white shadow-[0_20px_45px_rgba(99,102,241,0.35)] hover:opacity-90"
              >
                <FileText className="mr-2 h-4 w-4" />
                Nuevo reporte
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border border-white/60 bg-white/40 text-[#4338CA] backdrop-blur hover:bg-white/60"
              >
                Ver historial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-3 lg:max-w-xl">
            <div className="rounded-3xl border border-white/40 bg-white/60 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Totales</p>
              <p className="text-3xl font-semibold">{totalReports}</p>
              <span className="text-xs text-slate-500">Reportes activos</span>
            </div>
            <div className="rounded-3xl border border-white/40 bg-white/60 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Filtrados</p>
              <p className="text-3xl font-semibold">{filteredCount}</p>
              <span className="text-xs text-slate-500">Coincidencias actuales</span>
            </div>
            <div className="rounded-3xl border border-white/40 bg-white/60 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">Último PDF</p>
              <p className="text-2xl font-semibold">{lastGeneratedLabel}</p>
              <span className="text-xs text-slate-500">Hora de corte</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-[28px] border border-white/25 bg-white/60 shadow-[0_25px_70px_rgba(15,23,42,0.08)] backdrop-blur" padding="lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1]/15 to-[#DBEAFE]/60 text-[#4338CA]">
              <Filter className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Filtros inteligentes</h2>
              <p className="text-sm text-slate-600">Afina el tablero por dominio y obtén resultados curados.</p>
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
                  className={`flex-shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7D2FE] ${
                    isActive
                      ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-[0_15px_35px_rgba(99,102,241,0.35)]'
                      : 'border border-white/60 bg-white/40 text-slate-600 hover:border-[#C7D2FE] hover:text-slate-900'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`block text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
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
            className="group relative overflow-hidden rounded-[28px] border border-white/25 bg-white/65 shadow-[0_30px_70px_rgba(15,23,42,0.1)] backdrop-blur"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-[#EEF2FF]/90 opacity-0 transition group-hover:opacity-100"
            />
            <div className="relative flex items-start justify-between mb-4">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getTypeColor(report.type)}`}
              >
                {report.type}
              </span>
              <span className="rounded-2xl border border-white/40 bg-white/50 p-2.5 text-[#4F46E5] shadow-inner">
                <BarChart3 className="h-4 w-4" />
              </span>
            </div>

            <div className="relative space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">{report.title}</h3>
              <p className="text-sm text-slate-600">{report.description}</p>
            </div>

            <div className="relative mt-5 flex items-center justify-between text-sm text-slate-500">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4 text-[#6366F1]" />
                <span>{report.createdAt.toLocaleDateString()}</span>
              </div>
              <span className="text-slate-500">Por {report.createdBy}</span>
            </div>

            <div className="relative mt-5 flex gap-2">
              <Button
                variant="primary"
                className="flex-1 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-[0_20px_45px_rgba(79,70,229,0.35)] hover:opacity-90"
                size="sm"
                onClick={() => generatePDF(report)}
                disabled={isGenerating}
              >
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? 'Generando...' : 'Descargar PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border border-white/50 bg-white/40 text-[#4338CA] backdrop-blur hover:bg-white/60"
              >
                Ver detalle
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <Card className="rounded-[28px] border border-white/30 bg-white/60 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-[#94A3B8]" />
            <h3 className="mb-2 text-lg font-semibold text-slate-900">No hay reportes</h3>
            <p className="text-slate-600">Ajusta los filtros para visualizar otros conjuntos de informes.</p>
          </div>
        </Card>
      )}
    </section>
  );
};