'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrainCircuit, LayoutDashboard, LogOut, PanelLeft, UserCircle, GraduationCap, Send } from 'lucide-react';
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

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };

  const handlePublishScore = async (submission: any) => {
    if (!firestore || !submission) return;
    setIsPublishing(submission.id);

    try {
      // 1. Update the student's original assignment document
      const studentAssignmentRef = doc(firestore, 'users', submission.studentId, 'assignments', submission.originalAssignmentId);
      await updateDoc(studentAssignmentRef, {
        score: submission.score,
        feedback: submission.feedback,
        status: 'completed',
      });

      // 2. Update the denormalized submission record to mark it as published
      const educatorSubmissionRef = doc(firestore, `educators/${user!.uid}/submissions/${submission.id}`);
      await updateDoc(educatorSubmissionRef, {
        isPublished: true,
      });

      toast({
        title: 'Score Published!',
        description: `${submission.studentName} can now see their results.`,
      });
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

  return (
    <SidebarProvider>
        <Sidebar collapsible="icon">
            <SidebarHeader className='flex items-center p-2'>
                 <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                    <span className="font-headline group-data-[collapsible=icon]:hidden">AlgoGenius</span>
                </Link>
                <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:rotate-180">
                    <PanelLeft/>
                </SidebarTrigger>
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
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/profile')} tooltip="Profile">
                            <Link href="/dashboard/profile">
                                <UserCircle />
                                <span>Profile</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                 </SidebarMenu>
                  {userProfile?.role === 'educator' && (
                  <SidebarGroup>
                      <SidebarGroupLabel>Submissions</SidebarGroupLabel>
                      <SidebarMenu>
                          {isLoadingSubmissions && !submissions ? (
                              <p className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Loading...</p>
                          ) : submissions && submissions.length > 0 ? (
                            <ScrollArea className="h-64">
                              {submissions.map((sub: any) => (
                                <SidebarMenuItem key={sub.id}>
                                   <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <SidebarMenuButton variant="ghost" className="h-auto w-full justify-start text-left">
                                                <div className="flex flex-col">
                                                    <span>{sub.studentName}</span>
                                                    <span className="text-xs text-muted-foreground">{sub.dsaConcept} - {sub.score}%</span>
                                                </div>
                                            </SidebarMenuButton>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="max-w-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{sub.studentName}'s Submission for: {sub.dsaConcept}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Submitted on {sub.submittedAt ? format(sub.submittedAt.toDate(), 'PPP') : ''}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <ScrollArea className="max-h-[50vh]">
                                                <div className="space-y-4 p-1">
                                                    <div>
                                                        <h4 className="font-semibold mb-2">AI-Assessed Score: {sub.score}%</h4>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md border">{sub.feedback}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold mb-2">Submitted Code:</h4>
                                                        <pre className="bg-muted p-4 rounded-md text-xs text-foreground overflow-x-auto"><code>{sub.solutionCode}</code></pre>
                                                    </div>
                                                </div>
                                            </ScrollArea>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Close</AlertDialogCancel>
                                                {!sub.isPublished ? (
                                                    <Button onClick={() => handlePublishScore(sub)} disabled={isPublishing === sub.id}>
                                                        {isPublishing === sub.id ? 'Publishing...' : <><Send className="mr-2 h-4 w-4" /> Publish Score</>}
                                                    </Button>
                                                ) : (
                                                    <Button disabled>Already Published</Button>
                                                )}
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </SidebarMenuItem>
                              ))}
                              </ScrollArea>
                          ) : (
                               <div className="p-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                                  No submissions yet.
                               </div>
                          )}
                      </SidebarMenu>
                  </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter className="p-2">
                <SidebarMenu>
                     <SidebarMenuItem>
                        <div className='flex items-center gap-3 p-2'>
                             <Avatar className="h-8 w-8">
                                <AvatarImage
                                src={user.photoURL ?? ''}
                                alt={userProfile?.firstName ?? user.email ?? ''}
                                />
                                <AvatarFallback>
                                {userProfile?.firstName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className='flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden'>
                                <p className="text-sm font-medium leading-none truncate">
                                    {userProfile?.firstName || 'User'}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout} tooltip="Log Out">
                            <LogOut />
                            <span className="group-data-[collapsible=icon]:hidden">Log out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
        <main className="flex-1">
            <div className="p-4 md:p-8">
                 {children}
            </div>
        </main>
    </SidebarProvider>
  );
}

    