'use server';
/**
 * @fileOverview Provides solution approach tips for a given programming scenario.
 *
 * - suggestSolutionApproachTips - A function that takes a scenario and difficulty level and returns solution tips.
 * - SuggestSolutionApproachTipsInput - The input type for the suggestSolutionApproachTips function.
 * - SuggestSolutionApproachTipsOutput - The return type for the suggestSolutionApproachTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SuggestSolutionApproachTipsInputSchema = z.object({
  scenario: z.string().describe('The programming scenario for which to provide tips.'),
  difficulty: z
    .string()
    .describe(
      'The difficulty level of the scenario (e.g., Easy, Medium, Hard).'
    ),
});
export type SuggestSolutionApproachTipsInput = z.infer<
  typeof SuggestSolutionApproachTipsInputSchema
>;

const SuggestSolutionApproachTipsOutputSchema = z.object({
  tips: z.array(z.string()).describe('Array of solution approach tips.'),
});
export type SuggestSolutionApproachTipsOutput = z.infer<
  typeof SuggestSolutionApproachTipsOutputSchema
>;

export async function suggestSolutionApproachTips(
  input: SuggestSolutionApproachTipsInput
): Promise<SuggestSolutionApproachTipsOutput> {
  return suggestSolutionApproachTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSolutionApproachTipsPrompt',
  input: {schema: SuggestSolutionApproachTipsInputSchema},
  output: {schema: SuggestSolutionApproachTipsOutputSchema},
  prompt: `You are an expert programming tutor, skilled at providing helpful tips to students.

  Based on the programming scenario and difficulty level provided, suggest several solution approach tips.
  Focus on high-level strategies and common data structures and algorithms that might be useful.
  The tips should be clear, concise, and actionable.

  Scenario: {{{scenario}}}
  Difficulty: {{{difficulty}}}
  Tips:
  `,
});

const suggestSolutionApproachTipsFlow = ai.defineFlow(
  {
    name: 'suggestSolutionApproachTipsFlow',
    inputSchema: SuggestSolutionApproachTipsInputSchema,
    outputSchema: SuggestSolutionApproachTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
