'use server';

/**
 * @fileOverview An AI agent that identifies potential bugs or vulnerabilities in a given code block.
 *
 * - findBugs - A function that takes a code snippet and identifies potential bugs or vulnerabilities.
 * - FindBugsInput - The input type for the findBugs function.
 * - FindBugsOutput - The return type for the findBugs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindBugsFlowInputSchema = z.object({
  code: z.string().describe('The code snippet to analyze.'),
});
export type FindBugsInput = z.infer<typeof FindBugsFlowInputSchema>;

const FindBugsOutputSchema = z.object({
  bugs: z
    .array(z.string())
    .describe('An array of potential bugs or vulnerabilities identified in the code.'),
  explanation: z.string().describe('Explanation of the bugs and how to fix them.'),
});
export type FindBugsOutput = z.infer<typeof FindBugsOutputSchema>;

export async function findBugs(input: FindBugsInput): Promise<FindBugsOutput> {
  return findBugsFlow(input);
}

const findBugsFlow = ai.defineFlow(
  {
    name: 'findBugsFlow',
    inputSchema: FindBugsFlowInputSchema,
    outputSchema: FindBugsOutputSchema,
  },
  async (input) => {
    const {output} = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: `You are a security expert. Analyze the following code snippet for potential bugs and vulnerabilities. Provide a list of the bugs found and explain how to fix them.

Code:
${input.code}`,
      output: { schema: FindBugsOutputSchema },
    });
    return output!;
  }
);
