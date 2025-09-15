import React from 'react';

export default function Hero({ title, subtitle, cta }) {
  return (
    <section className="mb-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
      {subtitle && <p className="mt-2 text-slate-600 dark:text-slate-400">{subtitle}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </section>
  );
}


