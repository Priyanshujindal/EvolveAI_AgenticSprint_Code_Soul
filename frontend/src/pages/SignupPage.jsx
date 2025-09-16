import React, { useState } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const { user, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  if (user) {
    return null;
  }
  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Create your account</h1>
        <Card>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError('');
                setSubmitting(true);
                try {
                  await signup({ email, password });
                  navigate('/');
                } catch (err) {
                  const message = err?.message || 'Sign up failed';
                  setError(message);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Name</label>
                <Input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Password</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={submitting} />
              </div>
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Creating…' : 'Create account'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


