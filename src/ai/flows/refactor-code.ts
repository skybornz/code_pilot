
'use server';

/**
 * @fileOverview Refactors a block of code using AI suggestions.
 *
 * - refactorCode - A function that refactors a block of code.
 * - RefactorCodeInput - The input type for the refactorCode function.
 * - RefactorCodeOutput - The return type for the refactorCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const RefactorCodeFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for refactoring.'),
  code: z.string().describe('The block of code to refactor.'),
  language: z.string().describe('The programming language of the code.'),
});
export type RefactorCodeInput = z.infer<typeof RefactorCodeFlowInputSchema>;

const RefactorCodeOutputSchema = z.object({
  refactoredCode: z.string().describe('The refactored code with improvements.'),
  explanation: z.string().describe('An explanation of the refactoring changes.'),
});
export type RefactorCodeOutput = z.infer<typeof RefactorCodeOutputSchema>;

export async function refactorCode(input: RefactorCodeInput): Promise<RefactorCodeOutput> {
  return refactorCodeFlow(input);
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


const refactorCodeFlow = ai.defineFlow(
  {
    name: 'refactorCodeFlow',
    inputSchema: RefactorCodeFlowInputSchema,
    outputSchema: RefactorCodeOutputSchema,
  },
  async (input: RefactorCodeInput) => {
    const isQwenModel = input.model.includes('qwen');
    const promptName = isQwenModel ? 'refactor-code-qwen' : 'refactor-code';

    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({
        language: input.language,
        code: input.code,
    });

    const { output } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
        output: {
          schema: RefactorCodeOutputSchema
        }
    });
    
    if (!output) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    return output;
  }
);
