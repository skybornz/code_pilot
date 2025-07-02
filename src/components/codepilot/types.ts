
'use client';

import type { FindBugsOutput } from "@/ai/flows/find-bugs";
import type { RefactorCodeOutput } from "@/ai/flows/refactor-code";
import type { GenerateUnitTestOutput } from "@/ai/flows/generate-unit-test";
import type { GenerateSddOutput } from "@/ai/flows/generate-sdd";
import type { AnalyzeDiffOutput as AnalyzeDiffFlowOutput } from "@/ai/flows/analyze-diff";
import type { ExplainCodeOutput as ExplainCodeFlowOutput } from "@/ai/flows/explain-code";

export type AnalyzeDiffOutput = AnalyzeDiffFlowOutput;
export type ExplainCodeOutput = ExplainCodeFlowOutput;

export type ActionType = 'explain' | 'bugs' | 'refactor' | 'test' | 'sdd' | 'analyze-diff' | 'copilot';

type AIOutputBase = {
  title: string;
  language?: string;
  fileContext?: {
    id: string;
    name: string;
  };
};

export type AIOutput = AIOutputBase & (
  | { type: 'explain'; data: ExplainCodeOutput }
  | { type: 'bugs'; data: FindBugsOutput }
  | { type: 'refactor'; data: RefactorCodeOutput }
  | { type: 'test'; data: GenerateUnitTestOutput }
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
