import React, { useEffect, useState } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useToast } from '../components/ui/ToastProvider';
import getFriendlyAuthError from '../utils/firebaseErrorMessages';

export default function LoginPage() {
  const { user, login, loginWithGoogle, sendPhoneCode, confirmPhoneCode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState('enter'); // enter | verify
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

  // Google login
  async function handleGoogleLogin() {
    setError('');
    setSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (res) navigate(from, { replace: true });
    } catch (err) {
      const friendly = getFriendlyAuthError(err) || 'Google sign-in failed';
      setError(friendly);
      notify(friendly, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Send OTP for phone login
  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await sendPhoneCode(phone);
      setPhoneStep('verify');
    } catch (err) {
      const friendly = getFriendlyAuthError(err) || 'Failed to send OTP';
      setError(friendly);
      notify(friendly, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Confirm OTP
  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await confirmPhoneCode(otp);
      navigate(from, { replace: true });
    } catch (err) {
      const friendly = getFriendlyAuthError(err) || 'Invalid OTP';
      setError(friendly);
      notify(friendly, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (user) return null;

  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Welcome back</h1>
        <Card>
          <CardContent>
            {/* Email login */}
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={submitting} />
              <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} disabled={submitting} />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            {/* OR divider */}
            <div className="my-3 flex items-center gap-3 text-slate-500 text-sm">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span>or</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Google login */}
            <Button variant="secondary" onClick={handleGoogleLogin} disabled={submitting}>
              Continue with Google
            </Button>

            {/* Phone login */}
            <div id="recaptcha-container" className="mt-3" />
            {phoneStep === 'enter' && (
              <form className="space-y-2 mt-2" onSubmit={handleSendCode}>
                <Input type="tel" placeholder="Indian mobile (10 digits)" value={phone} onChange={e => setPhone(e.target.value)} disabled={submitting} />
                <Button type="submit" variant="secondary" disabled={submitting || !phone}>
                  Send OTP
                </Button>
              </form>
            )}
            {phoneStep === 'verify' && (
              <form className="space-y-2 mt-2" onSubmit={handleVerifyCode}>
                <Input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} disabled={submitting} />
                <Button type="submit" variant="secondary" disabled={submitting || !otp}>
                  Verify OTP
                </Button>
              </form>
            )}

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
              No account? <Link className="text-blue-600" to="/signup">Sign up</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
