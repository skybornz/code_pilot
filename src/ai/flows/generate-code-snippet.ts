
'use server';

/**
 * @fileOverview An AI agent that generates code snippets from natural language descriptions.
 *
 * - generateCodeSnippet - A function that handles the code generation process.
 * - GenerateCodeSnippetInput - The input type for the generateCodeSnippet function.
 * - GenerateCodeSnippetOutput - The return type for the generateCodeSnippet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';

const GenerateCodeSnippetInputSchema = z.object({
  prompt: z.string().describe('The plain English description of the desired code snippet.'),
  language: z.string().describe('The programming language for the generated snippet (e.g., "typescript", "python").'),
});
export type GenerateCodeSnippetInput = z.infer<typeof GenerateCodeSnippetInputSchema>;

const GenerateCodeSnippetOutputSchema = z.object({
  codeSnippet: z.string().describe("The generated code snippet in the requested language."),
  explanation: z.string().describe("A brief explanation of how the generated code works."),
});
export type GenerateCodeSnippetOutput = z.infer<typeof GenerateCodeSnippetOutputSchema>;

export async function generateCodeSnippet(input: GenerateCodeSnippetInput): Promise<GenerateCodeSnippetOutput> {
  const modelConfig = await getDefaultModel();
  if (!modelConfig) {
      throw new Error('No default model is configured.');
  }
  const modelName = modelConfig.type === 'local'
      ? `ollama/${modelConfig.name}`
      : `googleai/${modelConfig.name}`;

  return generateCodeSnippetFlow({ model: modelName, ...input });
}

const GenerateCodeSnippetFlowInputSchema = GenerateCodeSnippetInputSchema.extend({
    model: z.string().describe('The AI model to use for the generation.'),
});

const generateCodeSnippetFlow = ai.defineFlow(
  {
    name: 'generateCodeSnippetFlow',
    inputSchema: GenerateCodeSnippetFlowInputSchema,
    outputSchema: GenerateCodeSnippetOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: `You are an expert programmer specializing in writing clear, efficient, and correct code snippets.
A user wants to generate a code snippet in the following language: ${input.language}.
Their request is: "${input.prompt}"

Your tasks are:
1.  Generate the code snippet that best fulfills the user's request.
2.  Provide a concise explanation of what the code does and how it works.
ONLY output the raw code for the snippet, do not wrap it in markdown triple quotes.
`,
        output: { schema: GenerateCodeSnippetOutputSchema },
    });
    return output!;
  }
);
