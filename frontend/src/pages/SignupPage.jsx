import React from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { user } = useAuth();
  if (user) {
    return null;
  }
  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Create your account</h1>
        <Card>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Name</label>
                <Input type="text" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Email</label>
                <Input type="email" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Password</label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full">Create account</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


