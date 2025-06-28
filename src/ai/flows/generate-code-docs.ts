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

const GenerateCodeDocsInputSchema = z.object({
  code: z.string().describe('The code block to generate comments for.'),
});
export type GenerateCodeDocsInput = z.infer<typeof GenerateCodeDocsInputSchema>;

const GenerateCodeDocsOutputSchema = z.object({
  documentation: z.string().describe('The generated comments for the code block.'),
});
export type GenerateCodeDocsOutput = z.infer<typeof GenerateCodeDocsOutputSchema>;

export async function generateCodeDocs(input: GenerateCodeDocsInput): Promise<GenerateCodeDocsOutput> {
  return generateCodeDocsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCodeDocsPrompt',
  input: {schema: GenerateCodeDocsInputSchema},
  output: {schema: GenerateCodeDocsOutputSchema},
  prompt: `You are an expert software developer. Generate code comments for the following code block. The comments should explain the code's functionality, parameters, and return values, suitable for in-line documentation or docblocks. IMPORTANT: Only output the generated comments, do not wrap them in markdown code fences or any other formatting.\n\n{{code}}`,
});

const generateCodeDocsFlow = ai.defineFlow(
  {
    name: 'generateCodeDocsFlow',
    inputSchema: GenerateCodeDocsInputSchema,
    outputSchema: GenerateCodeDocsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
