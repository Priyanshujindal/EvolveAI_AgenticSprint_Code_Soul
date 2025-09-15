import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const linkCls = ({ isActive }) =>
    `px-2 py-1 rounded hover:text-blue-600 ${isActive ? 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-200'}`;

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <div className="mr-auto flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-blue-600" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">AgenticSprit</span>
        </div>
        {user ? (
          <>
            <NavLink className={linkCls} to="/">Dashboard</NavLink>
            <NavLink className={linkCls} to="/daily-checkin">Daily Check-in</NavLink>
            <NavLink className={linkCls} to="/upload-report">Upload Report</NavLink>
            <NavLink className={linkCls} to="/chatbot">Chatbot</NavLink>
            <Button onClick={logout} variant="secondary">Logout</Button>
          </>
        ) : (
          <>
            <NavLink className={linkCls} to="/login">Login</NavLink>
            <NavLink className={linkCls} to="/signup">Sign up</NavLink>
          </>
        )}
        <button onClick={toggleTheme} className="ml-2 px-2 py-1 rounded text-xs bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </nav>
  );
}


