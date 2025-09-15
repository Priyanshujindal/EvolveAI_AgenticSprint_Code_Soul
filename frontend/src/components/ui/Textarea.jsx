import React from 'react';

const Textarea = React.forwardRef(function Textarea({ className = '', rows = 4, ...props }, ref) {
  const base = 'block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-offset-0 outline-none';
  return <textarea ref={ref} rows={rows} className={`${base} ${className}`.trim()} {...props} />;
});

export default Textarea;


