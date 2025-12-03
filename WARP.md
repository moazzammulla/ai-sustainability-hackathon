# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 🚨 Repository Rules
- Do NOT change or remove any existing functions or features.
- Do NOT rename folders or files.
- Maintain the current project structure exactly as it is.
- When fixing bugs or updating code, use minimal and safe edits.
- Only add new code where necessary — do not refactor large areas.

## 🧩 Task Requirements
Your job in this repository is:

1. Add a fully working **Signup Page**.
2. Connect all 3 branches of the project properly so the application runs end-to-end.
3. Fix any connection issues without rewriting existing logic.
4. Debug and resolve errors safely.
5. Ensure the final build runs successfully with no breaking changes.

## ✔ Expected Behavior
- All existing features must continue working exactly the same.
- Signup should integrate with the existing login / authentication flow.
- Every change must be backward-compatible.

## ⚠ Important Safety Step
Before making code changes:
- Inspect the existing files and flows first; understand how the current login/authentication and branch connections work before editing.
- Prefer adding small, isolated units (new components, functions, or routes) over modifying shared logic.
- For any change that touches shared code, keep edits as small as possible and avoid changing public interfaces.
- After each logical change, run the project’s build/test commands (once they are defined) to ensure there are no regressions.

## Commands

At the time of writing, this repository does not define any standard tooling files (such as `package.json`, `pyproject.toml`, `Makefile`, or CI configuration), so build, lint, and test commands are not yet discoverable from the codebase.

When such tooling is added, future Warp agents should:

1. Look for language- or framework-specific files in the repository root (for example: `package.json`, `pnpm-lock.yaml`, `pyproject.toml`, `requirements.txt`, `Pipfile`, `Makefile`, `Dockerfile`, `.github/workflows/*.yml`).
2. From those files, determine how to:
   - build the project
   - run the full test suite
   - run an individual or filtered test (e.g., via a test pattern or test file path)
   - run linters and type checkers
3. Update this section with concrete commands and a brief description for each (e.g., "Run full test suite", "Run a single Jest test file", etc.), based only on what is explicitly defined by the repository configuration or documentation.

Avoid assuming or inventing commands that are not clearly specified.

## High-Level Architecture and Structure

The repository currently contains only `README.md` with the project title and no implementation code or directory structure to analyze. As the application is implemented (including the Signup page and three project branches), future Warp agents should focus on documenting the cross-file architecture rather than listing every file.

When code exists, summarize:

- **Primary entrypoints**: How the application is started (e.g., main server file, front-end entrypoint, CLI script) and how control flows from entrypoints into core modules.
- **Authentication flow**: How login and signup are wired together, what modules handle authentication, and how state (session, tokens, user profiles) flows through the system.
- **Branches / layers**: What the "3 branches" of the project are (for example, front-end, API, and data layer; or web app, worker, and admin UI) and how they are connected end-to-end.
- **Shared utilities and contracts**: Any shared models, types, or service interfaces that are used across branches and how changes to them can impact multiple areas.

The goal is to capture the big-picture relationships that require reading multiple files (for example, how a signup request moves from UI to backend to persistence) so future agents can make minimal, safe changes in the correct places.

## Existing Documentation and Rules

- `README.md` currently contains only the project title `ai-sustainability-hackathon` and no further documentation.
- There are currently no `CLAUDE.md`, Cursor rules (`.cursor/rules/` or `.cursorrules`), or Copilot rules (`.github/copilot-instructions.md`) in this repository.

If any of these files are added later, summarize any important, project-specific guidance they contain here so Warp agents can follow them while working in this repository.
