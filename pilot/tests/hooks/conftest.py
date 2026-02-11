"""Configure sys.path so _checkers and _util are importable in tests."""

import sys
from pathlib import Path

_hooks_dir = str(Path(__file__).resolve().parents[2] / "hooks")
if _hooks_dir not in sys.path:
    sys.path.insert(0, _hooks_dir)
