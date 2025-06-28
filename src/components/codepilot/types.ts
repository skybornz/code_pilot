import type { FindBugsOutput } from "@/ai/flows/find-bugs";
import type { RefactorCodeOutput } from "@/ai/flows/refactor-code";
import type { GenerateUnitTestOutput } from "@/ai/flows/generate-unit-test";
import type { GenerateCodeDocsOutput } from "@/ai/flows/generate-code-docs";

export type ActionType = 'explain' | 'bugs' | 'refactor' | 'test' | 'completion' | 'docs';

export type AIOutputData = string | FindBugsOutput | RefactorCodeOutput | GenerateUnitTestOutput | GenerateCodeDocsOutput;

export type AIOutput = {
    type: ActionType;
    data: AIOutputData;
    title: string;
};

export type CodeFile = {
  id: string;
  name: string;
  language: string;
  content: string;
};
