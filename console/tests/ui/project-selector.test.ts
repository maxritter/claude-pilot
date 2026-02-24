/**
 * Project Selector Tests
 *
 * Tests for the project selector dropdown in the Sidebar
 * and that the Topbar no longer contains a selector.
 */

import { describe, it, expect } from "bun:test";
import { renderToString } from "react-dom/server";
import React from "react";

describe("Project Selector in Sidebar", () => {
  it("renders a select element with All Projects option", async () => {
    const { SidebarProjectSelector } = await import(
      "../../src/ui/viewer/layouts/Sidebar/SidebarProjectSelector.js"
    );
    const { ProjectProvider } = await import(
      "../../src/ui/viewer/context/ProjectContext.js"
    );

    const html = renderToString(
      React.createElement(
        ProjectProvider,
        null,
        React.createElement(SidebarProjectSelector, { collapsed: false })
      )
    );

    expect(html).toContain("<select");
    expect(html).toContain("All Projects");
  });

  it("renders a Project label when expanded", async () => {
    const { SidebarProjectSelector } = await import(
      "../../src/ui/viewer/layouts/Sidebar/SidebarProjectSelector.js"
    );
    const { ProjectProvider } = await import(
      "../../src/ui/viewer/context/ProjectContext.js"
    );

    const html = renderToString(
      React.createElement(
        ProjectProvider,
        null,
        React.createElement(SidebarProjectSelector, { collapsed: false })
      )
    );

    expect(html).toContain("Project");
  });

  it("renders collapsed state with icon instead of dropdown", async () => {
    const { SidebarProjectSelector } = await import(
      "../../src/ui/viewer/layouts/Sidebar/SidebarProjectSelector.js"
    );
    const { ProjectProvider } = await import(
      "../../src/ui/viewer/context/ProjectContext.js"
    );

    const html = renderToString(
      React.createElement(
        ProjectProvider,
        null,
        React.createElement(SidebarProjectSelector, { collapsed: true })
      )
    );

    expect(html).not.toContain("<select");
    expect(html).toContain("button");
  });
});

describe("Topbar no longer contains project selector", () => {
  it("does not render a select element", async () => {
    const { Topbar } = await import(
      "../../src/ui/viewer/layouts/Topbar/index.js"
    );

    const html = renderToString(
      React.createElement(Topbar, {
        theme: "dark" as const,
        onToggleTheme: () => {},
      })
    );

    expect(html).not.toContain("<select");
    expect(html).toContain("Pilot Shell");
    expect(html).toContain("Max Ritter");
  });
});
