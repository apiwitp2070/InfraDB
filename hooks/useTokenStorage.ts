"use client";

import type { TokenKind } from "@/types/token";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_TOKENS,
  clearTokens,
  getToken,
  getTokens,
  saveToken,
} from "@/services/token-service";

export const useTokenStorage = () => {
  const [tokens, setTokens] = useState<Record<TokenKind, string>>({
    ...DEFAULT_TOKENS,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTokens = async () => {
      try {
        const storedTokens = await getTokens();

        if (!isMounted) {
          return;
        }

        setTokens(storedTokens);
      } catch (error) {
        console.error("Failed to load tokens", error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    void loadTokens();

    return () => {
      isMounted = false;
    };
  }, []);

  const setToken = useCallback((kind: TokenKind, value: string) => {
    setTokens((prev) => ({ ...prev, [kind]: value }));
    void saveToken(kind, value);
  }, []);

  const handleClearTokens = useCallback(() => {
    setTokens({ ...DEFAULT_TOKENS });
    void clearTokens();
  }, []);

  const hasTokens = useMemo(
    () => Boolean(tokens.github || tokens.gitlab || tokens.cloudflare),
    [tokens.cloudflare, tokens.github, tokens.gitlab],
  );

  return {
    tokens,
    setToken,
    clearTokens: handleClearTokens,
    isReady,
    hasTokens,
  };
};

export const getTokenFromStorage = async (kind: TokenKind) => {
  return getToken(kind);
};
