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
            <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await signup({ email, password }); navigate('/'); }}>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Name</label>
                <Input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Password</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Create account</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


