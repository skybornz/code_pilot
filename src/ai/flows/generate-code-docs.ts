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
  async (input) => {
    const {output} = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: `You are an expert software developer. Generate code comments for the following code block. The comments should explain the code's functionality, parameters, and return values, suitable for in-line documentation or docblocks. IMPORTANT: Only output the generated comments, do not wrap them in markdown code fences or any other formatting.\n\n${input.code}`,
        output: { schema: GenerateCodeDocsOutputSchema },
    });
    return output!;
  }
);
