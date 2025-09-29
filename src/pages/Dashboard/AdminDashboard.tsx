import React from 'react';
import { Users, ClipboardList, UserX, UserCheck } from 'lucide-react';
import { StatsCard } from '../../components/Dashboard/StatsCard';
import { Chart } from '../../components/Dashboard/Chart';
import { Card } from '../../components/UI/Card';
import { useApp } from '../../context/AppContext';

export const AdminDashboard: React.FC = () => {
  const { dashboardStats } = useApp();

  const fallbackGenderTotal =
    dashboardStats.genderDistribution.male +
    dashboardStats.genderDistribution.female +
    dashboardStats.genderDistribution.other;

  const genderData = dashboardStats.genderDistribution.breakdown.length
    ? dashboardStats.genderDistribution.breakdown.map(slice => ({
        name: slice.label,
        value: slice.count,
        percentage: slice.percentage,
      }))
    : [
        {
          name: 'Masculino',
          value: dashboardStats.genderDistribution.male,
          percentage: fallbackGenderTotal ? (dashboardStats.genderDistribution.male / fallbackGenderTotal) * 100 : 0,
        },
        {
          name: 'Femenino',
          value: dashboardStats.genderDistribution.female,
          percentage: fallbackGenderTotal ? (dashboardStats.genderDistribution.female / fallbackGenderTotal) * 100 : 0,
        },
        {
          name: 'Otros',
          value: dashboardStats.genderDistribution.other,
          percentage: fallbackGenderTotal ? (dashboardStats.genderDistribution.other / fallbackGenderTotal) * 100 : 0,
        },
      ];

  const programData = (dashboardStats.patientsByProgram ?? []).map(program => ({
    name: program.name,
    value: program.count,
  }));

  const unassignedUsersCount = (dashboardStats.patientsByProgram ?? []).find(program => {
    const normalizedName = (program.name ?? '').toString().trim().toLowerCase();
    return program.programId === null || normalizedName === 'sin programa';
  })?.count ?? 0;

  const lastUpdatedLabel = dashboardStats.lastUpdated ? new Date(dashboardStats.lastUpdated).toLocaleString() : null;

  const monthlyData = [
    { name: 'Jan', value: 120 },
    { name: 'Feb', value: 135 },
    { name: 'Mar', value: 148 },
    { name: 'Apr', value: 150 },
    { name: 'May', value: 165 },
    { name: 'Jun', value: 180 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Administrator Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600">System overview and key metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatsCard
          title="Total Patients"
          value={dashboardStats.totalPatients}
          icon={UserCheck}
          change={{ value: 12, positive: true }}
          color="blue"
        />
        <StatsCard
          title="Total Users"
          value={dashboardStats.totalUsers}
          icon={Users}
          change={{ value: 8, positive: true }}
          color="green"
        />
        <StatsCard
          title="Total Instruments"
          value={dashboardStats.totalInstruments}
          icon={ClipboardList}
          change={{ value: 3, positive: true }}
          color="purple"
        />
        <StatsCard
          title="Usuarios sin programa"
          value={unassignedUsersCount}
          icon={UserX}
          color="yellow"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Chart
          title="Gender Distribution"
          data={genderData}
          type="pie"
          dataKey="value"
        />
        <Chart
          title="Patients by Program"
          data={programData}
          type="bar"
          dataKey="value"
          xAxisKey="name"
          layout="vertical"
        />
      </div>

      <div className="w-full">
        <Chart
          title="Patient Growth Over Time"
          data={monthlyData}
          type="line"
          dataKey="value"
          xAxisKey="name"
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Detalle de distribución de género</h3>
            {lastUpdatedLabel && (
              <p className="text-xs text-gray-500 mt-1">Actualizado el {lastUpdatedLabel}</p>
            )}
          </div>
          <ul className="space-y-2">
            {genderData.map(item => (
              <li key={item.name} className="flex items-center justify-between text-sm sm:text-base">
                <span className="text-gray-600">{item.name}</span>
                <span className="font-medium text-gray-900">
                  {item.value.toLocaleString()} <span className="text-xs text-gray-500">({item.percentage.toFixed(2)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
};