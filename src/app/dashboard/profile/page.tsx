'use client';

import { useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userDocRef);

  const [formData, setFormData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        // Student fields
        academicLevel: userProfile.academicLevel || '',
        learningGoals: userProfile.learningGoals || '',
        preferredProgrammingLanguages: (userProfile.preferredProgrammingLanguages || []).join(', '),
        // Educator fields
        subjectSpecialization: userProfile.subjectSpecialization || '',
        yearsOfExperience: userProfile.yearsOfExperience || '',
        institution: userProfile.institution || '',
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDocRef) return;
    setIsUpdating(true);

    const updatedData = { ...formData };
    if (userProfile.role === 'student') {
        updatedData.preferredProgrammingLanguages = updatedData.preferredProgrammingLanguages.split(',').map((s: string) => s.trim());
    }
     if (userProfile.role === 'educator') {
        updatedData.yearsOfExperience = parseInt(updatedData.yearsOfExperience, 10) || 0;
    }


    setDocumentNonBlocking(userDocRef, updatedData, { merge: true });
    
    toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved.',
    });

    setIsUpdating(false);
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-lg text-muted-foreground">
          <BrainCircuit className="h-6 w-6 animate-spin text-primary" />
          <span>Loading Profile...</span>
        </div>
      </div>
    );
  }
  
  if (!userProfile) {
    return <div>Could not load profile.</div>
  }

  return (
    <>
    <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">My Profile</h1>
            <p className="text-muted-foreground">View and update your account details.</p>
        </div>
        <SidebarTrigger className="md:hidden"/>
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>
          This information is used to personalize your experience. Your email and role cannot be changed.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleUpdateProfile}>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={formData.firstName || ''} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={formData.lastName || ''} onChange={handleInputChange} />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={userProfile.email} disabled />
            </div>
             <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={userProfile.role} disabled className="capitalize" />
            </div>

            {/* Student Fields */}
            {userProfile.role === 'student' && (
                <div className="space-y-6 pt-6 border-t">
                    <h3 className="text-lg font-medium">Student Details</h3>
                    <div className="space-y-2">
                        <Label htmlFor="academicLevel">Academic Level</Label>
                        <Input id="academicLevel" placeholder="e.g., University Sophomore" value={formData.academicLevel || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="learningGoals">Learning Goals</Label>
                        <Textarea id="learningGoals" placeholder="e.g., Prepare for interviews, master dynamic programming" value={formData.learningGoals || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="preferredProgrammingLanguages">Preferred Languages (comma-separated)</Label>
                        <Input id="preferredProgrammingLanguages" placeholder="e.g., Python, JavaScript, C++" value={formData.preferredProgrammingLanguages || ''} onChange={handleInputChange} />
                    </div>
                </div>
            )}

             {/* Educator Fields */}
            {userProfile.role === 'educator' && (
                <div className="space-y-6 pt-6 border-t">
                    <h3 className="text-lg font-medium">Educator Details</h3>
                    <div className="space-y-2">
                        <Label htmlFor="subjectSpecialization">Subject Specialization</Label>
                        <Input id="subjectSpecialization" placeholder="e.g., Algorithms, Data Science" value={formData.subjectSpecialization || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                            <Input id="yearsOfExperience" type="number" placeholder="e.g., 5" value={formData.yearsOfExperience || ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="institution">Institution</Label>
                            <Input id="institution" placeholder="e.g., State University" value={formData.institution || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter>
            <Button type="submit" disabled={isUpdating}>
                 {isUpdating ? (
                    <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                    </>
                    ) : 'Update Profile'}
            </Button>
        </CardFooter>
      </form>
    </Card>
    </>
  );
}
