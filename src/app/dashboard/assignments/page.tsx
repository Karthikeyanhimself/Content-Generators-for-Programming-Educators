
'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';

import EducatorAssignments from '@/components/dashboards/assignments/EducatorAssignments';
import StudentAssignments from '@/components/dashboards/assignments/StudentAssignments';
import { BrainCircuit } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface UserProfile {
  role: 'student' | 'educator';
}

export default function AssignmentsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );

  const { data: userData, isLoading: isUserDocLoading } = useDoc<UserProfile>(userDocRef);

  if (isUserLoading || isUserDocLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex items-center gap-3 text-lg text-muted-foreground">
          <BrainCircuit className="h-6 w-6 animate-spin text-primary" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const userRole = userData?.role;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">
            {userRole === 'educator' ? 'Student Submissions' : 'My Assignments'}
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'educator'
              ? 'Review submitted work and track published grades.'
              : 'Challenges assigned to you by your educators or the AI agent.'}
          </p>
        </div>
        <SidebarTrigger className="md:hidden" />
      </div>

      {userRole === 'educator' && <EducatorAssignments />}
      {userRole === 'student' && <StudentAssignments />}
    </>
  );
}
