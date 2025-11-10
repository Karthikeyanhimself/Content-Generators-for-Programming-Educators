'use client';

import { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  generateThemedScenario,
  GenerateThemedScenarioInput,
  GenerateThemedScenarioOutput,
} from '@/ai/flows/generate-themed-scenario';
import {
  suggestSolutionApproachTips,
  SuggestSolutionApproachTipsInput,
  SuggestSolutionApproachTipsOutput,
} from '@/ai/flows/suggest-solution-approach-tips';
import { Loader, Lightbulb, FileCheck2, Copy, Sparkles, BookCopy, CalendarDays, PlusCircle, CalendarIcon, UserPlus, Trash2, GraduationCap } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  where,
  collectionGroup
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const dsaConcepts = {
  "Common Patterns": [
    "Sliding Window",
    "Two Pointers",
    "Fast & Slow Pointers",
    "Merge Intervals",
    "Cyclic Sort",
    "In-place Reversal of a LinkedList",
    "Tree BFS",
    "Tree DFS",
    "Two Heaps",
    "Subsets",
    "Modified Binary Search",
    "Top 'K' Elements",
    "K-way Merge",
  ],
  "Data Structures": [
    "Array",
    "String",
    "Linked List",
    "Stack",
    "Queue",
    "Hash Table",
    "Hash Set",
    "Hash Map",
    "Heap (Priority Queue)",
    "Trie",
    "Binary Tree",
    "Binary Search Tree",
    "N-ary Tree",
    "Graph",
    "Matrix",
  ],
  "Algorithms": [
    "Sorting",
    "Binary Search",
    "Depth-First Search (DFS)",
    "Breadth-First Search (BFS)",
    "Backtracking",
    "Recursion",
    "Dynamic Programming",
    "Greedy Algorithms",
    "Topological Sort",
    "Union Find",
    "Bit Manipulation",
    "Kadane's Algorithm",
  ],
};


