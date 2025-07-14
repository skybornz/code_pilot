'use server';

/**
 * @fileOverview Generates code comments for a given code block.
 *
 * - generateCodeDocs - A function that generates code comments for a given code block.
 * - GenerateCodeDocsInput - The input type for the generateCodeDocs function.
 * - GenerateCodeDocsOutput - The return type for the generateCodeDocs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const GenerateCodeDocsFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for generating docs.'),
  code: z.string().describe('The code block to generate comments for.'),
});
export type GenerateCodeDocsInput = z.infer<typeof GenerateCodeDocsFlowInputSchema>;

const GenerateCodeDocsOutputSchema = z.object({
  documentation: z.string().describe('The generated comments for the code block.'),
});
export type GenerateCodeDocsOutput = z.infer<typeof GenerateCodeDocsOutputSchema>;

export async function generateCodeDocs(input: GenerateCodeDocsInput): Promise<GenerateCodeDocsOutput> {
  return generateCodeDocsFlow(input);
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


const generateCodeDocsFlow = ai.defineFlow(
  {
    name: 'generateCodeDocsFlow',
    inputSchema: GenerateCodeDocsFlowInputSchema,
    outputSchema: GenerateCodeDocsOutputSchema,
  },
  async (input: GenerateCodeDocsInput) => {
    const promptTemplate = await getCompiledPrompt('generate-code-docs');
    const finalPrompt = promptTemplate({
        code: input.code,
    });
      
    const {output} = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
        output: { schema: GenerateCodeDocsOutputSchema },
    });
    return output!;
  }
);
