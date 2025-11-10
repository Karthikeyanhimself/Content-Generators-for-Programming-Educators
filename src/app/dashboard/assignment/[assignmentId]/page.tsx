'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { assessCodeSubmission, AssessCodeInput, AssessCodeOutput } from '@/ai/flows/assess-code-submission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Loader, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

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

export default function AssignmentPage() {
    const { assignmentId } = useParams();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [solutionCode, setSolutionCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!solutionCode || !assignmentData || !scenarioData || !user) return;

        setIsSubmitting(true);
        toast({ title: "Submitting your solution...", description: "The AI is warming up to assess your code." });

        try {
            const assessmentInput: AssessCodeInput = {
                scenario: scenarioData.content,
                dsaConcept: assignmentData.dsaConcept,
                difficulty: scenarioData.difficulty,
                studentCode: solutionCode,
            };

            const assessmentResult = await assessCodeSubmission(assessmentInput);

            await updateDoc(assignmentDocRef!, {
                solutionCode: solutionCode,
                score: assessmentResult.score,
                feedback: assessmentResult.feedback,
                status: 'completed',
                submittedAt: serverTimestamp(),
            });
            
            toast({
                title: `Assessment Complete! Score: ${assessmentResult.score}%`,
                description: "Your assignment has been graded. You can view feedback on your dashboard.",
            });

            router.push('/dashboard');

        } catch (error) {
            console.error("Error assessing code:", error);
            toast({
                variant: 'destructive',
                title: "Submission Error",
                description: "There was a problem submitting your code for assessment. Please try again."
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isUserLoading || isAssignmentLoading || isScenarioLoading;

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
                                        Assessing Your Code...
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

    