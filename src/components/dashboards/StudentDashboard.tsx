'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  generateQuizQuestions,
  GenerateQuizOutput,
} from '@/ai/flows/generate-quiz-questions';
import {
  generateStudyPlan,
  GenerateStudyPlanInput,
  StudyPlan,
} from '@/ai/flows/generate-study-plan';
import { Loader, BrainCircuit, Check, X, Target, BookOpen, BookCopy, CalendarDays, Bot } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
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
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

type Answer = {
  question: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  dsaConcept: string;
};

type ViewMode = 'loading' | 'assessment' | 'quiz' | 'results' | 'dashboard';

export default function StudentDashboard({ userProfile }: { userProfile: any }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [quizData, setQuizData] = useState<GenerateQuizOutput | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [finalAnswers, setFinalAnswers] = useState<Answer[]>([]);
  const [score, setScore] = useState(0);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

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

  useEffect(() => {
    if (!userProfile || isUserLoading) {
      setViewMode('loading');
      return;
    }

    if (userProfile.hasCompletedAssessment) {
        setViewMode('dashboard');
    } else {
       async function fetchQuiz() {
            if (quizData) {
                setViewMode('assessment');
                return;
            };
            try {
                const data = await generateQuizQuestions();
                setQuizData(data);
                setViewMode('assessment');
            } catch (error) {
                console.error('Failed to fetch quiz questions:', error);
            }
        }
        fetchQuiz();
    }
  }, [userProfile, quizData, isUserLoading]);

  const handleStartQuiz = () => {
    setViewMode('quiz');
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleFinishQuiz = async () => {
    if (!quizData || !user) return;
    
    setViewMode('results');
    setIsGeneratingPlan(true);

    const answers: Answer[] = quizData.questions.map((q, index) => {
      const selected = selectedAnswers[index] || "Not answered";
      const isCorrect = selected === q.answer;
      return {
        question: q.question,
        selected,
        correct: q.answer,
        isCorrect,
        dsaConcept: q.dsaConcept,
      };
    });

    const calculatedScore = (answers.filter((a) => a.isCorrect).length / quizData.questions.length) * 100;
    setScore(calculatedScore);
    setFinalAnswers(answers);

    const incorrectConcepts = answers
      .filter((a) => !a.isCorrect)
      .map((a) => a.dsaConcept);
    
    const planInput: GenerateStudyPlanInput = {
        incorrectConcepts: [...new Set(incorrectConcepts)],
        currentScore: calculatedScore,
    };

    try {
        const plan = await generateStudyPlan(planInput);
        setStudyPlan(plan);
        // Save the plan and assessment flag to the user's profile
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
            hasCompletedAssessment: true,
            learningGoals: plan.intro, // Set initial goal
        });
    } catch(e) {
        console.error("Failed to generate study plan", e)
    }

    setIsGeneratingPlan(false);
  };
  
  const handleViewDashboard = () => {
    setViewMode('dashboard');
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quizData?.questions.length ?? 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleFinishQuiz();
    }
  };

  if (viewMode === 'loading') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <BrainCircuit className="h-12 w-12 animate-pulse text-primary" />
        <h3 className="text-xl font-semibold text-foreground">
          Preparing Your Dashboard
        </h3>
        <p className="text-muted-foreground">
          Please wait while we check for your initial assessment...
        </p>
      </div>
    );
  }

  if (viewMode === 'assessment') {
    return (
      <div className="container mx-auto flex h-[70vh] items-center justify-center">
        <Card className="w-full max-w-lg text-center shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Welcome to AlgoGenius!</CardTitle>
            <CardDescription className="text-base">
              Let's start by assessing your current knowledge to create your personalized learning plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This short quiz will help us understand your strengths and weaknesses in key Data Structures and Algorithms concepts.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleStartQuiz} className="w-full" size="lg">
              Start Knowledge Assessment
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (viewMode === 'quiz') {
    const currentQuestion = quizData?.questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    const progressPercentage = ((currentQuestionIndex + 1) / (quizData?.questions.length ?? 1)) * 100;

    return (
      <div className="container mx-auto py-12">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <Progress value={progressPercentage} className="mb-4 h-2" />
            <CardDescription>
              Question {currentQuestionIndex + 1} of {quizData?.questions.length} &bull; {currentQuestion.dsaConcept}
            </CardDescription>
            <CardTitle className="font-headline text-2xl pt-2">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedAnswers[currentQuestionIndex] || ''}
              onValueChange={(value) => handleAnswerSelect(currentQuestionIndex, value)}
              className="space-y-4"
            >
              {currentQuestion.options.map((option, index) => (
                <Label
                  key={index}
                  className="flex items-center gap-4 rounded-lg border p-4 text-base hover:bg-accent/50 has-[input:checked]:border-primary has-[input:checked]:bg-accent/80 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value={option} id={`q${currentQuestionIndex}-o${index}`} />
                  <span>{option}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleNextQuestion}
              disabled={!selectedAnswers[currentQuestionIndex]}
              className="w-full"
              size="lg"
            >
              {currentQuestionIndex === (quizData?.questions.length ?? 0) - 1 ? 'Finish Quiz' : 'Next Question'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (viewMode === 'results') {
    return (
      <div className="container mx-auto py-12">
        <Card className="w-full max-w-3xl mx-auto shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline">Assessment Complete!</CardTitle>
            <CardDescription className="text-lg">
              You scored
            </CardDescription>
            <p className="text-6xl font-bold text-primary">{Math.round(score)}%</p>
          </CardHeader>
          <CardContent>
            {isGeneratingPlan ? (
                 <div className="flex h-[20vh] flex-col items-center justify-center gap-4 text-center">
                    <BrainCircuit className="h-10 w-10 animate-pulse text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                    Analyzing your results and building your plan...
                    </h3>
                </div>
            ) : (
                studyPlan && (
                    <div className="mt-6 space-y-6">
                        <div className="p-6 rounded-lg border bg-card-background">
                             <h3 className="flex items-center gap-3 text-2xl font-semibold mb-4 font-headline"><Target className="text-primary"/> Your Personalized Study Plan</h3>
                             <p className="text-muted-foreground mb-6">{studyPlan.intro}</p>
                             <ul className="space-y-4">
                                {studyPlan.topics.map((topic, index) => (
                                    <li key={index} className="p-4 bg-background rounded-lg border">
                                        <h4 className="font-bold text-lg">{topic.dsaConcept}</h4>
                                        <p className="text-muted-foreground">{topic.recommendation}</p>
                                    </li>
                                ))}
                             </ul>
                        </div>
                    </div>
                )
            )}

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-center">Your Answers</h3>
              <div className="space-y-4">
                {finalAnswers.map((answer, index) => (
                  <div key={index} className="p-4 border rounded-lg flex items-start gap-4">
                    {answer.isCorrect ? (
                      <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">{answer.question}</p>
                      <p className={`text-sm ${answer.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                        Your answer: {answer.selected}
                      </p>
                      {!answer.isCorrect && (
                        <p className="text-sm text-muted-foreground">
                          Correct answer: {answer.correct}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
           <CardFooter>
            <Button size="lg" className="w-full" onClick={handleViewDashboard} disabled={isGeneratingPlan}>
                <BookOpen className="mr-2"/>
                Start Learning
            </Button>
           </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (viewMode === 'dashboard') {
    return (
        <div className="space-y-8">
             <Alert className="bg-primary/5 border-primary/20">
                <Target className="h-4 w-4 !text-primary" />
                <AlertTitle className="text-primary font-bold">Current AI Goal</AlertTitle>
                <AlertDescription>
                    {userProfile.learningGoals || "Your learning plan is being generated. Complete an assignment to get your first goal!"}
                </AlertDescription>
            </Alert>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Assignments</CardTitle>
                    <CardDescription>Challenges assigned to you by your educators or the AI agent.</CardDescription>
                </CardHeader>
                <CardContent>
                     {assignmentsLoading ? (
                         <div className="flex h-[20vh] flex-col items-center justify-center gap-2 text-center">
                            <Loader className="h-8 w-8 text-muted-foreground animate-spin"/>
                            <p className="text-muted-foreground text-sm">Loading assignments...</p>
                        </div>
                     ) : assignments && assignments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {assignments.map((assignment: any) => (
                                <Card key={assignment.id} className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-xl">{assignment.dsaConcept}</CardTitle>
                                            {assignment.isAutonomouslyGenerated && (
                                                <Badge variant="outline" className="border-primary/50 text-primary"><Bot className="h-3 w-3 mr-1.5"/> AI</Badge>
                                            )}
                                        </div>
                                        <CardDescription>from {assignment.educatorId === 'SYSTEM' ? 'AI Agent' : 'Educator'}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 flex-1">
                                         <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Due Date</span>
                                            <span>{assignment.dueDate ? format(assignment.dueDate.toDate(), 'PPP') : 'N/A'}</span>
                                        </div>
                                         <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Status</span>
                                            <Badge variant={assignment.status === 'assigned' ? 'default' : 'secondary'} className="capitalize">{assignment.status}</Badge>
                                        </div>
                                        {assignment.status === 'completed' && (
                                             <div className="flex items-center justify-between text-sm font-medium pt-2">
                                                <span className="text-muted-foreground">Score</span>
                                                <span className={assignment.score > 75 ? "text-green-500" : "text-amber-500"}>{assignment.score}%</span>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        {assignment.status === 'assigned' ? (
                                            <Button className="w-full" asChild>
                                                <Link href={`/dashboard/assignment/${assignment.id}`}>Start Assignment</Link>
                                            </Button>
                                        ) : (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button className="w-full" variant="outline">View Submission</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="max-w-2xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Your Submission for: {assignment.dsaConcept}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                           Submitted on {assignment.submittedAt ? format(assignment.submittedAt.toDate(), 'PPP') : ''}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <ScrollArea className="max-h-[50vh]">
                                                        <div className="space-y-4 p-1">
                                                            <div>
                                                                <h4 className="font-semibold mb-2">Your Score: {assignment.score}%</h4>
                                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignment.feedback}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold mb-2">Your Code:</h4>
                                                                <pre className="bg-muted p-4 rounded-md text-xs text-foreground overflow-x-auto"><code>{assignment.solutionCode}</code></pre>
                                                            </div>
                                                        </div>
                                                    </ScrollArea>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Close</AlertDialogCancel>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                     ) : (
                        <div className="flex h-[20vh] flex-col items-center justify-center gap-2 text-center border-2 border-dashed rounded-lg">
                            <BookCopy className="h-8 w-8 text-muted-foreground"/>
                            <h3 className="text-lg font-semibold text-foreground">
                                No Assignments Yet
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Your assignments from educators will appear here.
                            </p>
                        </div>
                     )}
                </CardContent>
            </Card>
        </div>
    )
  }

  return null;
}
