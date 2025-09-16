import React from 'react';

export default function Button({ variant = 'primary', className = '', disabled = false, children, ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed px-3.5 py-2.5 text-sm font-medium shadow-sm focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900';
  const variants = {
    primary: 'bg-gradient-to-tr from-brand-600 to-brand-700 text-white hover:from-brand-600 hover:to-brand-800 focus:ring-brand-600',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 focus:ring-slate-300'
  };
  const cls = `${base} ${variants[variant] || variants.primary} ${className}`.trim();
  return (
    <button className={cls} disabled={disabled} {...props}>
      {children}
    </button>
  );
}


