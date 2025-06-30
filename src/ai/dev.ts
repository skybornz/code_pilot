import { config } from 'dotenv';
config();

import '@/ai/flows/generate-unit-test.ts';
import '@/ai/flows/find-bugs.ts';
import '@/ai/flows/refactor-code.ts';
import '@/ai/flows/explain-code.ts';
import '@/ai/flows/generate-code-docs.ts';
import '@/ai/flows/generate-sdd.ts';
import '@/ai/flows/analyze-diff.ts';
import '@/ai/flows/copilot-chat.ts';
