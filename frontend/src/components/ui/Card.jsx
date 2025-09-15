import React from 'react';

export function Card({ className = '', children }) {
  return <div className={`bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 ${className}`.trim()}>{children}</div>;
}

export function CardHeader({ className = '', children }) {
  return <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-800 ${className}`.trim()}>{children}</div>;
}

export function CardTitle({ className = '', children }) {
  return <h2 className={`text-base font-medium text-slate-900 dark:text-slate-100 ${className}`.trim()}>{children}</h2>;
}

export function CardContent({ className = '', children }) {
  return <div className={`p-4 text-slate-800 dark:text-slate-200 ${className}`.trim()}>{children}</div>;
}


