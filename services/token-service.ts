import { db } from "@/lib/db";
import type { TokenKind } from "@/types/token";

const STORAGE_KEYS: Record<TokenKind, string> = {
  github: "github",
  gitlab: "gitlab",
  cloudflare: "cloudflare",
};

export const DEFAULT_TOKENS: Record<TokenKind, string> = {
  github: "",
  gitlab: "",
  cloudflare: "",
};

export const getTokens = async (): Promise<Record<TokenKind, string>> => {
  if (typeof window === "undefined") {
    return DEFAULT_TOKENS;
  }

  try {
    const entries = await Promise.all(
      (Object.entries(STORAGE_KEYS) as [TokenKind, string][]).map(
        async ([kind, key]) => {
          const record = await db.tokens.get(key);
          return [kind, record?.value ?? ""] as const;
        },
      ),
    );

    const tokens = { ...DEFAULT_TOKENS };
    for (const [kind, value] of entries) {
      tokens[kind] = value;
    }

    return tokens;
  } catch (error) {
    console.error("Failed to load tokens from IndexedDB", error);
    return DEFAULT_TOKENS;
  }
};

export const getToken = async (kind: TokenKind): Promise<string> => {
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

export const saveToken = async (kind: TokenKind, value: string) => {
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

export const clearTokens = async () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await db.tokens.bulkDelete(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error("Failed to clear tokens", error);
  }
};
