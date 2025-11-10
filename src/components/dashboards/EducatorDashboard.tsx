'use client';

import { useState } from 'react';
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
import { Loader, Lightbulb, FileCheck2, Copy, Sparkles, BookCopy, CalendarDays, PlusCircle, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
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
  where,
  orderBy,
  getDoc,
  doc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { ScrollArea } from '../ui/scroll-area';

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
    "Topological Sort",
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


export default function EducatorDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [theme, setTheme] = useState('Adventure/Fantasy');
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>(['Array']);
  const [difficulty, setDifficulty] = useState(1);
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedData, setGeneratedData] =
    useState<GenerateThemedScenarioOutput | null>(null);
  const [solutionTips, setSolutionTips] =
    useState<SuggestSolutionApproachTipsOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  
  const [assigningAssignment, setAssigningAssignment] = useState<any | null>(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [isAssigning, setIsAssigning] = useState(false);
  const [open, setOpen] = useState(false);


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
      
      // 4. Create assignment document for the educator (as a starting point)
      const assignmentsCollection = collection(
        firestore,
        'users',
        user.uid,
        'assignments'
      );
      await addDoc(assignmentsCollection, {
          educatorId: user.uid,
          scenarioId: scenarioRef.id,
          dsaConcept: generatedData.dsaConcept,
          // Placeholder values, to be updated when assigned to a student
          studentId: 'unassigned', 
          dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Default due date: 1 week from now
          status: 'draft', 
          createdAt: serverTimestamp(),
      });

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
    if (!assigningAssignment || !studentEmail || !dueDate || !user) return;
    setIsAssigning(true);

    try {
        // 1. Find the student by email
        const studentEmailRef = doc(firestore, 'users-by-email', studentEmail);
        const studentEmailSnap = await getDoc(studentEmailRef);

        if (!studentEmailSnap.exists()) {
            toast({
                variant: 'destructive',
                title: 'Student not found',
                description: `No student found with the email: ${studentEmail}`
            });
            setIsAssigning(false);
            return;
        }

        const studentId = studentEmailSnap.data().uid;

        // 2. Create the assignment in the student's subcollection
        const studentAssignmentsCollection = collection(firestore, 'users', studentId, 'assignments');
        await addDoc(studentAssignmentsCollection, {
            educatorId: user.uid,
            scenarioId: assigningAssignment.scenarioId,
            studentId: studentId,
            dueDate: dueDate,
            status: 'assigned',
            createdAt: serverTimestamp(),
            dsaConcept: assigningAssignment.dsaConcept,
        });

        toast({
            title: 'Assignment Sent!',
            description: `Successfully assigned to ${studentEmail}.`
        });

        // Close dialog and reset state
        setAssigningAssignment(null);
        setStudentEmail('');
        setDueDate(new Date());

    } catch (error: any) {
        console.error('Error assigning assignment:', error);
        toast({
            variant: 'destructive',
            title: 'Assignment Failed',
            description: error.message || 'Could not assign the scenario. Please check permissions and try again.'
        });
    } finally {
        setIsAssigning(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  const allConcepts = Object.values(dsaConcepts).flat();

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
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between h-auto"
                            >
                                <div className="flex gap-1 flex-wrap">
                                    {selectedConcepts.length > 0 ? selectedConcepts.map((concept) => (
                                        <Badge variant="secondary" key={concept}>{concept}</Badge>
                                    )) : "Select concepts..."}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search concepts..." />
                                <CommandEmpty>No concept found.</CommandEmpty>
                                <ScrollArea className="h-72">
                                <CommandGroup>
                                    {allConcepts.map((concept) => (
                                        <CommandItem
                                            key={concept}
                                            value={concept}
                                            onSelect={(currentValue) => {
                                                setSelectedConcepts(prev => 
                                                    prev.includes(concept)
                                                    ? prev.filter(item => item !== concept)
                                                    : [...prev, concept]
                                                )
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedConcepts.includes(concept) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {concept}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                </ScrollArea>
                            </Command>
                        </PopoverContent>
                    </Popover>
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
                                    <Dialog onOpenChange={(open) => !open && setAssigningAssignment(null)}>
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
                                                    Enter the student's email and a due date to send the assignment.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={handleConfirmAssignment} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="student-email">Student Email</Label>
                                                    <Input 
                                                        id="student-email"
                                                        type="email"
                                                        placeholder="student@example.com"
                                                        value={studentEmail}
                                                        onChange={(e) => setStudentEmail(e.target.value)}
                                                        required
                                                    />
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
                                                <Button type="submit" className="w-full" disabled={isAssigning}>
                                                    {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
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
  );
}
