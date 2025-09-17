import React from 'react';

export default function ActivityFeed({ items = [] }) {
  const data = items.length ? items : [
    { type: 'info', text: 'Welcome! Start by running an analysis.' },
    { type: 'tip', text: 'Upload a report to extract structured insights.' }
  ];
  
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Recent Activity
      </h3>
      <div className="space-y-3">
        {data.map((d, i) => (
          <div 
            key={i} 
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
          >
            <div className={`flex-shrink-0 w-2 h-2 mt-2.5 rounded-full ${d.type === 'tip' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {d.text}
            </div>
            <div className="text-xs text-slate-400 ml-auto whitespace-nowrap">
              Just now
            </div>
          </div>
        ))}
      </div>
      {data.length > 0 && (
        <button className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
          View all activity →
        </button>
      )}
    </div>
  );
}
