import {genkit, ollama} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
    ollama({ host: process.env.OLLAMA_HOST }), // Use host from environment variables
  ],
});
