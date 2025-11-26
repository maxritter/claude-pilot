## Git Operations - Read-Only Mode

**Rule:** You may READ git state but NEVER WRITE to git. User controls all version control decisions.

### What You Can Do

Execute these commands freely to understand repository state:

```bash
git status              # Check working tree
git status --short      # Compact status
git diff                # Unstaged changes
git diff --staged       # Staged changes
git diff HEAD~1         # Compare with previous commit
git log                 # Commit history
git log --oneline -10   # Recent commits
git show <commit>       # Commit details
git branch              # Local branches
git branch -a           # All branches
git branch -r           # Remote branches
```

Use these to:
- Understand what files changed
- Check current branch
- Review recent commits
- Identify merge conflicts
- Verify repository state before suggesting actions

### What You Cannot Do

**NEVER execute these commands under any circumstances:**

```bash
git add                 # Staging
git commit              # Committing
git push                # Pushing
git pull                # Pulling
git fetch               # Fetching
git merge               # Merging
git rebase              # Rebasing
git checkout            # Switching branches/files
git switch              # Switching branches
git restore             # Restoring files
git reset               # Resetting
git revert              # Reverting
git stash               # Stashing
git cherry-pick         # Cherry-picking
git tag                 # Tagging
git remote add/remove   # Remote management
git submodule           # Submodule operations
```

### When User Asks for Git Operations

If user requests git write operations:

1. **Acknowledge** the request
2. **Provide exact command** they should run
3. **Explain what it does** if complex
4. **Do not execute** the command yourself

Example response:
```
I can't execute git commits, but here's what you should run:

git add .
git commit -m "feat: add user authentication"

This stages all changes and creates a commit with a conventional commit message.
```

### Suggesting Commit Messages

You can suggest commit messages following conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

Format: `<type>: <description>`

Example: `feat: add password reset functionality`

### Checking Work Before Completion

Always check git status before marking work complete:

```bash
git status              # Verify expected files changed
git diff                # Review actual changes
```

This helps you:
- Confirm changes were applied correctly
- Identify unintended modifications
- Verify no files were accidentally created/deleted

### Exception: Explicit User Override

If user explicitly says "checkout branch X" or "switch to branch Y", you may execute `git checkout` or `git switch` as directly requested. This is the only write operation exception.
