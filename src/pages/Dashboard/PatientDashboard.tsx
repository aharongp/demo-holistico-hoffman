import React from 'react';
import { Activity, Clock, TrendingUp, Calendar } from 'lucide-react';
import { StatsCard } from '../../components/Dashboard/StatsCard';
import { Chart } from '../../components/Dashboard/Chart';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';

export const PatientDashboard: React.FC = () => {
  const progressData = [
    { name: 'Week 1', value: 65 },
    { name: 'Week 2', value: 70 },
    { name: 'Week 3', value: 75 },
    { name: 'Week 4', value: 82 },
    { name: 'Week 5', value: 78 },
    { name: 'Week 6', value: 85 },
  ];

  const upcomingActivities = [
    { id: '1', name: 'Anxiety Assessment', dueDate: 'Tomorrow', type: 'psychological' },
    { id: '2', name: 'Daily Mood Check', dueDate: 'Today', type: 'health' },
    { id: '3', name: 'Stress Management', dueDate: 'In 3 days', type: 'attitudinal' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back, Jane!</h1>
        <p className="text-sm sm:text-base text-gray-600">Here's your progress overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatsCard
          title="Program Progress"
          value="85%"
          icon={TrendingUp}
          change={{ value: 5, positive: true }}
          color="green"
        />
        <StatsCard
          title="Pending Activities"
          value={3}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Completed This Week"
          value={7}
          icon={Activity}
          color="blue"
        />
        <StatsCard
          title="Streak Days"
          value={12}
          icon={Calendar}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Progress Chart */}
        <Chart
          title="Your Progress Over Time"
          data={progressData}
          type="line"
          dataKey="value"
          xAxisKey="name"
        />

        {/* Upcoming Activities */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Upcoming Activities</h3>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {upcomingActivities.map((activity) => (
              <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2 sm:space-y-0">
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{activity.name}</p>
                  <p className="text-xs sm:text-sm text-blue-600">{activity.type}</p>
                  <p className="text-xs text-gray-500">Due: {activity.dueDate}</p>
                </div>
                <Button variant="primary" size="sm" className="w-full sm:w-auto">Start</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <Button variant="primary" className="w-full">
            <Activity className="w-4 h-4 mr-2" />
            Start Daily Check-in
          </Button>
          <Button variant="outline" className="w-full">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Progress
          </Button>
          <Button variant="outline" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        </div>
      </Card>
    </div>
  );
};