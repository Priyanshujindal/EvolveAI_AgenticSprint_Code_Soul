import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Page not found</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-4">The page you are looking for doesn’t exist.</p>
      <Link className="text-blue-600 hover:underline" to="/">Go back home</Link>
    </div>
  );
}


