
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
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';


const ExecuteCodeInputSchema = z.object({
  code: z.string().describe('The code to execute.'),
  language: z.string().describe('The programming language of the code (e.g., "python", "typescript", "csharp").'),
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

// Define a template cache
const promptTemplateCache = new Map<string, handlebars.TemplateDelegate>();

async function getCompiledPrompt(name: string): Promise<handlebars.TemplateDelegate> {
    if (promptTemplateCache.has(name)) {
        return promptTemplateCache.get(name)!;
    }
    const promptPath = path.join(process.cwd(), 'src', 'ai', 'prompts', `${name}.md`);
    const promptText = await fs.readFile(promptPath, 'utf-8');
    const compiledTemplate = handlebars.compile(promptText);
    promptTemplateCache.set(name, compiledTemplate);
    return compiledTemplate;
}

const executeCodeFlow = ai.defineFlow(
  {
    name: 'executeCodeFlow',
    inputSchema: ExecuteCodeFlowInputSchema,
    outputSchema: ExecuteCodeOutputSchema,
  },
  async (input) => {
    const promptTemplate = await getCompiledPrompt('execute-code');
    const finalPrompt = promptTemplate({
        language: input.language,
        code: input.code,
    });
      
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
        output: { schema: ExecuteCodeOutputSchema },
    });
    return output!;
  }
);
