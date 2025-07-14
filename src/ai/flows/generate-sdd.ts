'use server';

/**
 * @fileOverview Generates a Software Design Document (SDD) for a given code block.
 *
 * - generateSdd - A function that generates an SDD for a given code block.
 * - GenerateSddInput - The input type for the generateSdd function.
 * - GenerateSddOutput - The return type for the generateSdd function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const GenerateSddFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for generating the SDD.'),
  code: z.string().describe('The code block to generate an SDD for.'),
});
export type GenerateSddInput = z.infer<typeof GenerateSddFlowInputSchema>;

const GenerateSddOutputSchema = z.object({
  sdd: z.string().describe('The generated Software Design Document in Markdown format.'),
});
export type GenerateSddOutput = z.infer<typeof GenerateSddOutputSchema>;

export async function generateSdd(input: GenerateSddInput): Promise<GenerateSddOutput> {
  return generateSddFlow(input);
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

const generateSddFlow = ai.defineFlow(
  {
    name: 'generateSddFlow',
    inputSchema: GenerateSddFlowInputSchema,
    outputSchema: GenerateSddOutputSchema,
  },
  async (input: GenerateSddInput) => {
    const isQwenCoder = input.model.includes('qwen2.5-coder');
    const promptName = isQwenCoder ? 'generate-sdd-qwen' : 'generate-sdd';

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
        return GenerateSddOutputSchema.parse(parsedOutput);
    } catch (error) {
        console.error("Failed to parse AI model's JSON output for SDD generation:", error);
        console.error("Original model output:", text);
        throw new Error("The AI model returned a response that was not valid JSON. Please try again.");
    }
  }
);
