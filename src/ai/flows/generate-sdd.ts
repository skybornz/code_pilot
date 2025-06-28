'use server';

/**
 * @fileOverview Generates a Software Design Document (SDD) for a given code block.
 *
 * - generateSdd - A function that generates an SDD for a given code block.
 * - GenerateSddInput - The input type for the generateSdd function.
 * - GenerateSddOutput - The return type for the generateSdd function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSddInputSchema = z.object({
  code: z.string().describe('The code block to generate an SDD for.'),
});
export type GenerateSddInput = z.infer<typeof GenerateSddInputSchema>;

const GenerateSddOutputSchema = z.object({
  sdd: z.string().describe('The generated Software Design Document in Markdown format.'),
});
export type GenerateSddOutput = z.infer<typeof GenerateSddOutputSchema>;

export async function generateSdd(input: GenerateSddInput): Promise<GenerateSddOutput> {
  return generateSddFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSddPrompt',
  input: {schema: GenerateSddInputSchema},
  output: {schema: GenerateSddOutputSchema},
  prompt: `You are an expert software architect. Generate a comprehensive Software Design Document (SDD) in Markdown format for the following code block.

The SDD should include the following sections:
1.  **Overview**: A high-level summary of the code's purpose and functionality.
2.  **Component Breakdown**: A description of the main functions, classes, or components, including their responsibilities and inputs/outputs.
3.  **Data Flow**: An explanation of how data moves through the code.
4.  **Dependencies**: A list of any external libraries or modules the code depends on.
5.  **Potential Improvements**: Suggestions for refactoring, performance optimization, or enhancing functionality.

Code:
\`\`\`
{{{code}}}
\`\`\`
`,
});

const generateSddFlow = ai.defineFlow(
  {
    name: 'generateSddFlow',
    inputSchema: GenerateSddInputSchema,
    outputSchema: GenerateSddOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
