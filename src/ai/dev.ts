
import { config } from 'dotenv';
config();

// Import and await the AI configuration
import { configureAi } from '@/ai/genkit';

async function initialize() {
    await configureAi();
    
    // Now that `ai` is configured, dynamically import the flows
    await import('@/ai/flows/generate-unit-test');
    await import('@/ai/flows/find-bugs');
    await import('@/ai/flows/refactor-code');
    await import('@/ai/flows/explain-code');
    await import('@/ai/flows/generate-code-docs');
    await import('@/ai/flows/generate-sdd');
    await import('@/ai/flows/analyze-diff');
    await import('@/ai/flows/copilot-chat');
    await import('@/ai/flows/check-model-status');
    await import('@/ai/flows/debug-error');
    await import('@/ai/flows/generate-regex');
    await import('@/ai/flows/generate-diagram');
    await import('@/ai/flows/generate-code-snippet');
    await import('@/ai/flows/execute-code');
    await import('@/ai/flows/refine-text');
    await import('@/ai/flows/code-completion');
    await import('@/ai/flows/refine-code-snippet');
}

initialize().catch(err => {
    console.error("Failed to initialize Genkit flows:", err);
    process.exit(1);
});
