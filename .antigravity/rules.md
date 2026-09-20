# Kids Flashcard App - Antigravity Agent Rules

## 1. Environment & Shell Conventions
- Operating System: Windows 11 / 10
- Default Shell: PowerShell (pwsh / powershell.exe)
- Workspace Root: (dynamically determined based on environment)
- Never invoke Unix-specific syntax or POSIX commands (e.g., do not use `export`, `grep`, `sed`, `head`, `tail`).
- When path separators are needed in terminal commands, use standard Windows or double backslashes/quotes appropriately.

## 2. File Inspection & Tool Usage (CRITICAL)
- DO NOT use terminal commands (`cat`, `Get-Content`, `findstr`, `select`, `Select-Object`, `type`) just to read or search file contents.
- Always utilize the built-in Editor / Workspace tools (`read_file`, `search_files`, `edit_file`) for all inspections.
- Read files in full or significant blocks when planning changes; do not page through files using arbitrary chunk offsets via shell pipelines.

## 3. Workflow & Execution Guidelines
- Read and understand the existing logic before editing.
- After modifying frontend components in `frontend/src/`, verify the changes by running:
  `npm run build` (inside the frontend directory or root matching package.json).
- Never run destructive commands without an explicit request (e.g., `git reset --hard`, `Remove-Item -Recurse`, `rmdir /s /q`).
- Do not commit or push source code to Git automatically (`git commit`, `git push`) unless explicitly instructed by the user.
- Git Commit Convention (when requested):
  - Always write Git commit messages strictly in ENGLISH.
  - Follow the SemVer / Conventional Commits format (`type(scope): brief summary`).
  - Structure must include both a clear Title and an explanatory Body (using bullet points or concise paragraphs explaining the "why" and "what").
- Always report and communicate results in VIETNAMESE (Tiếng Việt).

## 4. Coding Standards (Frontend)
- Target: React / Vite frontend.
- Code Comments: Always write code comments, JSDoc, and inline explanations in ENGLISH.
- Ensure all game states (timers, session intervals, cleanup hooks) are properly cleared in `useEffect` returns to avoid memory leaks.
- Keep components modular and maintain consistent prop interfaces between game modes (e.g., `BubbleQuiz.jsx`, `EyeSpyGame.jsx`).
