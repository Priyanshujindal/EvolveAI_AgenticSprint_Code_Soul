import React, { useState } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const from = location.state?.from?.pathname || '/';

  function onSubmit(e) {
    e.preventDefault();
    // Fake login: set simple user object
    login({ id: 'demo', email });
    navigate(from, { replace: true });
  }

  if (user) {
    return null;
  }

  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Welcome back</h1>
        <Card>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Password</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">No account? <Link className="text-blue-600" to="/signup">Sign up</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


