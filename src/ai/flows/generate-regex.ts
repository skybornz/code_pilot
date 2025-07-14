
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
import { textToJsonFlow } from './text-to-json';

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


const generateRegexFlow = ai.defineFlow(
  {
    name: 'generateRegexFlow',
    inputSchema: GenerateRegexFlowInputSchema,
    outputSchema: GenerateRegexOutputSchema,
  },
  async (input) => {
    const promptName = 'generate-regex';

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
    
    return textToJsonFlow(text, GenerateRegexOutputSchema);
  }
);
