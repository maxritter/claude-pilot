import { useState, useCallback, useEffect } from "react";

export const MODEL_CHOICES = ["sonnet", "opus"] as const;

export type ModelChoice = (typeof MODEL_CHOICES)[number];

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  sonnet: "Sonnet 4.6",
  opus: "Opus 4.6",
};

export interface ModelSettings {
  model: string;
  extendedContext: boolean;
  commands: Record<string, string>;
  agents: Record<string, string>;
}

export const DEFAULT_SETTINGS: ModelSettings = {
  model: "opus",
  extendedContext: false,
  commands: {
    spec: "sonnet",
    "spec-plan": "opus",
    "spec-implement": "sonnet",
    "spec-verify": "opus",
    vault: "sonnet",
    sync: "sonnet",
    learn: "sonnet",
  },
  agents: {
    "plan-challenger": "sonnet",
    "plan-verifier": "sonnet",
    "spec-reviewer-compliance": "sonnet",
    "spec-reviewer-quality": "opus",
  },
};

export interface UseSettingsResult {
  settings: ModelSettings;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  saved: boolean;
  updateModel: (model: string) => void;
  updateExtendedContext: (enabled: boolean) => void;
  updateCommand: (command: string, model: string) => void;
  updateAgent: (agent: string, model: string) => void;
  save: () => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then((data: ModelSettings) => {
        setSettings(data);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load settings");
        setIsLoading(false);
      });
  }, []);

  const updateModel = useCallback((model: string) => {
    setSettings((prev) => ({ ...prev, model }));
    setIsDirty(true);
    setSaved(false);
  }, []);

  const updateExtendedContext = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, extendedContext: enabled }));
    setIsDirty(true);
    setSaved(false);
  }, []);

  const updateCommand = useCallback((command: string, model: string) => {
    setSettings((prev) => ({
      ...prev,
      commands: { ...prev.commands, [command]: model },
    }));
    setIsDirty(true);
    setSaved(false);
  }, []);

  const updateAgent = useCallback((agent: string, model: string) => {
    setSettings((prev) => ({
      ...prev,
      agents: { ...prev.agents, [agent]: model },
    }));
    setIsDirty(true);
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Save failed: ${r.status}`);
        return r.json();
      })
      .then((data: ModelSettings) => {
        setSettings(data);
        setIsDirty(false);
        setSaved(true);
      });
  }, [settings]);

  return {
    settings,
    isLoading,
    error,
    isDirty,
    saved,
    updateModel,
    updateExtendedContext,
    updateCommand,
    updateAgent,
    save,
  };
}
