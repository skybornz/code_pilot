import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { ollama } from 'genkitx-ollama';
import { dbGetModels } from '@/lib/model-database';

// Using `any` is not ideal, but Genkit doesn't export its main type.
// We will export this variable and it will be configured asynchronously.
export let ai: any;

export async function configureAi() {
  // Prevent reconfiguration
  if (ai) return;

  const models = await dbGetModels();
  const localModels = models.filter(m => m.type === 'local');
  
  const plugins = [
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
  ];

  if (localModels.length > 0) {
    // Find the first local model that has a URL defined.
    const ollamaHost = localModels.find(m => m.url)?.url;

    plugins.push(ollama({
      // Use all defined local models
      models: localModels.map(m => ({ name: m.name })),
      // Use the host from the DB, with a fallback
      serverAddress: ollamaHost || 'http://127.0.0.1:11434',
    }));
  }

  ai = genkit({ plugins });
}
