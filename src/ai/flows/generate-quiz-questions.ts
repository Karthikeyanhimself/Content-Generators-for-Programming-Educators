'use server';
/**
 * @fileOverview Defines a Genkit flow for generating quiz questions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuizQuestionSchema = z.object({
  question: z.string().describe('The quiz question.'),
  options: z.array(z.string()).describe('An array of 4 multiple-choice options.'),
  answer: z.string().describe('The correct option.'),
  explanation: z.string().describe('A brief explanation of the correct answer.'),
  dsaConcept: z.string().describe('The DSA concept this question relates to.'),
});

const GenerateQuizOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema).length(5).describe('An array of 5 quiz questions.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const generateQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionsFlow',
    outputSchema: GenerateQuizOutputSchema,
  },
  async () => {
    const { output } = await ai.generate({
      prompt: `
        Generate a set of 5 multiple-choice quiz questions to assess a student's baseline knowledge of fundamental data structures and algorithms.

        Cover these 5 topics, one question per topic:
        1. Arrays & Strings
        2. Linked Lists
        3. Stacks & Queues
        4. Trees (specifically Binary Search Trees)
        5. Basic Sorting Algorithms (like Bubble Sort or Selection Sort)

        For each question, provide:
        - The question itself.
        - 4 multiple-choice options.
        - The letter of the correct option (e.g., "A", "B", "C", or "D").
        - A brief explanation for the correct answer.
        - The specific DSA concept being tested.
      `,
      output: {
        schema: GenerateQuizOutputSchema,
      },
      config: {
        temperature: 0.8, // Increase creativity for varied questions
      },
    });
    return output!;
  }
);

export async function generateQuizQuestions(): Promise<GenerateQuizOutput> {
  return generateQuizQuestionsFlow();
}
