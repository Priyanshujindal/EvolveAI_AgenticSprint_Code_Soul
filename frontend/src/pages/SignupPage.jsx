import React from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Sign up</h1>
      <Card className="max-w-md">
        <CardContent>
          <form className="space-y-3">
            <div>
              <label className="block text-sm mb-1 text-slate-700">Name</label>
              <Input type="text" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-slate-700">Email</label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-slate-700">Password</label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full">Create account</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


