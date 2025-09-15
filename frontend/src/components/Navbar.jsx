import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
// Auth controls removed per request

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-md transition-colors hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 ${isActive ? 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-200'}`;

  return (
    <nav className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="mr-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 shadow ring-1 ring-blue-500/30" />
            <span className="font-semibold tracking-wide text-slate-900 dark:text-slate-100">AgenticSprit</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <NavLink className={linkCls} to="/">Dashboard</NavLink>
            <NavLink className={linkCls} to="/daily-checkin">Daily Check-in</NavLink>
            <NavLink className={linkCls} to="/upload-report">Upload Report</NavLink>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} aria-label="Toggle theme" className="px-2 py-1 rounded text-xs bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <div id="mobile-nav" className="md:hidden mt-3 grid gap-1">
            <NavLink onClick={() => setOpen(false)} className={linkCls} to="/">Dashboard</NavLink>
            <NavLink onClick={() => setOpen(false)} className={linkCls} to="/daily-checkin">Daily Check-in</NavLink>
            <NavLink onClick={() => setOpen(false)} className={linkCls} to="/upload-report">Upload Report</NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}


