# AI Prompt Log

Raw, append-only log of AI sessions, grouped by date and tool. Add prompts immediately after a
session; do not reconstruct them from memory later. User prompts are copied verbatim. Assistant
replies are not reproduced here unless they contain a correction worth keeping; the full working
transcript stays in the OpenCode session.

## 2026-10-23 - OpenCode, DeepSeek V4.1 Flash Free

**User:**

```
D:\PLAN.md
```

**Assistant:** read the plan and asked what to do with it.

**User:** selected "Start building it".

**Assistant:** asked where the repo should live and how commit trailers should be handled. The
question was dismissed.

**User:**

```
D:\PLAN.md
```

**Assistant:** began Phase 0 at `D:\car-dealership`, using npm workspaces because Bun is not
installed, and a local PostgreSQL 16 because Docker is not installed.

## 2026-10-23 - OpenCode, DeepSeek V4.1 Flash Free (continued)

**User:** no further prompts; the agent continued executing PLAN.md.

**Assistant:** completed Phase 0 (scaffold, health check, commit hook) and Phase 1 (register,
login, `/me`, admin guard). Every feature landed as a failing test commit followed by a passing
implementation commit. Test database is `dealer_test`; truncation refuses any database whose name
does not end in `_test`.

