import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content */}
      <div className="flex-1 relative flex flex-col min-w-0 lg:ml-0">
        <header className="sm:hidden fixed inset-x-0 top-0 z-30 border-b border-white/70 bg-gradient-to-b from-[#f7f7f7] via-white to-[#e5e7eb] shadow-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-400">Hoffmann</p>
              <h1 className="text-lg font-bold text-slate-800">Sistema Hoffmann</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-lg shadow-slate-200"
            >
              <Menu className="h-4 w-4" />
              Menú
            </button>
          </div>
        </header>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden sm:flex lg:hidden justify-end p-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-lg shadow-slate-200"
          >
            <Menu className="h-4 w-4" />
            Menú
          </button>
        </div>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 pt-24 sm:pt-4 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
};