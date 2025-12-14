import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ListChecks, Users } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Patient } from '../../types';

export const PatientPunctuality: React.FC = () => {
  const { patients, programs } = useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const isPatientRole = user?.role === 'patient' || user?.role === 'student';

  const ownPatientRecord = useMemo(() => {
    if (!isPatientRole || !user?.id) {
      return null;
    }
    return patients.find((patient) => patient.userId === user.id || patient.id === user.id) ?? null;
  }, [isPatientRole, patients, user?.id]);

  useEffect(() => {
    if (!isPatientRole || !ownPatientRecord) {
      return;
    }
    navigate(`/patients/${ownPatientRecord.id}`, { replace: true });
  }, [isPatientRole, navigate, ownPatientRecord]);

  const programNameById = useMemo(() => {
    const lookup: Record<string, string> = {};
    programs.forEach((program) => {
      lookup[program.id] = program.name;
    });
    return lookup;
  }, [programs]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) {
      return patients;
    }
    const normalized = searchTerm.trim().toLowerCase();
    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return (
        fullName.includes(normalized)
        || patient.email.toLowerCase().includes(normalized)
        || (patient.cedula?.toLowerCase().includes(normalized) ?? false)
      );
    });
  }, [patients, searchTerm]);

  const columns = useMemo(() => ([
    {
      key: 'name',
      header: 'Paciente',
      render: (patient: Patient) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-800">{patient.firstName} {patient.lastName}</span>
          <span className="text-xs text-slate-400">{patient.email}</span>
        </div>
      ),
    },
    {
      key: 'program',
      header: 'Programa asignado',
      render: (patient: Patient) => {
        if (!patient.programId) {
          return <span className="text-xs text-amber-600">Sin programa</span>;
        }
        return (
          <span className="text-xs font-semibold text-violet-600">
            {programNameById[patient.programId] ?? 'Programa sin nombre'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'text-right',
      render: (patient: Patient) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/patients/${patient.id}`)}
          className="inline-flex items-center gap-2"
        >
          <ListChecks className="h-4 w-4" /> Ver puntualidad
        </Button>
      ),
    },
  ]), [navigate, programNameById]);

  if (isPatientRole) {
    return (
      <section className="flex min-h-[320px] items-center justify-center px-4 py-8 sm:px-8">
        <Card className="w-full max-w-xl border border-white/60 bg-white/85 text-center text-sm text-slate-600 shadow-lg">
          {ownPatientRecord
            ? 'Redireccionando a tu puntualidad personal...'
            : 'No encontramos tu expediente de paciente. Contacta al equipo de soporte para validar tu acceso.'}
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8 bg-gradient-to-br from-white via-slate-50 to-teal-50/40 px-4 py-8 sm:px-8">
      <Card className="border border-white/50 bg-white/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-600/80">Puntualidad</p>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Seguimiento de puntualidad</h1>
            <p className="text-sm text-slate-500">
              Elige un paciente para registrar o revisar la puntualidad y cumplimiento de sus actividades programadas.
            </p>
          </div>
          <div className="rounded-3xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4" /> Pacientes activos: {patients.length}
            </span>
          </div>
        </div>
      </Card>

      <Card className="border border-white/50 bg-white/85 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar paciente por nombre, correo o cédula"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-600 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            {filteredPatients.length === patients.length
              ? 'Mostrando todos los pacientes registrados'
              : `Coincidencias encontradas: ${filteredPatients.length}`}
          </div>
        </div>

        <div className="mt-6">
          {filteredPatients.length ? (
            <Table
              data={filteredPatients}
              columns={columns}
              rowKey={(patient) => patient.id}
              initialRows={15}
              loadMoreStep={15}
            />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No se encontraron pacientes con el criterio proporcionado.
            </div>
          )}
        </div>
      </Card>
    </section>
  );
};
