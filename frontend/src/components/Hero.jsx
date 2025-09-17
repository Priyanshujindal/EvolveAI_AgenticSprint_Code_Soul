import React from 'react';

export default function Hero({ title, subtitle, cta }) {
  return (
    <section className="mb-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          {subtitle}
        </p>
      )}
      {cta && (
        <div className="mt-6 flex flex-wrap gap-3">
          {cta}
        </div>
      )}
    </section>
  );
}
