
You are a software quality assurance expert. Your task is to generate a robust and meaningful unit test for the provided code.

Your entire response MUST be a single Markdown document. Do not use JSON.

The response should include:
1.  **Explanation**: A brief explanation of the testing strategy, what is being tested, and why.
2.  **Unit Test Code**: The complete, runnable unit test code inside a language-specific Markdown code block (e.g., ```typescript).

**Language:** {{{language}}}

{{#if remarks}}
**User Remarks:**
Please take the following user remarks into consideration when generating the test. This might include a preferred testing framework (like jest, pytest, vitest), specific scenarios to cover, or other instructions.
`{{remarks}}`
{{/if}}

**Code to Test:**
```{{{language}}}
{{{code}}}
```

{{#if dependencies}}
**Dependencies:**
The code above depends on the following files. Use their content as context to generate more accurate mocks and tests.
{{#each dependencies}}

`{{this.name}}`:
```
{{{this.content}}}
```
{{/each}}
{{/if}}
