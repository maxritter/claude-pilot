/**
 * Tests for Spec task click-to-jump navigation
 *
 * Validates:
 * - SpecContent generates task anchor IDs on h3 headings
 * - SpecHeaderCard accepts onTaskClick and wires it to task rows
 * - SpecView wires handleTaskClick and scroll-back button
 * - DashboardLayout constrains height for scrollable main
 * - renderToString verifies anchor IDs appear in rendered output
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import path from "path";
import React from "react";
import { renderToString } from "react-dom/server";

const SPEC_CONTENT_PATH = path.join(
  __dirname,
  "../../src/ui/viewer/views/Spec/SpecContent.tsx",
);
const HEADER_CARD_PATH = path.join(
  __dirname,
  "../../src/ui/viewer/views/Spec/SpecHeaderCard.tsx",
);
const INDEX_PATH = path.join(
  __dirname,
  "../../src/ui/viewer/views/Spec/index.tsx",
);
const LAYOUT_PATH = path.join(
  __dirname,
  "../../src/ui/viewer/layouts/DashboardLayout.tsx",
);

const specContentSource = readFileSync(SPEC_CONTENT_PATH, "utf-8");
const headerCardSource = readFileSync(HEADER_CARD_PATH, "utf-8");
const indexSource = readFileSync(INDEX_PATH, "utf-8");
const layoutSource = readFileSync(LAYOUT_PATH, "utf-8");

describe("SpecContent: task anchor IDs", () => {
  it("should extract task number from h3 children", () => {
    expect(specContentSource).toMatch(/Task\\s\+\(\\d\+\)/);
  });

  it("should generate id with task- prefix", () => {
    expect(specContentSource).toContain("`task-${taskMatch[1]}`");
  });

  it("should add scroll-mt class for scroll offset", () => {
    expect(specContentSource).toContain("scroll-mt-");
  });

  it("should render h3 with task anchor ID via renderToString", async () => {
    const { SpecContent } = await import(
      "../../src/ui/viewer/views/Spec/SpecContent"
    );
    const markdown = "### Task 1: Setup database\n\nSome details here.\n\n### Task 2: Add API\n\nMore details.";
    const html = renderToString(
      React.createElement(SpecContent, { content: markdown }),
    );
    expect(html).toContain('id="task-1"');
    expect(html).toContain('id="task-2"');
    expect(html).toContain("Setup database");
    expect(html).toContain("Add API");
  });

  it("should not add id to non-task h3 headings", async () => {
    const { SpecContent } = await import(
      "../../src/ui/viewer/views/Spec/SpecContent"
    );
    const markdown = "### Overview\n\nGeneral description.";
    const html = renderToString(
      React.createElement(SpecContent, { content: markdown }),
    );
    expect(html).not.toMatch(/id="task-/);
    expect(html).toContain("Overview");
  });
});

describe("SpecHeaderCard: onTaskClick prop", () => {
  it("should accept onTaskClick in props", () => {
    expect(headerCardSource).toContain("onTaskClick");
  });

  it("should declare onTaskClick as optional callback with taskNumber", () => {
    expect(headerCardSource).toMatch(
      /onTaskClick\?\s*:\s*\(taskNumber:\s*number\)\s*=>\s*void/,
    );
  });

  it("should call onTaskClick on task row click", () => {
    expect(headerCardSource).toContain("onTaskClick?.(task.number)");
  });

  it("should apply cursor-pointer to task rows", () => {
    expect(headerCardSource).toContain("cursor-pointer");
  });

  it("should apply hover styles to task rows", () => {
    expect(headerCardSource).toContain("hover:bg-success/15");
    expect(headerCardSource).toContain("hover:bg-base-200");
  });

  it("should render clickable task rows via renderToString", async () => {
    const { SpecHeaderCard } = await import(
      "../../src/ui/viewer/views/Spec/SpecHeaderCard"
    );
    const html = renderToString(
      React.createElement(SpecHeaderCard, {
        parsed: {
          title: "Test Plan",
          goal: "Test goal",
          tasks: [
            { number: 1, title: "First task", completed: true },
            { number: 2, title: "Second task", completed: false },
          ],
        },
        spec: {
          status: "PENDING" as const,
          iterations: 0,
          approved: true,
          worktree: false,
          specType: "Feature" as const,
          filePath: "/tmp/test-plan.md",
          modifiedAt: "2026-02-24T10:00:00Z",
        },
        onTaskClick: () => {},
      }),
    );
    expect(html).toContain("First task");
    expect(html).toContain("Second task");
    expect(html).toContain("cursor-pointer");
  });
});

describe("SpecView: task navigation wiring", () => {
  it("should define handleTaskClick callback", () => {
    expect(indexSource).toContain("handleTaskClick");
  });

  it("should scroll to task element by ID", () => {
    expect(indexSource).toMatch(/getElementById\(`task-\$\{taskNumber\}`\)/);
  });

  it("should use smooth scrolling", () => {
    expect(indexSource).toContain('behavior: "smooth"');
  });

  it("should pass onTaskClick to SpecHeaderCard", () => {
    expect(indexSource).toContain("onTaskClick={handleTaskClick}");
  });

  it("should track headerCardRef for scroll-back", () => {
    expect(indexSource).toContain("headerCardRef");
    expect(indexSource).toContain("ref={headerCardRef}");
  });

  it("should compare against main element top for button visibility", () => {
    expect(indexSource).toContain("mainEl.getBoundingClientRect().top");
    expect(indexSource).toContain("rect.bottom < mainTop");
  });

  it("should render scroll-back button with arrow icon", () => {
    expect(indexSource).toContain("showBackToTasks");
    expect(indexSource).toContain("scrollBackToTasks");
    expect(indexSource).toContain("lucide:arrow-up");
    expect(indexSource).toContain("Task List");
  });
});

describe("DashboardLayout: scrollable main constraint", () => {
  it("should use h-screen (not min-h-screen) to constrain viewport height", () => {
    expect(layoutSource).toContain("h-screen");
    expect(layoutSource).not.toContain("min-h-screen");
  });

  it("should add min-h-0 to flex column wrapper for flex shrinking", () => {
    expect(layoutSource).toMatch(/flex-1 flex flex-col min-w-0 min-h-0/);
  });

  it("should add min-h-0 to main for flex shrinking", () => {
    expect(layoutSource).toMatch(/overflow-y-auto min-h-0/);
  });
});
