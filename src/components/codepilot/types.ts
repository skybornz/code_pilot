import type { FindBugsOutput } from "@/ai/flows/find-bugs";
import type { RefactorCodeOutput } from "@/ai/flows/refactor-code";
import type { GenerateUnitTestOutput } from "@/ai/flows/generate-unit-test";

export type ActionType = 'explain' | 'bugs' | 'refactor' | 'test' | 'completion';

export type AIOutputData = string | FindBugsOutput | RefactorCodeOutput | GenerateUnitTestOutput;

export type AIOutput = {
    type: ActionType;
    data: AIOutputData;
    title: string;
};
