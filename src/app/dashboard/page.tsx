'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';

import StudentDashboard from '@/components/dashboards/StudentDashboard';
import EducatorDashboard from '@/components/dashboards/EducatorDashboard';
import { BrainCircuit } from 'lucide-react';

interface UserProfile {
  role: 'student' | 'educator';
}

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const { data: userData, isLoading: isUserDocLoading } = useDoc<UserProfile>(userDocRef);

  if (isUserLoading || isUserDocLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-lg text-muted-foreground">
          <BrainCircuit className="h-6 w-6 animate-spin text-primary" />
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  const userRole = userData?.role;

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      {userRole === 'student' && <StudentDashboard />}
      {userRole === 'educator' && <EducatorDashboard />}
      {!userRole && (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-bold">Could not determine user role.</h2>
          <p className="text-muted-foreground">
            There might be an issue with your account setup. Please try logging in again or contact support.
          </p>
        </div>
      )}
    </div>
  );
}
