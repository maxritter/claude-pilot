"""Tests for TDD enforcer hook."""

from __future__ import annotations

import tempfile
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from tdd_enforcer import (
    _find_test_dirs,
    _search_test_dirs,
    has_go_test_file,
    has_python_test_file,
    has_typescript_test_file,
    is_test_file,
    is_trivial_edit,
    should_skip,
)


class TestShouldSkip:
    def test_skips_markdown(self):
        assert should_skip("/project/README.md") is True

    def test_skips_json(self):
        assert should_skip("/project/package.json") is True

    def test_skips_excluded_dir(self):
        assert should_skip("/project/node_modules/foo.ts") is True
        assert should_skip("/project/dist/bundle.js") is True
        assert should_skip("/project/__pycache__/mod.pyc") is True

    def test_does_not_skip_source_files(self):
        assert should_skip("/project/src/app.py") is False
        assert should_skip("/project/src/app.ts") is False
        assert should_skip("/project/main.go") is False


class TestIsTestFile:
    def test_python_test_prefix(self):
        assert is_test_file("test_foo.py") is True

    def test_python_test_suffix(self):
        assert is_test_file("foo_test.py") is True

    def test_python_impl(self):
        assert is_test_file("foo.py") is False

    def test_ts_test(self):
        assert is_test_file("Foo.test.ts") is True

    def test_ts_spec(self):
        assert is_test_file("Foo.spec.tsx") is True

    def test_ts_impl(self):
        assert is_test_file("Foo.ts") is False

    def test_go_test(self):
        assert is_test_file("foo_test.go") is True

    def test_go_impl(self):
        assert is_test_file("foo.go") is False


