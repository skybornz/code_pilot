
'use client';

import type { GenerateUnitTestOutput as GenTestOutput } from '@/ai/flows/generate-unit-test';

// All flow outputs are now just strings, so we don't need to import their specific types.
// We'll define the output types here directly for simplicity.
export type AnalyzeDiffOutput = string;
export type ExplainCodeOutput = string;
export type FindBugsOutput = string;
export type RefactorCodeOutput = string;
export type GenerateUnitTestOutput = GenTestOutput;
export type GenerateSddOutput = string;

export type ActionType = 'explain' | 'bugs' | 'refactor' | 'test' | 'sdd' | 'analyze-diff' | 'copilot';

type AIOutputBase = {
  title: string;
  language?: string;
  fileContext?: {
    id: string;
    name: string;
  };
};

// The `data` property for all types is now a simple string.
export type AIOutput = AIOutputBase & (
  | { type: 'explain'; data: ExplainCodeOutput }
  | { type: 'bugs'; data: FindBugsOutput }
  | { type: 'refactor'; data: RefactorCodeOutput }
  | { type: 'test'; data: string } // The `data` for test is the string from GenerateUnitTestOutput.test
  | { type: 'sdd'; data: GenerateSddOutput }
  | { type: 'analyze-diff'; data: AnalyzeDiffOutput }
);

export type Commit = {
  hash: string;
  message: string;
  date: string;
};

export type CodeFile = {
  id: string; // This is the full path
  name: string;
  language: string;
  type: 'file' | 'folder';
  content?: string; // Optional: loaded on demand
  originalContent?: string; // Optional: loaded on demand
  childrenLoaded?: boolean; // For folders
  previousContent?: string;
  commits?: Commit[];
  activeCommitHash?: string;
};
