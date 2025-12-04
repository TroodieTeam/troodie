# Git Worktrees Guide

Git worktrees allow you to have multiple working directories attached to a single repository. This is useful for working on multiple branches simultaneously without stashing or committing incomplete work.

## Basic Concepts

- **Main worktree**: Your original cloned repository
- **Linked worktrees**: Additional working directories for other branches
- All worktrees share the same `.git` data, so commits made in any worktree are visible to all

## Common Commands

### List All Worktrees

```bash
git worktree list
```

Example output:
```
/Users/kndri/projects/troodie                        d56b1e1 [main]
/Users/kndri/projects/troodie-fix-member-post-counts eef8e1f [fix/TRO-20-fix-member-post-counts]
```

### Create a New Worktree

**From an existing branch:**
```bash
git worktree add <path> <branch>

# Example
git worktree add ../troodie-feature feature/new-feature
```

**From a remote branch:**
```bash
git fetch origin <branch>
git worktree add <path> <branch>

# Example
git fetch origin fix/TRO-20-fix-member-post-counts
git worktree add ../troodie-fix-member-post-counts fix/TRO-20-fix-member-post-counts
```

**Create a new branch and worktree together:**
```bash
git worktree add -b <new-branch> <path> <start-point>

# Example - create new branch from main
git worktree add -b feature/my-feature ../troodie-my-feature main
```

### Switch Between Worktrees

Simply change directories:

```bash
# Go to main worktree
cd /Users/kndri/projects/troodie

# Go to feature worktree
cd /Users/kndri/projects/troodie-fix-member-post-counts
```

Each directory is a fully independent working directory with its own:
- Checked out files
- Staged changes
- Working tree state

### Remove a Worktree

**When done with a worktree:**
```bash
git worktree remove <path>

# Example
git worktree remove ../troodie-fix-member-post-counts
```

**Force remove (if there are uncommitted changes):**
```bash
git worktree remove --force <path>
```

**Clean up stale worktree references:**
```bash
git worktree prune
```

## Practical Workflow

### Scenario: Review a PR while working on another feature

```bash
# You're on main working on something
cd /Users/kndri/projects/troodie

# Create worktree for the PR branch
git fetch origin fix/bug-123
git worktree add ../troodie-bug-123 fix/bug-123

# Switch to review the PR
cd ../troodie-bug-123

# Make changes, commit, push
git add .
git commit -m "Review feedback changes"
git push

# Switch back to your original work
cd ../troodie

# When done with PR, clean up
git worktree remove ../troodie-bug-123
```

### Scenario: Work on multiple features simultaneously

```bash
# Create worktrees for each feature
git worktree add -b feature/auth ../troodie-auth main
git worktree add -b feature/dashboard ../troodie-dashboard main

# Work on auth
cd ../troodie-auth
# ... make changes ...

# Quick switch to dashboard without committing
cd ../troodie-dashboard
# ... make changes ...

# Back to auth
cd ../troodie-auth
```

## Tips

1. **Naming convention**: Use descriptive paths like `<repo>-<branch-short-name>`

2. **Install dependencies**: Each worktree needs its own `node_modules`:
   ```bash
   cd ../troodie-new-worktree
   npm install
   ```

3. **IDE setup**: Open each worktree as a separate project/window in your IDE

4. **Avoid conflicts**: You cannot have the same branch checked out in multiple worktrees

5. **Disk space**: Worktrees share git objects but duplicate working files. Consider cleanup when done.

## Quick Reference

| Action | Command |
|--------|---------|
| List worktrees | `git worktree list` |
| Add from branch | `git worktree add <path> <branch>` |
| Add new branch | `git worktree add -b <branch> <path> <start>` |
| Remove worktree | `git worktree remove <path>` |
| Clean stale refs | `git worktree prune` |
| Switch worktrees | `cd <path>` |
