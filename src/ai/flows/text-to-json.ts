'use server';

/**
 * @fileOverview An internal AI flow that converts unstructured text into a structured JSON object.
 * This flow is designed to be called by other flows and uses the same model provided
 * by the parent flow to ensure consistency and support for local-only environments.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { inspect } from 'util';

const TextToJsonInputSchema = z.object({
    text: z.string().describe('The unstructured text to convert to JSON.'),
    model: z.string().describe('The name of the model to use for the conversion, passed from the parent flow.'),
});

// Define a schema for the optional task description
const TextToJsonTaskSchema = z.object({
  task: z.string().optional().describe('An optional, more specific task description for the conversion.'),
});
type TextToJsonTask = z.infer<typeof TextToJsonTaskSchema>;

// This is an internal flow, so we don't export a wrapper function for it.
const textToJsonInternalFlow = ai.defineFlow(
  {
    name: 'textToJsonInternalFlow',
    inputSchema: TextToJsonInputSchema.extend(TextToJsonTaskSchema),
    // The output schema is dynamic, so we use z.any() here.
    // The actual validation happens within the flow itself.
    outputSchema: z.any(), 
  },
  async (input, streamingCallback, context) => {
    // Dynamically get the Zod schema from the context. This is a bit of a workaround
    // as Genkit flows don't have a built-in way to pass schemas dynamically,
    // but we can pass it in the context from the calling function.
    const { outputSchema } = context.data as { outputSchema: z.ZodTypeAny };
    if (!outputSchema) {
        throw new Error('Output Zod schema must be provided in the context.');
    }

    const { output } = await ai.generate({
      model: input.model as any,
      prompt: `
        You are a data extraction expert. Your sole purpose is to convert the provided text into a valid JSON object that strictly adheres to the provided Zod schema.
        Do NOT include any commentary, explanations, or markdown formatting. Your response must be ONLY the raw JSON object.

        Zod Schema for the JSON object:
        ---
        ${inspect(outputSchema.shape, { depth: null })}
        ---
        
        Text to convert:
        ---
        ${input.text}
        ---

        JSON Output:
      `,
      output: {
        schema: outputSchema,
      },
      config: {
        // Use a lower temperature to encourage the model to stick to the facts and the schema.
        temperature: 0.2,
      },
    });

    if (!output) {
      throw new Error('AI model returned an empty output when converting text to JSON.');
    }
    return output;
  }
);


/**
 * Converts a string of unstructured text into a validated JSON object of a given Zod schema type.
 * This function orchestrates the call to the internal Genkit flow.
 * @param input The input object containing the text to convert and the model to use.
 * @param schema The Zod schema to validate the output against.
 * @param options Optional parameters to provide more context for the conversion.
 * @returns A promise that resolves to the structured JSON object.
 * @throws An error if the conversion or validation fails.
 */
export async function textToJsonFlow<T extends z.ZodTypeAny>(
  input: z.infer<typeof TextToJsonInputSchema>,
  schema: T,
  options?: TextToJsonTask
): Promise<z.infer<T>> {
  try {
    const flowInput = { ...input, ...options };
    // Pass the dynamic schema via the context object.
    const result = await textToJsonInternalFlow(flowInput, { data: { outputSchema: schema }});
    
    // Final validation just in case the model's output isn't perfect
    const parsed = schema.safeParse(result);
    if (!parsed.success) {
        throw new Error(`Failed to parse AI output into the required schema. Errors: ${parsed.error.message}`);
    }
    
    return parsed.data;

  } catch (error) {
    console.error("Error in textToJsonFlow:", error);
    console.error("Original text passed to flow:", input.text);
    // Re-throw a more user-friendly error
    throw new Error('Failed to convert raw text to a valid JSON structure.');
  }
}
