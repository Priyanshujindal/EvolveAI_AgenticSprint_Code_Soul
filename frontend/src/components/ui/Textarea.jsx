import React from 'react';

const Textarea = React.forwardRef(function Textarea({ className = '', rows = 4, ...props }, ref) {
  const base = 'block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:ring-offset-0 outline-none';
  return <textarea ref={ref} rows={rows} className={`${base} ${className}`.trim()} {...props} />;
});

export default Textarea;


