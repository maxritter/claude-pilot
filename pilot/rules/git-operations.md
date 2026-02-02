## Git Operations - Read-Only by Default

**Rule:** You may READ git state freely, but NEVER execute git WRITE COMMANDS without EXPLICIT user permission.

### Clarification: File Modifications Are Always Allowed

**This rule is about git commands, NOT file operations.**

- ✅ **Always allowed:** Creating, editing, deleting files in the working tree
- ✅ **Always allowed:** Making code changes, writing tests, modifying configs
- ❌ **Needs permission:** Git commands that modify repository state (commit, push, etc.)

Editing files is normal development work. The rule only restricts git commands that persist changes to the repository.

### ⛔ CRITICAL: User Approval Required for Git Commands

**NEVER execute these git commands without the user explicitly saying "commit", "push", etc.:**
- `git add` / `git commit` / `git commit --amend`
- `git push` / `git push --force`
- `git pull` / `git fetch` / `git merge` / `git rebase`
- `git reset` / `git revert` / `git stash`

**"Fix this bug" does NOT mean "commit it". Wait for explicit git instructions.**

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

### Write Operations - Only With Explicit Permission

These commands require the user to explicitly say "commit", "push", etc.:

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

### When User Gives Explicit Permission

When user explicitly says "commit", "push", "commit and push", etc.:
1. **Execute the command** - don't ask for confirmation again
2. **Use appropriate commit message format** (see custom/git-commits.md)

### When User Hasn't Mentioned Git

If user asks you to fix/change code but doesn't mention committing:
1. **Make the code changes**
2. **Run tests to verify**
3. **STOP and report completion**
4. **Wait for user to say "commit" or "push"**

**Do NOT assume the user wants you to commit.**

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
