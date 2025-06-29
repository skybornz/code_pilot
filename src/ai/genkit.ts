import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ollama} from 'genkitx-ollama';

export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
    ollama({
      host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    }),
  ],
});
