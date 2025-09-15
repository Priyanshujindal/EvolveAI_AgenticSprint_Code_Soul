import React from 'react';
import Button from './ui/Button';

export default function QuickActions({ onAnalyze, onLocate }) {
  return (
    <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="font-medium text-slate-900 dark:text-slate-100 mb-2">Quick actions</div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onAnalyze}>Run Analysis</Button>
        <Button variant="secondary" onClick={onLocate}>Find Ambulance</Button>
      </div>
    </div>
  );
}


