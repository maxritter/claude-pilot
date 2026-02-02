## GitHub CLI (gh)

**Use `gh` for all GitHub operations instead of API calls or web scraping.**

### When to Use

| Need | Command |
|------|---------|
| View PR details | `gh pr view 123` |
| Create PR | `gh pr create` |
| View issue | `gh issue view 456` |
| Create issue | `gh issue create` |
| Check CI status | `gh pr checks 123` or `gh run list` |
| Any GitHub API | `gh api <endpoint>` |

### Common Commands

```bash
# Pull Requests
gh pr view 123                              # View PR details
gh pr view 123 --json title,body,files      # Get JSON output
gh pr create --title "..." --body "..."     # Create PR
gh pr diff 123                              # View PR diff
gh pr checks 123                            # View CI status
gh pr list                                  # List open PRs
gh pr merge 123                             # Merge PR

# Issues
gh issue view 456                           # View issue
gh issue create --title "..." --body "..."  # Create issue
gh issue list                               # List open issues
gh issue close 456                          # Close issue

# Actions/Runs
gh run list                                 # List workflow runs
gh run view 789                             # View run details
gh run watch 789                            # Watch run in progress

# API (for anything not covered by commands)
gh api repos/{owner}/{repo}/pulls/123/comments
gh api repos/{owner}/{repo}/issues/456 --jq '.title'
gh api /user --jq '.login'

# Repository
gh repo view                                # View current repo
gh repo clone owner/repo                    # Clone repo
```

### JSON Output

Use `--json` flag for structured data:

```bash
# Get specific fields
gh pr view 123 --json title,body,state,files

# Parse with jq
gh pr view 123 --json files --jq '.files[].path'

# List PRs as JSON
gh pr list --json number,title,author
```

### Why gh Over Alternatives?

| Alternative | Problem | gh Advantage |
|-------------|---------|--------------|
| WebFetch on GitHub | May hit rate limits, requires parsing | Authenticated, structured data |
| GitHub API directly | Need to handle auth, pagination | Built-in auth and pagination |
| Web scraping | Fragile, may break | Official CLI, stable API |

**Key benefits:**
- Automatically authenticated (uses your GitHub token)
- Handles pagination for large result sets
- Returns structured data with `--json` flag
- Works with private repos you have access to

### Authentication

gh uses credentials from `gh auth login`. Check status:

```bash
gh auth status                              # Check auth status
gh auth login                               # Login interactively
```

### Tips

- Use `--json` + `--jq` for precise data extraction
- Use `gh api` for any endpoint not covered by commands
- Pipe to `jq` for complex JSON processing
- Check `gh <command> --help` for all options
