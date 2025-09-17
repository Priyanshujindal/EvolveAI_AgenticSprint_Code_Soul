import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';

export default function QuickActions({ onLocate }) {
  const navigate = useNavigate();
  
  return (
    <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="font-medium text-slate-900 dark:text-slate-100 mb-2">Quick actions</div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate('/daily-checkin')}>Daily Check-in</Button>
        <Button variant="secondary" onClick={() => navigate('/upload-report')}>Upload Report</Button>
        <Button variant="secondary" onClick={onLocate}>Find Ambulance</Button>
      </div>
    </div>
  );
}


