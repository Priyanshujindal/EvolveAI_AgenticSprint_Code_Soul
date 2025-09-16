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
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState('enter'); // enter | verify
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  async function handleEmailSignup(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const newUser = await signup({ email, password, name });

      // If phone is provided, trigger OTP verification
      if (phone) {
        await sendPhoneCode(phone);
        setPhoneStep('verify');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err?.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePhoneVerify(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await confirmPhoneCode(otp);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (res) navigate('/');
    } catch (err) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (user) return null;

  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Create your account</h1>
        <Card>
          <CardContent>
            {phoneStep === 'enter' ? (
              <form className="space-y-4" onSubmit={handleEmailSignup}>
                <Input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} disabled={submitting} />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={submitting} />
                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} disabled={submitting} />
                <Input type="tel" placeholder="Indian phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} disabled={submitting} />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Account'}
                </Button>
              </form>
            ) : (
              <form className="space-y-2" onSubmit={handlePhoneVerify}>
                <Input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} disabled={submitting} />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting || !otp}>
                  Verify OTP
                </Button>
              </form>
            )}

            <div className="my-3 flex items-center gap-3 text-slate-500 text-sm">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span>or</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            <Button variant="secondary" onClick={handleGoogle} disabled={submitting}>
              Continue with Google
            </Button>
            <div id="recaptcha-container" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
