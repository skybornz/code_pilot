'use server';

/**
 * @fileOverview An AI agent that analyzes the difference between two code snippets and provides feedback.
 *
 * - analyzeDiff - A function that reviews code changes.
 * - AnalyzeDiffInput - The input type for the analyzeDiff function.
 * - AnalyzeDiffOutput - The return type for the analyzeDiff function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDiffFlowInputSchema = z.object({
  oldCode: z.string().describe('The original code before changes.'),
  newCode: z.string().describe('The new code after changes.'),
  language: z.string().describe('The programming language of the code.'),
});
export type AnalyzeDiffInput = z.infer<typeof AnalyzeDiffFlowInputSchema>;

const AnalyzeDiffOutputSchema = z.object({
  summary: z.string().describe('A high-level summary of the changes.'),
  detailedAnalysis: z
    .array(z.string())
    .describe('A list of specific points, suggestions, or potential issues found in the changes.'),
});
export type AnalyzeDiffOutput = z.infer<typeof AnalyzeDiffOutputSchema>;

export async function analyzeDiff(input: AnalyzeDiffInput): Promise<AnalyzeDiffOutput> {
  return analyzeDiffFlow(input);
}

const analyzeDiffFlow = ai.defineFlow(
  {
    name: 'analyzeDiffFlow',
    inputSchema: AnalyzeDiffFlowInputSchema,
    outputSchema: AnalyzeDiffOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: `You are an expert code reviewer. Analyze the following code changes for a file written in ${input.language}.
Provide a concise, high-level summary of the changes.
Then, provide a detailed analysis of the changes, pointing out potential bugs, style issues, or areas for improvement.

Original Code:
\`\`\`${input.language}
${input.oldCode}
\`\`\`

New Code:
\`\`\`${input.language}
${input.newCode}
\`\`\`
`,
        output: { schema: AnalyzeDiffOutputSchema },
    });
    return output!;
  }
);
