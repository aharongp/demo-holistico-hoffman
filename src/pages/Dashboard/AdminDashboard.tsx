import React from 'react';
import { Users, ClipboardList, Activity, FileText, UserCheck, Calendar } from 'lucide-react';
import { StatsCard } from '../../components/Dashboard/StatsCard';
import { Chart } from '../../components/Dashboard/Chart';
import { useApp } from '../../context/AppContext';

export const AdminDashboard: React.FC = () => {
  const { dashboardStats } = useApp();

  const genderData = [
    { name: 'Male', value: dashboardStats.genderDistribution.male },
    { name: 'Female', value: dashboardStats.genderDistribution.female },
    { name: 'Other', value: dashboardStats.genderDistribution.other },
  ];

  const roleData = Object.entries(dashboardStats.roleDistribution).map(([role, count]) => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value: count,
  }));

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
          title="Active Instruments"
          value={dashboardStats.totalInstruments}
          icon={ClipboardList}
          change={{ value: 3, positive: true }}
          color="purple"
        />
        <StatsCard
          title="Pending Assignments"
          value={dashboardStats.pendingAssignments}
          icon={Activity}
          change={{ value: -5, positive: false }}
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
          title="Users by Role"
          data={roleData}
          type="bar"
          dataKey="value"
          xAxisKey="name"
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
    </div>
  );
};