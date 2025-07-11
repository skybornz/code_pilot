'use server';

/**
 * @fileOverview Refactors a block of code using AI suggestions.
 *
 * - refactorCode - A function that refactors a block of code.
 * - RefactorCodeInput - The input type for the refactorCode function.
 * - RefactorCodeOutput - The return type for the refactorCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefactorCodeFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for refactoring.'),
  code: z.string().describe('The block of code to refactor.'),
  language: z.string().describe('The programming language of the code.'),
});
export type RefactorCodeInput = z.infer<typeof RefactorCodeFlowInputSchema>;

const RefactorCodeOutputSchema = z.object({
  refactoredCode: z.string().describe('The refactored code with improvements.'),
  explanation: z.string().describe('An explanation of the refactoring changes.'),
});
export type RefactorCodeOutput = z.infer<typeof RefactorCodeOutputSchema>;

export async function refactorCode(input: RefactorCodeInput): Promise<RefactorCodeOutput> {
  return refactorCodeFlow(input);
}

const refactorCodeFlow = ai.defineFlow(
  {
    name: 'refactorCodeFlow',
    inputSchema: RefactorCodeFlowInputSchema,
    outputSchema: RefactorCodeOutputSchema,
  },
  async (input: RefactorCodeInput) => {
    const {output} = await ai.generate({
        model: input.model as any,
        prompt: `You are an AI code assistant that refactors code.
Given the following code block and its programming language, suggest refactoring improvements. Return the refactored code and an explanation of the changes.

Language: ${input.language}
Code:
${input.code}
`,
        output: { schema: RefactorCodeOutputSchema },
    });
    return output!;
  }
);
