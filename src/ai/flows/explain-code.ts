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

// Helper to clean up model output that might be wrapped in markdown
function cleanJsonOutput(text: string): string {
    const trimmed = text.trim();
    const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return trimmed.replace(/^```|```$/g, '').trim();
}

const explainCodeFlow = ai.defineFlow(
  {
    name: 'explainCodeFlow',
    inputSchema: ExplainCodeFlowInputSchema,
    outputSchema: ExplainCodeOutputSchema,
  },
  async (input: ExplainCodeInput) => {
    const isQwenCoder = input.model.includes('qwen2.5-coder');
    const promptName = isQwenCoder ? 'explain-code-qwen' : 'explain-code';
    
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
        return ExplainCodeOutputSchema.parse(parsedOutput);
    } catch (error) {
        console.error("Failed to parse AI model's JSON output for code explanation:", error);
        console.error("Original model output:", text);
        throw new Error("The AI model returned a response that was not valid JSON. Please try again.");
    }
  }
);
