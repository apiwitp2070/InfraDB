"use client";

import type { TokenKind } from "@/types/token";

import { useCallback, useEffect, useMemo, useState } from "react";

import { db } from "@/lib/db";

const STORAGE_KEYS: Record<TokenKind, string> = {
  github: "github",
  gitlab: "gitlab",
  cloudflare: "cloudflare",
};

const DEFAULT_TOKENS: Record<TokenKind, string> = {
  github: "",
  gitlab: "",
  cloudflare: "",
};

export const useTokenStorage = () => {
  const [tokens, setTokens] = useState<Record<TokenKind, string>>({
    ...DEFAULT_TOKENS,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTokens = async () => {
      try {
        if (typeof window === "undefined") {
          setIsReady(true);
          return;
        }

        const entries = await Promise.all(
          (Object.entries(STORAGE_KEYS) as [TokenKind, string][]).map(
            async ([kind, key]) => {
              const record = await db.tokens.get(key);
              return [kind, record?.value ?? ""] as const;
            }
          )
        );

        if (!isMounted) {
          return;
        }

        setTokens((prev) => {
          const next = { ...prev };

          for (const [kind, value] of entries) {
            next[kind] = value;
          }

          return next;
        });
      } catch (error) {
        console.error("Failed to load tokens from IndexedDB", error);
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

    const persist = async () => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        if (value) {
          await db.tokens.put({ key: STORAGE_KEYS[kind], value });
        } else {
          await db.tokens.delete(STORAGE_KEYS[kind]);
        }
      } catch (error) {
        console.error("Failed to persist token", error);
      }
    };

    void persist();
  }, []);

  const clearTokens = useCallback(() => {
    setTokens({ ...DEFAULT_TOKENS });

    const clear = async () => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        await db.tokens.bulkDelete(Object.values(STORAGE_KEYS));
      } catch (error) {
        console.error("Failed to clear tokens", error);
      }
    };

    void clear();
  }, []);

  const hasTokens = useMemo(
    () =>
      Boolean(tokens.github || tokens.gitlab || tokens.cloudflare),
    [tokens.cloudflare, tokens.github, tokens.gitlab]
  );

  return { tokens, setToken, clearTokens, isReady, hasTokens };
};

export const getTokenFromStorage = async (kind: TokenKind) => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const record = await db.tokens.get(STORAGE_KEYS[kind]);
    return record?.value ?? "";
  } catch (error) {
    console.error("Failed to read token from IndexedDB", error);
    return "";
  }
};
