import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  FileText, 
  TrendingUp,
  Calendar,
  Upload,
  UserCheck,
  Activity,
  X,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  onClose?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles: UserRole[];
}

const navigation: NavItem[] = [
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach', 'patient', 'student'],
  },
  {
    to: '/users',
    icon: Users,
    label: 'Users',
    roles: ['administrator'],
  },
  {
    to: '/patients',
    icon: UserCheck,
    label: 'Patients',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach'],
  },
  {
    to: '/instruments',
    icon: ClipboardList,
    label: 'Instruments',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach'],
  },
  {
    to: '/activities',
    icon: Activity,
    label: 'Activities',
    roles: ['patient', 'student'],
  },
  {
    to: '/programs',
    icon: Calendar,
    label: 'Programs',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach'],
  },
  {
    to: '/evolution',
    icon: TrendingUp,
    label: 'Evolution',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach', 'patient', 'student'],
  },
  {
    to: '/reports',
    icon: FileText,
    label: 'Reports',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach'],
  },
  {
    to: '/medical-history',
    icon: Upload,
    label: 'Medical History',
    roles: ['patient', 'student'],
  },
  {
    to: '/profile',
    icon: Settings,
    label: 'Profile',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach', 'patient', 'student'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user } = useAuth();

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="flex flex-col w-full h-full bg-white shadow-lg border-r border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <h1 className="text-lg sm:text-xl font-bold text-blue-600">Hoffman System</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
              onClick={onClose}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};