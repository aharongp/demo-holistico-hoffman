import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
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
  BarChart3,
  X,
  Settings,
  Bell,
  User,
  LogOut,
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
    label: 'Panel principal',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach', 'patient', 'student'],
  },
  {
    to: '/users',
    icon: Users,
    label: 'Usuarios',
    roles: ['administrator'],
  },
  {
    to: '/patients',
    icon: UserCheck,
    label: 'Pacientes',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach'],
  },
  {
    to: '/instruments',
    icon: ClipboardList,
    label: 'Instrumentos',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach'],
  },
  {
    to: '/activities',
    icon: Activity,
    label: 'Actividades',
    roles: ['patient', 'student'],
  },
  {
    to: '/results',
    icon: BarChart3,
    label: 'Resultados',
    roles: ['patient', 'student'],
  },
  {
    to: '/programs',
    icon: Calendar,
    label: 'Programas',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach'],
  },
  {
    to: '/evolution',
    icon: TrendingUp,
    label: 'Evolución',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach', 'patient', 'student'],
  },
  {
    to: '/reports',
    icon: FileText,
    label: 'Reportes',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach'],
  },
  {
    to: '/medical-history',
    icon: Upload,
    label: 'Historia clínica',
    roles: ['patient', 'student'],
  },
  {
    to: '/profile',
    icon: Settings,
    label: 'Perfil',
    roles: ['administrator', 'trainer', 'therapist', 'doctor', 'coach', 'patient', 'student'],
  },
];

