import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-md transition-colors hover:text-brand-700 hover:bg-slate-100 dark:hover:bg-slate-800 ${isActive ? 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-200'}`;

  return (
    <nav className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-subtle">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="mr-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-brand-600 to-brand-700 shadow ring-1 ring-brand-500/30" />
            <span className="font-semibold tracking-wide text-slate-900 dark:text-slate-100">AgenticSprit</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <NavLink className={linkCls} to="/">Dashboard</NavLink>
            <NavLink className={linkCls} to="/daily-checkin">Daily Check-in</NavLink>
            <NavLink className={linkCls} to="/upload-report">Upload Report</NavLink>
          </div>
          <div className="flex items-center gap-2 relative">
            <button onClick={toggleTheme} aria-label="Toggle theme" className="px-2 py-1 rounded text-xs bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            {!loading && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="avatar" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-brand-600 text-white grid place-items-center text-xs">
                        {(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="hidden sm:inline text-sm max-w-[10rem] truncate">{user.displayName || user.email}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div role="menu" className="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-50">
                      <div className="px-3 py-2 text-sm text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                        <div className="font-medium truncate">{user.displayName || 'Signed in'}</div>
                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      </div>
                      <a
                        href="/profile"
                        className="block px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Profile
                      </a>
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false);
                          try { await logout(); } catch (_) {}
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        role="menuitem"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-1">
                  <NavLink className={linkCls} to="/login">Log in</NavLink>
                  <NavLink className={linkCls} to="/signup">Sign up</NavLink>
                </div>
              )
            )}
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
            {!loading && (
              user ? (
                <button
                  onClick={async () => {
                    setOpen(false);
                    try { await logout(); } catch (_) {}
                  }}
                  className="text-left px-3 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Log out
                </button>
              ) : (
                <>
                  <NavLink onClick={() => setOpen(false)} className={linkCls} to="/login">Log in</NavLink>
                  <NavLink onClick={() => setOpen(false)} className={linkCls} to="/signup">Sign up</NavLink>
                </>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}


