
'use server';

/**
 * @fileOverview Generates a unit test for a given code block.
 *
 * - generateUnitTest - A function that generates a unit test for a given code block.
 * - GenerateUnitTestInput - The input type for the generateUnitTest function.
 * - GenerateUnitTestOutput - The return type for the generateUnitTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const GenerateUnitTestFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for generating the test.'),
  code: z.string().describe('The code block to generate a unit test for.'),
  language: z.string().describe('The programming language of the code.'),
});
export type GenerateUnitTestInput = z.infer<typeof GenerateUnitTestFlowInputSchema>;

// The output is now a single string containing the full unit test and explanation in Markdown.
const GenerateUnitTestOutputSchema = z.object({
  test: z.string().describe('The generated unit test and explanation in Markdown format.'),
});
export type GenerateUnitTestOutput = z.infer<typeof GenerateUnitTestOutputSchema>;

export async function generateUnitTest(input: GenerateUnitTestInput): Promise<GenerateUnitTestOutput> {
  return generateUnitTestFlow(input);
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


const generateUnitTestFlow = ai.defineFlow(
  {
    name: 'generateUnitTestFlow',
    inputSchema: GenerateUnitTestFlowInputSchema,
    outputSchema: GenerateUnitTestOutputSchema,
  },
  async (input: GenerateUnitTestInput) => {
    const isQwenModel = input.model.includes('qwen');
    const promptName = isQwenModel ? 'generate-unit-test-qwen' : 'generate-unit-test';

    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({
        language: input.language,
        code: input.code,
    });
      
    const result = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
    });
    
    return { test: result.text };
  }
);
