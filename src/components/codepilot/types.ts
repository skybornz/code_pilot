import type { FindBugsOutput } from "@/ai/flows/find-bugs";
import type { RefactorCodeOutput } from "@/ai/flows/refactor-code";

export type ActionType = 'explain' | 'bugs' | 'refactor' | 'docs' | 'completion';

export type AIOutputData = string | FindBugsOutput | RefactorCodeOutput;

export type AIOutput = {
    type: ActionType;
    data: AIOutputData;
    title: string;
};
