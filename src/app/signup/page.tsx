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
import { Textarea } from '@/components/ui/textarea';

export default function SignupPage() {
  // Common state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'educator' | null>(null);

  // Student-specific state
  const [academicLevel, setAcademicLevel] = useState('');
  const [learningGoals, setLearningGoals] = useState('');
  const [languages, setLanguages] = useState('');

  // Educator-specific state
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [institution, setInstitution] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // This effect runs when the user object is available after signup.
    // It creates the user document in Firestore.
    if (user && isSubmitting) {
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');

      const userRef = doc(firestore, 'users', user.uid);
      
      let profileData: any = {
        id: user.uid,
        email: user.email,
        role: role,
        firstName: firstName,
        lastName: lastName,
      };
      
      if (role === 'student') {
        profileData = {
          ...profileData,
          academicLevel,
          learningGoals,
          preferredProgrammingLanguages: languages.split(',').map(s => s.trim()),
        };
      } else if (role === 'educator') {
        profileData = {
          ...profileData,
          subjectSpecialization: specialization,
          yearsOfExperience: parseInt(experience, 10) || 0,
          institution,
        };
      }

      setDocumentNonBlocking(userRef, profileData, { merge: true });
      
      // Redirect to dashboard after setting document.
      // Non-blocking nature means we don't wait for Firestore write to complete.
      router.push('/dashboard');
    }
  }, [user, isSubmitting, router, firestore, fullName, role, academicLevel, learningGoals, languages, specialization, experience, institution]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      alert("Please select a role.");
      return;
    }
    setIsSubmitting(true);
    initiateEmailSignUp(auth, email, password);
  };

  if (isUserLoading || (user && isSubmitting)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
            <BrainCircuit className="h-12 w-12 text-primary animate-pulse mx-auto" />
            <p className="text-lg text-muted-foreground">Setting up your AlgoGenius account...</p>
        </div>
      </div>
    );
  }
  
  if (user && !isSubmitting) {
    // If user is logged in but didn't just submit, redirect them away.
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-3xl font-bold"
          >
            <BrainCircuit className="h-8 w-8 text-primary" />
            <span className="font-headline">AlgoGenius</span>
          </Link>
        </div>
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
            <CardDescription>
              Join the next generation of coders and educators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSignup}>
              <div className="space-y-2">
                <Label>I am a...</Label>
                <RadioGroup
                  className="flex gap-4 pt-2"
                  value={role ?? ''}
                  onValueChange={(value) => setRole(value as 'student' | 'educator')}
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

              {role && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        placeholder="john.doe@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  {role === 'student' && (
                    <div className="space-y-4 animate-in fade-in-50 duration-500">
                      <div className="space-y-2">
                        <Label htmlFor="academicLevel">Academic Level</Label>
                        <Input id="academicLevel" placeholder="e.g., University Sophomore" value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="learningGoals">Learning Goals</Label>
                        <Textarea id="learningGoals" placeholder="e.g., Prepare for interviews, master dynamic programming" value={learningGoals} onChange={(e) => setLearningGoals(e.target.value)} />
                      </div>
                       <div className="space-y-2">
                        <Label htmlFor="languages">Preferred Languages (comma-separated)</Label>
                        <Input id="languages" placeholder="e.g., Python, JavaScript, C++" value={languages} onChange={(e) => setLanguages(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {role === 'educator' && (
                    <div className="space-y-4 animate-in fade-in-50 duration-500">
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Subject Specialization</Label>
                        <Input id="specialization" placeholder="e.g., Algorithms, Data Science" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                      </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="experience">Years of Experience</Label>
                          <Input id="experience" type="number" placeholder="e.g., 5" value={experience} onChange={(e) => setExperience(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="institution">Institution</Label>
                          <Input id="institution" placeholder="e.g., State University" value={institution} onChange={(e) => setInstitution(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full !mt-8" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </>
              )}
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="underline text-foreground font-medium">
                Log In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
