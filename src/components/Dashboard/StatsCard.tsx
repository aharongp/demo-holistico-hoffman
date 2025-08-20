import React from 'react';
import { Card } from '../UI/Card';
import { DivideIcon as LucideIcon } from 'lucide-react';

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
    blue: 'bg-blue-500 text-blue-600 bg-blue-50',
    green: 'bg-green-500 text-green-600 bg-green-50',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50',
    red: 'bg-red-500 text-red-600 bg-red-50',
    yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-50',
  };

  const [bgColor, textColor, lightBg] = colorClasses[color].split(' ');

  return (
    <Card>
      <div className="flex items-center justify-between sm:justify-start">
        <div className={`p-2 sm:p-3 rounded-full ${lightBg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${textColor}`} />
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