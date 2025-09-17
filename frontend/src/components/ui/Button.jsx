import React from 'react';

export default function Button({ 
  variant = 'primary', 
  size = 'md',
  className = '', 
  disabled = false, 
  children, 
  ...props 
}) {
  const base = 'inline-flex items-center justify-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-sm focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900';
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3.5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };
  
  const variants = {
    primary: 'bg-gradient-to-tr from-brand-600 to-brand-700 text-white hover:from-brand-600 hover:to-brand-800 focus:ring-brand-600 hover:shadow-lg transform hover:-translate-y-0.5',
    secondary: 'bg-blue-50 text-blue-900 hover:bg-blue-100 focus:ring-blue-300 dark:bg-slate-800 dark:text-blue-100 dark:hover:bg-slate-700',
    outline: 'border-2 border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white focus:ring-brand-600 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-400 dark:hover:text-slate-900',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 hover:shadow-lg transform hover:-translate-y-0.5',
    ghost: 'bg-transparent text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800 focus:ring-brand-300'
  };
  
  const cls = `${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`.trim();
  
  return (
    <button className={cls} disabled={disabled} {...props}>
      {children}
    </button>
  );
}


