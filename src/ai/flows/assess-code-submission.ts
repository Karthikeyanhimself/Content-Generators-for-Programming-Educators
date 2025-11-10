'use server';
/**
 * @fileOverview Defines a Genkit flow for assessing a student's code submission.
 * This flow evaluates the code against the scenario, difficulty, and DSA concept,
 * providing a score and constructive feedback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const AssessCodeInputSchema = z.object({
  scenario: z.string().describe('The programming scenario the code is trying to solve.'),
  dsaConcept: z.string().describe('The primary Data Structure or Algorithm concept for the scenario.'),
  difficulty: z.string().describe('The difficulty level of the scenario (e.g., Easy, Medium, Hard).'),
  studentCode: z.string().describe("The student's submitted code solution."),
});
export type AssessCodeInput = z.infer<typeof AssessCodeInputSchema>;

export const AssessCodeOutputSchema = z.object({
  isCorrect: z.boolean().describe('Whether the provided solution correctly solves the scenario.'),
  score: z.number().min(0).max(100).describe('A score from 0 to 100 for the submission.'),
  feedback: z.string().describe('Detailed, constructive feedback for the student.'),
});
export type AssessCodeOutput = z.infer<typeof AssessCodeOutputSchema>;


const prompt = ai.definePrompt({
  name: 'assessCodeSubmissionPrompt',
  input: { schema: AssessCodeInputSchema },
  output: { schema: AssessCodeOutputSchema },
  prompt: `
    You are an expert programming instructor and code evaluator. Your task is to assess a student's code submission for a given programming scenario.

    Analyze the student's code based on the following criteria:
    1.  **Correctness**: Does the code solve the problem described in the scenario? Does it handle edge cases?
    2.  **Efficiency**: Is the code efficient? Does it use an appropriate data structure and algorithm for the {{{dsaConcept}}} concept?
    3.  **Readability**: Is the code well-structured and easy to understand?

    Based on your analysis, provide a score from 0 to 100 and generate constructive feedback. The feedback should be encouraging, highlight what the student did well, and provide specific, actionable suggestions for improvement.

    **Scenario Details:**
    - **Concept:** {{{dsaConcept}}}
    - **Difficulty:** {{{difficulty}}}
    - **Problem:** {{{scenario}}}

    **Student's Code:**
    \`\`\`
    {{{studentCode}}}
    \`\`\`

    First, determine if the solution is fundamentally correct and set the 'isCorrect' flag.
    Then, calculate the score. A fully correct and efficient solution should get 90-100. A solution that works but is inefficient might get 70-85. A partially correct solution could get 40-60. A non-working solution should get below 40.
    Finally, write the feedback. Be specific. If they used the wrong algorithm, explain why and point them to the right one. If there are logical errors, point them out.
  `,
  config: {
    temperature: 0.4,
  },
});

const assessCodeSubmissionFlow = ai.defineFlow(
  {
    name: 'assessCodeSubmissionFlow',
    inputSchema: AssessCodeInputSchema,
    outputSchema: AssessCodeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


export async function assessCodeSubmission(input: AssessCodeInput): Promise<AssessCodeOutput> {
  return assessCodeSubmissionFlow(input);
}

    