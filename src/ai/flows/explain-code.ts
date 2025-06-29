'use server';
/**
 * @fileOverview Explains a block of code in plain language.
 *
 * - explainCode - A function that explains the functionality of a code block.
 * - ExplainCodeInput - The input type for the explainCode function.
 * - ExplainCodeOutput - The return type for the explainCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainCodeFlowInputSchema = z.object({
  code: z.string().describe('The code to be explained.'),
});
export type ExplainCodeInput = z.infer<typeof ExplainCodeFlowInputSchema>;

const ExplainCodeOutputSchema = z.object({
  summary: z.string().describe('A high-level summary of what the code does.'),
  breakdown: z.array(z.string()).describe('A bullet-point breakdown of key parts of the code.'),
});
export type ExplainCodeOutput = z.infer<typeof ExplainCodeOutputSchema>;

export async function explainCode(input: ExplainCodeInput): Promise<ExplainCodeOutput> {
  return explainCodeFlow(input);
}

const explainCodeFlow = ai.defineFlow(
  {
    name: 'explainCodeFlow',
    inputSchema: ExplainCodeFlowInputSchema,
    outputSchema: ExplainCodeOutputSchema,
  },
  async (input) => {
    const {output} = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: `You are an expert software developer. Explain the following code.
Provide a high-level summary, and then a bullet-point breakdown of what each part of the code does.

Code:
\`\`\`
${input.code}
\`\`\`
`,
        output: { schema: ExplainCodeOutputSchema },
    });
    return output!;
  }
);
