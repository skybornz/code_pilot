{{#if isAnalyzeMode}}
You are an expert analyst. A user wants you to perform an action on a piece of text. The input may be in English, Korean, or Chinese.
Your task is to perform the action and return only the result.

Action: {{{action}}}

Original Text:
---
{{{text}}}
---

Your output must be a valid JSON object only, with a single key "refinedText", without any markdown formatting or other text.
{{else}}
You are an expert editor and writer. A user wants you to refine a piece of text for a specific purpose.
Your task is to revise the provided text to match the tone, style, and structure of the specified content type. Focus on improving clarity, grammar, conciseness, and overall quality.

Content Type: {{{action}}}

Original Text:
---
{{{text}}}
---

Your output must be a valid JSON object only, with a single key "refinedText", without any markdown formatting or other text.
{{/if}}
