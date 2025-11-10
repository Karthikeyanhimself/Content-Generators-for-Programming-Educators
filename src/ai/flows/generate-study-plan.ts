'use server';
/**
 * @fileOverview Defines a Genkit flow for generating a personalized study plan.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateStudyPlanInputSchema = z.object({
  incorrectConcepts: z
    .array(z.string())
    .describe(
      'An array of DSA concepts the student answered incorrectly.'
    ),
  currentScore: z
    .number()
    .describe('The student score from the quiz.'),
});
export type GenerateStudyPlanInput = z.infer<typeof GenerateStudyPlanInputSchema>;


const StudyPlanTopicSchema = z.object({
  dsaConcept: z.string().describe('The DSA concept to focus on.'),
  recommendation: z
    .string()
    .describe(
      'A brief, actionable recommendation for how to study this concept.'
    ),
});

const StudyPlanSchema = z.object({
  intro: z.string().describe("A brief, encouraging introductory sentence for the study plan."),
  topics: z
    .array(StudyPlanTopicSchema)
    .describe('An array of study topics.'),
});
export type StudyPlan = z.infer<typeof StudyPlanSchema>;


const generateStudyPlanFlow = ai.defineFlow(
  {
    name: 'generateStudyPlanFlow',
    inputSchema: GenerateStudyPlanInputSchema,
    outputSchema: StudyPlanSchema,
  },
  async ({ incorrectConcepts, currentScore }) => {
    const { output } = await ai.generate({
      prompt: `
        You are an expert programming tutor creating a personalized study plan for a student based on their recent quiz results.

        The student's quiz score is ${currentScore}%.
        They struggled with the following Data Structures and Algorithms (DSA) concepts: ${incorrectConcepts.join(
          ', '
        )}.

        Your task is to generate a concise, encouraging, and actionable study plan.

        1.  Write a brief, one-sentence introduction that acknowledges their score and sets a positive tone for improvement.
        2.  For each of the incorrect concepts, provide a targeted recommendation. The recommendation should suggest a specific area of focus or a type of problem to practice. Keep it brief and to the point.
      `,
      output: {
        schema: StudyPlanSchema,
      },
      config: {
        temperature: 0.5,
      },
    });
    return output!;
  }
);

export async function generateStudyPlan(
  input: GenerateStudyPlanInput
): Promise<StudyPlan> {
  return generateStudyPlanFlow(input);
}
