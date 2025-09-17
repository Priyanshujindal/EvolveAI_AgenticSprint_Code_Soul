import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Home() {
  return (
    <div className="relative">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Health Sphere</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Your AI Health Companion</p>
      </header>

      <section className="prose dark:prose-invert max-w-none">
        <p>
          Stay proactive with AI-powered insights. Log quick daily check-ins, visualize trends, and upload medical reports
          to get simplified, plain-language summaries.
        </p>
      </section>

      <div className="mt-8 space-y-6">
        <article className="rounded-md border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Daily Check‑In</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Log how you feel each day and review your history to spot patterns early. AI summarizes trends to help you stay ahead.
              </p>
              <NavLink to="/daily-checkin" className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Get Started →</NavLink>
            </div>
          </div>
        </article>

        <article className="rounded-md border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-600 dark:text-blue-400" aria-hidden="true">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20l9-5-9-5-9 5 9 5z"/><path d="M12 12l9-5-9-5-9 5 9 5z"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Medical Report Analysis</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Upload reports; OCR extracts key details and provides a clear summary to discuss with your clinician.
              </p>
              <NavLink to="/upload-report" className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Get Started →</NavLink>
            </div>
          </div>
        </article>
      </div>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        These tools help you track day‑to‑day health and gain proactive insights, keeping you informed and prepared.
      </p>
    </div>
  );
}


