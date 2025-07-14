
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


const generateSddFlow = ai.defineFlow(
  {
    name: 'generateSddFlow',
    inputSchema: GenerateSddFlowInputSchema,
    outputSchema: GenerateSddOutputSchema,
  },
  async (input: GenerateSddInput) => {
    const isQwenModel = input.model.includes('qwen');
    const promptName = isQwenModel ? 'generate-sdd-qwen' : 'generate-sdd';

    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({
        code: input.code,
    });

    const { output } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
        output: {
          schema: GenerateSddOutputSchema
        }
    });
    
    if (!output) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    return output;
  }
);
