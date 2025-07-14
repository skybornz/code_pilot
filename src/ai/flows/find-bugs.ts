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

const FindBugsOutputSchema = z.object({
  bugs: z
    .array(z.string())
    .describe('An array of potential bugs or vulnerabilities identified in the code.'),
  explanation: z.string().describe('Explanation of the bugs and how to fix them.'),
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

// Helper to clean up model output that might be wrapped in markdown
function cleanJsonOutput(text: string): string {
    const trimmed = text.trim();
    const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return trimmed.replace(/^```|```$/g, '').trim();
}

const findBugsFlow = ai.defineFlow(
  {
    name: 'findBugsFlow',
    inputSchema: FindBugsFlowInputSchema,
    outputSchema: FindBugsOutputSchema,
  },
  async (input: FindBugsInput) => {
    const isQwenCoder = input.model.includes('qwen2.5-coder');
    const promptName = isQwenCoder ? 'find-bugs-qwen' : 'find-bugs';
    
    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({
        code: input.code,
    });
      
    const {text} = await ai.generate({
      model: input.model as any,
      prompt: finalPrompt,
    });

    if (!text) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    try {
        const cleanedText = cleanJsonOutput(text);
        const parsedOutput = JSON.parse(cleanedText);
        return FindBugsOutputSchema.parse(parsedOutput);
    } catch (error) {
        console.error("Failed to parse AI model's JSON output for bug finding:", error);
        console.error("Original model output:", text);
        throw new Error("The AI model returned a response that was not valid JSON. Please try again.");
    }
  }
);
