import { config } from 'dotenv';
config();

// Import and await the AI configuration
import { configureAi } from '@/ai/genkit';

async function initialize() {
    await configureAi();
    
    // Now that `ai` is configured, dynamically import the flows
    await import('@/ai/flows/generate-unit-test.ts');
    await import('@/ai/flows/find-bugs.ts');
    await import('@/ai/flows/refactor-code.ts');
    await import('@/ai/flows/explain-code.ts');
    await import('@/ai/flows/generate-code-docs.ts');
    await import('@/ai/flows/generate-sdd.ts');
    await import('@/ai/flows/analyze-diff.ts');
    await import('@/ai/flows/copilot-chat.ts');
}

initialize().catch(err => {
    console.error("Failed to initialize Genkit flows:", err);
    process.exit(1);
});
