'use server';

/**
 * @fileOverview Defines a Genkit flow for updating a student's learning goals.
 * This flow acts as an autonomous agent that analyzes a student's performance
 * history and generates a new, focused goal and a corresponding assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generateThemedScenario, GenerateThemedScenarioInput, GenerateThemedScenarioOutput } from './generate-themed-scenario';


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


const updateLearningGoalsFlow = ai.defineFlow(
  {
    name: 'updateLearningGoalsFlow',
    inputSchema: UpdateLearningGoalsInputSchema,
    outputSchema: UpdateLearningGoalsOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `
        You are an expert AI academic advisor for a platform called AlgoGenius. Your role is to function as an autonomous agent that sets a student's learning path.

        Your task is to analyze a student's performance history and their previous goal to determine the next single, most important learning goal and the parameters for their next assignment.

        **Student's Performance History:**
        ${input.performanceHistory.map(p => `- Concept: ${p.dsaConcept}, Score: ${p.score}%, Difficulty: ${p.difficulty}`).join('\n')}

        **Previous Goal:** ${input.previousGoal || 'None'}

        **Your Multi-Step Reasoning Process:**
        1.  **Analyze Performance:** Identify the student's weakest concept. This is the concept with the lowest average score, especially on harder problems. Prioritize concepts that the student has failed multiple times.
        2.  **Determine Next Goal:** Based on the weakest concept, formulate a new, specific, and measurable goal. The goal should be encouraging and focused. For example, "Achieve a score of 80% or higher on a Medium-level 'Binary Search' problem."
        3.  **Recommend Difficulty:** Determine the appropriate difficulty for the next assignment. If the student is consistently scoring below 60% on a concept, recommend 'Easy'. If they are scoring 60-85%, recommend 'Medium'. If they are consistently scoring above 85%, recommend 'Hard' to challenge them.
        4.  **Return the Plan:** Output the new goal, the weakest concept, and the recommended difficulty.

        Execute this reasoning process and provide the output in the required format.
      `,
      output: {
        schema: UpdateLearningGoalsOutputSchema,
      },
      config: {
        temperature: 0.3,
      },
    });

    return output!;
  }
);


export async function updateLearningGoalsAndCreateAssignment(
  input: UpdateLearningGoalsInput
): Promise<{ goal: UpdateLearningGoalsOutput, nextAssignment: GenerateThemedScenarioOutput }> {

  // Step 1: Determine the next goal and weakest concept.
  const goal = await updateLearningGoalsFlow(input);

  // Step 2: Autonomously generate a new scenario based on the AI's recommendation.
  const scenarioInput: GenerateThemedScenarioInput = {
    dsaConcepts: [goal.weakestConcept],
    difficulty: goal.recommendedDifficulty,
    theme: 'Business/Real-world', // Using a practical theme for focused learning
    userPrompt: `A scenario specifically designed to test understanding of ${goal.weakestConcept}.`,
  };
  const nextAssignment = await generateThemedScenario(scenarioInput);

  return { goal, nextAssignment };
}
