
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
    status: 'assigned' | 'submitted' | 'completed';
    dsaConcept: string;
    score?: number;
    feedback?: string;
    solutionCode?: string;
    educatorId: string;
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

            // Step 2: The student doesn't get a study plan immediately anymore.
            // We just show a confirmation.
            toast({
                title: `Submission Received!`,
                description: "Your submission is pending review by your educator.",
            });
            
            const submittedAtTimestamp = serverTimestamp();

            // Step 3: Update the student's assignment document with the code and 'submitted' status.
            // NO score or feedback is saved here.
            const studentAssignmentUpdate = {
                solutionCode: solutionCode,
                status: 'submitted' as const,
                submittedAt: submittedAtTimestamp,
            };

            await updateDoc(assignmentDocRef, studentAssignmentUpdate)
              .catch(error => {
                const permissionError = new FirestorePermissionError({
                    path: assignmentDocRef.path,
                    operation: 'update',
                    requestResourceData: studentAssignmentUpdate
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
              });

            // Step 4: Denormalize submission for educator, including the AI's assessment.
            if (assignmentData.educatorId && assignmentData.educatorId !== 'SYSTEM') {
                const educatorSubmissionsRef = collection(firestore, 'educators', assignmentData.educatorId, 'submissions');
                const submissionRecord = {
                    studentId: user.uid,
                    studentEmail: user.email,
                    studentName: `${user.displayName || user.email}`,
                    originalAssignmentId: assignmentId as string,
                    dsaConcept: assignmentData.dsaConcept,
                    score: assessmentResult.score,
                    feedback: assessmentResult.feedback,
                    solutionCode: solutionCode,
                    submittedAt: submittedAtTimestamp,
                    isPublished: false, // NEW: Mark as not published
                };
                 addDoc(educatorSubmissionsRef, submissionRecord).catch(error => {
                    const permissionError = new FirestorePermissionError({
                        path: `educators/${(assignmentData as any).educatorId}/submissions`,
                        operation: 'create',
                        requestResourceData: submissionRecord,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw permissionError;
                });
            }
            
            // Redirect user to dashboard after submission.
            router.push('/dashboard');

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

    const isSubmitted = assignmentData.status === 'submitted';
    const isCompleted = assignmentData.status === 'completed';

    return (
        <div className="container mx-auto max-w-4xl py-8">
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


                    {isCompleted || isSubmitted ? (
                         <Alert>
                            <AlertTitle className="font-headline text-xl">
                               {isCompleted ? 'Assignment Completed' : 'Assignment Submitted'}
                            </AlertTitle>
                            <AlertDescription className="space-y-4">
                               {isCompleted ? (
                                <>
                                   <p>You have already completed this assignment and received a score of <strong>{assignmentData.score}%</strong>.</p>
                                    <div>
                                        <h4 className="font-semibold mb-2">Your Submitted Code:</h4>
                                        <pre className="bg-muted p-4 rounded-md text-xs text-foreground overflow-x-auto"><code>{assignmentData.solutionCode}</code></pre>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">AI Feedback:</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignmentData.feedback}</p>
                                    </div>
                                </>
                               ) : (
                                <p>Your submission is awaiting review from your educator. Your score and feedback will appear here once published.</p>
                               )}
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
                                        Submitting for Review...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Submit for Review
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

    