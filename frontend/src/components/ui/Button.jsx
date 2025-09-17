import React from 'react';

export default function Button({ variant = 'primary', className = '', disabled = false, children, ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed px-3.5 py-2.5 text-sm font-medium shadow-sm focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900';
  const variants = {
    primary: 'bg-gradient-to-tr from-brand-600 to-brand-700 text-white hover:from-brand-600 hover:to-brand-800 focus:ring-brand-600',
    secondary: 'bg-blue-50 text-blue-900 hover:bg-blue-100 focus:ring-blue-300 dark:bg-slate-800 dark:text-blue-100 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
    ghost: 'bg-transparent text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800 focus:ring-brand-300'
  };
  const cls = `${base} ${variants[variant] || variants.primary} ${className}`.trim();
  return (
    <button className={cls} disabled={disabled} {...props}>
      {children}
    </button>
  );
}


