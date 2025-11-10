'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating programming scenarios based on selected themes.
 *
 * The flow takes a theme as input and returns a programming scenario.
 * The supported themes are Adventure/Fantasy, Sci-Fi, Business/Real-world, Gaming, Mystery/Detective.
 *
 * @exports {generateThemedScenario} - The function to generate a themed scenario.
 * @exports {GenerateThemedScenarioInput} - The input type for the generateThemedScenario function.
 * @exports {GenerateThemedScenarioOutput} - The output type for the generateThemedScenario function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ThemeEnum = z.enum([
  'Adventure/Fantasy',
  'Sci-Fi',
  'Business/Real-world',
  'Gaming',
  'Mystery/Detective',
]);

const GenerateThemedScenarioInputSchema = z.object({
  theme: ThemeEnum.describe('The theme for the programming scenario.'),
  dsaConcepts: z
    .array(z.string())
    .min(1)
    .describe('An array of DSA concepts to incorporate into the scenario.'),
  difficulty: z
    .enum(['Easy', 'Medium', 'Hard'])
    .describe('The difficulty of the scenario.'),
  userPrompt: z
    .string()
    .optional()
    .describe(
      'Optional user-provided keywords or a short description to guide scenario creation.'
    ),
});

export type GenerateThemedScenarioInput = z.infer<
  typeof GenerateThemedScenarioInputSchema
>;

const TestCaseSchema = z.object({
  input: z.string().describe('The input for the test case.'),
  output: z.string().describe('The expected output for the test case.'),
  isEdgeCase: z
    .boolean()
    .describe('Whether this test case is an edge case.'),
  explanation: z.string().describe('An explanation of the test case.'),
});

const GenerateThemedScenarioOutputSchema = z.object({
  scenario: z
    .string()
    .describe('The generated programming scenario based on the selected theme.'),
  hints: z
    .array(z.string())
    .length(3)
    .describe('An array of three progressive hints for the scenario.'),
  testCases: z
    .array(TestCaseSchema)
    .describe('An array of test cases for the scenario.'),
  dsaConcept: z.string().describe('The primary DSA concept used.'),
});

export type GenerateThemedScenarioOutput = z.infer<
  typeof GenerateThemedScenarioOutputSchema
>;

const generateThemedScenarioPrompt = ai.definePrompt({
  name: 'generateThemedScenarioPrompt',
  input: {schema: GenerateThemedScenarioInputSchema},
  output: {schema: GenerateThemedScenarioOutputSchema},
  prompt: `You are a creative scenario generator for programming exercises.
  Your task is to generate a complete programming problem, including a scenario, a primary DSA concept, hints, and test cases.

  Follow these steps:
  1.  Generate a programming scenario based on the following theme: {{{theme}}}.
  2.  The difficulty should be {{{difficulty}}}.
  3.  Incorporate the following DSA concepts into the scenario: {{{dsaConcepts}}}. If multiple concepts are provided, select one to be the primary focus and return it in the 'dsaConcept' field.
  4.  If the user provides additional context, use it to shape the scenario: '{{{userPrompt}}}'
  5.  The scenario should be engaging and relevant to the theme.
  6.  Provide exactly three progressive hints. The first hint should be a gentle nudge, the second more specific, and the third should guide them close to the solution without giving it away.
  7.  Provide a set of at least 4 test cases, including at least one edge case (e.g., empty input, single-item input, large input). For each test case, provide the input, expected output, a brief explanation, and whether it's an edge case.
  `,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const generateThemedScenarioFlow = ai.defineFlow(
  {
    name: 'generateThemedScenarioFlow',
    inputSchema: GenerateThemedScenarioInputSchema,
    outputSchema: GenerateThemedScenarioOutputSchema,
  },
  async (input) => {
    const {output} = await generateThemedScenarioPrompt(input);
    return output!;
  }
);

export async function generateThemedScenario(
  input: GenerateThemedScenarioInput
): Promise<GenerateThemedScenarioOutput> {
  return generateThemedScenarioFlow(input);
}
