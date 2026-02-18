"""Consolidated file checker — dispatches by file extension to language-specific checkers."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _checkers.go import check_go
from _checkers.python import check_python
from _checkers.typescript import TS_EXTENSIONS, check_typescript
from _util import find_git_root, get_edited_file_from_stdin


def main() -> int:
    """Main entry point — dispatch by file extension."""
    git_root = find_git_root()
    if git_root:
        os.chdir(git_root)

    target_file = get_edited_file_from_stdin()
    if not target_file or not target_file.exists():
        return 0

    if target_file.suffix == ".py":
        _, reason = check_python(target_file)
    elif target_file.suffix in TS_EXTENSIONS:
        _, reason = check_typescript(target_file)
    elif target_file.suffix == ".go":
        _, reason = check_go(target_file)
    else:
        return 0

    if reason:
        print(json.dumps({"decision": "block", "reason": reason}))

    return 0


if __name__ == "__main__":
    sys.exit(main())
