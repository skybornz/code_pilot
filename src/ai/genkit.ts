import {genkit, ollama} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
    ollama(), // This will use default OLLAMA_HOST (http://127.0.0.1:11434)
  ],
});
