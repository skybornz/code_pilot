
'use server';

/**
 * @fileOverview An AI agent that simulates the execution of code in various languages and returns its output.
 *
 * - executeCode - A function that simulates code execution.
 * - ExecuteCodeInput - The input type for the executeCode function.
 * - ExecuteCodeOutput - The return type for the executeCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';

const ExecuteCodeInputSchema = z.object({
  code: z.string().describe('The code to execute.'),
  language: z.string().describe('The programming language of the code (e.g., "python", "csharp", "java").'),
});
export type ExecuteCodeInput = z.infer<typeof ExecuteCodeInputSchema>;

const ExecuteCodeOutputSchema = z.object({
  output: z.string().describe('The simulated standard output (stdout) from the code execution. If there is an error, this might contain the traceback or compilation errors.'),
  error: z.string().optional().nullable().describe('Any error message produced during execution. Null if execution is successful.'),
});
export type ExecuteCodeOutput = z.infer<typeof ExecuteCodeOutputSchema>;

export async function executeCode(input: ExecuteCodeInput): Promise<ExecuteCodeOutput> {
  const modelConfig = await getDefaultModel();
  if (!modelConfig) {
      throw new Error('No default model is configured.');
  }
  const modelName = modelConfig.type === 'local'
      ? `ollama/${modelConfig.name}`
      : `googleai/${modelConfig.name}`;

  return executeCodeFlow({ model: modelName, ...input });
}

const ExecuteCodeFlowInputSchema = ExecuteCodeInputSchema.extend({
    model: z.string().describe('The AI model to use for the simulation.'),
});

const executeCodeFlow = ai.defineFlow(
  {
    name: 'executeCodeFlow',
    inputSchema: ExecuteCodeFlowInputSchema,
    outputSchema: ExecuteCodeOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: `You are an expert programmer acting as a code interpreter and compiler. You will be given a snippet of code in a specific language.
Execute the code and provide the standard output (stdout).
If the code runs successfully, return the output in the 'output' field and set the 'error' field to null.
If the code produces a compilation or runtime error, return the full error message and traceback in the 'output' field and a short summary of the error in the 'error' field.
Do not provide any explanation, comments, or anything other than the raw output of the script.

Language: ${input.language}

Code:
\`\`\`${input.language}
${input.code}
\`\`\`
`,
        output: { schema: ExecuteCodeOutputSchema },
    });
    return output!;
  }
);
