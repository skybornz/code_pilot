
'use server';

/**
 * @fileOverview An AI agent that refines or analyzes text based on a specified action.
 *
 * - refineText - A function that handles the text processing.
 * - RefineTextInput - The input type for the refineText function.
 * - RefineTextOutput - The return type for the refineText function (which is just a string).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';


const RefineTextInputSchema = z.object({
  text: z.string().describe('The original text to be processed.'),
  action: z.string().describe('The desired action, e.g., "Business Email", "Summarize Document", "Translate Content to Korean", "use-template".'),
  template: z.string().optional().describe('An optional template to structure the output.'),
  enhance: z.boolean().optional().describe('Whether to generate detailed content before applying a template.'),
});
export type RefineTextInput = z.infer<typeof RefineTextInputSchema>;

// The output is now a simple string.
export type RefineTextOutput = {
    refinedText: string;
};

// The flow itself will return a string.
export async function refineText(input: RefineTextInput): Promise<string> {
  const modelConfig = await getDefaultModel();
  if (!modelConfig) {
      throw new Error('No default model is configured.');
  }
  const modelName = modelConfig.type === 'local'
      ? `ollama/${modelConfig.name}`
      : `googleai/${modelConfig.name}`;

  return refineTextFlow({ model: modelName, ...input });
}

const RefineTextFlowInputSchema = RefineTextInputSchema.extend({
    model: z.string().describe('The AI model to use for the refinement.'),
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


const refineTextFlow = ai.defineFlow(
  {
    name: 'refineTextFlow',
    inputSchema: RefineTextFlowInputSchema,
    outputSchema: z.string(), // The flow now outputs a raw string
  },
  async (input) => {
    const isAnalyzeMode = input.action.startsWith('summarize') || input.action.startsWith('translate') || input.action.startsWith('insight');
    const isTemplateMode = input.action === 'use-template';

    const promptTemplate = await getCompiledPrompt('refine-text');
    const finalPrompt = promptTemplate({
        isAnalyzeMode,
        isTemplateMode,
        action: input.action,
        text: input.text,
        template: input.template,
        enhance: input.enhance,
    });
    
    const result = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
    });

    if (!result.text) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    return result.text;
  }
);
