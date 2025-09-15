import React from 'react';

export default function StatCard({ label, value, hint, accent = 'blue' }) {
  const accents = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-slate-800 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-slate-800 dark:text-red-300'
  };
  return (
    <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className={`inline-block rounded px-2 py-0.5 text-xs ${accents[accent]}`}>{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}


