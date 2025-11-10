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
import { Loader, Lightbulb, FileCheck2, Copy, Sparkles } from 'lucide-react';
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

export default function EducatorDashboard() {
  const { toast } = useToast();

  const [theme, setTheme] = useState('Adventure/Fantasy');
  const [dsaConcept, setDsaConcept] = useState('Arrays');
  const [difficulty, setDifficulty] = useState(1);
  const [generatedData, setGeneratedData] =
    useState<GenerateThemedScenarioOutput | null>(null);
  const [solutionTips, setSolutionTips] =
    useState<SuggestSolutionApproachTipsOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const difficultyLabels = ['Easy', 'Medium', 'Hard'];

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsGenerating(true);
    setGeneratedData(null);
    setSolutionTips(null);
    try {
      const input: GenerateThemedScenarioInput = {
        theme: theme as any,
        dsaConcept,
        difficulty: difficultyLabels[difficulty] as any,
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
      <div className="md:col-span-4 lg:col-span-3">
        <form onSubmit={handleGenerate}>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Scenario Generator</CardTitle>
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
      </div>

      <div className="md:col-span-8 lg:col-span-9">
        <Card className="min-h-[600px]">
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
              <p className="text-center text-muted-foreground pt-16">
                Your generated scenario will appear here.
              </p>
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
                            <div key={index} className="p-4 bg-background/50 rounded-md border">
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
                    <Button className='w-full' size="lg">Create Assignment from Scenario</Button>
                </div>
               )}
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
