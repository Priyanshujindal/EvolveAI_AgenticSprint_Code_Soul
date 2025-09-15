import React from 'react';

export default function Button({ variant = 'primary', className = '', disabled = false, children, ...props }) {
  const base = 'inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2 text-sm font-medium';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300'
  };
  const cls = `${base} ${variants[variant] || variants.primary} ${className}`.trim();
  return (
    <button className={cls} disabled={disabled} {...props}>
      {children}
    </button>
  );
}


