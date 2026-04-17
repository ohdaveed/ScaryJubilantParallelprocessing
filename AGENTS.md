# AGENTS.md

This file defines repo-local operating rules for AI agents and automation working in this repository.

## Scope

These rules apply to any agent, assistant, or automation that can read files, inspect diffs, run commands, or generate output from this workspace.

## Secrets Handling

Agents must treat secrets as restricted material.

Do not open, print, quote, summarize, diff, or echo the contents of files that are likely to contain secrets unless the user explicitly asks for that exact action.

Protected files and patterns include:

- `.env`
- `.env.*`
- `credentials.json`
- `token.json`
- `*.pem`
- `*.key`
- `*-service-account*.json`
- `*service-account*.json`
- files under `.local/` that may contain tokens, credentials, or exported local data

Protected values include:

- API keys
- database URLs
- OAuth client secrets
- refresh tokens
- private keys
- service account JSON contents
- bearer tokens
- session tokens

## Default Behavior

When working near protected files or values, agents must:

- avoid reading the file unless it is strictly required for the task
- prefer environment variable names, placeholders, and redacted examples over raw values
- avoid including secret-bearing content in terminal output, logs, diffs, summaries, commit messages, or docs
- avoid copying secret values into tests, fixtures, screenshots, or example commands
- assume any exposed secret should be rotated

## If Access Is Required

If a task genuinely requires checking secret configuration, agents should:

1. ask before opening the protected file
2. inspect only the minimum needed
3. report structure or presence, not raw values
4. redact all sensitive substrings in any response

Example:

- allowed: "`DATABASE_URL` is set"
- allowed: "`ANTHROPIC_API_KEY` appears missing"
- not allowed: printing the actual value

## Safe Alternatives

Prefer these patterns:

- use `.env.example` with placeholder values for documentation
- refer to secret names, not contents
- validate whether a variable exists rather than reading it aloud
- describe connection failures without exposing credentials

## Rotation Rule

If a secret is revealed in output, logs, chat, screenshots, or committed history, treat it as compromised and tell the user to rotate it.
