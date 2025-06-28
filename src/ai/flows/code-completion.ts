'use server';

/**
 * @fileOverview Implements the code completion flow using a local Ollama LLM.
 *
 * - codeCompletion - A function that provides code completion suggestions based on the current code context.
 * - CodeCompletionInput - The input type for the codeCompletion function.
 * - CodeCompletionOutput - The return type for the codeCompletion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeCompletionInputSchema = z.object({
  codeSnippet: z
    .string()
    .describe('The current code snippet the user is typing.'),
  language: z.string().describe('The programming language of the code snippet.'),
  projectContext: z
    .string()
    .optional()
    .describe('Optional context about the project, such as file structure or dependencies.'),
});
export type CodeCompletionInput = z.infer<typeof CodeCompletionInputSchema>;

const CodeCompletionOutputSchema = z.object({
  completion: z.string().describe('The AI-powered code completion suggestion.'),
});
export type CodeCompletionOutput = z.infer<typeof CodeCompletionOutputSchema>;

export async function codeCompletion(input: CodeCompletionInput): Promise<CodeCompletionOutput> {
  return codeCompletionFlow(input);
}

const codeCompletionPrompt = ai.definePrompt({
  name: 'codeCompletionPrompt',
  input: {schema: CodeCompletionInputSchema},
  output: {schema: CodeCompletionOutputSchema},
  prompt: `You are an AI code completion assistant. You will receive a code snippet and you will generate a code completion suggestion based on the code, language, and project context.

  Language: {{{language}}}
  Code Snippet:
  \`\`\`{{{language}}}
  {{{codeSnippet}}}
  \`\`\`

  Project Context: {{{projectContext}}}

  Completion:`, 
});

const codeCompletionFlow = ai.defineFlow(
  {
    name: 'codeCompletionFlow',
    inputSchema: CodeCompletionInputSchema,
    outputSchema: CodeCompletionOutputSchema,
  },
  async input => {
    const {output} = await codeCompletionPrompt(input);
    return output!;
  }
);
