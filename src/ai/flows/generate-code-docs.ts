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

// Helper to clean up model output that might be wrapped in markdown
function cleanJsonOutput(text: string): string {
    const trimmed = text.trim();
    const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return trimmed.replace(/^```|```$/g, '').trim();
}

const generateCodeDocsFlow = ai.defineFlow(
  {
    name: 'generateCodeDocsFlow',
    inputSchema: GenerateCodeDocsFlowInputSchema,
    outputSchema: GenerateCodeDocsOutputSchema,
  },
  async (input: GenerateCodeDocsInput) => {
    const isQwenCoder = input.model.includes('qwen2.5-coder');
    const promptName = isQwenCoder ? 'generate-code-docs-qwen' : 'generate-code-docs';

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
        return GenerateCodeDocsOutputSchema.parse(parsedOutput);
    } catch (error) {
        console.error("Failed to parse AI model's JSON output for code doc generation:", error);
        console.error("Original model output:", text);
        throw new Error("The AI model returned a response that was not valid JSON. Please try again.");
    }
  }
);
