'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';

import StudentDashboard from '@/components/dashboards/StudentDashboard';
import EducatorDashboard from '@/components/dashboards/EducatorDashboard';

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
        Loading...
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
        <div className="flex h-full items-center justify-center">
          <p>Could not determine user role. Please contact support.</p>
        </div>
      )}
    </div>
  );
}
