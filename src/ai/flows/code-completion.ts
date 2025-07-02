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

const CodeCompletionFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for completion.'),
  codeSnippet: z
    .string()
    .describe('The current code snippet the user is typing.'),
  language: z.string().describe('The programming language of the code snippet.'),
  projectContext: z
    .string()
    .optional()
    .describe('Optional context about the project, such as file structure or dependencies.'),
});
export type CodeCompletionInput = z.infer<typeof CodeCompletionFlowInputSchema>;

const CodeCompletionOutputSchema = z.object({
  completion: z.string().describe('The AI-powered code completion suggestion.'),
});
export type CodeCompletionOutput = z.infer<typeof CodeCompletionOutputSchema>;

export async function codeCompletion(input: CodeCompletionInput): Promise<CodeCompletionOutput> {
  return codeCompletionFlow(input);
}

const codeCompletionFlow = ai.defineFlow(
  {
    name: 'codeCompletionFlow',
    inputSchema: CodeCompletionFlowInputSchema,
    outputSchema: CodeCompletionOutputSchema,
  },
  async (input: CodeCompletionInput) => {
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: `You are an AI code completion assistant. You will receive a code snippet and you will generate a code completion suggestion based on the code, language, and project context.

Language: ${input.language}
Code Snippet:
\`\`\`${input.language}
${input.codeSnippet}
\`\`\`

Project Context: ${input.projectContext}

Completion:`,
        output: { schema: CodeCompletionOutputSchema },
    });
    return output!;
  }
);
