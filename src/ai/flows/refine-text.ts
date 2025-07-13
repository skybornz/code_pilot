
'use server';

/**
 * @fileOverview An AI agent that refines or analyzes text based on a specified action.
 *
 * - refineText - A function that handles the text processing.
 * - RefineTextInput - The input type for the refineText function.
 * - RefineTextOutput - The return type for the refineText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';

const RefineTextInputSchema = z.object({
  text: z.string().describe('The original text to be processed.'),
  action: z.string().describe('The desired action, e.g., "Business Email", "Summarize Document", "Translate Content to Korean".'),
});
export type RefineTextInput = z.infer<typeof RefineTextInputSchema>;

const RefineTextOutputSchema = z.object({
  refinedText: z.string().describe("The processed, improved, or analyzed version of the text."),
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
    let prompt;
    if (input.action.startsWith('summarize') || input.action.startsWith('translate') || input.action.startsWith('insight')) {
        // Handle Analyze mode
        prompt = `You are an expert analyst. A user wants you to perform an action on a piece of text. The input may be in English, Korean, or Chinese.
Your task is to perform the action and return only the result.

Action: ${input.action}

Original Text:
---
${input.text}
---

Result:
`;
    } else {
        // Handle Draft mode
        prompt = `You are an expert editor and writer. A user wants you to refine a piece of text for a specific purpose.
Your task is to revise the provided text to match the tone, style, and structure of the specified content type. Focus on improving clarity, grammar, conciseness, and overall quality.

Content Type: ${input.action}

Original Text:
---
${input.text}
---
`;
    }


    const { output } = await ai.generate({
        model: input.model as any,
        prompt: prompt,
        output: { schema: RefineTextOutputSchema },
    });
    return output!;
  }
);
