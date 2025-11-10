
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, addDoc, collection, getDocs, query, limit, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


import { assessCodeSubmission } from '@/ai/flows/assess-code-submission';
import { updateLearningGoalsAndCreateAssignment } from '@/ai/flows/update-learning-goals';
import { generateStudyPlan, StudyPlan, GenerateStudyPlanInput } from '@/ai/flows/generate-study-plan';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Loader, Send, Lightbulb, FileCheck2, Target } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { addDays } from 'date-fns';
import type { AssessCodeInput, AssessCodeOutput } from '@/ai/flows/schemas';
import type { UpdateLearningGoalsInput } from '@/ai/flows/schemas';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type AssignmentData = {
    id: string;
    scenarioId: string;
    status: 'assigned' | 'completed';
    dsaConcept: string;
    score?: number;
    feedback?: string;
    solutionCode?: string;
};

type ScenarioData = {
    content: string;
    difficulty: string;
};

type HintData = {
    id: string;
    hintLevel: number;
    content: string;
};

type TestCaseData = {
    id: string;
    input: string;
    output: string;
    explanation: string;
    isEdgeCase: boolean;
};

type SubmissionResult = {
    assessment: AssessCodeOutput;
    studyPlan: StudyPlan;
};

export default function AssignmentPage() {
    const { assignmentId } = useParams();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [solutionCode, setSolutionCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

    const assignmentDocRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid, 'assignments', assignmentId as string) : null),
        [user, firestore, assignmentId]
    );
    const { data: assignmentData, isLoading: isAssignmentLoading } = useDoc<AssignmentData>(assignmentDocRef);

    const scenarioDocRef = useMemoFirebase(
        () => (assignmentData ? doc(firestore, 'scenarios', assignmentData.scenarioId) : null),
        [assignmentData, firestore]
    );
    const { data: scenarioData, isLoading: isScenarioLoading } = useDoc<ScenarioData>(scenarioDocRef);

    const hintsQuery = useMemoFirebase(
        () => (assignmentData ? query(collection(firestore, 'scenarios', assignmentData.scenarioId, 'hints'), orderBy('hintLevel')) : null),
        [assignmentData, firestore]
    );
    const { data: hintsData, isLoading: areHintsLoading } = useCollection<HintData>(hintsQuery);

    const testCasesCollectionRef = useMemoFirebase(
        () => (assignmentData ? collection(firestore, 'scenarios', assignmentData.scenarioId, 'testCases') : null),
        [assignmentData, firestore]
    );
    const { data: testCasesData, isLoading: areTestCasesLoading } = useCollection<TestCaseData>(testCasesCollectionRef);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!solutionCode || !assignmentData || !scenarioData || !user || !assignmentDocRef || !firestore) return;

        setIsSubmitting(true);
        toast({ title: "Submitting your solution...", description: "The AI is assessing your code. This may take a moment." });

        try {
            // Step 1: Assess the current submission
            const assessmentInput: AssessCodeInput = {
                scenario: scenarioData.content,
                dsaConcept: assignmentData.dsaConcept,
                difficulty: scenarioData.difficulty,
                studentCode: solutionCode,
            };
            const assessmentResult = await assessCodeSubmission(assessmentInput);

            // Step 2: Generate a study plan based on the result
            const studyPlanInput: GenerateStudyPlanInput = {
                currentScore: assessmentResult.score,
                incorrectConcepts: assessmentResult.isCorrect ? [] : [assignmentData.dsaConcept]
            };
            const studyPlanResult = await generateStudyPlan(studyPlanInput);
            
            setSubmissionResult({ assessment: assessmentResult, studyPlan: studyPlanResult });

            // Step 3: Update the current assignment document with the results
            const submissionData = {
                solutionCode: solutionCode,
                score: assessmentResult.score,
                feedback: assessmentResult.feedback,
                status: 'completed' as const,
                submittedAt: serverTimestamp(),
            };

            await updateDoc(assignmentDocRef, submissionData)
              .catch(error => {
                const permissionError = new FirestorePermissionError({
                    path: assignmentDocRef.path,
                    operation: 'update',
                    requestResourceData: submissionData
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
              });

            // --- Autonomous Agent Logic ---
            // Step 4: Fetch recent performance history
            const historyQuery = query(
                collection(firestore, 'users', user.uid, 'assignments'),
                where('status', '==', 'completed'),
                orderBy('submittedAt', 'desc'),
                limit(5)
            );
            const historySnapshot = await getDocs(historyQuery);
            const performanceHistory = historySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    dsaConcept: data.dsaConcept,
                    score: data.score,
                    difficulty: 'Medium' // Placeholder, this should be fetched from scenario
                };
            });

            // Step 5: Get current user profile to find previous goal
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            const userProfile = userDoc.data();

            // Step 6: Call the AI agent to get the next goal and generate a new assignment
            const agentInput: UpdateLearningGoalsInput = {
                performanceHistory,
                previousGoal: userProfile?.learningGoals,
            };
            const { goal, nextAssignment } = await updateLearningGoalsAndCreateAssignment(agentInput);
            
            // Step 7: Update the user's profile with the new goal
            const userDocRefToUpdate = doc(firestore, 'users', user.uid);
            const userProfileUpdate = { learningGoals: goal.nextGoal };
            await updateDoc(userDocRefToUpdate, userProfileUpdate)
                .catch(error => {
                    const permissionError = new FirestorePermissionError({
                        path: userDocRefToUpdate.path,
                        operation: 'update',
                        requestResourceData: userProfileUpdate
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw permissionError;
                });

            // Step 8: Create the new scenario and assignment in Firestore
            const newScenarioData = {
                theme: 'Business/Real-world',
                content: nextAssignment.scenario,
                difficulty: goal.recommendedDifficulty,
                dsaConcept: nextAssignment.dsaConcept,
                createdAt: serverTimestamp(),
                createdBy: 'SYSTEM',
            };
            const newScenarioRef = await addDoc(collection(firestore, 'scenarios'), newScenarioData)
                .catch(error => {
                    const permissionError = new FirestorePermissionError({
                        path: 'scenarios',
                        operation: 'create',
                        requestResourceData: newScenarioData
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw permissionError;
                });
            
            // Generate a unique ID for the new assignment on the client
            const newAssignmentRef = doc(collection(firestore, `users/${user.uid}/assignments`));
            const newAssignmentData = {
                id: newAssignmentRef.id, // Use the generated ID
                educatorId: 'SYSTEM',
                scenarioId: newScenarioRef.id,
                studentId: user.uid,
                dueDate: addDays(new Date(), 7),
                status: 'assigned' as const,
                createdAt: serverTimestamp(),
                dsaConcept: nextAssignment.dsaConcept,
                isAutonomouslyGenerated: true,
            };
            
            await setDoc(newAssignmentRef, newAssignmentData)
                .catch(error => {
                    const permissionError = new FirestorePermissionError({
                        path: newAssignmentRef.path,
                        operation: 'create',
                        requestResourceData: newAssignmentData
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw permissionError;
                });

            // Create hints for the new scenario
            const hintsCollection = collection(firestore, 'scenarios', newScenarioRef.id, 'hints');
            for (const [index, hintContent] of nextAssignment.hints.entries()) {
                 addDoc(hintsCollection, { hintLevel: index + 1, content: hintContent }).catch(error => {
                    const permissionError = new FirestorePermissionError({
                        path: `scenarios/${newScenarioRef.id}/hints`,
                        operation: 'create',
                    });
                    errorEmitter.emit('permission-error', permissionError);
                });
            }

            // Create test cases for the new scenario
            const testCasesCollection = collection(firestore, 'scenarios', newScenarioRef.id, 'testCases');
            for (const testCase of nextAssignment.testCases) {
                addDoc(testCasesCollection, testCase).catch(error => {
                    const permissionError = new FirestorePermissionError({
                        path: `scenarios/${newScenarioRef.id}/testCases`,
                        operation: 'create',
                        requestResourceData: testCase
                    });
                    errorEmitter.emit('permission-error', permissionError);
                });
            }

            toast({
                title: `Assessment Complete! Score: ${assessmentResult.score}%`,
                description: "Check the results and your new study plan.",
            });

        } catch (error) {
             if (!(error instanceof FirestorePermissionError)) {
                 console.error("An unexpected error occurred during submission:", error);
                 toast({
                    variant: 'destructive',
                    title: "An Unexpected Error Occurred",
                    description: "There was a problem submitting your assignment. Please try again later."
                });
             }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCloseDialog = () => {
        setSubmissionResult(null);
        router.push('/dashboard');
    }

    const isLoading = isUserLoading || isAssignmentLoading || isScenarioLoading || areHintsLoading || areTestCasesLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex items-center gap-3 text-lg text-muted-foreground">
                    <BrainCircuit className="h-6 w-6 animate-spin text-primary" />
                    <span>Loading Assignment...</span>
                </div>
            </div>
        );
    }
    
    if (!assignmentData || !scenarioData) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-lg text-destructive">Could not load assignment details.</p>
            </div>
        );
    }

    const isCompleted = assignmentData.status === 'completed';

    return (
        <div className="container mx-auto max-w-4xl py-8">
            <Dialog open={!!submissionResult} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-headline">Submission Results</DialogTitle>
                         <DialogDescription>
                            Great work! Here's your feedback and your next steps.
                        </DialogDescription>
                    </DialogHeader>
                    {submissionResult && (
                         <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
                             <div className="text-center">
                                <p className="text-lg text-muted-foreground">You scored</p>
                                <p className="text-6xl font-bold text-primary">{submissionResult.assessment.score}%</p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2 text-lg">AI Feedback:</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md border">{submissionResult.assessment.feedback}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2 text-lg">Your Submitted Code:</h4>
                                    <pre className="bg-muted p-4 rounded-md text-xs text-foreground overflow-x-auto"><code>{solutionCode}</code></pre>
                                </div>
                            </div>
                           
                            <div className="p-4 rounded-lg border bg-card-background mt-4">
                                 <h3 className="flex items-center gap-3 text-xl font-semibold mb-3 font-headline"><Target className="text-primary"/> Your New Study Plan</h3>
                                 <p className="text-muted-foreground mb-4 text-sm">{submissionResult.studyPlan.intro}</p>
                                 <ul className="space-y-3">
                                    {submissionResult.studyPlan.topics.map((topic, index) => (
                                        <li key={index} className="p-3 bg-background rounded-lg border">
                                            <h4 className="font-bold">{topic.dsaConcept}</h4>
                                            <p className="text-muted-foreground text-sm">{topic.recommendation}</p>
                                        </li>
                                    ))}
                                 </ul>
                            </div>
                         </div>
                    )}
                    <Button onClick={handleCloseDialog} className="mt-4">
                        Back to Dashboard
                    </Button>
                </DialogContent>
            </Dialog>


            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle className="font-headline text-3xl">{assignmentData.dsaConcept}</CardTitle>
                             <CardDescription>Difficulty: {scenarioData.difficulty}</CardDescription>
                        </div>
                        <Badge variant={isCompleted ? 'secondary' : 'default'} className="capitalize">{assignmentData.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="prose dark:prose-invert max-w-none mb-8"
                        dangerouslySetInnerHTML={{ __html: scenarioData.content.replace(/\n/g, '<br />') }}
                    />
                    
                    <Accordion type="multiple" className="w-full mb-8">
                        {hintsData && hintsData.length > 0 && (
                            <AccordionItem value="hints">
                                <AccordionTrigger className="text-lg font-medium">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="h-5 w-5" />
                                        Adaptive Hints
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4">
                                    <div className="space-y-4">
                                        {hintsData.map((hint) => (
                                            <div key={hint.id} className="p-4 bg-background/50 rounded-md border">
                                                <p className="text-muted-foreground">{hint.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )}
                        {testCasesData && testCasesData.length > 0 && (
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
                                            {testCasesData.map((tc) => (
                                                <TableRow key={tc.id}>
                                                    <TableCell className="font-mono text-xs">{tc.input}</TableCell>
                                                    <TableCell className="font-mono text-xs">{tc.output}</TableCell>
                                                    <TableCell>
                                                        {tc.isEdgeCase && (
                                                            <Badge variant="outline" className="mb-1 mr-2 border-amber-500 text-amber-500">
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
                        )}
                    </Accordion>


                    {isCompleted ? (
                         <Alert>
                            <AlertTitle className="font-headline text-xl">Assignment Already Completed</AlertTitle>
                            <AlertDescription className="space-y-4">
                                <p>You have already submitted a solution for this assignment and received a score of <strong>{assignmentData.score}%</strong>.</p>
                                <div>
                                    <h4 className="font-semibold mb-2">Your Submitted Code:</h4>
                                    <pre className="bg-muted p-4 rounded-md text-xs text-foreground overflow-x-auto"><code>{assignmentData.solutionCode}</code></pre>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">AI Feedback:</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignmentData.feedback}</p>
                                </div>
                                 <Button onClick={() => router.push('/dashboard')} className="mt-4">Back to Dashboard</Button>
                            </AlertDescription>
                        </Alert>
                    ): (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="solution-code" className="text-lg font-semibold">Your Solution</label>
                                <Textarea 
                                    id="solution-code"
                                    value={solutionCode}
                                    onChange={(e) => setSolutionCode(e.target.value)}
                                    placeholder="Enter your code here..."
                                    className="font-code h-80 text-sm"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                             <p className="text-xs text-muted-foreground">You can only submit your solution once. Make sure it's ready before submitting.</p>
                             <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !solutionCode}>
                                {isSubmitting ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin"/>
                                        Assessing & Updating Your Path...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Submit and Assess
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    