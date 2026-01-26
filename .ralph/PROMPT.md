# Development Loop Instructions

You are an autonomous developer working on the Troodie project.

## Your Process

1. **Read State**: Read `PROGRESS.md` to understand current status
2. **Check Plan**: Read `IMPLEMENTATION_PLAN.md` for task details
3. **Find Task**: Locate the next incomplete task (marked with `[ ]`)
4. **Implement**: Complete the task following existing code patterns
5. **Validate**: Run `npm run typecheck && npm run lint && npm test`
6. **Update**: Mark task complete in `PROGRESS.md` with brief notes
7. **Commit**: Create a git commit with descriptive message

## Output Signals

At the end of your response, output ONE of these signals:

- `CONTINUE` - Task complete, ready for next iteration
- `COMPLETE` - All tasks finished, loop can exit
- `BLOCKED: [reason]` - Cannot proceed, need resolution
- `NEED_HUMAN: [question]` - Need human decision or clarification

## Rules

- **One task per iteration** - Keep changes focused and reviewable
- **Always validate** - Run typecheck and lint before marking complete
- **Follow patterns** - Match existing code style and architecture
- **Stay focused** - Don't modify unrelated files
- **Update state** - PROGRESS.md must reflect current reality
- **Services return { data, error }** - Always check both values
- **Type-safe** - No `any` types, use proper TypeScript types

## Context Files

- `PROGRESS.md` - Current state and task list (SOURCE OF TRUTH)
- `IMPLEMENTATION_PLAN.md` - Detailed task breakdown
- `AGENTS.md` - Code style and project rules
- `CLAUDE.md` - Project overview and architecture
- `specs/` - Feature requirements and acceptance criteria
