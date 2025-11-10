'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, addDoc, collection, getDocs, query, limit, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { assessCodeSubmission } from '@/ai/flows/assess-code-submission';
import { updateLearningGoalsAndCreateAssignment } from '@/ai/flows/update-learning-goals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Loader, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { addDays } from 'date-fns';
import type { AssessCodeInput, AssessCodeOutput } from '@/ai/flows/schemas';
import type { UpdateLearningGoalsInput } from '@/ai/flows/schemas';

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

            // Step 2: Update the current assignment document with the results
            await updateDoc(assignmentDocRef!, {
                solutionCode: solutionCode,
                score: assessmentResult.score,
                feedback: assessmentResult.feedback,
                status: 'completed',
                submittedAt: serverTimestamp(),
            });

            toast({
                title: `Assessment Complete! Score: ${assessmentResult.score}%`,
                description: "The AI is now generating your next goal and assignment.",
            });

            // --- Autonomous Agent Logic ---
            // Step 3: Fetch recent performance history
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

            // Step 4: Get current user profile to find previous goal
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            const userProfile = userDoc.data();

            // Step 5: Call the AI agent to get the next goal and generate a new assignment
            const agentInput: UpdateLearningGoalsInput = {
                performanceHistory,
                previousGoal: userProfile?.learningGoals,
            };
            const { goal, nextAssignment } = await updateLearningGoalsAndCreateAssignment(agentInput);
            
            // Step 6: Update the user's profile with the new goal
            await updateDoc(doc(firestore, 'users', user.uid), {
                learningGoals: goal.nextGoal,
            });

            // Step 7: Create the new scenario and assignment in Firestore
            const newScenarioRef = await addDoc(collection(firestore, 'scenarios'), {
                theme: 'Business/Real-world',
                content: nextAssignment.scenario,
                difficulty: nextAssignment.dsaConcept,
                dsaConcept: nextAssignment.dsaConcept,
                createdAt: serverTimestamp(),
                createdBy: 'SYSTEM',
            });

            const newAssignmentRef = doc(collection(firestore, `users/${user.uid}/assignments`));
            await setDoc(newAssignmentRef, {
                id: newAssignmentRef.id,
                educatorId: 'SYSTEM',
                scenarioId: newScenarioRef.id,
                studentId: user.uid,
                dueDate: addDays(new Date(), 7),
                status: 'assigned',
                createdAt: serverTimestamp(),
                dsaConcept: nextAssignment.dsaConcept,
                isAutonomouslyGenerated: true,
            });

            toast({
                title: "New Goal & Assignment Created!",
                description: "Your dashboard has been updated with your next challenge.",
            });

            router.push('/dashboard');

        } catch (error) {
            console.error("Error during submission and autonomous update:", error);
            toast({
                variant: 'destructive',
                title: "Submission Error",
                description: "There was a problem submitting your code or generating the next step. Please try again."
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
