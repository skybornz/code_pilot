'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2 } from 'lucide-react';
import type { AIOutput } from './types';
import type { FindBugsOutput } from '@/ai/flows/find-bugs';
import type { RefactorCodeOutput } from '@/ai/flows/refactor-code';
import type { GenerateUnitTestOutput } from '@/ai/flows/generate-unit-test';
import type { GenerateCodeDocsOutput } from '@/ai/flows/generate-code-docs';
import type { GenerateSddOutput } from '@/ai/flows/generate-sdd';
import { CodeBlock } from './code-block';
import type { AnalyzeDiffOutput } from './types';

interface AIOutputPanelProps {
  output: AIOutput | null;
  isLoading: boolean;
}

const renderOutput = (output: AIOutput) => {
  const { data, type, language } = output;

  if (type === 'analyze-diff') {
    const analysis = data as AnalyzeDiffOutput;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Summary of Changes:</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Detailed Analysis:</h4>
          {analysis.detailedAnalysis.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 bg-muted/50 p-4 rounded-md">
                  {analysis.detailedAnalysis.map((point, index) => <li key={index}>{point}</li>)}
              </ul>
          ) : <p className="text-muted-foreground">No specific issues found.</p>}
        </div>
      </div>
    );
  }

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
          <CodeBlock code={refactorData.refactoredCode} language={language} />
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
          <CodeBlock code={testData.unitTest} language={language} />
        </div>
        <div>
          <h4 className="font-semibold mb-2">Explanation:</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{testData.explanation}</p>
        </div>
      </div>
    );
  }

  if (type === 'docs') {
    const docsData = data as GenerateCodeDocsOutput;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Documentation:</h4>
          <CodeBlock code={docsData.documentation} language={language} />
        </div>
      </div>
    );
  }
  
  if (type === 'sdd') {
    const sddData = data as GenerateSddOutput;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Software Design Document:</h4>
          <CodeBlock code={sddData.sdd} language={language} />
        </div>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap">{String(data)}</p>;
};

export function AIOutputPanel({ output, isLoading }: AIOutputPanelProps) {
  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-shrink-0 border-b p-4 flex flex-row items-center">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-accent" />
          <span>AI Assistant</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 min-h-0 overflow-y-auto">
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
            {renderOutput(output)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
