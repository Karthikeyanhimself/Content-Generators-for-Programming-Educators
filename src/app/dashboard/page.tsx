
'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';

import StudentDashboard from '@/components/dashboards/StudentDashboard';
import EducatorDashboard from '@/components/dashboards/EducatorDashboard';
import { BrainCircuit } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface UserProfile {
  role: 'student' | 'educator';
  firstName: string;
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
  const userName = userData?.firstName || user.email;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline">Welcome back, {userName}!</h1>
            <p className="text-muted-foreground">Here's your overview for today.</p>
          </div>
          <SidebarTrigger className="md:hidden"/>
      </div>
      {userRole === 'student' && <StudentDashboard userProfile={userData} />}
      {userRole === 'educator' && <EducatorDashboard userProfile={userData} />}
      {!userRole && (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-bold">Could not determine user role.</h2>
          <p className="text-muted-foreground">
            There might be an issue with your account setup. Please try logging in again or contact support.
          </p>
        </div>
      )}
    </>
  );
}
