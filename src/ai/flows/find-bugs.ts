
'use server';

/**
 * @fileOverview An AI agent that identifies potential bugs or vulnerabilities in a given code block.
 *
 * - findBugs - A function that takes a code snippet and identifies potential bugs or vulnerabilities.
 * - FindBugsInput - The input type for the findBugs function.
 * - FindBugsOutput - The return type for the findBugs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const FindBugsFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for bug detection.'),
  code: z.string().describe('The code snippet to analyze.'),
});
export type FindBugsInput = z.infer<typeof FindBugsFlowInputSchema>;

// The output is now a single string containing the full report in Markdown.
const FindBugsOutputSchema = z.object({
  report: z.string().describe('A report of potential bugs in Markdown format, including explanations and fixes.'),
});
export type FindBugsOutput = z.infer<typeof FindBugsOutputSchema>;

export async function findBugs(input: FindBugsInput): Promise<FindBugsOutput> {
  return findBugsFlow(input);
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


const findBugsFlow = ai.defineFlow(
  {
    name: 'findBugsFlow',
    inputSchema: FindBugsFlowInputSchema,
    outputSchema: FindBugsOutputSchema,
  },
  async (input: FindBugsInput) => {
    const isQwenModel = input.model.includes('qwen');
    const promptName = isQwenModel ? 'find-bugs-qwen' : 'find-bugs';
    
    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({
        code: input.code,
    });
      
    const result = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
    });

    return { report: result.text };
  }
);
