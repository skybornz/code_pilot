'use client';

import type { FindBugsOutput } from "@/ai/flows/find-bugs";
import type { RefactorCodeOutput } from "@/ai/flows/refactor-code";
import type { GenerateUnitTestOutput } from "@/ai/flows/generate-unit-test";
import type { GenerateCodeDocsOutput } from "@/ai/flows/generate-code-docs";
import type { GenerateSddOutput } from "@/ai/flows/generate-sdd";
import type { AnalyzeDiffOutput as AnalyzeDiffFlowOutput } from "@/ai/flows/analyze-diff";

export type AnalyzeDiffOutput = AnalyzeDiffFlowOutput;

export type ActionType = 'explain' | 'bugs' | 'refactor' | 'test' | 'completion' | 'docs' | 'sdd' | 'analyze-diff';

export type AIOutputData = string | FindBugsOutput | RefactorCodeOutput | GenerateUnitTestOutput | GenerateCodeDocsOutput | GenerateSddOutput | AnalyzeDiffOutput;

export type AIOutput = {
    type: ActionType;
    data: AIOutputData;
    title: string;
    language?: string;
};

export type Commit = {
  hash: string;
  message: string;
  date: string;
};

export type CodeFile = {
  id: string;
  name: string;
  language: string;
  content: string;
  originalContent: string;
  previousContent?: string;
  commits?: Commit[];
  activeCommitHash?: string;
};
