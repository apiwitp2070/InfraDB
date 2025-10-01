"use client";

import { useCallback, useEffect, useState } from "react";

import { db } from "@/lib/db";
import { gitLabApiBaseUrl } from "@/lib/gitlab";
import { githubApiBaseUrl } from "@/lib/github";

const SETTINGS_KEYS = {
  gitlab: "gitlab_base_url",
  github: "github_base_url",
} as const;

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
    let isMounted = true;

    const loadSettings = async () => {
      try {
        if (typeof window === "undefined") {
          setIsReady(true);
          return;
        }

        const [gitlabRecord, githubRecord] = await Promise.all([
          db.settings.get(SETTINGS_KEYS.gitlab),
          db.settings.get(SETTINGS_KEYS.github),
        ]);

        if (!isMounted) {
          return;
        }

        setSettings((prev) => ({
          gitlabBaseUrl: gitlabRecord?.value ?? prev.gitlabBaseUrl,
          githubBaseUrl: githubRecord?.value ?? prev.githubBaseUrl,
        }));
      } catch (error) {
        console.error("Failed to load API settings", error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<ApiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };

      const persist = async () => {
        if (typeof window === "undefined") {
          return;
        }

        const tasks: Promise<unknown>[] = [];

        if (partial.gitlabBaseUrl !== undefined) {
          tasks.push(
            db.settings.put({
              key: SETTINGS_KEYS.gitlab,
              value: next.gitlabBaseUrl,
            })
          );
        }

        if (partial.githubBaseUrl !== undefined) {
          tasks.push(
            db.settings.put({
              key: SETTINGS_KEYS.github,
              value: next.githubBaseUrl,
            })
          );
        }

        try {
          await Promise.all(tasks);
        } catch (error) {
          console.error("Failed to persist API settings", error);
        }
      };

      void persist();

      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);

    const reset = async () => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        await db.settings.bulkDelete([
          SETTINGS_KEYS.gitlab,
          SETTINGS_KEYS.github,
        ]);
      } catch (error) {
        console.error("Failed to reset API settings", error);
      }
    };

    void reset();
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isReady,
  };
};

export type UseApiSettingsReturn = ReturnType<typeof useApiSettings>;
