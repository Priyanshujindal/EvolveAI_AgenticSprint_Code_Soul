import React, { useEffect, useState } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const { user, signup, loginWithGoogle, sendPhoneCode, confirmPhoneCode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState('enter');
  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
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
                  await signup({ email, password, name });
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
            <div className="my-3 flex items-center gap-3 text-slate-500 text-sm">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span>or</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="grid gap-2">
              <Button variant="secondary" onClick={async () => {
                setError('');
                setSubmitting(true);
                try {
                  const res = await loginWithGoogle();
                  if (res) {
                    navigate('/');
                  }
                } catch (err) {
                  setError(err?.message || 'Google sign-in failed');
                } finally {
                  setSubmitting(false);
                }
              }} disabled={submitting}>
                Continue with Google
              </Button>
              <div id="recaptcha-container" />
              {phoneStep === 'enter' && (
                <form className="space-y-2" onSubmit={async (e) => {
                  e.preventDefault();
                  setError('');
                  setSubmitting(true);
                  try {
                    await sendPhoneCode(phone);
                    setPhoneStep('verify');
                  } catch (err) {
                    setError(err?.message || 'Failed to send code');
                  } finally {
                    setSubmitting(false);
                  }
                }}>
                  <Input
                    type="tel"
                    placeholder="Indian mobile (10 digits)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="text-xs text-slate-500">We'll send an OTP to +91. Enter 10 digits only.</p>
                  <Button type="submit" variant="secondary" disabled={submitting || !phone}>Send code</Button>
                </form>
              )}
              {phoneStep === 'verify' && (
                <form className="space-y-2" onSubmit={async (e) => {
                  e.preventDefault();
                  setError('');
                  setSubmitting(true);
                  try {
                    await confirmPhoneCode(otp);
                    navigate('/');
                  } catch (err) {
                    setError(err?.message || 'Invalid code');
                  } finally {
                    setSubmitting(false);
                  }
                }}>
                  <Input type="text" placeholder="6-digit code" value={otp} onChange={e => setOtp(e.target.value)} disabled={submitting} />
                  <Button type="submit" variant="secondary" disabled={submitting || !otp}>Verify code</Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


