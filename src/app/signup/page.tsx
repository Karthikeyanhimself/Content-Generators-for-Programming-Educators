'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BrainCircuit } from 'lucide-react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && fullName) {
      // Create user profile document after user is created
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');

      const userRef = doc(firestore, 'users', user.uid);
      
      setDocumentNonBlocking(userRef, {
        id: user.uid,
        email: user.email,
        role: role,
        firstName: firstName,
        lastName: lastName,
      }, { merge: true });

      router.push('/dashboard');
    }
  }, [user, router, firestore, fullName, role]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    initiateEmailSignUp(auth, email, password);
  };

  if (isUserLoading) {
    return <div>Loading...</div>;
  }
  
  if (user) {
    // While profile is being created, show loading or redirect.
    return <div>Setting up your account...</div>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold"
          >
            <BrainCircuit className="h-8 w-8 text-primary" />
            <span className="font-headline">AlgoGenius</span>
          </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
            <CardDescription>
              Start your journey with AlgoGenius today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>I am a...</Label>
                <RadioGroup
                  defaultValue="student"
                  className="flex gap-4 pt-1"
                  value={role}
                  onValueChange={setRole}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="student" id="student" />
                    <Label htmlFor="student" className="font-normal">
                      Student
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="educator" id="educator" />
                    <Label htmlFor="educator" className="font-normal">
                      Educator
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Log In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
