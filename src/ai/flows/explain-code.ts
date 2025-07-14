
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

// The output is now a single string containing the full explanation in Markdown.
const ExplainCodeOutputSchema = z.object({
  explanation: z.string().describe('A full explanation of the code in Markdown format, including a summary and breakdown.'),
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
    const isQwenModel = input.model.includes('qwen');
    const promptName = isQwenModel ? 'explain-code-qwen' : 'explain-code';
    
    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({
        code: input.code,
    });
      
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
        output: {
          schema: ExplainCodeOutputSchema
        }
    });
    
    if (!output) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    return output;
  }
);
