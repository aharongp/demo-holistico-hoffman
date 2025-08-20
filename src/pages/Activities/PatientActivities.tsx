import React, { useState } from 'react';
import { Play, Clock, CheckCircle, FileText } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';

interface Activity {
  id: string;
  name: string;
  description: string;
  category: 'attitudinal' | 'health' | 'psychological';
  status: 'pending' | 'in_progress' | 'completed';
  estimatedDuration: number;
  dueDate?: string;
  completedAt?: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    name: 'Daily Mood Assessment',
    description: 'Track your daily mood and energy levels',
    category: 'health',
    status: 'pending',
    estimatedDuration: 5,
    dueDate: 'Today',
  },
  {
    id: '2',
    name: 'Anxiety Self-Evaluation',
    description: 'Comprehensive anxiety evaluation questionnaire',
    category: 'psychological',
    status: 'in_progress',
    estimatedDuration: 15,
    dueDate: 'Tomorrow',
  },
  {
    id: '3',
    name: 'Stress Management Techniques',
    description: 'Learn and practice stress reduction methods',
    category: 'attitudinal',
    status: 'completed',
    estimatedDuration: 20,
    completedAt: 'Yesterday',
  },
];

export const PatientActivities: React.FC = () => {
  const [activities] = useState<Activity[]>(mockActivities);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return activity.status === 'pending' || activity.status === 'in_progress';
    if (activeTab === 'completed') return activity.status === 'completed';
    return true;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'health': return 'bg-green-100 text-green-800';
      case 'psychological': return 'bg-blue-100 text-blue-800';
      case 'attitudinal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress': return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Activities</h1>
        <p className="text-gray-600">Complete your assigned instruments and assessments</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Activities', count: activities.length },
            { key: 'pending', label: 'Pending', count: activities.filter(a => a.status === 'pending' || a.status === 'in_progress').length },
            { key: 'completed', label: 'Completed', count: activities.filter(a => a.status === 'completed').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.map((activity) => (
          <Card key={activity.id}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                {getStatusIcon(activity.status)}
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getCategoryColor(activity.category)}`}>
                  {activity.category}
                </span>
              </div>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">{activity.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{activity.description}</p>
            
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>{activity.estimatedDuration} min</span>
              <span>
                {activity.status === 'completed' 
                  ? `Completed ${activity.completedAt}`
                  : `Due: ${activity.dueDate}`
                }
              </span>
            </div>
            
            <div className="flex space-x-2">
              {activity.status === 'completed' ? (
                <Button variant="outline" className="w-full" size="sm">
                  View Results
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  className="w-full" 
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {activity.status === 'in_progress' ? 'Continue' : 'Start'}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredActivities.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
            <p className="text-gray-600">
              {activeTab === 'pending' && 'You have no pending activities at this time.'}
              {activeTab === 'completed' && 'You haven\'t completed any activities yet.'}
              {activeTab === 'all' && 'No activities have been assigned to you yet.'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};