import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  workerStatus: "online" | "offline" | "processing";
  version?: string;
  queueDepth?: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onToggleLogs?: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function DashboardLayout({
  children,
  currentPath,
  workerStatus,
  version,
  queueDepth,
  theme,
  onToggleTheme,
  onToggleLogs,
  sidebarCollapsed,
  onToggleSidebar,
}: DashboardLayoutProps) {
  const themeName = theme === "dark" ? "pilot-shell" : "pilot-shell-light";

  return (
    <div className="dashboard-layout flex h-screen" data-theme={themeName}>
      <Sidebar
        currentPath={currentPath}
        workerStatus={workerStatus}
        version={version}
        queueDepth={queueDepth}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          theme={theme}
          onToggleTheme={onToggleTheme}
          onToggleLogs={onToggleLogs}
        />
        <main className="flex-1 p-6 overflow-y-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}
