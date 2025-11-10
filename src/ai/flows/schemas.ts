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
