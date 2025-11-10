'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrainCircuit, LayoutDashboard, LogOut, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarProvider, SidebarFooter } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';

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
  const [isClient, setIsClient] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userDocRef);

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
    // This case is handled by the useEffect redirect, but it's good practice
    // to have a guard here.
    return null;
  }

  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarHeader>
                 <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                    <span className="font-headline">AlgoGenius</span>
                </Link>
            </SidebarHeader>
            <SidebarContent className="p-2">
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
                            <Link href="/dashboard">
                                <LayoutDashboard />
                                <span>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/profile')}>
                            <Link href="/dashboard/profile">
                                <UserCircle />
                                <span>Profile</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                 </SidebarMenu>
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
                            <div className='flex flex-col overflow-hidden'>
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
                        <SidebarMenuButton onClick={handleLogout}>
                            <LogOut />
                            <span>Log out</span>
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
