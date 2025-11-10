'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from '@/ai/flows/generate-themed-scenario';
import { Loader } from 'lucide-react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [theme, setTheme] = useState('Adventure/Fantasy');
  const [dsaConcept, setDsaConcept] = useState('Arrays');
  const [difficulty, setDifficulty] = useState([1]);
  const [generatedScenario, setGeneratedScenario] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedScenario('');
    try {
      const input: GenerateThemedScenarioInput = {
        theme: theme as any,
        dsaConcept,
      };
      const result = await generateThemedScenario(input);
      setGeneratedScenario(result.scenario);
    } catch (error) {
      console.error('Error generating scenario:', error);
      setGeneratedScenario(
        'Sorry, there was an error generating the scenario. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const difficultyLabels = ['Easy', 'Medium', 'Hard'];

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">
                Scenario Generator
              </CardTitle>
              <CardDescription>
                Create a new programming challenge.
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
                <Label htmlFor="dsa-concept">DSA Concept</Label>
                <Input
                  id="dsa-concept"
                  placeholder="e.g., Arrays, Trees, Graphs"
                  value={dsaConcept}
                  onChange={(e) => setDsaConcept(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Difficulty</Label>
                  <span className="text-sm font-medium text-muted-foreground">
                    {difficultyLabels[difficulty[0]]}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={1}
                  value={difficulty}
                  onValueChange={setDifficulty}
                />
              </div>

              <Button
                onClick={handleGenerate}
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
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-headline">Generated Scenario</CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-1/4 rounded-full bg-muted animate-pulse"></div>
                    <div className="h-4 w-full rounded-full bg-muted animate-pulse"></div>
                    <div className="h-4 w-3/4 rounded-full bg-muted animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-1/2 rounded-full bg-muted animate-pulse"></div>
                    <div className="h-4 w-full rounded-full bg-muted animate-pulse"></div>
                    <div className="h-4 w-5/6 rounded-full bg-muted animate-pulse"></div>
                  </div>
                </div>
              ) : generatedScenario ? (
                <div
                  className="prose prose-sm max-w-none text-card-foreground"
                  dangerouslySetInnerHTML={{
                    __html: generatedScenario.replace(/\n/g, '<br />'),
                  }}
                />
              ) : (
                <p className="text-muted-foreground">
                  Your generated scenario will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
