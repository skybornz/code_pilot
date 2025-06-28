# **App Name**: CodePilot

## Core Features:

- Code Completion: AI-powered code suggestions using Ollama models: As the user types, the extension sends snippets of code to the local Ollama LLM. The LLM, acting as a tool, uses its understanding of the project to suggest code completions, improvements, and identify potential errors.
- Inline Code Display: Inline code display: Display AI-generated code suggestions directly within the VS Code editor, allowing users to preview and accept or reject changes.
- Ollama Integration: Local Ollama Model Integration: Configure the extension to connect to a locally running Ollama LLM instance. Allow the user to define specific models to use within the extension.
- Action Menu: Contextual action menu: Provide a menu of actions such as 'Explain this code', 'Refactor this code', or 'Find bugs', sending the selection and current code selection to the LLM to complete the request.
- File Access: File system access: Securely read and modify code files within the current VS Code project based on LLM suggestions (with user confirmation).
- Code Doc Generator: Code documentation: Automatically generate documentation for code blocks based on the selected code in the VS Code window.

## Style Guidelines:

- Primary color: Deep indigo (#4B0082), evocative of technical precision and intelligence.
- Background color: Dark navy (#1A237E) with approximately 20% saturation, setting a professional tone.
- Accent color: Electric violet (#8F00FF) to highlight important features.
- Font: 'Inter', a sans-serif font for code readability and a clean UI. Note: currently only Google Fonts are supported.
- Use minimalist, geometric icons for primary functions, keeping a professional look.
- Use subtle, non-intrusive animations to signal processing and code changes.