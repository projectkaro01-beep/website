import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  message = 'Loading data...',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <div className={`${sizeMap[size]} border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3`} />
      {message && <p className="text-sm font-medium">{message}</p>}
    </div>
  );
};
