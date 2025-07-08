
'use server';

/**
 * @fileOverview An AI agent that analyzes error messages and suggests fixes.
 *
 * - debugError - A function that analyzes an error message.
 * - DebugErrorInput - The input type for the debugError function.
 * - DebugErrorOutput - The return type for the debugError function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';

const DebugErrorInputSchema = z.object({
  errorMessage: z.string().describe('The full error message or stack trace to be analyzed.'),
});
export type DebugErrorInput = z.infer<typeof DebugErrorInputSchema>;

const RecommendedFixSchema = z.object({
    description: z.string().describe("A clear explanation of what this fix does."),
    codeSnippet: z.string().optional().describe("An optional code snippet demonstrating the fix.")
});

const DebugErrorOutputSchema = z.object({
  potentialCause: z
    .string()
    .describe('A detailed explanation of the most likely cause of the error.'),
  recommendedFixes: z.array(RecommendedFixSchema).describe('An array of recommended fixes, ranked by relevance.'),
});
export type DebugErrorOutput = z.infer<typeof DebugErrorOutputSchema>;

// This is the main function the UI will call
export async function debugError(input: DebugErrorInput): Promise<DebugErrorOutput> {
    const modelConfig = await getDefaultModel();
    if (!modelConfig) {
        throw new Error('No default model is configured.');
    }
    const modelName = modelConfig.type === 'local'
        ? `ollama/${modelConfig.name}`
        : `googleai/${modelConfig.name}`;

    return debugErrorFlow({ model: modelName, ...input });
}

const DebugErrorFlowInputSchema = DebugErrorInputSchema.extend({
    model: z.string().describe('The AI model to use for the analysis.'),
});

const debugErrorFlow = ai.defineFlow(
  {
    name: 'debugErrorFlow',
    inputSchema: DebugErrorFlowInputSchema,
    outputSchema: DebugErrorOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: `You are an expert software developer and debugger. A user has provided the following error message or stack trace.
Analyze it carefully.

Error:
\`\`\`
${input.errorMessage}
\`\`\`

Your task is to:
1.  Identify the most likely root cause of the error. Explain it clearly in the 'potentialCause' field.
2.  Provide a list of actionable, recommended fixes. Rank them by how likely they are to solve the problem. For each fix, provide a clear description and an optional code snippet if it's relevant.
`,
        output: { schema: DebugErrorOutputSchema },
    });
    return output!;
  }
);
