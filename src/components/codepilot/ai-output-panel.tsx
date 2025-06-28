'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2 } from 'lucide-react';
import type { AIOutput, AIOutputData } from './types';
import type { FindBugsOutput } from '@/ai/flows/find-bugs';
import type { RefactorCodeOutput } from '@/ai/flows/refactor-code';
import type { GenerateUnitTestOutput } from '@/ai/flows/generate-unit-test';

interface AIOutputPanelProps {
  output: AIOutput | null;
  isLoading: boolean;
  onApplyChanges: (newCode: string) => void;
}

const renderOutput = (data: AIOutputData, type: AIOutput['type'], onApplyChanges: (newCode: string) => void) => {
  if (type === 'bugs') {
    const bugReport = data as FindBugsOutput;
    return (
      <>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Bugs Found:</h4>
            {bugReport.bugs.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 bg-muted/50 p-3 rounded-md">
                    {bugReport.bugs.map((bug, index) => <li key={index}>{bug}</li>)}
                </ul>
            ) : <p className="text-muted-foreground">No bugs found.</p>}
          </div>
          <div>
            <h4 className="font-semibold mb-2">Explanation & Fixes:</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{bugReport.explanation}</p>
          </div>
        </div>
      </>
    );
  }

  if (type === 'refactor') {
    const refactorData = data as RefactorCodeOutput;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Refactored Code:</h4>
          <pre className="bg-muted p-3 rounded-md text-sm font-code whitespace-pre-wrap">{refactorData.refactoredCode}</pre>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Explanation:</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{refactorData.explanation}</p>
        </div>
      </div>
    );
  }

  if (type === 'test') {
    const testData = data as GenerateUnitTestOutput;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Generated Unit Test:</h4>
          <pre className="bg-muted p-3 rounded-md text-sm font-code whitespace-pre-wrap">{testData.unitTest}</pre>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Explanation:</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{testData.explanation}</p>
        </div>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap">{String(data)}</p>;
};

export function AIOutputPanel({ output, isLoading, onApplyChanges }: AIOutputPanelProps) {
  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-accent" />
          <span>AI Assistant</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-y-auto">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {!isLoading && !output && (
          <div className="text-center text-muted-foreground h-full flex flex-col justify-center items-center">
            <p>Select an AI action to see the results here.</p>
            <p className="text-xs mt-2">e.g., Explain, Find Bugs, Refactor Code</p>
          </div>
        )}
        {!isLoading && output && output.type !== 'completion' && (
          <div>
            <h3 className="font-bold text-xl mb-4">{output.title}</h3>
            {renderOutput(output.data, output.type, onApplyChanges)}
          </div>
        )}
      </CardContent>
      {!isLoading && output?.type === 'refactor' && (
        <CardFooter className="p-4 border-t">
          <Button onClick={() => onApplyChanges((output.data as RefactorCodeOutput).refactoredCode)}>
            Apply Changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
