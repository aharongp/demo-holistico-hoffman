import React from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm sm:max-w-md',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-xl lg:max-w-2xl',
    xl: 'max-w-xl sm:max-w-2xl lg:max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-0">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gradient-to-br from-white/70 via-slate-200/60 to-slate-900/20 backdrop-blur"
          onClick={onClose}
        />

        <div className={clsx(
          'relative mx-auto inline-block w-full overflow-hidden rounded-[24px] border border-white/60 bg-white/90 text-left align-bottom shadow-2xl shadow-slate-200/80 backdrop-blur-xl transition-all sm:my-8 sm:align-middle',
          sizeClasses[size]
        )}>
          <div className="flex items-center justify-between border-b border-white/60 bg-white/70 px-4 py-3 sm:px-6 sm:py-4">
            <h3 className="pr-4 text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 text-slate-400 transition hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto px-4 py-4 sm:max-h-none sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};