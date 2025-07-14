
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
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const DebugErrorInputSchema = z.object({
  errorMessage: z.string().describe('The full error message or stack trace to be analyzed.'),
  context: z.string().optional().describe('Optional user-provided context about when and how the error occurred.'),
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


const debugErrorFlow = ai.defineFlow(
  {
    name: 'debugErrorFlow',
    inputSchema: DebugErrorFlowInputSchema,
    outputSchema: DebugErrorOutputSchema,
  },
  async (input) => {
    const isQwenModel = input.model.includes('qwen');
    const promptName = isQwenModel ? 'debug-error-qwen' : 'debug-error';

    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({ 
        errorMessage: input.errorMessage,
        context: input.context 
    });

    const { output } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
        output: {
          schema: DebugErrorOutputSchema
        }
    });
    
    if (!output) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    return output;
  }
);
