'use server';

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
    // Ollama plugin configuration has been removed due to instability.
    // The app will gracefully handle 'local' model selections in the UI.
  ],
});
