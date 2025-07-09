
'use server';

/**
 * @fileOverview An AI agent that simulates the execution of Python code and returns its output.
 *
 * - executePythonCode - A function that simulates Python code execution.
 * - ExecutePythonCodeInput - The input type for the executePythonCode function.
 * - ExecutePythonCodeOutput - The return type for the executePythonCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';

const ExecutePythonCodeInputSchema = z.object({
  code: z.string().describe('The Python code to execute.'),
});
export type ExecutePythonCodeInput = z.infer<typeof ExecutePythonCodeInputSchema>;

const ExecutePythonCodeOutputSchema = z.object({
  output: z.string().describe('The simulated standard output (stdout) from the code execution. If there is an error, this might contain the traceback.'),
  error: z.string().optional().nullable().describe('Any error message produced during execution. Null if execution is successful.'),
});
export type ExecutePythonCodeOutput = z.infer<typeof ExecutePythonCodeOutputSchema>;

export async function executePythonCode(input: ExecutePythonCodeInput): Promise<ExecutePythonCodeOutput> {
  const modelConfig = await getDefaultModel();
  if (!modelConfig) {
      throw new Error('No default model is configured.');
  }
  const modelName = modelConfig.type === 'local'
      ? `ollama/${modelConfig.name}`
      : `googleai/${modelConfig.name}`;

  return executePythonCodeFlow({ model: modelName, ...input });
}

const ExecutePythonCodeFlowInputSchema = ExecutePythonCodeInputSchema.extend({
    model: z.string().describe('The AI model to use for the simulation.'),
});

const executePythonCodeFlow = ai.defineFlow(
  {
    name: 'executePythonCodeFlow',
    inputSchema: ExecutePythonCodeFlowInputSchema,
    outputSchema: ExecutePythonCodeOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: `You are a Python interpreter. You will be given a snippet of Python code.
Execute the code and provide the standard output (stdout).
If the code runs successfully, return the output in the 'output' field and set the 'error' field to null.
If the code produces an error, return the full error message and traceback in the 'output' field and a short summary of the error in the 'error' field.
Do not provide any explanation, comments, or anything other than the raw output of the script.

Python Code:
\`\`\`python
${input.code}
\`\`\`
`,
        output: { schema: ExecutePythonCodeOutputSchema },
    });
    return output!;
  }
);
