import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, loading, loginWithGoogle } = useAuth();
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
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              aria-pressed={theme === 'dark'}
              className="relative inline-flex w-14 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900
                bg-slate-200 dark:bg-slate-700"
            >
              {/* track icons */}
              <span className="absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-300 text-amber-500 ${theme === 'dark' ? 'opacity-0' : 'opacity-100'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Zm0 13a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm7-6a1 1 0 0 1 1 1h1a1 1 0 1 1 0 2h-1a1 1 0 1 1-2 0 1 1 0 0 1 1-1ZM4 12a1 1 0 0 1 1-1H6a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm12.95-6.364a1 1 0 0 1 1.414 0l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414ZM4.929 17.657a1 1 0 0 1 1.414 0l.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414Zm12.021 2.121a1 1 0 0 1 0-1.414l.707-.707a1 1 0 1 1 1.414 1.414l-.707.707a1 1 0 0 1-1.414 0ZM6.05 5.636a1 1 0 0 1 0 1.414l-.707.707A1 1 0 1 1 3.929 6.343l.707-.707A1 1 0 0 1 6.05 5.636Z"/></svg>
              </span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 transition-opacity duration-300 text-sky-400 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>
              </span>
              {/* thumb */}
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
            {!loading && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className="relative inline-flex items-center gap-2 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    <span className="relative inline-block">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full ring-2 ring-brand-500/40" />
                      ) : (
                        <span className="w-8 h-8 rounded-full grid place-items-center text-white text-sm font-medium bg-gradient-to-tr from-brand-600 to-brand-700 ring-2 ring-brand-500/40">
                          {(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute -right-0.5 -bottom-0.5 block w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" aria-hidden="true"></span>
                    </span>
                    <span className="hidden sm:inline text-sm max-w-[10rem] truncate">{user.displayName || user.email}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div role="menu" className="absolute right-0 mt-2 w-60 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-50">
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
                <div className="hidden md:flex items-center gap-2">
                  <NavLink className={linkCls} to="/login">Log in</NavLink>
                  <NavLink className={linkCls} to="/signup">Sign up</NavLink>
                  <Button variant="secondary" onClick={() => { try { loginWithGoogle(); } catch(_) {} }}>Continue with Google</Button>
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
                  <button
                    onClick={() => { setOpen(false); try { loginWithGoogle(); } catch(_) {} }}
                    className="text-left px-3 py-2 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Continue with Google
                  </button>
                </>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}


