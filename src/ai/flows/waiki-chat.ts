'use server';

/**
 * @fileOverview A conversational AI agent for W.A.I.K.I.
 *
 * - waikiChat - A function that handles the chat conversation and streams the response.
 * - WaikiChatInput - The input type for the waikiChat function.
 * - Message - The type for a single chat message.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

const WaikiChatInputSchema = z.object({
  model: z.string().describe('The AI model to use for the chat.'),
  messages: z.array(MessageSchema).describe('The conversation history.'),
});
export type WaikiChatInput = z.infer<typeof WaikiChatInputSchema>;


export async function waikiChat(
  input: WaikiChatInput
): Promise<ReadableStream<Uint8Array>> {

  const systemPrompt = `You are W.A.I.K.I (Web-based AI for Knowledge & Interaction), a powerful, friendly, and helpful AI assistant from AD Labs. Engage in a natural, informative, and supportive conversation.`;

    const firstUserMessageIndex = input.messages.findIndex(m => m.role === 'user');
    const historyForApi = firstUserMessageIndex !== -1 ? input.messages.slice(firstUserMessageIndex) : [];

    const {stream} = ai.generateStream({
      model: input.model as any,
      system: systemPrompt,
      messages: historyForApi.map((m) => ({...m, content: [{text: m.content}]})),
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
