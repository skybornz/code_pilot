'use server';

/**
 * @fileOverview Implements the code completion flow using a local Ollama LLM.
 *
 * - codeCompletion - A function that provides code completion suggestions based on the current code context.
 * - CodeCompletionInput - The input type for the codeCompletion function.
 * - CodeCompletionOutput - The return type for the codeCompletion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const CodeCompletionFlowInputSchema = z.object({
  model: z.string().describe('The AI model to use for completion.'),
  codeSnippet: z
    .string()
    .describe('The current code snippet the user is typing.'),
  language: z.string().describe('The programming language of the code snippet.'),
  projectContext: z
    .string()
    .optional()
    .describe('Optional context about the project, such as file structure or dependencies.'),
});
export type CodeCompletionInput = z.infer<typeof CodeCompletionFlowInputSchema>;

const CodeCompletionOutputSchema = z.object({
  completion: z.string().describe('The AI-powered code completion suggestion.'),
});
export type CodeCompletionOutput = z.infer<typeof CodeCompletionOutputSchema>;

export async function codeCompletion(input: CodeCompletionInput): Promise<CodeCompletionOutput> {
  return codeCompletionFlow(input);
}

// Define a template cache
const promptTemplateCache = new Map<string, handlebars.TemplateDelegate>();

async function getCompiledPrompt(name: string): Promise<handlebars.TemplateDelegate> {
    if (promptTemplateCache.has(name)) {
        return promptTemplateCache.get(name)!;
    }
    const promptPath = path.join(process.cwd(), 'src', 'ai', 'prompts', `${name}.md`);
    const promptText = await fs.readFile(promptPath, 'utf-8');
    const compiledTemplate = handlebars.compile(promptText);
    promptTemplateCache.set(name, compiledTemplate);
    return compiledTemplate;
}

// Helper to clean up model output that might be wrapped in markdown
function cleanJsonOutput(text: string): string {
    const trimmed = text.trim();
    const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return trimmed.replace(/^```|```$/g, '').trim();
}

const codeCompletionFlow = ai.defineFlow(
  {
    name: 'codeCompletionFlow',
    inputSchema: CodeCompletionFlowInputSchema,
    outputSchema: CodeCompletionOutputSchema,
  },
  async (input: CodeCompletionInput) => {
    const isQwenCoder = input.model.includes('qwen2.5-coder');
    const promptName = isQwenCoder ? 'code-completion-qwen' : 'code-completion';

    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({
        language: input.language,
        codeSnippet: input.codeSnippet,
        projectContext: input.projectContext
    });

    const { text } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
    });

    if (!text) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    try {
        const cleanedText = cleanJsonOutput(text);
        const parsedOutput = JSON.parse(cleanedText);
        return CodeCompletionOutputSchema.parse(parsedOutput);
    } catch (error) {
        console.error("Failed to parse AI model's JSON output for code completion:", error);
        console.error("Original model output:", text);
        throw new Error("The AI model returned a response that was not valid JSON. Please try again.");
    }
  }
);
