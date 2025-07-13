
'use server';

/**
 * @fileOverview An AI agent that converts natural language to Mermaid.js diagram code.
 *
 * - generateDiagram - A function that handles the diagram generation process.
 * - GenerateDiagramInput - The input type for the generateDiagram function.
 * - GenerateDiagramOutput - The return type for the generateDiagram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDefaultModel } from '@/actions/models';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

const GenerateDiagramInputSchema = z.object({
  prompt: z.string().describe('The plain English description of the desired diagram.'),
  diagramType: z.string().describe('The type of Mermaid.js diagram to generate (e.g., "flowchart", "sequenceDiagram", "gantt", "classDiagram", "erDiagram", "stateDiagram-v2").'),
});
export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;

const GenerateDiagramOutputSchema = z.object({
  diagramCode: z.string().describe("The generated Mermaid.js code. It should be a valid Mermaid string, starting with the diagram type declaration."),
});
export type GenerateDiagramOutput = z.infer<typeof GenerateDiagramOutputSchema>;

export async function generateDiagram(input: GenerateDiagramInput): Promise<GenerateDiagramOutput> {
  const modelConfig = await getDefaultModel();
  if (!modelConfig) {
      throw new Error('No default model is configured.');
  }
  const modelName = modelConfig.type === 'local'
      ? `ollama/${modelConfig.name}`
      : `googleai/${modelConfig.name}`;

  return generateDiagramFlow({ model: modelName, ...input });
}

const GenerateDiagramFlowInputSchema = GenerateDiagramInputSchema.extend({
    model: z.string().describe('The AI model to use for the generation.'),
});

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
    // Regex to find content between ```json and ```
    const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    // Fallback for cases where it might just be ``` at the start and end
    return trimmed.replace(/^```|```$/g, '').trim();
}

const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: GenerateDiagramFlowInputSchema,
    outputSchema: GenerateDiagramOutputSchema,
  },
  async (input) => {
    const promptTemplate = await getCompiledPrompt('generate-diagram');
    const finalPrompt = promptTemplate({ 
        diagramType: input.diagramType,
        prompt: input.prompt
    });
      
    // Ask for a text response instead of direct JSON to handle model inconsistencies
    const { text } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
    });

    if (!text) {
        throw new Error("Received an empty response from the AI model.");
    }

    try {
        // Clean and parse the response manually
        const cleanedText = cleanJsonOutput(text);
        const parsedOutput = JSON.parse(cleanedText);
        // Validate the parsed object against our schema
        return GenerateDiagramOutputSchema.parse(parsedOutput);
    } catch (error) {
        console.error("Failed to parse AI model's JSON output for diagram:", error);
        console.error("Original model output:", text);
        // Re-throw a more user-friendly error
        throw new Error("The AI model returned a response that was not valid JSON. Please try again.");
    }
  }
);
