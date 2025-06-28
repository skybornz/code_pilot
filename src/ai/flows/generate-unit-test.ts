'use server';

/**
 * @fileOverview Generates a unit test for a given code block.
 *
 * - generateUnitTest - A function that generates a unit test for a given code block.
 * - GenerateUnitTestInput - The input type for the generateUnitTest function.
 * - GenerateUnitTestOutput - The return type for the generateUnitTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateUnitTestInputSchema = z.object({
  code: z.string().describe('The code block to generate a unit test for.'),
  language: z.string().describe('The programming language of the code.'),
});
export type GenerateUnitTestInput = z.infer<typeof GenerateUnitTestInputSchema>;

const GenerateUnitTestOutputSchema = z.object({
  unitTest: z.string().describe('The generated unit test for the code block.'),
  explanation: z.string().describe('An explanation of the generated unit test.'),
});
export type GenerateUnitTestOutput = z.infer<typeof GenerateUnitTestOutputSchema>;

export async function generateUnitTest(input: GenerateUnitTestInput): Promise<GenerateUnitTestOutput> {
  return generateUnitTestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUnitTestPrompt',
  input: {schema: GenerateUnitTestInputSchema},
  output: {schema: GenerateUnitTestOutputSchema},
  prompt: `You are a software quality assurance expert. Generate a unit test for the following code block. Also provide an explanation of what the test covers.

Language: {{{language}}}
Code:
{{code}}`,
});

const generateUnitTestFlow = ai.defineFlow(
  {
    name: 'generateUnitTestFlow',
    inputSchema: GenerateUnitTestInputSchema,
    outputSchema: GenerateUnitTestOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
