
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader, UserPlus, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Student = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
};

export default function StudentsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [addStudentEmail, setAddStudentEmail] = useState('');
    const [foundStudent, setFoundStudent] = useState<Student | null>(null);
    const [studentSearchError, setStudentSearchError] = useState('');

    const rosterQuery = useMemoFirebase(
        () => (user ? query(collection(firestore, `users/${user.uid}/students`), orderBy('firstName')) : null),
        [user, firestore]
    );
    const { data: roster, isLoading: isLoadingRoster } = useCollection<Student>(rosterQuery);

    const handleSearchStudent = async () => {
        if (!addStudentEmail || !firestore) return;

        setStudentSearchError('');
        setFoundStudent(null);
        setIsAddingStudent(true);

        try {
            const emailLookupRef = doc(firestore, 'users-by-email', addStudentEmail);
            const emailDocSnapshot = await getDocs(query(collection(firestore, 'users-by-email'), where('__name__', '==', addStudentEmail)));

            if (emailDocSnapshot.empty) {
                setStudentSearchError('No user found with this email address.');
                return;
            }
            
            const studentUid = emailDocSnapshot.docs[0].data().uid;

            const studentRef = doc(firestore, 'users', studentUid);
            const studentDocSnapshot = await getDocs(query(collection(firestore, 'users'), where('id', '==', studentUid)));
            
            if (!studentDocSnapshot.docs[0].exists() || studentDocSnapshot.docs[0].data().role !== 'student') {
                setStudentSearchError('This user is not registered as a student.');
                return;
            }

            const studentData = studentDocSnapshot.docs[0].data();
            setFoundStudent({
                uid: studentUid,
                email: studentData.email,
                firstName: studentData.firstName,
                lastName: studentData.lastName,
            });

        } catch (error) {
            console.error('Error searching for student:', error);
            setStudentSearchError('An error occurred while searching. Please try again.');
        } finally {
            setIsAddingStudent(false);
        }
    };

    const handleAddStudentToRoster = async () => {
        if (!foundStudent || !user || !firestore) return;
        setIsAddingStudent(true);

        try {
            const studentInRosterRef = doc(firestore, `users/${user.uid}/students`, foundStudent.uid);
            await setDoc(studentInRosterRef, {
                ...foundStudent,
                addedAt: serverTimestamp(),
            });
            toast({
                title: 'Student Added',
                description: `${foundStudent.firstName} has been added to your roster.`,
            });
            setAddStudentEmail('');
            setFoundStudent(null);
        } catch (error) {
            console.error('Error adding student to roster:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not add student to roster.',
            });
        } finally {
            setIsAddingStudent(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Student Management</h1>
                    <p className="text-muted-foreground">Manage your student roster and view their progress.</p>
                </div>
                <SidebarTrigger className="md:hidden"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Student Roster</CardTitle>
                            <CardDescription>The list of students you have added to your classroom.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoadingRoster ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader className="animate-spin text-muted-foreground"/>
                                </div>
                            ) : roster && roster.length > 0 ? (
                                <ScrollArea className="h-96">
                                    <div className="space-y-3 pr-4">
                                        {roster.map((s) => (
                                            <div key={s.uid} className="flex justify-between items-center text-sm p-3 rounded-lg bg-background border">
                                                <div>
                                                    <p className="font-medium">{s.firstName} {s.lastName}</p>
                                                    <p className="text-muted-foreground">{s.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <Users className="mx-auto h-10 w-10 mb-4" />
                                    <h3 className="font-semibold text-lg">Your Roster is Empty</h3>
                                    <p className="text-sm">Use the 'Add Student' form to build your roster.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Student to Roster</CardTitle>
                            <CardDescription>
                            Find a student by their email address to add them to your roster.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                            <Label htmlFor="student-email">Student Email</Label>
                            <div className="flex gap-2">
                                <Input
                                id="student-email"
                                type="email"
                                placeholder="student@example.com"
                                value={addStudentEmail}
                                onChange={(e) => setAddStudentEmail(e.target.value)}
                                />
                                <Button onClick={handleSearchStudent} disabled={isAddingStudent || !addStudentEmail}>
                                {isAddingStudent ? <Loader className="animate-spin" /> : 'Search'}
                                </Button>
                            </div>
                            {studentSearchError && <p className="text-sm text-destructive">{studentSearchError}</p>}
                            </div>

                            {foundStudent && (
                            <div className="p-4 border rounded-lg bg-accent/50 space-y-4 animate-in fade-in-50">
                                <p>
                                Found: <strong>{foundStudent.firstName} {foundStudent.lastName}</strong>
                                </p>
                                <Button className="w-full" onClick={handleAddStudentToRoster} disabled={isAddingStudent}>
                                   <UserPlus className="mr-2"/> Add to Roster
                                </Button>
                            </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

