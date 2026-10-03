"use server";

import Cloudflare from "cloudflare";

export type TestResult = {
  success: boolean;
  message: string;
};

const sanitizeToken = (raw: string | undefined): string => {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
};

export const testGitLabToken = async (
  token: string,
  baseUrl?: string
): Promise<TestResult> => {
  const cleanToken = sanitizeToken(token);
  const cleanUrl = (baseUrl?.trim() || "https://gitlab.com/api/v4")
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");

  if (!cleanToken) {
    return { success: false, message: "GitLab token is required." };
  }

  try {
    // 1. Try personal_access_tokens/self
    const patRes = await fetch(`${cleanUrl}/personal_access_tokens/self`, {
      headers: {
        "Content-Type": "application/json",
        "PRIVATE-TOKEN": cleanToken,
      },
    });

    if (patRes.ok) {
      const data = await patRes.json();
      const scopes = data.scopes?.length
        ? ` (scopes: ${data.scopes.join(", ")})`
        : "";
      return {
        success: true,
        message: `GitLab token is valid: "${data.name || "PAT"}"${scopes}${
          data.active ? " (active)" : ""
        }`,
      };
    }

    // 2. Fallback to /user (useful for project access tokens or older GitLab versions)
    const userRes = await fetch(`${cleanUrl}/user`, {
      headers: {
        "Content-Type": "application/json",
        "PRIVATE-TOKEN": cleanToken,
      },
    });

    if (userRes.ok) {
      const data = await userRes.json();
      return {
        success: true,
        message: `GitLab token is valid for user @${data.username}`,
      };
    }

    if (userRes.status === 401 || patRes.status === 401) {
      return {
        success: false,
        message: "GitLab error (401): Invalid or expired token.",
      };
    }

    if (userRes.status === 403 || patRes.status === 403) {
      return {
        success: false,
        message: "GitLab error (403): Token lacks permission or is blocked.",
      };
    }

    return {
      success: false,
      message: `GitLab request failed with status ${userRes.status}.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to connect to GitLab API.",
    };
  }
};

export const testGitHubToken = async (
  token: string,
  baseUrl?: string
): Promise<TestResult> => {
  const cleanToken = sanitizeToken(token);
  const cleanUrl = (baseUrl?.trim() || "https://api.github.com")
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");

  if (!cleanToken) {
    return { success: false, message: "GitHub token is required." };
  }

  try {
    const res = await fetch(`${cleanUrl}/user`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${cleanToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const scopes = res.headers.get("x-oauth-scopes");
      const scopeMsg = scopes ? ` (scopes: ${scopes})` : "";
      return {
        success: true,
        message: `GitHub token is valid for user @${data.login}${scopeMsg}`,
      };
    }

    if (res.status === 401) {
      return {
        success: false,
        message: "GitHub error (401): Invalid or expired token (Bad credentials).",
      };
    }

    if (res.status === 403) {
      return {
        success: false,
        message: "GitHub error (403): Rate limit exceeded or access forbidden.",
      };
    }

    const text = await res.text();
    return {
      success: false,
      message: `GitHub error (${res.status}): ${text || res.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to connect to GitHub API.",
    };
  }
};

export const testCloudflareToken = async (
  token: string,
  accountId: string
): Promise<TestResult> => {
  const cleanToken = sanitizeToken(token);
  const cleanAccountId = accountId?.trim().replace(/^["']|["']$/g, "");

  if (!cleanToken) {
    return { success: false, message: "Cloudflare token is required." };
  }

  if (!cleanAccountId) {
    return { success: false, message: "Cloudflare account ID is required." };
  }

  // Detect accidental Global API Key (37 hex characters)
  if (cleanToken.length === 37 && /^[0-9a-f]{37}$/i.test(cleanToken)) {
    return {
      success: false,
      message:
        "The value entered appears to be a Global API Key (37 hex characters). Cloudflare requires an API Token (from My Profile > API Tokens), as Global API Keys cannot be used with Bearer authentication.",
    };
  }

  // Detect if Account ID and Token were swapped
  if (
    cleanToken.length === 32 &&
    /^[0-9a-f]{32}$/i.test(cleanToken) &&
    cleanAccountId.length > 32
  ) {
    return {
      success: false,
      message:
        "The token field looks like a Cloudflare Account ID (32 hex characters) and the Account ID field looks like a token. Please verify you haven't swapped them.",
    };
  }

  const client = new Cloudflare({ apiToken: cleanToken });

  // 1. Try User API Token verification (/user/tokens/verify)
  try {
    const verifyRes = await client.user.tokens.verify();
    if (verifyRes.status === "active") {
      return {
        success: true,
        message: "Cloudflare token is valid and active (User API Token).",
      };
    }
  } catch (err) {
    if (err instanceof Cloudflare.APIError && err.status === 400 && /authorization/i.test(err.message)) {
      return {
        success: false,
        message:
          "Cloudflare rejected the Authorization header (400). Ensure you are using an API Token (from My Profile > API Tokens), not a Global API Key or S3 Access Key, and without leading 'Bearer '.",
      };
    }
    // If not a format error, continue to account-level and resource-level checks
  }

  // 2. Try Account-Owned API Token verification (/accounts/{account_id}/tokens/verify)
  try {
    const accountVerifyRes = await client.accounts.tokens.verify({
      account_id: cleanAccountId,
    });
    if (accountVerifyRes.status === "active") {
      return {
        success: true,
        message: "Cloudflare token is valid and active (Account API Token).",
      };
    }
  } catch {
    // Continue to resource checks
  }

  // 3. Try checking DNS/Zone access directly
  try {
    await client.zones.list({
      account: { id: cleanAccountId },
      per_page: 1,
    });
    return {
      success: true,
      message: "Cloudflare token is valid (verified DNS & Zone access).",
    };
  } catch {
    // Continue to R2 check
  }

  // 4. Try checking R2 Storage access directly
  try {
    await client.r2.buckets.list({
      account_id: cleanAccountId,
      per_page: 1,
    });
    return {
      success: true,
      message: "Cloudflare token is valid (verified R2 Storage access).",
    };
  } catch {
    // Continue to final error reporting
  }

  // If all attempts failed, call user.tokens.verify once more to extract the exact error
  try {
    await client.user.tokens.verify();
    return {
      success: true,
      message: "Cloudflare token is valid.",
    };
  } catch (error) {
    if (error instanceof Cloudflare.APIError) {
      if (error.status === 401) {
        return {
          success: false,
          message:
            "Cloudflare returned 401 Unauthorized. If this token works in production, check if 'Client IP Address Filtering' is enabled on this token in Cloudflare (restricting access to your production server's IP).",
        };
      }
      return {
        success: false,
        message: `Cloudflare error (${error.status}): ${error.message}`,
      };
    }
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to verify Cloudflare token.",
    };
  }
};
