import React from 'react';

export default function Input({ className = '', ...props }) {
  const base = 'block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-offset-0 outline-none';
  return <input className={`${base} ${className}`.trim()} {...props} />;
}


