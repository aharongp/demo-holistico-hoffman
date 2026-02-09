import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  onRowClick?: (item: T) => void;
  rowKey?: (item: T, index: number) => React.Key;
  initialRows?: number;
  loadMoreStep?: number;
  loadMoreLabel?: string;
  rowClassName?: (item: T, index: number) => string | undefined;
}

export function Table<T extends Record<string, any>>({ 
  data, 
  columns, 
  className,
  onRowClick,
  rowKey,
  initialRows = 20,
  loadMoreStep,
  loadMoreLabel = 'Cargar más',
  rowClassName,
}: TableProps<T>) {
  const resolvedInitialRows = Math.max(initialRows, 0);
  const resolvedLoadMoreStep = Math.max(loadMoreStep ?? resolvedInitialRows, 1);

  const [visibleCount, setVisibleCount] = useState(() => Math.min(resolvedInitialRows || data.length, data.length));

  useEffect(() => {
    setVisibleCount(Math.min(resolvedInitialRows || data.length, data.length));
  }, [data.length, resolvedInitialRows]);

  const visibleData = data.slice(0, visibleCount || data.length);
  const canLoadMore = visibleCount < data.length;

  return (
    <div className={clsx('overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, colIndex) => (
                <th
                  key={colIndex}
                  className={clsx(
                    'px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleData.map((item, rowIndex) => (
              <tr
                key={rowKey ? rowKey(item, rowIndex) : rowIndex}
                className={clsx(
                  'hover:bg-gray-50 transition-colors duration-150',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(item, rowIndex)
                )}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={clsx(
                      'px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900',
                      column.className
                    )}
                  >
                    {column.render
                      ? column.render(item)
                      : String(item[column.key as keyof T] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canLoadMore && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => Math.min(prev + resolvedLoadMoreStep, data.length))}
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            {loadMoreLabel}
          </button>
        </div>
      )}
    </div>
  );
}