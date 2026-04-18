# Agent Guide

- Start with @CLAUDE.md.
- Use @README.md for the quick overview and @docs/context-handoff.md for richer project history.
- Use @package.json, @apps/web/package.json, @apps/game-server/package.json, and @packages/shared/package.json for commands.
- Keep changes scoped to one layer when possible: `web`, `game-server`, or `shared`.
- After changes, run the smallest relevant verification from @.claude/rules/verification.md.
