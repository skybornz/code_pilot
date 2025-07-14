'use server';
/**
 * @fileOverview Explains a block of code in plain language.
 *
 * - explainCode - A function that explains the functionality of a code block.
 * - ExplainCodeInput - The input type for the explainCode function.
 * - ExplainCodeOutput - The return type for the explainCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const ExplainCodeFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for the explanation.'),
  code: z.string().describe('The code to be explained.'),
});
export type ExplainCodeInput = z.infer<typeof ExplainCodeFlowInputSchema>;

const ExplainCodeOutputSchema = z.object({
  summary: z.string().describe('A high-level summary of what the code does.'),
  breakdown: z.array(z.string()).describe('A bullet-point breakdown of key parts of the code.'),
});
export type ExplainCodeOutput = z.infer<typeof ExplainCodeOutputSchema>;

export async function explainCode(input: ExplainCodeInput): Promise<ExplainCodeOutput> {
  return explainCodeFlow(input);
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


const explainCodeFlow = ai.defineFlow(
  {
    name: 'explainCodeFlow',
    inputSchema: ExplainCodeFlowInputSchema,
    outputSchema: ExplainCodeOutputSchema,
  },
  async (input: ExplainCodeInput) => {
    const promptTemplate = await getCompiledPrompt('explain-code');
    const finalPrompt = promptTemplate({
        code: input.code,
    });
      
    const {output} = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
        output: { schema: ExplainCodeOutputSchema },
    });
    return output!;
  }
);
