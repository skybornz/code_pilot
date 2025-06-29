'use server';

/**
 * @fileOverview A conversational AI agent for the SemCo-Pilot.
 *
 * - copilotChat - A function that handles the chat conversation and streams the response.
 * - CopilotChatInput - The input type for the copilotChat function.
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


// This function now returns a stream for real-time chat.
export async function copilotChat(
  input: CopilotChatInput
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = `You are SemCo-Pilot, an expert software development assistant. Your role is to help users with their coding questions, explain concepts, and provide solutions. Be friendly and helpful.

You have access to the following context about the user's project:
${input.projectContext || 'No context provided.'}`;

    const {stream} = ai.generateStream({
      system: systemPrompt,
      messages: input.messages.map((m) => ({...m, content: [{text: m.content}]})),
    });

    // Convert Genkit's stream to a web ReadableStream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
        async start(controller) {
            for await (const chunk of stream) {
                if (chunk.text) {
                    controller.enqueue(encoder.encode(chunk.text));
                }
            }
            controller.close();
        }
    });

    return readableStream;
}
