import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
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
  Settings,
  Bell,
  User,
  LogOut
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
    sidebarBg: 'bg-gradient-to-b from-[#ecfdf5] via-white to-[#d1fae5]',
    navActive: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 shadow-md shadow-emerald-200/60',
    iconActive: 'border-emerald-100 bg-white text-emerald-600',
    subLabelActive: 'text-emerald-600',
  },
  '/patients': {
    sidebarBg: 'bg-gradient-to-b from-[#f5f3ff] via-white to-[#ede9fe]',
    navActive: 'bg-[#f5f3ff] text-[#7c3aed] ring-1 ring-purple-100 shadow-md shadow-purple-200/60',
    iconActive: 'border-purple-100 bg-white text-[#7c3aed]',
    subLabelActive: 'text-[#7c3aed]',
  },
  '/instruments': {
    sidebarBg: 'bg-gradient-to-b from-[#f9fafb] via-white to-[#e5e7eb]',
    navActive: 'bg-[#f7f7f5] text-[#57534e] ring-1 ring-gray-200 shadow-md shadow-gray-300/60',
    iconActive: 'border-gray-200 bg-white text-[#57534e]',
    subLabelActive: 'text-[#78716c]',
  },
  '/programs': {
    sidebarBg: 'bg-gradient-to-b from-[#fff7ed] via-white to-[#fed7aa]',
    navActive: 'bg-[#fff7ed] text-[#ea580c] ring-1 ring-orange-100 shadow-md shadow-orange-200/60',
    iconActive: 'border-orange-100 bg-white text-[#ea580c]',
    subLabelActive: 'text-[#f97316]',
  },
  '/evolution': {
    sidebarBg: 'bg-gradient-to-b from-[#fef2f2] via-white to-[#fecaca]',
    navActive: 'bg-[#fef2f2] text-[#dc2626] ring-1 ring-rose-100 shadow-md shadow-rose-200/60',
    iconActive: 'border-rose-100 bg-white text-[#dc2626]',
    subLabelActive: 'text-[#f87171]',
  },
  '/reports': {
    sidebarBg: 'bg-gradient-to-b from-[#f8f1ea] via-white to-[#eadfcc]',
    navActive: 'bg-[#f6ede3] text-[#7F5B3E] ring-1 ring-[#e5d6c4] shadow-md shadow-[#e5d6c4]/60',
    iconActive: 'border-[#e0cfbb] bg-white text-[#7F5B3E]',
    subLabelActive: 'text-[#a87954]',
  },
};

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  const sidebarBackgroundClass = 'bg-gradient-to-b from-[#f7f7f7] via-white to-[#e5e7eb]';

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
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-inner backdrop-blur">
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