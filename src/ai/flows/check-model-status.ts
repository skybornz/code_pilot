'use server';

/**
 * @fileOverview A flow to check the connection status of a given AI model.
 *
 * - checkModelStatus - A function that attempts a simple generation to verify connectivity.
 * - CheckModelStatusInput - The input type for the checkModelStatus function.
 * - CheckModelStatusOutput - The return type for the checkModelStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CheckModelStatusInputSchema = z.object({
  model: z.string().describe('The full name of the AI model to test, e.g., googleai/gemini-pro.'),
});
export type CheckModelStatusInput = z.infer<typeof CheckModelStatusInputSchema>;

const CheckModelStatusOutputSchema = z.object({
  success: z.boolean().describe('Whether the connection test was successful.'),
  message: z.string().describe('A message indicating the status or error.'),
});
export type CheckModelStatusOutput = z.infer<typeof CheckModelStatusOutputSchema>;

export async function checkModelStatus(input: CheckModelStatusInput): Promise<CheckModelStatusOutput> {
  return checkModelStatusFlow(input);
}

const checkModelStatusFlow = ai.defineFlow(
  {
    name: 'checkModelStatusFlow',
    inputSchema: CheckModelStatusInputSchema,
    outputSchema: CheckModelStatusOutputSchema,
  },
  async (input: CheckModelStatusInput) => {
    try {
      // Use a simple, low-cost prompt to test generation.
      await ai.generate({
        model: input.model as any,
        prompt: 'Hello',
      });
      return { success: true, message: 'Connection successful.' };
    } catch (error: any) {
      // Catching errors from `ai.generate` which indicates a connection or configuration problem.
      console.error(`Model status check failed for ${input.model}:`, error);
      return { success: false, message: error.message || 'An unknown error occurred during the connection test.' };
    }
  }
);
