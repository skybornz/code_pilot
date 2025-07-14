'use server';

/**
 * @fileOverview An internal AI flow that converts unstructured text into a structured JSON object.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define a schema for the optional task description
const TextToJsonTaskSchema = z.object({
  task: z.string().optional().describe('An optional, more specific task description for the conversion.'),
});
type TextToJsonTask = z.infer<typeof TextToJsonTaskSchema>;


/**
 * Converts a string of unstructured text into a validated JSON object of a given Zod schema type.
 * @param text The input text to convert.
 * @param schema The Zod schema to validate the output against.
 * @param options Optional parameters to provide more context for the conversion.
 * @returns A promise that resolves to the structured JSON object.
 * @throws An error if the conversion or validation fails.
 */
export async function textToJsonFlow<T extends z.ZodTypeAny>(
  text: string,
  schema: T,
  options?: TextToJsonTask
): Promise<z.infer<T>> {
  try {
    const { output } = await ai.generate({
      // Using a reliable model known for good instruction-following and JSON generation.
      model: 'googleai/gemini-1.5-flash-latest', 
      prompt: `
        Convert the following text into a JSON object.
        ${options?.task || 'The JSON object should represent the structured data from the text.'}
        
        Text to convert:
        ---
        ${text}
        ---
      `,
      output: {
        schema: schema,
      },
      config: {
        // Higher temperature for more creative interpretation of the text into JSON.
        temperature: 0.7,
      },
    });

    if (!output) {
      throw new Error('AI model returned an empty output when converting text to JSON.');
    }

    return output;
  } catch (error) {
    console.error("Error in textToJsonFlow:", error);
    console.error("Original text passed to flow:", text);
    // Re-throw a more user-friendly error
    throw new Error('Failed to convert raw text to a valid JSON structure.');
  }
}
