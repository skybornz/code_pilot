'use server';

/**
 * @fileOverview Generates code comments for a given code block.
 *
 * - generateCodeDocs - A function that generates code comments for a given code block.
 * - GenerateCodeDocsInput - The input type for the generateCodeDocs function.
 * - GenerateCodeDocsOutput - The return type for the generateCodeDocs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCodeDocsFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for generating docs.'),
  code: z.string().describe('The code block to generate comments for.'),
});
export type GenerateCodeDocsInput = z.infer<typeof GenerateCodeDocsFlowInputSchema>;

const GenerateCodeDocsOutputSchema = z.object({
  documentation: z.string().describe('The generated comments for the code block.'),
});
export type GenerateCodeDocsOutput = z.infer<typeof GenerateCodeDocsOutputSchema>;

export async function generateCodeDocs(input: GenerateCodeDocsInput): Promise<GenerateCodeDocsOutput> {
  return generateCodeDocsFlow(input);
}

const generateCodeDocsFlow = ai.defineFlow(
  {
    name: 'generateCodeDocsFlow',
    inputSchema: GenerateCodeDocsFlowInputSchema,
    outputSchema: GenerateCodeDocsOutputSchema,
  },
  async (input: GenerateCodeDocsInput) => {
    const {output} = await ai.generate({
        model: input.model as any,
        prompt: `You are an expert software developer.
Generate code comments for the following code block. The comments should explain the code's functionality, parameters, and return values, suitable for in-line documentation or docblocks.

Code:
${input.code}`,
        output: { schema: GenerateCodeDocsOutputSchema },
    });
    return output!;
  }
);
