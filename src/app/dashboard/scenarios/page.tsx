
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, orderBy } from 'firebase/firestore';
import { generateThemedScenario, GenerateThemedScenarioInput } from '@/ai/flows/generate-themed-scenario';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader, Wand2, BrainCircuit, Bot, FileCheck2, X, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


type Scenario = {
    id: string;
    theme: string;
    difficulty: string;
    dsaConcept: string;
    content: string;
};

const dsaConceptOptions = [
    "Arrays", "Strings", "Linked Lists", "Stacks", "Queues", "Hash Maps", 
    "Trees", "Graphs", "Heaps", "Sorting", "Binary Search", "Recursion", 
    "Dynamic Programming", "Greedy Algorithms", "Backtracking", 
    "Bit Manipulation", "BFS", "DFS"
];

export default function ScenariosPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isGenerating, setIsGenerating] = useState(false);
    const [theme, setTheme] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [selectedDsaConcepts, setSelectedDsaConcepts] = useState<string[]>([]);
    const [userPrompt, setUserPrompt] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const scenariosQuery = useMemoFirebase(
        () => query(collection(firestore, 'scenarios'), orderBy('difficulty')),
        [firestore]
    );
    const { data: scenarios, isLoading: isLoadingScenarios } = useCollection<Scenario>(scenariosQuery);
    
    const handleGenerateScenario = async () => {
        if (!theme || !difficulty || selectedDsaConcepts.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Missing Fields',
                description: 'Please select a theme, difficulty, and at least one DSA concept.',
            });
            return;
        }

        setIsGenerating(true);
        toast({ title: 'Generating Scenario...', description: 'The AI is crafting a new challenge. Please wait.' });

        try {
            const input: GenerateThemedScenarioInput = {
                theme: theme as any,
                difficulty: difficulty as any,
                dsaConcepts: selectedDsaConcepts,
                userPrompt,
            };

            const result = await generateThemedScenario(input);

            if (!firestore) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available' });
                 return;
            }
            
            // Save the main scenario document
            const scenarioRef = await addDoc(collection(firestore, 'scenarios'), {
                theme: input.theme,
                content: result.scenario,
                difficulty: input.difficulty,
                dsaConcept: result.dsaConcept,
            });
            
            // Save hints as a subcollection
            const hintsCollection = collection(firestore, 'scenarios', scenarioRef.id, 'hints');
            for (let i = 0; i < result.hints.length; i++) {
                await addDoc(hintsCollection, {
                    hintLevel: i + 1,
                    content: result.hints[i],
                });
            }

            // Save test cases as a subcollection
            const testCasesCollection = collection(firestore, 'scenarios', scenarioRef.id, 'testCases');
            for (const testCase of result.testCases) {
                await addDoc(testCasesCollection, { ...testCase, scenarioId: scenarioRef.id });
            }

            toast({
                title: 'Scenario Generated!',
                description: `A new "${result.dsaConcept}" scenario has been added to the library.`,
            });
            
            // Reset form and close dialog
            setTheme('');
            setDifficulty('');
            setSelectedDsaConcepts([]);
            setUserPrompt('');
            setIsDialogOpen(false);

        } catch (error) {
            console.error('Error generating scenario:', error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: 'The AI could not generate a scenario. Please try again.',
            });
        } finally {
            setIsGenerating(false);
        }
    };


    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">AI Scenario Generator</h1>
                    <p className="text-muted-foreground">Craft unique programming challenges for your students.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Wand2 className="mr-2 h-4 w-4" />
                                Generate New Scenario
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[525px]">
                            <DialogHeader>
                                <DialogTitle className="font-headline text-2xl">Generate a New Scenario</DialogTitle>
                                <DialogDescription>
                                    Use the power of AI to create a unique programming challenge.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="theme">Theme</Label>
                                         <Select value={theme} onValueChange={setTheme}>
                                            <SelectTrigger id="theme">
                                                <SelectValue placeholder="Select a theme" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Adventure/Fantasy">Adventure/Fantasy</SelectItem>
                                                <SelectItem value="Sci-Fi">Sci-Fi</SelectItem>
                                                <SelectItem value="Business/Real-world">Business/Real-world</SelectItem>
                                                <SelectItem value="Gaming">Gaming</SelectItem>
                                                <SelectItem value="Mystery/Detective">Mystery/Detective</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="difficulty">Difficulty</Label>
                                         <Select value={difficulty} onValueChange={setDifficulty}>
                                            <SelectTrigger id="difficulty">
                                                <SelectValue placeholder="Select a difficulty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Easy">Easy</SelectItem>
                                                <SelectItem value="Medium">Medium</SelectItem>
                                                <SelectItem value="Hard">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>DSA Concepts</Label>
                                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={isPopoverOpen}
                                                className="w-full justify-between font-normal h-auto min-h-10"
                                            >
                                                <div className="flex gap-1 flex-wrap">
                                                {selectedDsaConcepts.length > 0 ? (
                                                    selectedDsaConcepts.map((concept) => (
                                                        <Badge
                                                            variant="secondary"
                                                            key={concept}
                                                            className="mr-1 mb-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDsaConcepts(prev => prev.filter(c => c !== concept));
                                                            }}
                                                        >
                                                            {concept}
                                                            <X className="ml-1 h-3 w-3" />
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground">Select concepts...</span>
                                                )}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search concepts..." />
                                                <CommandList>
                                                    <CommandEmpty>No concept found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {dsaConceptOptions.map((option) => (
                                                            <CommandItem
                                                                key={option}
                                                                value={option}
                                                                onSelect={(currentValue) => {
                                                                    setSelectedDsaConcepts(current => 
                                                                        current.includes(option) 
                                                                            ? current.filter(c => c !== option)
                                                                            : [...current, option]
                                                                    );
                                                                    setIsPopoverOpen(false);
                                                                }}
                                                            >
                                                                <FileCheck2 className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedDsaConcepts.includes(option) ? "opacity-100" : "opacity-0"
                                                                )} />
                                                                {option}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="user-prompt">Optional Prompt</Label>
                                    <Input id="user-prompt" value={userPrompt} onChange={e => setUserPrompt(e.target.value)} placeholder="e.g., A problem about inventory management..." />
                                </div>
                            </div>
                            <DialogFooter>
                                 <DialogClose asChild>
                                    <Button variant="ghost">Cancel</Button>
                                 </DialogClose>
                                <Button onClick={handleGenerateScenario} disabled={isGenerating}>
                                    {isGenerating ? (
                                        <>
                                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            Generate
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <SidebarTrigger className="md:hidden"/>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Scenario Library</CardTitle>
                    <CardDescription>A collection of all AI-generated and custom-made scenarios.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isLoadingScenarios ? (
                        <div className="h-[40vh] items-center justify-center">
                            <div className="flex items-center gap-3 text-lg text-muted-foreground">
                                <BrainCircuit className="h-6 w-6 animate-spin text-primary" />
                                <span>Loading Scenarios...</span>
                            </div>
                        </div>
                    ) : scenarios && scenarios.length > 0 ? (
                        <ScrollArea className="h-[60vh]">
                            <div className="space-y-4 pr-6">
                                {scenarios.map((scenario) => (
                                    <Alert key={scenario.id}>
                                         <FileCheck2 className="h-4 w-4" />
                                        <AlertTitle className="flex justify-between items-center">
                                            <span>{scenario.dsaConcept}</span>
                                            <div className="flex items-center gap-2">
                                                 <Badge variant="outline">{scenario.difficulty}</Badge>
                                                 <Badge variant="secondary">{scenario.theme}</Badge>
                                            </div>
                                        </AlertTitle>
                                        <AlertDescription className="mt-2 text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: scenario.content.substring(0, 200).replace(/\n/g, '<br />') + '...' }}/>
                                    </Alert>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                         <div className="flex h-[40vh] flex-col items-center justify-center gap-4 text-center border-2 border-dashed rounded-lg">
                            <Bot className="h-12 w-12 text-muted-foreground"/>
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Library is Empty
                            </h3>
                            <p className="text-muted-foreground max-w-sm">
                                Use the "Generate New Scenario" button to start creating programming challenges for your students.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </>
    );
}

    

    