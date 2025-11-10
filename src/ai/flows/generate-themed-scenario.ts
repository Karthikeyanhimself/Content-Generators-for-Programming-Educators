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
  dsaConcept: z.string().describe('The DSA concept to incorporate into the scenario.'),
});

export type GenerateThemedScenarioInput = z.infer<
  typeof GenerateThemedScenarioInputSchema
>;

const GenerateThemedScenarioOutputSchema = z.object({
  scenario: z
    .string()
    .describe('The generated programming scenario based on the selected theme.'),
});

export type GenerateThemedScenarioOutput = z.infer<
  typeof GenerateThemedScenarioOutputSchema
>;

const dsaGuidanceTool = ai.defineTool({
  name: 'getDSAGuidance',
  description:
    'This tool retrieves guidance and explanations for a specific DSA concept to incorporate into a programming scenario.',
  inputSchema: z.object({
    dsaConcept: z.string().describe('The DSA concept to get guidance for.'),
  }),
  outputSchema: z.string().describe('Guidance on how to use the DSA concept.'),
},
async input => {
    // Placeholder implementation for fetching DSA guidance.
    // In a real application, this would call an external service or database.
    return `Guidance for ${input.dsaConcept}: Implement it efficiently!`;
  }
);

const generateThemedScenarioPrompt = ai.definePrompt({
  name: 'generateThemedScenarioPrompt',
  input: {schema: GenerateThemedScenarioInputSchema},
  output: {schema: GenerateThemedScenarioOutputSchema},
  tools: [dsaGuidanceTool],
  prompt: `You are a creative scenario generator for programming exercises.
  Generate a programming scenario based on the following theme: {{{theme}}}.
  Incorporate the following DSA concept into the scenario, using the getDSAGuidance tool to understand how to use the DSA concept: {{{dsaConcept}}}.
  Make sure the scenario is engaging and relevant to the theme.
  Use the getDSAGuidance tool to help incorporate the DSA concept into the scenario.
  `,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      // ...
    ],
  },
});

const generateThemedScenarioFlow = ai.defineFlow(
  {
    name: 'generateThemedScenarioFlow',
    inputSchema: GenerateThemedScenarioInputSchema,
    outputSchema: GenerateThemedScenarioOutputSchema,
  },
  async input => {
    const {output} = await generateThemedScenarioPrompt(input);
    return output!;
  }
);

export async function generateThemedScenario(
  input: GenerateThemedScenarioInput
): Promise<GenerateThemedScenarioOutput> {
  return generateThemedScenarioFlow(input);
}
