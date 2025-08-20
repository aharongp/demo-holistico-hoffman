import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { Card } from '../UI/Card';

interface ChartProps {
  title: string;
  data: any[];
  type: 'line' | 'pie' | 'bar';
  dataKey?: string;
  xAxisKey?: string;
  colors?: string[];
}

export const Chart: React.FC<ChartProps> = ({
  title,
  data,
  type,
  dataKey = 'value',
  xAxisKey = 'name',
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
}) => {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey={dataKey} stroke={colors[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey={dataKey}
                fontSize={10}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey={dataKey} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card>
      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">{title}</h3>
      {renderChart()}
    </Card>
  );
};