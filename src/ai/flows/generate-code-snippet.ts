
'use server';

/**
 * @fileOverview An AI agent that generates code snippets from natural language descriptions.
 *
 * - generateCodeSnippet - A function that handles the code generation process.
 * - GenerateCodeSnippetInput - The input type for the generateCodeSnippet function.
 * - GenerateCodeSnippetOutput - The return type for the generateCodeSnippet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const GenerateCodeSnippetInputSchema = z.object({
  prompt: z.string().describe('The plain English description of the desired code snippet.'),
  language: z.string().describe('The programming language for the generated snippet (e.g., "typescript", "python").'),
});
export type GenerateCodeSnippetInput = z.infer<typeof GenerateCodeSnippetInputSchema>;

const GenerateCodeSnippetOutputSchema = z.object({
  codeSnippet: z.string().describe("The generated code snippet in the requested language."),
  explanation: z.string().describe("A brief explanation of how the generated code works."),
});
export type GenerateCodeSnippetOutput = z.infer<typeof GenerateCodeSnippetOutputSchema>;

export async function generateCodeSnippet(input: GenerateCodeSnippetInput): Promise<GenerateCodeSnippetOutput> {
  const modelConfig = await getDefaultModel();
  if (!modelConfig) {
      throw new Error('No default model is configured.');
  }
  const modelName = modelConfig.type === 'local'
      ? `ollama/${modelConfig.name}`
      : `googleai/${modelConfig.name}`;

  return generateCodeSnippetFlow({ model: modelName, ...input });
}

const GenerateCodeSnippetFlowInputSchema = GenerateCodeSnippetInputSchema.extend({
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


const generateCodeSnippetFlow = ai.defineFlow(
  {
    name: 'generateCodeSnippetFlow',
    inputSchema: GenerateCodeSnippetFlowInputSchema,
    outputSchema: GenerateCodeSnippetOutputSchema,
  },
  async (input) => {
    const promptTemplate = await getCompiledPrompt('generate-code-snippet');
    const finalPrompt = promptTemplate({ 
        language: input.language,
        prompt: input.prompt
    });
      
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
        output: { schema: GenerateCodeSnippetOutputSchema },
    });
    return output!;
  }
);
