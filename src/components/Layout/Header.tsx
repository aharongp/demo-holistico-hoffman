import React, { useState } from 'react';
import { Bell, User, LogOut, Settings, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!user) return null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6">
      <div className="flex items-center">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden mr-2"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 capitalize truncate">
          {user.role} Dashboard
        </h2>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Notifications */}
        <button className="relative p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:block">
              {user.firstName} {user.lastName}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                <div className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-500 border-b border-gray-100 truncate">
                  {user.email}
                </div>
                <button className="w-full flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Settings
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};