import React from 'react';

export function Card({ className = '', children }) {
  return <div className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm ${className}`.trim()}>{children}</div>;
}

export function CardHeader({ className = '', children }) {
  return <div className={`px-5 py-4 border-b border-slate-200 dark:border-slate-800 ${className}`.trim()}>{children}</div>;
}

export function CardTitle({ className = '', children }) {
  return <h2 className={`text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 ${className}`.trim()}>{children}</h2>;
}

export function CardContent({ className = '', children }) {
  return <div className={`p-5 text-slate-800 dark:text-slate-200 ${className}`.trim()}>{children}</div>;
}


