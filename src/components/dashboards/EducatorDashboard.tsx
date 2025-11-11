
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  Timestamp,
  addDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader, UserPlus, Send, Calendar as CalendarIcon, FileCheck2, Edit } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';

type Student = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
};

type Scenario = {
  id: string;
  dsaConcept: string;
  difficulty: string;
  theme: string;
};

export default function EducatorDashboard({ userProfile }: { userProfile: any}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [addStudentEmail, setAddStudentEmail] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [studentSearchError, setStudentSearchError] = useState('');

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

  // State for editing a submission
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);
  const [editableScore, setEditableScore] = useState<number | string>('');
  const [editableFeedback, setEditableFeedback] = useState<string>('');


  // When a submission is selected for editing, populate the state
  useEffect(() => {
    if (editingSubmission) {
      setEditableScore(editingSubmission.score);
      setEditableFeedback(editingSubmission.feedback);
    }
  }, [editingSubmission]);

  // Fetch scenarios for assignment
  const scenariosQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'scenarios')) : null),
    [user, firestore]
  );
  const { data: scenarios, isLoading: isLoadingScenarios } = useCollection<Scenario>(scenariosQuery);
  
  // Fetch educator's student roster
  const rosterQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/students`), orderBy('firstName')) : null),
    [user, firestore]
  );
  const { data: roster, isLoading: isLoadingRoster } = useCollection<Student>(rosterQuery);

  // Fetch submissions for this educator
  const submissionsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `educators/${user.uid}/submissions`), orderBy('submittedAt', 'desc')) : null),
    [user, firestore]
  );
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection(submissionsQuery);

  const handleSearchStudent = async () => {
    if (!addStudentEmail || !firestore) return;

    setStudentSearchError('');
    setFoundStudent(null);
    setIsAddingStudent(true);

    try {
      // 1. Look up UID from email
      const emailLookupRef = doc(firestore, 'users-by-email', addStudentEmail);
      const emailDoc = await getDocs(query(collection(firestore, 'users-by-email'), where('email', '==', addStudentEmail)));

      if (emailDoc.empty) {
        setStudentSearchError('No user found with this email address.');
        return;
      }
      
      const userByEmailData = emailDoc.docs[0].data();
      const studentUid = userByEmailData.uid;

      // 2. Get student's profile
      const studentRef = doc(firestore, 'users', studentUid);
      const studentDoc = await getDocs(query(collection(firestore, 'users'), where('id', '==', studentUid)));
      
      if (!studentDoc.docs[0].exists() || studentDoc.docs[0].data().role !== 'student') {
        setStudentSearchError('This user is not registered as a student.');
        return;
      }

      const studentData = studentDoc.docs[0].data();
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

  const handleAssignScenario = async () => {
    if (!selectedScenario || !selectedStudent || !dueDate || !user || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please select a scenario, a student, and a due date.',
        });
        return;
    }
    setIsAssigning(true);

    try {
        const assignmentRef = collection(firestore, `users/${selectedStudent.uid}/assignments`);
        
        const newAssignment = {
            educatorId: user.uid,
            studentId: selectedStudent.uid,
            scenarioId: selectedScenario.id,
            dsaConcept: selectedScenario.dsaConcept,
            status: scheduleDate ? 'scheduled' : 'assigned',
            dueDate: Timestamp.fromDate(dueDate),
            scheduledAt: scheduleDate ? Timestamp.fromDate(scheduleDate) : null,
            isAutonomouslyGenerated: false,
            createdAt: serverTimestamp(),
        };

        await addDoc(assignmentRef, newAssignment);

        toast({
            title: `Assignment ${scheduleDate ? 'Scheduled' : 'Assigned'}!`,
            description: `${selectedScenario.dsaConcept} has been assigned to ${selectedStudent.firstName}.`,
        });

        // Reset state
        setSelectedScenario(null);
        setSelectedStudent(null);
        setDueDate(undefined);
        setScheduleDate(undefined);

    } catch (error) {
        console.error('Error assigning scenario:', error);
        toast({
            variant: 'destructive',
            title: 'Assignment Failed',
            description: 'Could not assign the scenario. Please check permissions and try again.',
        });
    } finally {
        setIsAssigning(false);
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


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-8">
         {/* Assign Scenario Card */}
        <Card>
          <CardHeader>
            <CardTitle>Assign a New Scenario</CardTitle>
            <CardDescription>
              Select a scenario and a student to create a new assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label>Select Scenario</Label>
                <Select
                    onValueChange={(value) => setSelectedScenario(scenarios?.find(s => s.id === value) || null)}
                    disabled={isLoadingScenarios}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Loading scenarios..." />
                    </SelectTrigger>
                    <SelectContent>
                        {scenarios?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.dsaConcept} ({s.difficulty})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
               </div>
               <div className="space-y-2">
                 <Label>Select Student</Label>
                <Select
                    onValueChange={(value) => setSelectedStudent(roster?.find(s => s.uid === value) || null)}
                    disabled={isLoadingRoster || !roster || roster.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={isLoadingRoster ? 'Loading...' : 'Select from roster'} />
                    </SelectTrigger>
                    <SelectContent>
                        {roster?.map((s) => (
                            <SelectItem key={s.uid} value={s.uid}>
                                {s.firstName} {s.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Due Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={setDueDate}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="space-y-2">
                    <Label>Schedule Send Date (Optional)</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !scheduleDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduleDate ? format(scheduleDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={scheduleDate}
                            onSelect={setScheduleDate}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleAssignScenario} disabled={isAssigning}>
                 {isAssigning ? (
                    <>
                        <Loader className="mr-2 h-4 w-4 animate-spin"/>
                        Assigning...
                    </>
                 ) : (
                    <>
                        <Send className="mr-2 h-4 w-4"/>
                        {scheduleDate ? 'Schedule Assignment' : 'Assign Now'}
                    </>
                 )}
            </Button>
          </CardFooter>
        </Card>

        {/* Submissions Card */}
        <Card>
            <CardHeader>
                <CardTitle>Student Submissions</CardTitle>
                <CardDescription>Review and grade work submitted by your students.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoadingSubmissions ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader className="animate-spin text-muted-foreground"/>
                    </div>
                ) : submissions && submissions.length > 0 ? (
                    <ScrollArea className="h-96">
                        <div className="space-y-4 pr-6">
                            {submissions.map((sub: any) => (
                                <Alert key={sub.id} className={sub.isPublished ? 'border-green-500/30' : ''}>
                                    <FileCheck2 className="h-4 w-4" />
                                    <AlertTitle className="flex justify-between items-center">
                                        <span>{sub.dsaConcept} - {sub.studentName}</span>
                                         <Badge variant={sub.isPublished ? 'secondary' : 'default'}>{sub.isPublished ? 'Published' : 'Pending'}</Badge>
                                    </AlertTitle>
                                    <AlertDescription className="mt-2 text-sm">
                                        Submitted on {format(sub.submittedAt.toDate(), 'PPP')} &bull; Score: {sub.score}%
                                    </AlertDescription>
                                    <div className="mt-4">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => setEditingSubmission(sub)}>
                                                    <Edit className="mr-2 h-3 w-3"/>
                                                    Review & Publish
                                                </Button>
                                            </DialogTrigger>
                                        </Dialog>
                                    </div>
                                </Alert>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                     <div className="text-center py-8 text-muted-foreground">
                        No submissions yet.
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-8">
        {/* Add Student Card */}
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
                  Add to Roster
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
         {/* Student Roster Card */}
        <Card>
            <CardHeader>
                <CardTitle>Student Roster</CardTitle>
                <CardDescription>Your currently managed students.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingRoster ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader className="animate-spin text-muted-foreground"/>
                    </div>
                ) : roster && roster.length > 0 ? (
                    <ScrollArea className="h-60">
                        <div className="space-y-3 pr-4">
                        {roster.map((s) => (
                            <div key={s.uid} className="flex justify-between items-center text-sm p-2 rounded-md bg-background">
                                <span>{s.firstName} {s.lastName}</span>
                                <span className="text-muted-foreground">{s.email}</span>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        Your roster is empty.
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

       {/* Edit Submission Dialog */}
      <Dialog open={!!editingSubmission} onOpenChange={(isOpen) => !isOpen && setEditingSubmission(null)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
              Review the student's code, adjust the AI-generated feedback and score if needed, and publish the results.
            </DialogDescription>
          </DialogHeader>
          {editingSubmission && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Student</Label>
                <Input value={editingSubmission.studentName} disabled className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="score" className="text-right">Score</Label>
                <Input
                  id="score"
                  type="number"
                  value={editableScore}
                  onChange={(e) => setEditableScore(e.target.value)}
                  className="col-span-1"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                 <Label htmlFor="feedback" className="text-right pt-2">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={editableFeedback}
                  onChange={(e) => setEditableFeedback(e.target.value)}
                  className="col-span-3 h-48"
                />
              </div>
              <div>
                <Label>Submitted Code</Label>
                <pre className="bg-muted p-4 rounded-md text-xs text-foreground overflow-x-auto mt-2">
                  <code>{editingSubmission.solutionCode}</code>
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={() => handlePublishScore(editingSubmission)} disabled={isPublishing === editingSubmission?.id}>
              {isPublishing === editingSubmission?.id ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin"/> Publishing...
                </>
              ) : 'Save & Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
