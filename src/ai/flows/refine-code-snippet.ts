
'use server';

/**
 * @fileOverview An AI agent that refines an existing code snippet based on user instructions.
 *
 * - refineCodeSnippetFlow - A function that handles the code refinement process.
 * - RefineCodeSnippetInput - The input type for the refineCodeSnippet function.
 * - RefineCodeSnippetOutput - The return type for the refineCodeSnippet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';

const RefineCodeSnippetInputSchema = z.object({
  code: z.string().describe('The original code snippet to be refined.'),
  instruction: z.string().describe('The user instruction for how to refine the code.'),
  language: z.string().describe('The programming language of the code snippet.'),
});
export type RefineCodeSnippetInput = z.infer<typeof RefineCodeSnippetInputSchema>;

const RefineCodeSnippetOutputSchema = z.object({
  codeSnippet: z.string().describe("The refined, updated code snippet."),
  explanation: z.string().describe("A brief explanation of the changes made to the code."),
});
export type RefineCodeSnippetOutput = z.infer<typeof RefineCodeSnippetOutputSchema>;


const RefineCodeSnippetFlowInputSchema = RefineCodeSnippetInputSchema.extend({
    model: z.string().describe('The AI model to use for the refinement.'),
});

export async function refineCodeSnippetFlow(input: RefineCodeSnippetInput): Promise<RefineCodeSnippetOutput> {
    const modelConfig = await getDefaultModel();
    if (!modelConfig) {
        throw new Error('No default model is configured.');
    }
    const modelName = modelConfig.type === 'local'
        ? `ollama/${modelConfig.name}`
        : `googleai/${modelConfig.name}`;
    
    return ai.run('refineCodeSnippetFlow', { model: modelName, ...input });
}


ai.defineFlow(
  {
    name: 'refineCodeSnippetFlow',
    inputSchema: RefineCodeSnippetFlowInputSchema,
    outputSchema: RefineCodeSnippetOutputSchema,
  },
  async (input) => {
    const prompt = `
You are an expert programmer who refines code based on instructions.
Your task is to take an existing piece of code, a user's instruction, and rewrite the code to incorporate the instruction.
You must return the full, complete, updated code snippet.

Language: ${input.language}

User's Instruction: "${input.instruction}"

Original Code:
\`\`\`${input.language}
${input.code}
\`\`\`

You must provide your response as a JSON object with two keys: "codeSnippet" and "explanation".
- "codeSnippet": The complete, updated code. Do not use markdown backticks.
- "explanation": A brief summary of what you changed.
`;
      
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: prompt,
        output: {
          schema: RefineCodeSnippetOutputSchema
        }
    });

    if (!output) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    return output;
  }
);
