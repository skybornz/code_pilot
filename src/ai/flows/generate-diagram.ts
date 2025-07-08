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

const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: GenerateDiagramFlowInputSchema,
    outputSchema: GenerateDiagramOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: input.model as any,
        prompt: `You are an expert in creating diagrams using Mermaid.js syntax. A user has provided a description of a diagram and specified the type.
Your task is to generate the corresponding Mermaid.js code.
ONLY output the raw Mermaid code block. Do not include the markdown triple quotes (e.g. \`\`\`mermaid). Start directly with the diagram type (e.g. 'flowchart TD').
Make the diagram visually appealing and well-structured.

Diagram Type: ${input.diagramType}
User's Description: "${input.prompt}"
`,
        output: { schema: GenerateDiagramOutputSchema },
    });
    return output!;
  }
);
