'use server';

/**
 * @fileOverview An AI agent that refines text based on a specified content type.
 *
 * - refineText - A function that handles the text refinement process.
 * - RefineTextInput - The input type for the refineText function.
 * - RefineTextOutput - The return type for the refineText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';

const RefineTextInputSchema = z.object({
  text: z.string().describe('The original text to be refined.'),
  contentType: z.string().describe('The target content type for the refinement (e.g., "Business Email", "Technical Report").'),
});
export type RefineTextInput = z.infer<typeof RefineTextInputSchema>;

const RefineTextOutputSchema = z.object({
  refinedText: z.string().describe("The refined, improved version of the text."),
});
export type RefineTextOutput = z.infer<typeof RefineTextOutputSchema>;

export async function refineText(input: RefineTextInput): Promise<RefineTextOutput> {
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

const refineTextFlow = ai.defineFlow(
  {
    name: 'refineTextFlow',
    inputSchema: RefineTextFlowInputSchema,
    outputSchema: RefineTextOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: `You are an expert editor and writer. A user wants you to refine a piece of text for a specific purpose.
Your task is to revise the provided text to match the tone, style, and structure of the specified content type. Focus on improving clarity, grammar, conciseness, and overall quality.

Content Type: ${input.contentType}

Original Text:
---
${input.text}
---
`,
        output: { schema: RefineTextOutputSchema },
    });
    return output!;
  }
);
