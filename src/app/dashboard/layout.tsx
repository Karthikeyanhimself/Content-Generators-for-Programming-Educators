
'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrainCircuit, LayoutDashboard, LogOut, PanelLeft, UserCircle, GraduationCap, Send, Pencil, Users, Settings, BookCopy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarProvider, SidebarFooter, SidebarTrigger, SidebarGroup, SidebarGroupLabel, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/firebase';
import { collection, doc, orderBy, query, updateDoc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogFooter, AlertDialogTrigger, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

  // State for editing a submission
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);
  const [editableScore, setEditableScore] = useState<number | string>('');
  const [editableFeedback, setEditableFeedback] = useState<string>('');


  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userDocRef);

  const submissionsQuery = useMemoFirebase(
    () =>
      user && userProfile?.role === 'educator'
        ? query(
            collection(firestore, `educators/${user.uid}/submissions`),
            orderBy('submittedAt', 'desc')
          )
        : null,
    [firestore, user, userProfile]
  );
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection(submissionsQuery);

  useEffect(() => {
    setIsClient(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  // When a submission is selected for editing, populate the state
  useEffect(() => {
    if (editingSubmission) {
      setEditableScore(editingSubmission.score);
      setEditableFeedback(editingSubmission.feedback);
    }
  }, [editingSubmission]);

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };

  const handlePublishScore = async (submission: any) => {
    if (!firestore || !submission || !user) return;
    setIsPublishing(submission.id);

    try {
      // 1. Update the student's original assignment document with the (potentially edited) score and feedback
      const studentAssignmentRef = doc(firestore, 'users', submission.studentId, 'assignments', submission.originalAssignmentId);
      await updateDoc(studentAssignmentRef, {
        score: Number(editableScore), // Use the editable score from state
        feedback: editableFeedback, // Use the editable feedback from state
        status: 'completed',
      });

      // 2. Update the denormalized submission record to mark it as published
      const educatorSubmissionRef = doc(firestore, `educators/${user.uid}/submissions/${submission.id}`);
      await updateDoc(educatorSubmissionRef, {
        isPublished: true,
        score: Number(editableScore), // Also update the score here for consistency
        feedback: editableFeedback,
      });

      toast({
        title: 'Score Published!',
        description: `${submission.studentName} can now see their results.`,
      });
      
      setEditingSubmission(null); // Close the dialog by resetting the state

    } catch (error) {
      console.error('Error publishing score:', error);
      toast({
        variant: 'destructive',
        title: 'Publishing Failed',
        description: 'Could not publish the score. Please check permissions and try again.',
      });
    } finally {
      setIsPublishing(null);
    }
  };


  const isLoading = !isClient || isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-lg text-muted-foreground">
          <BrainCircuit className="h-6 w-6 animate-spin text-primary" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  }
  
  return (
    <SidebarProvider>
        <Sidebar collapsible="icon">
             <SidebarHeader className='flex items-center p-4'>
                 <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                    <span className="font-headline group-data-[collapsible=icon]:hidden">Dashboard</span>
                </Link>
            </SidebarHeader>
            <SidebarContent className="p-2">
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                            <Link href="/dashboard">
                                <LayoutDashboard />
                                <span>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {userProfile?.role === 'educator' && (
                        <>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/scenarios')} tooltip="Scenarios">
                                    <Link href="/dashboard/scenarios">
                                        <BrainCircuit />
                                        <span>Scenarios</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/students')} tooltip="Students">
                                    <Link href="/dashboard/students">
                                        <Users />
                                        <span>Students</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </>
                    )}
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/assignments')} tooltip="Assignments">
                            <Link href="/dashboard/assignments">
                                <BookCopy />
                                <span>Assignments</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                 </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-2 mt-auto">
                <SidebarMenu>
                     <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/profile')} tooltip="Profile">
                            <Link href="/dashboard/profile">
                                <Settings />
                                <span>Profile</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <div className='flex items-center gap-3 p-2 w-full'>
                             <Avatar className="h-8 w-8">
                                <AvatarImage
                                src={user.photoURL ?? ''}
                                alt={userProfile?.firstName ?? user.email ?? ''}
                                />
                                <AvatarFallback>
                                {getInitials(userProfile?.firstName)}
                                </AvatarFallback>
                            </Avatar>
                            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden">
                                <LogOut/>
                                <span>Log Out</span>
                            </button>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
        <main className="flex-1 bg-background">
            <div className="p-4 md:p-8">
                 {children}
            </div>
        </main>
    </SidebarProvider>
  );
}
