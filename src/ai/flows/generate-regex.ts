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


const generateRegexFlow = ai.defineFlow(
  {
    name: 'generateRegexFlow',
    inputSchema: GenerateRegexFlowInputSchema,
    outputSchema: GenerateRegexOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: `You are a Regex Wizard, an expert in creating regular expressions. A user has provided a description of what they want to match.
Your task is to:
1.  Generate a robust, and efficient regular expression (regex) that accurately captures the user's request. DO NOT wrap the regex in slashes (/).
2.  Provide a clear, step-by-step explanation of how the generated regex works.

User's request: "${input.prompt}"
`,
        output: { schema: GenerateRegexOutputSchema },
    });
    return output!;
  }
);
