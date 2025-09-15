import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
      <div className="mx-auto max-w-6xl px-4">© {new Date().getFullYear()} AgenticSprit</div>
    </footer>
  );
}


