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
  generateQuizQuestions,
  GenerateQuizOutput,
} from '@/ai/flows/generate-quiz-questions';
import { Loader, BrainCircuit } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';

export default function StudentDashboard() {
  const [quizData, setQuizData] = useState<GenerateQuizOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isQuizStarted, setIsQuizStarted] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const data = await generateQuizQuestions();
        setQuizData(data);
      } catch (error) {
        console.error('Failed to fetch quiz questions:', error);
        // Optionally, set an error state to show in the UI
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuiz();
  }, []);

  const handleStartQuiz = () => {
    setIsQuizStarted(true);
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quizData?.questions.length ?? 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz is finished, handle submission logic here in the next step
      console.log('Quiz finished. Final answers:', selectedAnswers);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <BrainCircuit className="h-12 w-12 animate-pulse text-primary" />
        <h3 className="text-xl font-semibold text-foreground">
          Preparing Your Knowledge Assessment
        </h3>
        <p className="text-muted-foreground">
          Please wait while we generate your personalized quiz...
        </p>
      </div>
    );
  }

  if (!isQuizStarted) {
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

  const currentQuestion = quizData?.questions[currentQuestionIndex];
  if (!currentQuestion) return null;

  const progressPercentage = ((currentQuestionIndex + 1) / (quizData?.questions.length ?? 1)) * 100;

  return (
    <div className="container mx-auto py-12">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <Progress value={progressPercentage} className="mb-4" />
          <CardTitle className="font-headline text-xl">
            Question {currentQuestionIndex + 1} of {quizData?.questions.length}
          </CardTitle>
          <CardDescription className="pt-2 text-lg">
            {currentQuestion.question}
          </CardDescription>
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
                className="flex items-center gap-4 rounded-md border p-4 hover:bg-accent/50 has-[input:checked]:border-primary has-[input:checked]:bg-accent/80 transition-colors"
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