export default function EducatorDashboard({ userProfile }: { userProfile: any}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // Scenario Generator State
  const [theme, setTheme] = useState('Adventure/Fantasy');
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>(['Array']);
  const [difficulty, setDifficulty] = useState(1);
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedData, setGeneratedData] =
    useState<GenerateThemedScenarioOutput | null>(null);
  const [solutionTips, setSolutionTips] =
    useState<SuggestSolutionApproachTipsOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Assignment State
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [assigningAssignment, setAssigningAssignment] = useState<any | null>(null);
  const [studentsToAssign, setStudentsToAssign] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [isAssigning, setIsAssigning] = useState(false);

  // Roster State
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  const difficultyLabels = ['Easy', 'Medium', 'Hard'];

  const assignmentsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, `users/${user.uid}/assignments`),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore, user]
  );
  const { data: assignments, isLoading: assignmentsLoading } = useCollection(assignmentsQuery);
  
  const studentsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, `users/${user.uid}/students`),
            orderBy('addedAt', 'desc')
          )
        : null,
    [firestore, user]
  );
  const { data: students, isLoading: studentsLoading } = useCollection(studentsQuery);

  const submissionsQuery = useMemoFirebase(
    () =>
        user
        ? query(
            collection(firestore, `educators/${user.uid}/submissions`),
            orderBy('submittedAt', 'desc')
            )
        : null,
    [firestore, user]
  );
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection(submissionsQuery);


  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedConcepts.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Please select at least one DSA concept.',
      });
      return;
    }
    setIsGenerating(true);
    setGeneratedData(null);
    setSolutionTips(null);
    try {
      const input: GenerateThemedScenarioInput = {
        theme: theme as any,
        dsaConcepts: selectedConcepts,
        difficulty: difficultyLabels[difficulty] as any,
        userPrompt: userPrompt
      };
      const result = await generateThemedScenario(input);
      setGeneratedData(result);

      // Now, generate solution tips
      const tipsInput: SuggestSolutionApproachTipsInput = {
        scenario: result.scenario,
        difficulty: difficultyLabels[difficulty],
      };
      const tipsResult = await suggestSolutionApproachTips(tipsInput);
      setSolutionTips(tipsResult);
    } catch (error) {
      console.error('Error generating scenario:', error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Scenario',
        description:
          'Sorry, there was an error generating the scenario. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!generatedData || !user) return;
    setIsCreatingAssignment(true);
    try {
      // 1. Create scenario document
      const scenarioRef = await addDoc(collection(firestore, 'scenarios'), {
        theme: theme,
        content: generatedData.scenario,
        difficulty: difficultyLabels[difficulty],
        dsaConcept: generatedData.dsaConcept,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      // 2. Add hints to subcollection
      const hintsCollection = collection(
        firestore,
        'scenarios',
        scenarioRef.id,
        'hints'
      );
      for (const [index, hintContent] of generatedData.hints.entries()) {
        await addDoc(hintsCollection, {
          hintLevel: index + 1,
          content: hintContent,
        });
      }

      // 3. Add test cases to subcollection
      const testCasesCollection = collection(
        firestore,
        'scenarios',
        scenarioRef.id,
        'testCases'
      );
      for (const testCase of generatedData.testCases) {
        await addDoc(testCasesCollection, testCase);
      }
      
      const assignmentRef = doc(collection(firestore, `users/${user.uid}/assignments`));
      
      const draftAssignment = {
        id: assignmentRef.id,
        educatorId: user.uid,
        scenarioId: scenarioRef.id,
        dsaConcept: generatedData.dsaConcept,
        status: 'draft', 
        createdAt: serverTimestamp(),
      };
      await setDoc(assignmentRef, draftAssignment);


      toast({
        title: 'Assignment Created!',
        description: 'The new scenario has been saved as an assignment draft.',
      });
      setGeneratedData(null);
      setSolutionTips(null);
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Error Creating Assignment',
        description:
          'There was a problem saving the assignment. Please check your connection and try again.',
      });
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAssignment || studentsToAssign.length === 0 || !dueDate || !user) return;
    setIsAssigning(true);

    try {
        const assignmentPromises = studentsToAssign.map(studentId => {
            const studentAssignmentsCollection = collection(firestore, 'users', studentId, 'assignments');
            const newAssignmentRef = doc(studentAssignmentsCollection);
            return setDoc(newAssignmentRef, {
                id: newAssignmentRef.id,
                educatorId: user.uid,
                scenarioId: assigningAssignment.scenarioId,
                studentId: studentId,
                dueDate: dueDate,
                status: 'assigned',
                createdAt: serverTimestamp(),
                dsaConcept: assigningAssignment.dsaConcept,
            });
        });

        await Promise.all(assignmentPromises);

        toast({
            title: 'Assignments Sent!',
            description: `Successfully assigned to ${studentsToAssign.length} student(s).`
        });

        // Close dialog and reset state
        setAssigningAssignment(null);
        setStudentsToAssign([]);
        setDueDate(new Date());

    } catch (error: any) {
        console.error('Error assigning assignment:', error);
        if (error.code === 'permission-denied') {
             errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: `users/[studentId]/assignments`,
                    operation: 'create',
                    requestResourceData: { educatorId: user.uid, scenarioId: assigningAssignment.scenarioId },
                })
             );
        } else {
            toast({
                variant: 'destructive',
                title: 'Assignment Failed',
                description: error.message || 'Could not assign the scenario. Please check permissions and try again.'
            });
        }
    } finally {
        setIsAssigning(false);
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentEmail || !user) return;
    setIsAddingStudent(true);

    try {
      // 1. Look up student UID by email
      const emailLookupRef = doc(firestore, 'users-by-email', newStudentEmail);
      const emailLookupSnap = await getDoc(emailLookupRef);

      if (!emailLookupSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Student Not Found',
          description: 'No student account exists for this email. Please ask them to sign up first.',
        });
        setIsAddingStudent(false);
        return;
      }

      const { uid: studentUid } = emailLookupSnap.data();

      // 2. Fetch the student's main profile to check their role and get their name
      const studentUserRef = doc(firestore, 'users', studentUid);
      const studentUserSnap = await getDoc(studentUserRef);
      
      if (!studentUserSnap.exists() || studentUserSnap.data().role !== 'student') {
        toast({
          variant: 'destructive',
          title: 'Not a Student Account',
          description: 'The user with this email is not registered as a student.',
        });
        setIsAddingStudent(false);
        return;
      }
      
      const studentData = studentUserSnap.data();
      
      // 3. Add student to educator's roster subcollection. This document now contains all info needed.
      const rosterRef = doc(firestore, `users/${user.uid}/students/${studentUid}`);
      await setDoc(rosterRef, {
        uid: studentUid,
        email: studentData.email,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        addedAt: serverTimestamp()
      }, { merge: true });

      toast({
        title: 'Student Added!',
        description: `${studentData.firstName} ${studentData.lastName} has been added to your roster.`,
      });
      setNewStudentEmail('');

    } catch (error: any) {
        console.error("Error adding student:", error);
         if (error.code === 'permission-denied') {
             errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: error.customData?.path || `users-by-email/${newStudentEmail}`,
                    operation: 'get',
                })
             );
         } else {
            toast({
                variant: 'destructive',
                title: 'Error Adding Student',
                description: 'An unexpected error occurred. Check the console for details.',
            });
         }
    } finally {
        setIsAddingStudent(false);
    }
};

  const handleRemoveStudent = async (studentId: string) => {
    if (!user) return;
    const rosterRef = doc(firestore, `users/${user.uid}/students/${studentId}`);
    try {
        await deleteDoc(rosterRef);
        toast({
            title: "Student Removed",
            description: "The student has been removed from your roster."
        })
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Error Removing Student',
            description: error.message || 'There was a problem removing the student.'
        })
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };
  
  const handleConceptSelection = (concept: string) => {
    setSelectedConcepts(prev => 
      prev.includes(concept)
        ? prev.filter(item => item !== concept)
        : [...prev, concept]
    );
  };
  
  const handleStudentSelection = (studentId: string) => {
    setStudentsToAssign(prev =>
        prev.includes(studentId)
            ? prev.filter(id => id !== studentId)
            : [...prev, studentId]
    );
  };


  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
      <div className="md:col-span-4 lg:col-span-3">
        <div className="space-y-8">
            <form onSubmit={handleGenerate}>
            <Card className="sticky top-24">
                <CardHeader>
                <CardTitle className="font-headline text-xl">
                    Scenario Generator
                </CardTitle>
                <CardDescription>
                    Craft the perfect challenge for your students.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger id="theme">
                          <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Adventure/Fantasy">
                          Adventure/Fantasy
                          </SelectItem>
                          <SelectItem value="Sci-Fi">Sci-Fi</SelectItem>
                          <SelectItem value="Business/Real-world">
                          Business/Real-world
                          </SelectItem>
                          <SelectItem value="Gaming">Gaming</SelectItem>
                          <SelectItem value="Mystery/Detective">
                          Mystery/Detective
                          </SelectItem>
                      </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>DSA Concept(s)</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal h-auto min-h-10">
                           <div className="flex gap-1 flex-wrap">
                              {selectedConcepts.length > 0 ? selectedConcepts.map((concept) => (
                                  <Badge variant="secondary" key={concept}>{concept}</Badge>
                              )) : "Select concepts..."}
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                        <ScrollArea className="h-72">
                          {Object.entries(dsaConcepts).map(([group, concepts], index) => (
                            <DropdownMenuGroup key={group}>
                              <DropdownMenuLabel>{group}</DropdownMenuLabel>
                              {concepts.map(concept => (
                                <DropdownMenuCheckboxItem
                                  key={concept}
                                  checked={selectedConcepts.includes(concept)}
                                  onCheckedChange={() => handleConceptSelection(concept)}
                                  onSelect={(e) => e.preventDefault()} // Prevent closing on select
                                >
                                  {concept}
                                </DropdownMenuCheckboxItem>
                              ))}
                              {index < Object.keys(dsaConcepts).length - 1 && <DropdownMenuSeparator />}
                            </DropdownMenuGroup>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-prompt">Scenario Keywords (Optional)</Label>
                    <Textarea 
                      id="user-prompt"
                      placeholder="e.g., A mystery on a space station..."
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-4">
                      <div className="flex items-center justify-between">
                      <Label>Difficulty</Label>
                      <span className="text-sm font-medium text-muted-foreground">
                          {difficultyLabels[difficulty]}
                      </span>
                      </div>
                      <Slider
                      min={0}
                      max={2}
                      step={1}
                      defaultValue={[difficulty]}
                      onValueChange={(value) => setDifficulty(value[0])}
                      />
                  </div>
                </CardContent>
                <CardFooter>
                <Button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full"
                >
                    {isGenerating ? (
                    <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                    </>
                    ) : (
                    'Generate Scenario'
                    )}
                </Button>
                </CardFooter>
            </Card>
            </form>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl">My Roster</CardTitle>
                    <CardDescription>Add and manage students in your class.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddStudent} className="flex items-center gap-2 mb-4">
                        <Input
                            type="email"
                            placeholder="Student's email address"
                            value={newStudentEmail}
                            onChange={(e) => setNewStudentEmail(e.target.value)}
                            disabled={isAddingStudent}
                        />
                        <Button type="submit" size="icon" disabled={isAddingStudent || !newStudentEmail}>
                            {isAddingStudent ? <Loader className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        </Button>
                    </form>

                    <ScrollArea className="h-48">
                         {studentsLoading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Loading roster...</div>
                        ) : students && students.length > 0 ? (
                            <div className="space-y-2">
                                {students.map((s: any) => (
                                    <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-background border">
                                        <div>
                                            <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{s.email}</p>
                                        </div>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently remove {s.firstName} from your roster. They will no longer be able to receive assignments from you.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRemoveStudent(s.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Remove Student
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                Your roster is empty. Add students using their email.
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl">
                        My Assignments
                    </CardTitle>
                    <CardDescription>
                        Manage and track assignments you've created.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {assignmentsLoading ? (
                        <div className="space-y-2">
                            <div className="h-12 w-full animate-pulse rounded-md bg-muted"></div>
                            <div className="h-12 w-full animate-pulse rounded-md bg-muted"></div>
                        </div>
                    ) : assignments && assignments.length > 0 ? (
                         <div className="space-y-3">
                            {assignments.map((assignment: any) => (
                                <div key={assignment.id} className="rounded-lg border p-3 text-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium">{assignment.dsaConcept || 'Assignment Draft'}</p>
                                             <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                                <CalendarDays className="h-3 w-3" />
                                                Created {assignment.createdAt ? format(assignment.createdAt.toDate(), 'PPP') : 'just now'}
                                            </p>
                                        </div>
                                        <Badge variant={assignment.status === 'draft' ? 'outline' : 'default'}>{assignment.status}</Badge>
                                    </div>
                                    <Dialog onOpenChange={(open) => { if (!open) { setAssigningAssignment(null); setStudentsToAssign([]); } }}>
                                        <DialogTrigger asChild>
                                             <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setAssigningAssignment(assignment)}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Assign to Student
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Assign Scenario</DialogTitle>
                                                <DialogDescription>
                                                    Select students and a due date to send the assignment.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={handleConfirmAssignment} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Students</Label>
                                                    <Card>
                                                        <ScrollArea className="h-40">
                                                            <CardContent className="p-2">
                                                                {studentsLoading && <div className="p-4 text-sm text-center text-muted-foreground">Loading students...</div>}
                                                                {!studentsLoading && students && students.length > 0 ? students.map((s:any) => (
                                                                    <div key={s.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent">
                                                                        <Checkbox 
                                                                            id={`student-${s.id}`} 
                                                                            onCheckedChange={() => handleStudentSelection(s.uid)}
                                                                            checked={studentsToAssign.includes(s.uid)}
                                                                        />
                                                                        <label
                                                                            htmlFor={`student-${s.id}`}
                                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                                                                        >
                                                                            {s.firstName} {s.lastName} <span className="text-muted-foreground">({s.email})</span>
                                                                        </label>
                                                                    </div>
                                                                )) : (
                                                                    !studentsLoading && <div className="p-4 text-sm text-center text-muted-foreground">No students in roster.</div>
                                                                )}
                                                            </CardContent>
                                                        </ScrollArea>
                                                    </Card>
                                                </div>
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
                                                <Button type="submit" className="w-full" disabled={isAssigning || studentsToAssign.length === 0}>
                                                    {isAssigning ? 'Assigning...' : `Confirm Assignment (${studentsToAssign.length})`}
                                                </Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex h-[20vh] flex-col items-center justify-center gap-2 text-center border-2 border-dashed rounded-lg">
                            <BookCopy className="h-8 w-8 text-muted-foreground"/>
                            <h3 className="text-lg font-semibold text-foreground">
                                No Assignments Yet
                            </h3>
                            <p className="text-muted-foreground text-sm max-w-xs">
                                Use the generator to create a scenario, then save it as an assignment.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

      <div className="md:col-span-8 lg:col-span-9">
        <div className="space-y-8">
            <Card className="min-h-[600px] sticky top-24">
            <CardHeader>
                <CardTitle className="font-headline">Generated Scenario</CardTitle>
                {generatedData && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-4"
                    onClick={() => copyToClipboard(generatedData.scenario)}
                >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                </Button>
                )}
            </CardHeader>
            <CardContent>
                {isGenerating ? (
                <div className="space-y-6 pt-4">
                    <div className="space-y-3">
                    <div className="h-5 w-3/4 rounded-full bg-muted animate-pulse"></div>
                    <div className="h-4 w-full rounded-full bg-muted animate-pulse"></div>
                    <div className="h-4 w-5/6 rounded-full bg-muted animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                    <div className="h-4 w-full rounded-full bg-muted animate-pulse"></div>
                    <div className="h-4 w-1/2 rounded-full bg-muted animate-pulse"></div>
                    <div className="h-4 w-4/5 rounded-full bg-muted animate-pulse"></div>
                    </div>
                </div>
                ) : generatedData ? (
                <div
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                    dangerouslySetInnerHTML={{
                    __html: generatedData.scenario.replace(/\n/g, '<br />'),
                    }}
                />
                ) : (
                <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
                        <div className="bg-primary/10 p-4 rounded-full">
                            <Sparkles className="h-8 w-8 text-primary"/>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">
                            Your AI-Generated Scenario Awaits
                        </h3>
                        <p className="text-muted-foreground text-base max-w-md">
                        Use the controls on the left to select a theme, concept, and difficulty, then click "Generate Scenario" to begin.
                        </p>
                    </div>
                )}
            </CardContent>
            {(generatedData || solutionTips) && (
                <CardFooter className="flex-col items-start gap-4">
                <Accordion type="multiple" className="w-full">
                    {solutionTips && (
                    <AccordionItem value="solution-tips">
                        <AccordionTrigger className="text-lg font-medium">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Approach Tips
                        </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                        <ul className="space-y-3 list-disc pl-5">
                            {solutionTips.tips.map((tip, index) => (
                            <li key={index} className="text-muted-foreground">
                                {tip}
                            </li>
                            ))}
                        </ul>
                        </AccordionContent>
                    </AccordionItem>
                    )}
                    {generatedData && (
                    <>
                        <AccordionItem value="hints">
                        <AccordionTrigger className="text-lg font-medium">
                            <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5" />
                            Adaptive Hints
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <div className="space-y-4">
                            {generatedData.hints.map((hint, index) => (
                                <div
                                key={index}
                                className="p-4 bg-background/50 rounded-md border"
                                >
                                <p className="text-muted-foreground">{hint}</p>
                                </div>
                            ))}
                            </div>
                        </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="test-cases">
                        <AccordionTrigger className="text-lg font-medium">
                            <div className="flex items-center gap-2">
                            <FileCheck2 className="h-5 w-5" />
                            Smart Test Cases
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Input</TableHead>
                                <TableHead>Output</TableHead>
                                <TableHead>Explanation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generatedData.testCases.map((tc, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">
                                    {tc.input}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                    {tc.output}
                                    </TableCell>
                                    <TableCell>
                                    {tc.isEdgeCase && (
                                        <Badge
                                        variant="outline"
                                        className="mb-1 mr-2 border-amber-500 text-amber-500"
                                        >
                                        Edge Case
                                        </Badge>
                                    )}
                                    {tc.explanation}
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                            </Table>
                        </AccordionContent>
                        </AccordionItem>
                    </>
                    )}
                </Accordion>
                {generatedData && (
                    <div className="w-full pt-4">
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleCreateAssignment}
                        disabled={isCreatingAssignment}
                    >
                        {isCreatingAssignment ? (
                        <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                        ) : (
                            'Create Assignment from Scenario'
                        )}
                    </Button>
                    </div>
                )}
                </CardFooter>
            )}
            </Card>
        </div>
      </div>
    </div>
  );
}
