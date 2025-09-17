import React from 'react';

export function Card({ className = '', children, hoverable = false }) {
  return (
    <div 
      className={`
        bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm 
        rounded-xl border border-slate-200 dark:border-slate-800 
        shadow-sm hover:shadow-md transition-all duration-300
        ${hoverable ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }) {
  return (
    <div 
      className={`
        px-6 py-5 border-b border-slate-200/80 dark:border-slate-800/80
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children }) {
  return (
    <h2 
      className={`
        text-lg font-semibold tracking-tight 
        text-slate-900 dark:text-slate-100
        ${className}
      `.trim()}
    >
      {children}
    </h2>
  );
}

export function CardContent({ className = '', children }) {
  return (
    <div 
      className={`
        p-6 text-slate-800 dark:text-slate-200 
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}
