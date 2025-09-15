import React from 'react';

export default function ActivityFeed({ items = [] }) {
  const data = items.length ? items : [
    { type: 'info', text: 'Welcome! Start by running an analysis.' },
    { type: 'tip', text: 'Upload a report to extract structured insights.' }
  ];
  return (
    <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="font-medium text-slate-900 dark:text-slate-100 mb-2">Recent activity</div>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {data.map((d, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1 w-2 h-2 rounded-full ${d.type === 'tip' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            <span>{d.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


