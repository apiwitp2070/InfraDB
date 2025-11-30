import { db } from "@/lib/db";
import { githubApiBaseUrl } from "@/lib/github";
import { gitLabApiBaseUrl } from "@/lib/gitlab";

const SETTINGS_KEYS = {
  gitlab: "gitlab_base_url",
  github: "github_base_url",
  cloudflareAccount: "cloudflare_account_id",
} as const;

export type ApiSettings = {
  gitlabBaseUrl: string;
  githubBaseUrl: string;
  cloudflareAccountId: string;
};

export const DEFAULT_SETTINGS: ApiSettings = {
  gitlabBaseUrl: gitLabApiBaseUrl,
  githubBaseUrl: githubApiBaseUrl,
  cloudflareAccountId: "",
};

export const getSettings = async (): Promise<ApiSettings> => {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const [gitlabRecord, githubRecord, cloudflareAccount] = await Promise.all([
      db.settings.get(SETTINGS_KEYS.gitlab),
      db.settings.get(SETTINGS_KEYS.github),
      db.settings.get(SETTINGS_KEYS.cloudflareAccount),
    ]);

    return {
      gitlabBaseUrl: gitlabRecord?.value ?? DEFAULT_SETTINGS.gitlabBaseUrl,
      githubBaseUrl: githubRecord?.value ?? DEFAULT_SETTINGS.githubBaseUrl,
      cloudflareAccountId:
        cloudflareAccount?.value ?? DEFAULT_SETTINGS.cloudflareAccountId,
    };
  } catch (error) {
    console.error("Failed to load API settings", error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: Partial<ApiSettings>) => {
  if (typeof window === "undefined") {
    return;
  }

  const tasks: Promise<unknown>[] = [];

  if (settings.gitlabBaseUrl !== undefined) {
    tasks.push(
      db.settings.put({
        key: SETTINGS_KEYS.gitlab,
        value: settings.gitlabBaseUrl,
      }),
    );
  }

  if (settings.githubBaseUrl !== undefined) {
    tasks.push(
      db.settings.put({
        key: SETTINGS_KEYS.github,
        value: settings.githubBaseUrl,
      }),
    );
  }

  if (settings.cloudflareAccountId !== undefined) {
    tasks.push(
      db.settings.put({
        key: SETTINGS_KEYS.cloudflareAccount,
        value: settings.cloudflareAccountId,
      }),
    );
  }

  try {
    await Promise.all(tasks);
  } catch (error) {
    console.error("Failed to persist API settings", error);
  }
};

export const clearSettings = async () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await db.settings.bulkDelete([
      SETTINGS_KEYS.gitlab,
      SETTINGS_KEYS.github,
      SETTINGS_KEYS.cloudflareAccount,
    ]);
  } catch (error) {
    console.error("Failed to reset API settings", error);
  }
};
