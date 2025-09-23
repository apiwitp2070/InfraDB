"use client";

import { useCallback, useEffect, useState } from "react";

import { gitLabApiBaseUrl } from "@/lib/gitlab";
import { githubApiBaseUrl } from "@/lib/github";

const STORAGE_KEY = "api_settings";

export type ApiSettings = {
  gitlabBaseUrl: string;
  githubBaseUrl: string;
};

const DEFAULT_SETTINGS: ApiSettings = {
  gitlabBaseUrl: gitLabApiBaseUrl,
  githubBaseUrl: githubApiBaseUrl,
};

export const useApiSettings = () => {
  const [settings, setSettings] = useState<ApiSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<ApiSettings> | null;

      if (!parsed) {
        return;
      }

      setSettings((prev) => ({
        gitlabBaseUrl: parsed.gitlabBaseUrl ?? prev.gitlabBaseUrl,
        githubBaseUrl: parsed.githubBaseUrl ?? prev.githubBaseUrl,
      }));
    } catch (error) {
      console.error("Failed to load API settings", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<ApiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isReady,
  };
};

export type UseApiSettingsReturn = ReturnType<typeof useApiSettings>;
