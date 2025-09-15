import React from 'react';

export default function Input({ className = '', ...props }) {
  const base = 'block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-offset-0 outline-none';
  return <input className={`${base} ${className}`.trim()} {...props} />;
}


