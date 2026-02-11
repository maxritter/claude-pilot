#!/usr/bin/env python3
"""Tests for TDD enforcer hook."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pilot.hooks.tdd_enforcer import (
    has_typescript_test_file,
    is_test_file,
    is_trivial_edit,
    should_skip,
)


class TestIsTestFile:
    """Test is_test_file() detection."""

    def test_python_test_prefix(self):
        assert is_test_file("test_handler.py") is True

    def test_python_test_suffix(self):
        assert is_test_file("handler_test.py") is True

    def test_typescript_test_suffix(self):
        assert is_test_file("handler.test.ts") is True

    def test_typescript_spec_suffix(self):
        assert is_test_file("handler.spec.ts") is True

    def test_go_test_suffix(self):
        assert is_test_file("handler_test.go") is True

    def test_python_impl_file(self):
        assert is_test_file("handler.py") is False

    def test_go_impl_file(self):
        assert is_test_file("handler.go") is False


class TestGoSupport:
    """Test Go-specific TDD enforcement."""

    def test_go_test_file_recognized(self):
        """Go test files should be recognized and skipped."""
        assert is_test_file("handler_test.go") is True
        assert is_test_file("service_test.go") is True

    def test_go_impl_file_not_test(self):
        """Go implementation files should not be marked as test files."""
        assert is_test_file("handler.go") is False
        assert is_test_file("service.go") is False

    def test_has_go_test_file_exists(self, tmp_path):
        """Should detect when corresponding _test.go file exists."""
        impl_file = tmp_path / "handler.go"
        test_file = tmp_path / "handler_test.go"

        impl_file.write_text("package main\n")
        test_file.write_text("package main\n")

        from pilot.hooks.tdd_enforcer import has_go_test_file

        assert has_go_test_file(str(impl_file)) is True

    def test_has_go_test_file_missing(self, tmp_path):
        """Should detect when no _test.go file exists."""
        impl_file = tmp_path / "handler.go"
        impl_file.write_text("package main\n")

        from pilot.hooks.tdd_enforcer import has_go_test_file

        assert has_go_test_file(str(impl_file)) is False


class TestShouldSkip:
    """Test should_skip() exclusion logic."""

    def test_skip_markdown(self):
        assert should_skip("README.md") is True

    def test_skip_json(self):
        assert should_skip("config.json") is True

    def test_skip_migrations(self):
        assert should_skip("src/migrations/001_init.py") is True

    def test_dont_skip_python(self):
        assert should_skip("handler.py") is False

    def test_dont_skip_go(self):
        assert should_skip("handler.go") is False


class TestTrivialEdit:
    """Test is_trivial_edit() detection."""

    def test_import_only_edit(self):
        tool_input = {
            "old_string": "import os",
            "new_string": "import os\nimport sys",
        }
        assert is_trivial_edit("Edit", tool_input) is True

    def test_logic_change_not_trivial(self):
        tool_input = {
            "old_string": "return x + 1",
            "new_string": "return x + 2",
        }
        assert is_trivial_edit("Edit", tool_input) is False

    def test_write_not_trivial(self):
        tool_input = {"file_path": "test.py", "content": "def foo(): pass"}
        assert is_trivial_edit("Write", tool_input) is False


class TestTypescriptTestFile:
    """Test has_typescript_test_file() detection."""

    def test_finds_test_ts(self, tmp_path):
        impl_file = tmp_path / "handler.ts"
        test_file = tmp_path / "handler.test.ts"

        impl_file.write_text("export function handler() {}")
        test_file.write_text("test('handler', () => {})")

        assert has_typescript_test_file(str(impl_file)) is True

    def test_no_test_file(self, tmp_path):
        impl_file = tmp_path / "handler.ts"
        impl_file.write_text("export function handler() {}")

        assert has_typescript_test_file(str(impl_file)) is False
