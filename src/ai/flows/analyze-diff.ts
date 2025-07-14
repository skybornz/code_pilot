
'use server';

/**
 * @fileOverview An AI agent that analyzes the difference between two code snippets and provides feedback.
 *
 * - analyzeDiff - A function that reviews code changes.
 * - AnalyzeDiffInput - The input type for the analyzeDiff function.
 * - AnalyzeDiffOutput - The return type for the analyzeDiff function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const AnalyzeDiffFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for the analysis.'),
  oldCode: z.string().describe('The original code before changes.'),
  newCode: z.string().describe('The new code after changes.'),
  language: z.string().describe('The programming language of the code.'),
});
export type AnalyzeDiffInput = z.infer<typeof AnalyzeDiffFlowInputSchema>;

// The output is now a single string containing the full analysis in Markdown.
const AnalyzeDiffOutputSchema = z.object({
  analysis: z.string().describe('A full analysis of the code changes in Markdown format.'),
});
export type AnalyzeDiffOutput = z.infer<typeof AnalyzeDiffOutputSchema>;

export async function analyzeDiff(input: AnalyzeDiffInput): Promise<AnalyzeDiffOutput> {
  return analyzeDiffFlow(input);
}

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


const analyzeDiffFlow = ai.defineFlow(
  {
    name: 'analyzeDiffFlow',
    inputSchema: AnalyzeDiffFlowInputSchema,
    outputSchema: AnalyzeDiffOutputSchema,
  },
  async (input: AnalyzeDiffInput) => {
    const isQwenModel = input.model.includes('qwen');
    const promptName = isQwenModel ? 'analyze-diff-qwen' : 'analyze-diff';

    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({
        language: input.language,
        oldCode: input.oldCode,
        newCode: input.newCode,
    });
    
    const result = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
    });
    
    return { analysis: result.text };
  }
);
