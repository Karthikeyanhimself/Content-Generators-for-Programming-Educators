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


const PerformanceHistorySchema = z.object({
  dsaConcept: z.string(),
  score: z.number(),
  difficulty: z.string(),
});

export const UpdateLearningGoalsInputSchema = z.object({
  previousGoal: z.string().optional().describe("The student's previous learning goal."),
  performanceHistory: z.array(PerformanceHistorySchema).describe("A history of the student's recent assignment scores and topics."),
});
export type UpdateLearningGoalsInput = z.infer<typeof UpdateLearningGoalsInputSchema>;

export const UpdateLearningGoalsOutputSchema = z.object({
  nextGoal: z.string().describe("The new, specific, and measurable learning goal for the student."),
  weakestConcept: z.string().describe("The DSA concept the student is struggling with the most, which will be the focus of the next assignment."),
  recommendedDifficulty: z.enum(['Easy', 'Medium', 'Hard']).describe("The recommended difficulty for the next assignment."),
});
export type UpdateLearningGoalsOutput = z.infer<typeof UpdateLearningGoalsOutputSchema>;
