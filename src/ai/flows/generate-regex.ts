
'use server';

/**
 * @fileOverview An AI agent that converts natural language to regular expressions.
 *
 * - generateRegex - A function that handles the regex generation process.
 * - GenerateRegexInput - The input type for the generateRegex function.
 * - GenerateRegexOutput - The return type for the generateRegex function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const GenerateRegexInputSchema = z.object({
  prompt: z.string().describe('The plain English description of the desired regular expression.'),
});
export type GenerateRegexInput = z.infer<typeof GenerateRegexInputSchema>;

const GenerateRegexOutputSchema = z.object({
  regex: z.string().describe("The generated regular expression pattern. It should be a valid regex string without the enclosing slashes, e.g., '^[a-zA-Z0-9]+$'."),
  explanation: z.string().describe("A step-by-step explanation of what each part of the regex does."),
});
export type GenerateRegexOutput = z.infer<typeof GenerateRegexOutputSchema>;

export async function generateRegex(input: GenerateRegexInput): Promise<GenerateRegexOutput> {
  const modelConfig = await getDefaultModel();
  if (!modelConfig) {
      throw new Error('No default model is configured.');
  }
  const modelName = modelConfig.type === 'local'
      ? `ollama/${modelConfig.name}`
      : `googleai/${modelConfig.name}`;

  return generateRegexFlow({ model: modelName, ...input });
}

const GenerateRegexFlowInputSchema = GenerateRegexInputSchema.extend({
    model: z.string().describe('The AI model to use for the generation.'),
});

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

const generateRegexFlow = ai.defineFlow(
  {
    name: 'generateRegexFlow',
    inputSchema: GenerateRegexFlowInputSchema,
    outputSchema: GenerateRegexOutputSchema,
  },
  async (input) => {
    const isQwenCoder = input.model.includes('qwen2.5-coder');
    const promptName = isQwenCoder ? 'generate-regex-qwen' : 'generate-regex';

    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({ 
        prompt: input.prompt
    });
    
    const { text } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
    });
    
    if (!text) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    try {
        const cleanedText = cleanJsonOutput(text);
        const parsedOutput = JSON.parse(cleanedText);
        return GenerateRegexOutputSchema.parse(parsedOutput);
    } catch (error) {
        console.error("Failed to parse AI model's JSON output for regex generation:", error);
        console.error("Original model output:", text);
        throw new Error("The AI model returned a response that was not valid JSON. Please try again.");
    }
  }
);