const SECTION_THEMES: Record<string, {
  sidebarBg: string;
  navActive: string;
  iconActive: string;
  subLabelActive: string;
}> = {
  '/users': {
    sidebarBg: 'bg-gradient-to-b from-[#e0f2f1] via-white to-[#d1fae5]/70',
    navActive: 'bg-gradient-to-r from-[#d1fae5] to-[#a7f3d0] text-[#065f46] ring-1 ring-[#6ee7b7] shadow-md shadow-emerald-200/70',
    iconActive: 'border-[#a7f3d0] bg-white text-[#047857]',
    subLabelActive: 'text-[#10b981]',
  },
  '/patients': {
    sidebarBg: 'bg-gradient-to-b from-[#f5f3ff] via-white to-[#ede9fe]',
    navActive: 'bg-[#f5f3ff] text-[#7c3aed] ring-1 ring-purple-100 shadow-md shadow-purple-200/60',
    iconActive: 'border-purple-100 bg-white text-[#7c3aed]',
    subLabelActive: 'text-[#7c3aed]',
  },
  '/instruments': {
    sidebarBg: 'bg-gradient-to-b from-[#f9fafb] via-white to-[#e5e7eb]',
    navActive: 'bg-[#F2F1E4] text-[#57534e] ring-1 ring-gray-200 shadow-md shadow-gray-300/60',
    iconActive: 'border-gray-200 bg-white text-[#57534e]',
    subLabelActive: 'text-[#78716c]',
  },
  '/programs': {
    sidebarBg: 'bg-gradient-to-b from-[#E0F7FF] via-white to-[#EEF2FF]',
    navActive: 'bg-[#DBF5FF] text-[#0369A1] ring-1 ring-[#BFDBFE] shadow-sm shadow-sky-100/40',
    iconActive: 'border-[#BFDBFE] bg-white text-[#0EA5E9]',
    subLabelActive: 'text-[#0284C7]',
  },
  '/evolution': {
    sidebarBg: 'bg-gradient-to-b from-[#FFF9F4] via-white to-[#FFEFE8]',
    navActive: 'bg-[#FFE4D6] text-[#B45309] ring-1 ring-[#FED7AA] shadow-sm shadow-orange-100/40',
    iconActive: 'border-[#FED7AA] bg-white text-[#C2410C]',
    subLabelActive: 'text-[#F97316]',
  },
  '/reports': {
    sidebarBg: 'bg-gradient-to-b from-[#EEF5FF] via-white to-[#FDF4FF]',
    navActive: 'bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] text-[#4F46E5] ring-1 ring-[#E0E7FF] shadow-md shadow-[#cbd5f5]/70',
    iconActive: 'border-[#E0E7FF] bg-white text-[#4F46E5]',
    subLabelActive: 'text-[#6366F1]',
  },
  '/activities': {
    sidebarBg: 'bg-gradient-to-b from-[#fff5fb] via-white to-[#ffe8ff]',
    navActive: 'bg-[#EBC9F0] text-[#685573] ring-1 ring-[#F2D8E7] shadow-sm shadow-orange-100/40',
    iconActive: 'border-[#F2D8E7] bg-white text-[#8F65A8]',
    subLabelActive: 'text-[#8F65A8]',
  },
  '/results': {
    sidebarBg: 'bg-gradient-to-b from-[#f4f9ff] via-white to-[#e0f2fe]',
    navActive: 'bg-gradient-to-r from-[#DBEAFE] to-[#C7D2FE] text-[#1E3A8A] ring-1 ring-[#BFDBFE] shadow-sm shadow-sky-200/60',
    iconActive: 'border-[#BFDBFE] bg-white text-[#2563EB]',
    subLabelActive: 'text-[#1D4ED8]',
  },
  '/medical-history': {
    sidebarBg: 'bg-gradient-to-b from-[#f4f4f5] via-white to-[#e4e4e7]',
    navActive: 'bg-gradient-to-r from-[#f4f4f5] to-[#e4e4e7] text-[#27272a] ring-1 ring-[#d4d4d8] shadow-md shadow-slate-300/50',
    iconActive: 'border-[#d4d4d8] bg-white text-[#3f3f46]',
    subLabelActive: 'text-[#71717a]',
  },
};

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  const sidebarBackgroundClass = 'bg-gradient-to-b from-[#f5f5f4] via-white to-[#e5e7eb]';

  return (
    <div className={`flex h-full w-full flex-col border-r border-white/60 ${sidebarBackgroundClass} shadow-2xl`}>
      <div className="flex items-center justify-between border-b border-white/70 bg-white/70 px-5 py-5 backdrop-blur">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-400">Hoffman</p>
          <h1 className="text-xl font-bold text-slate-800">Sistema Holístico</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/60 hover:text-slate-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        <div className="rounded-2xl border border-gray-200/60 bg-white/70 p-4 shadow-inner backdrop-blur">
          <div className="flex flex-col gap-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const navTheme = SECTION_THEMES[item.to];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => {
                  const baseClasses =
                    'group relative flex items-center rounded-2xl px-3 py-3 transition-all duration-200';
                  const activeClasses = navTheme?.navActive ??
                    'bg-gradient-to-r from-[#2563eb] to-[#38bdf8] text-white shadow-lg shadow-blue-200/80';
                  const inactiveClasses = 'text-slate-500 hover:bg-white/80 hover:text-slate-900';
                  return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
                }}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`mr-3 flex h-10 w-10 items-center justify-center rounded-xl border text-sm transition-all duration-200 ${
                        isActive
                          ? navTheme?.iconActive ?? 'border-white/40 bg-white/20 text-white'
                          : 'border-slate-200 bg-white text-slate-500 group-hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className={`text-[11px] uppercase tracking-wide ${
                        isActive
                          ? navTheme?.subLabelActive ?? 'text-white/80'
                          : 'text-slate-400'
                      }`}>
                        Navegación
                      </span>
                    </div>
                    {isActive && !navTheme && (
                      <span className="absolute inset-y-2 right-3 w-px rounded-full bg-white/60" aria-hidden />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
          </div>
        </div>
      </nav>

      <div className="px-4 pb-6">
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner backdrop-blur">
          <div className="flex items-center justify-between">
            <button className="relative rounded-full p-2 text-slate-400 transition hover:bg-white/80 hover:text-slate-600">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(prev => !prev)}
                className="flex items-center space-x-3 rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-left text-slate-700 shadow-sm transition hover:bg-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 text-white">
                  <User className="h-5 w-5" />
                </span>
                <span className="hidden flex-col text-sm font-semibold leading-tight sm:flex">
                  {user.firstName} {user.lastName}
                  <span className="text-xs font-normal text-slate-400">{user.role}</span>
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute bottom-14 right-0 w-52 rounded-2xl border border-slate-100 bg-white/95 py-2 text-sm shadow-2xl">
                  <div className="px-4 py-2 text-xs uppercase text-slate-400">
                    {user.email}
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => {
                      setShowUserMenu(false);
                      onClose?.();
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex w-full items-center px-4 py-2 text-rose-500 transition hover:bg-rose-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};