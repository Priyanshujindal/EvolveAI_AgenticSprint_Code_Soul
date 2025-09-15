import React from 'react';

export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`.trim()} />;
}


