import React from 'react';
import { Card } from '../UI/Card';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    positive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: { text: 'text-blue-600', lightBg: 'bg-blue-50' },
    green: { text: 'text-green-600', lightBg: 'bg-green-50' },
    purple: { text: 'text-purple-600', lightBg: 'bg-purple-50' },
    red: { text: 'text-red-600', lightBg: 'bg-red-50' },
    yellow: { text: 'text-yellow-600', lightBg: 'bg-yellow-50' },
  } as const;

  const { text, lightBg } = colorClasses[color];

  return (
    <Card>
      <div className="flex items-center justify-between sm:justify-start">
        <div className={`p-2 sm:p-3 rounded-full ${lightBg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${text}`} />
        </div>
        <div className="ml-3 sm:ml-4 flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</h3>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900">{value}</p>
          {change && (
            <p className={`text-xs sm:text-sm ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
              {change.positive ? '+' : ''}{change.value}% from last month
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};