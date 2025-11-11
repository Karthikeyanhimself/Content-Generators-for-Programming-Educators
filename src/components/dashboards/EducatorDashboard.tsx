
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
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader, UserPlus, Send, Calendar as CalendarIcon, FileCheck2, Edit, Users, BrainCircuit, BookCopy } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import Link from 'next/link';

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

  const [isAssigning, setIsAssigning] = useState(false);

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  
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
        const assignmentCollectionRef = collection(firestore, `users/${selectedStudent.uid}/assignments`);
        
        // Use addDoc to let Firestore generate an ID
        const newAssignmentDoc = await addDoc(assignmentCollectionRef, {
            educatorId: user.uid,
            studentId: selectedStudent.uid,
            scenarioId: selectedScenario.id,
            dsaConcept: selectedScenario.dsaConcept,
            status: scheduleDate ? 'scheduled' : 'assigned',
            dueDate: Timestamp.fromDate(dueDate),
            scheduledAt: scheduleDate ? Timestamp.fromDate(scheduleDate) : null,
            isAutonomouslyGenerated: false,
            createdAt: serverTimestamp(),
        });
        
        // Now update the document with its own ID
        await updateDoc(newAssignmentDoc, { id: newAssignmentDoc.id });

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
      </div>

      {/* Right Column */}
      <div className="space-y-8">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/scenarios"><BrainCircuit className="mr-2" /> AI Scenario Generator</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/assignments"><BookCopy className="mr-2" /> Manage Assignments</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/students"><Users className="mr-2" /> Oversee Students</Link>
              </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
