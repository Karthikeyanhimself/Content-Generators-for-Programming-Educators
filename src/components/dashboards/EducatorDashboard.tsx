
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
  Timestamp,
  addDoc,
  serverTimestamp,
  orderBy,
  updateDoc,
  writeBatch,
  doc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader, Send, Calendar as CalendarIcon, Users, BrainCircuit, BookCopy, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';


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
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [dueTime, setDueTime] = useState<string>('23:59'); // Default to end of day
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [isStudentPopoverOpen, setIsStudentPopoverOpen] = useState(false);
  
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
    if (!selectedScenario || selectedStudents.length === 0 || !dueDate || !user || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please select a scenario, at least one student, and a due date/time.',
        });
        return;
    }
    setIsAssigning(true);

    try {
        const batch = writeBatch(firestore);
        
        // Combine date and time
        const [hours, minutes] = dueTime.split(':').map(Number);
        const finalDueDate = new Date(dueDate);
        finalDueDate.setHours(hours, minutes, 0, 0);

        let finalScheduleDate: Date | undefined;
        if (scheduleDate) {
            finalScheduleDate = new Date(scheduleDate);
            finalScheduleDate.setHours(0,0,0,0); // Start of day
        }


        selectedStudents.forEach((student) => {
            const assignmentCollectionRef = collection(firestore, `users/${student.uid}/assignments`);
            const newAssignmentRef = doc(assignmentCollectionRef); // Create a reference with a new ID
            
            batch.set(newAssignmentRef, {
                id: newAssignmentRef.id,
                educatorId: user.uid,
                studentId: student.uid,
                scenarioId: selectedScenario.id,
                dsaConcept: selectedScenario.dsaConcept,
                status: finalScheduleDate ? 'scheduled' : 'assigned',
                dueDate: Timestamp.fromDate(finalDueDate),
                scheduledAt: finalScheduleDate ? Timestamp.fromDate(finalScheduleDate) : null,
                isAutonomouslyGenerated: false,
                createdAt: serverTimestamp(),
            });
        });

        await batch.commit();

        toast({
            title: `Assignment ${finalScheduleDate ? 'Scheduled' : 'Assigned'}!`,
            description: `${selectedScenario.dsaConcept} has been assigned to ${selectedStudents.length} student(s).`,
        });

        // Reset state
        setSelectedScenario(null);
        setSelectedStudents([]);
        setDueDate(undefined);
        setDueTime('23:59');
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
              Select a scenario, one or more students, and a deadline to create a new assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label>Select Scenario</Label>
                <Select
                    onValueChange={(value) => setSelectedScenario(scenarios?.find(s => s.id === value) || null)}
                    disabled={isLoadingScenarios}
                    value={selectedScenario?.id || ''}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={isLoadingScenarios ? "Loading scenarios..." : "Select a scenario"} />
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
                    <Label>Select Student(s)</Label>
                    <Popover open={isStudentPopoverOpen} onOpenChange={setIsStudentPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isStudentPopoverOpen}
                                className="w-full justify-between font-normal h-auto min-h-10"
                                disabled={isLoadingRoster || !roster || roster.length === 0}
                            >
                                <div className="flex gap-1 flex-wrap">
                                {selectedStudents.length > 0
                                    ? selectedStudents.map(student => (
                                        <Badge
                                            variant="secondary"
                                            key={student.uid}
                                            className="mr-1 mb-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStudents(current => current.filter(s => s.uid !== student.uid))
                                            }}
                                        >
                                            {student.firstName}
                                            <X className="ml-1 h-3 w-3" />
                                        </Badge>
                                    ))
                                    : (<span>{isLoadingRoster ? 'Loading...' : 'Select from roster'}</span>)
                                }
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search students..." />
                                <CommandList>
                                    <CommandEmpty>No students found.</CommandEmpty>
                                    <CommandGroup>
                                        {roster?.map((student) => (
                                            <CommandItem
                                                key={student.uid}
                                                value={`${student.firstName} ${student.lastName} ${student.email}`}
                                                onSelect={() => {
                                                    setSelectedStudents(current => 
                                                        current.some(s => s.uid === student.uid)
                                                            ? current.filter(s => s.uid !== student.uid)
                                                            : [...current, student]
                                                    );
                                                    setIsStudentPopoverOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedStudents.some(s => s.uid === student.uid) ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {student.firstName} {student.lastName}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2 lg:col-span-1">
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
                 <div className="space-y-2 lg:col-span-1">
                    <Label>Due Time</Label>
                    <Input 
                        type="time" 
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                    />
                </div>
                 <div className="space-y-2 lg:col-span-1">
                    <Label>Schedule Date (Optional)</Label>
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
                            {scheduleDate ? format(scheduleDate, "PPP") : <span>Send Later</span>}
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
            <Button onClick={handleAssignScenario} disabled={isAssigning || selectedStudents.length === 0 || !selectedScenario || !dueDate}>
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
        <Card>
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

    