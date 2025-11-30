"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type ApiSettings,
  DEFAULT_SETTINGS,
  clearSettings,
  getSettings,
  saveSettings,
} from "@/services/settings-service";

export const useApiSettings = () => {
  const [settings, setSettings] = useState<ApiSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const storedSettings = await getSettings();

        if (!isMounted) {
          return;
        }

        setSettings(storedSettings);
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

      void saveSettings(partial);

      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    void clearSettings();
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isReady,
  };
};

export type UseApiSettingsReturn = ReturnType<typeof useApiSettings>;
