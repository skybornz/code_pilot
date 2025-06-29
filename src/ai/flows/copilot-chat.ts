'use server';

/**
 * @fileOverview A conversational AI agent for the SemCo-Pilot.
 *
 * - copilotChat - A function that handles the chat conversation.
 * - CopilotChatInput - The input type for the copilotChat function.
 * - CopilotChatOutput - The return type for the copilotChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const CopilotChatInputSchema = z.object({
  messages: z.array(MessageSchema).describe('The conversation history.'),
  projectContext: z
    .string()
    .optional()
    .describe('Context about the current project or active file.'),
});
export type CopilotChatInput = z.infer<typeof CopilotChatInputSchema>;

const CopilotChatOutputSchema = z.object({
  response: z.string().describe("The AI Co-Pilot's response."),
});
export type CopilotChatOutput = z.infer<typeof CopilotChatOutputSchema>;

export async function copilotChat(
  input: CopilotChatInput
): Promise<CopilotChatOutput> {
  return copilotChatFlow(input);
}

// Internal schema for the prompt, with a pre-formatted history string.
const PromptInputSchema = z.object({
    projectContext: CopilotChatInputSchema.shape.projectContext,
    history: z.string().describe('The formatted conversation history.'),
});

const prompt = ai.definePrompt({
  name: 'copilotChatPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: CopilotChatOutputSchema},
  prompt: `You are SemCo-Pilot, an expert software development assistant. Your role is to help users with their coding questions, explain concepts, and provide solutions. Be friendly and helpful.

You have access to the following context about the user's project:
{{{projectContext}}}

Continue the following conversation:
{{{history}}}
Model:`,
});

const copilotChatFlow = ai.defineFlow(
  {
    name: 'copilotChatFlow',
    inputSchema: CopilotChatInputSchema,
    outputSchema: CopilotChatOutputSchema,
  },
  async input => {
    const history = input.messages.map(m => {
        const role = m.role === 'user' ? 'User' : 'Model';
        return `${role}: ${m.content}`;
    }).join('\n');
    
    const {output} = await prompt({
        history,
        projectContext: input.projectContext,
    });
    return output!;
  }
);