class TestFindTestDirs:
    def test_finds_tests_dir_in_parent(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            tests = Path(tmpdir) / "tests"
            src.mkdir()
            tests.mkdir()

            dirs = _find_test_dirs(src)
            assert tests in dirs

    def test_finds_multiple_test_dirs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src" / "lib"
            src.mkdir(parents=True)
            (Path(tmpdir) / "tests").mkdir()
            (Path(tmpdir) / "src" / "__tests__").mkdir()

            dirs = _find_test_dirs(src)
            assert len(dirs) >= 2

    def test_returns_empty_when_none(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            src.mkdir()

            dirs = _find_test_dirs(src)
            assert dirs == []


class TestSearchTestDirs:
    def test_finds_matching_test_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tests = Path(tmpdir) / "tests"
            tests.mkdir()
            (tests / "Foo.test.ts").touch()

            assert _search_test_dirs([tests], "Foo", [".test.ts"]) is True

    def test_finds_nested_test_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tests = Path(tmpdir) / "tests" / "unit"
            tests.mkdir(parents=True)
            (tests / "Foo.test.ts").touch()

            assert _search_test_dirs([Path(tmpdir) / "tests"], "Foo", [".test.ts"]) is True

    def test_returns_false_when_no_match(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tests = Path(tmpdir) / "tests"
            tests.mkdir()
            (tests / "Bar.test.ts").touch()

            assert _search_test_dirs([tests], "Foo", [".test.ts"]) is False


class TestHasPythonTestFile:
    def test_finds_sibling_test(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "utils.py"
            impl.touch()
            (Path(tmpdir) / "test_utils.py").touch()

            assert has_python_test_file(str(impl)) is True

    def test_finds_sibling_test_suffix(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "utils.py"
            impl.touch()
            (Path(tmpdir) / "utils_test.py").touch()

            assert has_python_test_file(str(impl)) is True

    def test_finds_test_in_tests_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            src.mkdir()
            impl = src / "utils.py"
            impl.touch()
            tests = Path(tmpdir) / "tests"
            tests.mkdir()
            (tests / "test_utils.py").touch()

            assert has_python_test_file(str(impl)) is True

    def test_finds_test_in_nested_tests_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            src.mkdir()
            impl = src / "utils.py"
            impl.touch()
            tests = Path(tmpdir) / "tests" / "unit"
            tests.mkdir(parents=True)
            (tests / "test_utils.py").touch()

            assert has_python_test_file(str(impl)) is True

    def test_returns_false_when_no_test(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "utils.py"
            impl.touch()

            assert has_python_test_file(str(impl)) is False


class TestHasTypescriptTestFile:
    def test_finds_sibling_test(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "Foo.ts"
            impl.touch()
            (Path(tmpdir) / "Foo.test.ts").touch()

            assert has_typescript_test_file(str(impl)) is True

    def test_finds_sibling_spec(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "Foo.ts"
            impl.touch()
            (Path(tmpdir) / "Foo.spec.ts").touch()

            assert has_typescript_test_file(str(impl)) is True

    def test_finds_tsx_test(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "App.tsx"
            impl.touch()
            (Path(tmpdir) / "App.test.tsx").touch()

            assert has_typescript_test_file(str(impl)) is True

    def test_finds_test_in_tests_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            src.mkdir()
            impl = src / "Foo.ts"
            impl.touch()
            tests = Path(tmpdir) / "tests"
            tests.mkdir()
            (tests / "Foo.test.ts").touch()

            assert has_typescript_test_file(str(impl)) is True

    def test_finds_test_in_nested_tests_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src" / "services"
            src.mkdir(parents=True)
            impl = src / "Foo.ts"
            impl.touch()
            tests = Path(tmpdir) / "tests" / "services"
            tests.mkdir(parents=True)
            (tests / "Foo.test.ts").touch()

            assert has_typescript_test_file(str(impl)) is True

    def test_finds_test_in___tests___dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            src.mkdir()
            impl = src / "Foo.ts"
            impl.touch()
            tests = src / "__tests__"
            tests.mkdir()
            (tests / "Foo.test.ts").touch()

            assert has_typescript_test_file(str(impl)) is True

    def test_returns_false_when_no_test(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "Foo.ts"
            impl.touch()

            assert has_typescript_test_file(str(impl)) is False

    def test_returns_false_for_non_ts(self):
        assert has_typescript_test_file("/project/foo.py") is False


class TestHasGoTestFile:
    def test_finds_sibling_test(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "handler.go"
            impl.touch()
            (Path(tmpdir) / "handler_test.go").touch()

            assert has_go_test_file(str(impl)) is True

    def test_finds_test_in_tests_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "pkg"
            src.mkdir()
            impl = src / "handler.go"
            impl.touch()
            tests = Path(tmpdir) / "tests"
            tests.mkdir()
            (tests / "handler_test.go").touch()

            assert has_go_test_file(str(impl)) is True

    def test_returns_false_when_no_test(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            impl = Path(tmpdir) / "handler.go"
            impl.touch()

            assert has_go_test_file(str(impl)) is False

    def test_returns_false_for_non_go(self):
        assert has_go_test_file("/project/foo.py") is False


class TestIsTrivialEdit:
    def test_import_only_edit(self):
        assert is_trivial_edit("Edit", {
            "old_string": "import os",
            "new_string": "import os\nimport sys",
        }) is True

    def test_non_edit_tool(self):
        assert is_trivial_edit("Write", {
            "old_string": "import os",
            "new_string": "import sys",
        }) is False

    def test_code_removal(self):
        assert is_trivial_edit("Edit", {
            "old_string": "a = 1\nb = 2\nc = 3",
            "new_string": "a = 1\nc = 3",
        }) is True

    def test_constant_addition(self):
        assert is_trivial_edit("Edit", {
            "old_string": "FOO = 1",
            "new_string": "FOO = 1\nBAR = 2",
        }) is True

    def test_non_trivial_edit(self):
        assert is_trivial_edit("Edit", {
            "old_string": "return x + 1",
            "new_string": "return x + 2",
        }) is False
