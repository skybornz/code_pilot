
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
import { textToJsonFlow } from './text-to-json';

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


const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: GenerateDiagramFlowInputSchema,
    outputSchema: GenerateDiagramOutputSchema,
  },
  async (input) => {
    const promptName = 'generate-diagram';

    const promptTemplate = await getCompiledPrompt(promptName);
    const finalPrompt = promptTemplate({ 
        diagramType: input.diagramType,
        prompt: input.prompt
    });
      
    const { text } = await ai.generate({
        model: input.model as any,
        prompt: finalPrompt,
    });

    if (!text) {
        throw new Error("Received an empty response from the AI model.");
    }

    const jsonResult = await textToJsonFlow(text, GenerateDiagramOutputSchema, { task: 'Extract the Mermaid diagram code from the text.'});

    if (jsonResult.diagramCode) {
        jsonResult.diagramCode = jsonResult.diagramCode.replace(/\\n/g, '\n');
    }
    
    return jsonResult;
  }
);
