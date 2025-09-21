"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type TokenKind = "github" | "gitlab";

const STORAGE_KEYS: Record<TokenKind, string> = {
  github: "github_token",
  gitlab: "gitlab_token",
};

export const useTokenStorage = () => {
  const [tokens, setTokens] = useState<Record<TokenKind, string>>({
    github: "",
    gitlab: "",
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setTokens({
      github: localStorage.getItem(STORAGE_KEYS.github) ?? "",
      gitlab: localStorage.getItem(STORAGE_KEYS.gitlab) ?? "",
    });
    setIsReady(true);
  }, []);

  const setToken = useCallback((kind: TokenKind, value: string) => {
    setTokens((prev) => ({ ...prev, [kind]: value }));

    if (typeof window === "undefined") {
      return;
    }

    if (value) {
      localStorage.setItem(STORAGE_KEYS[kind], value);
    } else {
      localStorage.removeItem(STORAGE_KEYS[kind]);
    }
  }, []);

  const clearTokens = useCallback(() => {
    setTokens({ github: "", gitlab: "" });

    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(STORAGE_KEYS.github);
    localStorage.removeItem(STORAGE_KEYS.gitlab);
  }, []);

  const hasTokens = useMemo(
    () => Boolean(tokens.github || tokens.gitlab),
    [tokens.github, tokens.gitlab]
  );

  return { tokens, setToken, clearTokens, isReady, hasTokens };
};

export const getTokenFromStorage = (kind: TokenKind) => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(STORAGE_KEYS[kind]) ?? "";
};
