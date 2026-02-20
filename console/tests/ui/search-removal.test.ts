/**
 * Search View Removal Tests
 *
 * Tests that the Search view is properly removed,
 * and navigation references are cleaned up.
 * Note: VexorStatus dashboard widget is intentionally kept.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";

describe("Search view removal", () => {
  it("views index.ts does not export SearchView", () => {
    const source = readFileSync("src/ui/viewer/views/index.ts", "utf-8");
    expect(source).not.toContain("SearchView");
    expect(source).not.toContain("./Search");
  });

  it("App.tsx does not import SearchView", () => {
    const source = readFileSync("src/ui/viewer/App.tsx", "utf-8");
    expect(source).not.toContain("SearchView");
  });

  it("App routes do not include /search route", () => {
    const source = readFileSync("src/ui/viewer/App.tsx", "utf-8");
    expect(source).not.toContain("'/search'");
    expect(source).not.toContain("path: '/search'");
  });

  it("sidebar navigation does not include Search item", () => {
    const source = readFileSync(
      "src/ui/viewer/layouts/Sidebar/SidebarNav.tsx",
      "utf-8"
    );
    expect(source).not.toContain("'Search'");
    expect(source).not.toContain("'#/search'");
  });

  it("command palette does not include 'Go to Search' command", () => {
    const source = readFileSync(
      "src/ui/viewer/components/CommandPalette.tsx",
      "utf-8"
    );
    expect(source).not.toContain("Go to Search");
    expect(source).not.toContain("nav-search");
    expect(source).not.toContain("/search");
  });

  it("keyboard shortcuts do not include 'g r' for Search", () => {
    const source = readFileSync(
      "src/ui/viewer/constants/shortcuts.ts",
      "utf-8"
    );
    expect(source).not.toContain("Go to Search");
    expect(source).not.toContain("navigate:/search");
    expect(source).not.toContain('"g r"');
  });

  it("Dashboard renders 4 workspace cards including VexorStatus", () => {
    const source = readFileSync(
      "src/ui/viewer/views/Dashboard/index.tsx",
      "utf-8"
    );
    expect(source).toContain("<VexorStatus");
    expect(source).toContain("<WorkerStatus");
    expect(source).toContain("<PlanStatus");
    expect(source).toContain("<VaultStatus");
  });
});
