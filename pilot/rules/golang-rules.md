## Go Development Standards

**Standards:** Use go modules | go test for tests | gofmt + go vet + golangci-lint for quality | Self-documenting code

### Module Management

**Use Go modules for dependency management:**

```bash
# Initialize a new module
go mod init module-name

# Add dependencies (automatically via imports)
go mod tidy

# Update dependencies
go get -u ./...

# Verify dependencies
go mod verify
```

**Why modules:** Standard Go dependency management, reproducible builds, version control.

### Testing & Quality

**⚠️ CRITICAL: Always use minimal output flags to avoid context bloat.**

```bash
# Tests - USE MINIMAL OUTPUT
go test ./...                           # All tests
go test ./... -v                        # Verbose (only when debugging)
go test ./... -short                    # Skip long-running tests
go test ./... -cover                    # With coverage
go test -coverprofile=coverage.out ./...  # Coverage report

# Code quality
gofmt -w .                              # Format code
go vet ./...                            # Static analysis
golangci-lint run                       # Comprehensive linting
```

**Why minimal output?** Verbose test output consumes context tokens rapidly. Only add `-v` when debugging specific failing tests.

### Code Style Essentials

**Formatting:** `gofmt` handles all formatting. Run `gofmt -w .` before committing.

**Naming Conventions:**
- **Packages:** lowercase, single word (e.g., `http`, `json`, `user`)
- **Exported:** PascalCase (e.g., `ProcessOrder`, `UserService`)
- **Unexported:** camelCase (e.g., `processOrder`, `userService`)
- **Acronyms:** ALL CAPS (e.g., `HTTPServer`, `XMLParser`, `userID`)

**Comments:** Write self-documenting code. Comments for exported functions should start with the function name:
```go
// ProcessOrder handles order processing for the given user.
func ProcessOrder(userID string, order Order) error {
    // implementation
}
```

### Error Handling

**Always handle errors explicitly. Never ignore them.**

```go
// GOOD - handle error
result, err := doSomething()
if err != nil {
    return fmt.Errorf("failed to do something: %w", err)
}

// BAD - ignoring error
result, _ := doSomething()
```

**Error wrapping:** Use `fmt.Errorf` with `%w` for context:
```go
if err != nil {
    return fmt.Errorf("processing user %s: %w", userID, err)
}
```

### Project Structure

**Standard Go project layout:**
```
project/
├── cmd/              # Main applications
│   └── myapp/
│       └── main.go
├── internal/         # Private packages
│   └── service/
├── pkg/              # Public packages
│   └── api/
├── go.mod
└── go.sum
```

**Package organization:**
- Keep packages focused and cohesive
- Avoid circular dependencies
- Use `internal/` for private packages

### Verification Checklist

Before completing Go work:
- [ ] Code formatted: `gofmt -w .`
- [ ] Tests pass: `go test ./...`
- [ ] Static analysis clean: `go vet ./...`
- [ ] Linting clean: `golangci-lint run`
- [ ] No ignored errors
- [ ] Dependencies tidy: `go mod tidy`

### Quick Reference

| Task              | Command                    |
| ----------------- | -------------------------- |
| Init module       | `go mod init module-name`  |
| Run tests         | `go test ./...`            |
| Coverage          | `go test -cover ./...`     |
| Format            | `gofmt -w .`               |
| Static analysis   | `go vet ./...`             |
| Lint              | `golangci-lint run`        |
| Tidy deps         | `go mod tidy`              |
| Build             | `go build ./...`           |
| Run               | `go run cmd/myapp/main.go` |
