import React, { useEffect, useState } from 'react';
import Seo from '../components/Seo';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useToast } from '../components/ui/ToastProvider';
import getFriendlyAuthError from '../utils/firebaseErrorMessages';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { notify } = useToast();

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  // Email/password login
  async function handleEmailLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      const friendly = getFriendlyAuthError(err);
      setError(friendly);
      notify(friendly, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  

  

  

  if (user) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-brand-50 to-white dark:from-slate-900 dark:to-slate-950 grid place-items-center px-4">
      <Seo
        title="Sign in | Health Sphere"
        description="Securely sign in to access your health dashboard and reports."
        url="https://evolveai-backend.onrender.com/login"
        canonical="https://evolveai-backend.onrender.com/login"
        noIndex={true}
      />
      <div className="w-full max-w-5xl">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <div className="hidden md:flex relative overflow-hidden rounded-xl border border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
            <div className="relative z-10 my-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 dark:border-slate-700 px-3 py-1 text-xs text-brand-700 dark:text-blue-200 bg-brand-50/60 dark:bg-slate-800 mb-4">Secure by Firebase Auth</div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Your health, simplified</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Fast access to your dashboard, daily check-ins, and reports.</p>
              <ul className="mt-6 space-y-3 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">✓</span>
                  Quick, password-only sign in
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">✓</span>
                  Privacy-first, no social tracking
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">✓</span>
                  Modern, accessible design
                </li>
              </ul>
            </div>
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-gradient-to-tr from-brand-300/40 to-blue-300/40 blur-3xl" />
          </div>
          <div>
            <div className="mb-4">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Welcome back</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Sign in to continue to your dashboard.</p>
            </div>
            <Card>
              <CardContent>
                {error && (
                  <div role="alert" className="mb-3 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                  </div>
                )}
                <form className="space-y-4" onSubmit={handleEmailLogin}>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">Email</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" fill="none"></path><path d="M22 6l-10 7L2 6" /></svg>
                      </span>
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={submitting} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="text-xs text-blue-600 hover:underline disabled:opacity-50" disabled={submitting}>
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M19 11V7a7 7 0 0 0-14 0v4"/><rect x="5" y="11" width="14" height="10" rx="2"/></svg>
                      </span>
                      <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" disabled={submitting} className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full inline-flex items-center justify-center gap-2" disabled={submitting}>
                    {submitting && (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                        <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4"></path>
                      </svg>
                    )}
                    {submitting ? 'Signing in…' : 'Sign in'}
                  </Button>
                </form>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                  No account? <Link className="text-blue-600 hover:underline" to="/signup">Create one</Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
