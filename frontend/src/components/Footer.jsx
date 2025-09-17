import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-10 relative overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur">
      <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-tr from-brand-600 to-blue-500" />
            Health Sphere
          </div>
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} Health Sphere · All rights reserved
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
            <a href="/" className="hover:text-slate-700 dark:hover:text-slate-200">Home</a>
            <a href="/dashboard" className="hover:text-slate-700 dark:hover:text-slate-200">Dashboard</a>
            <a href="/daily-checkin" className="hover:text-slate-700 dark:hover:text-slate-200">Daily Check‑In</a>
            <a href="/upload-report" className="hover:text-slate-700 dark:hover:text-slate-200">Upload Report</a>
            <a href="/chatbot" className="hover:text-slate-700 dark:hover:text-slate-200">AI Assistant</a>
            <a href="mailto:contact@example.com" className="hover:text-slate-700 dark:hover:text-slate-200">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}


