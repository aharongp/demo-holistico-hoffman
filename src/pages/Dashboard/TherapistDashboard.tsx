import React from 'react';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { StatsCard } from '../../components/Dashboard/StatsCard';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useApp } from '../../context/AppContext';

export const TherapistDashboard: React.FC = () => {
  const { patients, assignments } = useApp();

  const myPatients = patients.slice(0, 3); // Mock assigned patients
  const pendingAssignments = assignments.filter(a => a.status === 'pending').slice(0, 5);

  return (
    <section className="space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Panel del terapeuta</h1>
        <p className="text-sm sm:text-base text-gray-600">Gestiona tus pacientes y asignaciones</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatsCard
          title="Mis pacientes"
          value={myPatients.length}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Evaluaciones pendientes"
          value={8}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Completadas esta semana"
          value={12}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Retrasos"
          value={2}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* My Patients */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Mis pacientes</h3>
            <Button variant="outline" size="sm">Ver todos</Button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {myPatients.map((patient) => (
              <div key={patient.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">{patient.email}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">Ver</Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Pending Assignments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Evaluaciones pendientes</h3>
            <Button variant="outline" size="sm">Ver todas</Button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200 space-y-2 sm:space-y-0">
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Evaluación de ansiedad</p>
                  <p className="text-xs sm:text-sm text-gray-500">Paciente: Jane Doe</p>
                  <p className="text-xs text-yellow-600">Para: Mañana</p>
                </div>
                <Button variant="primary" size="sm" className="w-full sm:w-auto">Evaluar</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
};