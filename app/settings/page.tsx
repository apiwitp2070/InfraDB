"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";

import { useApiSettings } from "@/hooks/useApiSettings";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import { gitLabApiBaseUrl } from "@/lib/gitlab";
import { githubApiBaseUrl } from "@/lib/github";

export default function TokenSettingsPage() {
  const { tokens, setToken, clearTokens, isReady } = useTokenStorage();
  const { settings: apiSettings, updateSettings } = useApiSettings();
  const [gitlabToken, setGitlabToken] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [cloudflareToken, setCloudflareToken] = useState("");
  const [gitlabBaseUrl, setGitlabBaseUrl] = useState("");
  const [githubBaseUrl, setGithubBaseUrl] = useState("");
  const [cloudflareAccountId, setCloudflareAccountId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"saved" | "cleared" | null>(
    null
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    setGitlabToken(tokens.gitlab);
    setGithubToken(tokens.github);
    setCloudflareToken(tokens.cloudflare);
    setGitlabBaseUrl(apiSettings.gitlabBaseUrl);
    setGithubBaseUrl(apiSettings.githubBaseUrl);
    setCloudflareAccountId(apiSettings.cloudflareAccountId);
  }, [
    apiSettings.cloudflareAccountId,
    apiSettings.githubBaseUrl,
    apiSettings.gitlabBaseUrl,
    isReady,
    tokens.cloudflare,
    tokens.github,
    tokens.gitlab,
  ]);

  const hasChanges = useMemo(() => {
    if (!isReady) {
      return false;
    }

    return (
      tokens.gitlab !== gitlabToken.trim() ||
      tokens.github !== githubToken.trim() ||
      apiSettings.gitlabBaseUrl !== gitlabBaseUrl.trim() ||
      tokens.cloudflare !== cloudflareToken.trim() ||
      apiSettings.githubBaseUrl !== githubBaseUrl.trim() ||
      apiSettings.cloudflareAccountId !== cloudflareAccountId.trim()
    );
  }, [
    apiSettings.cloudflareAccountId,
    apiSettings.githubBaseUrl,
    apiSettings.gitlabBaseUrl,
    cloudflareAccountId,
    cloudflareToken,
    gitlabBaseUrl,
    gitlabToken,
    githubBaseUrl,
    githubToken,
    isReady,
    tokens.cloudflare,
    tokens.github,
    tokens.gitlab,
  ]);

  useEffect(() => {
    if (!feedback) {
      setFeedbackType(null);
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3000);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const handleSave = () => {
    setToken("gitlab", gitlabToken.trim());
    setToken("github", githubToken.trim());
    setToken("cloudflare", cloudflareToken.trim());
    updateSettings({
      gitlabBaseUrl: gitlabBaseUrl.trim() || gitLabApiBaseUrl,
      githubBaseUrl: githubBaseUrl.trim() || githubApiBaseUrl,
      cloudflareAccountId: cloudflareAccountId.trim(),
    });
    setFeedback("Tokens saved");
    setFeedbackType("saved");
  };

  const handleClear = () => {
    clearTokens();
    setGitlabToken("");
    setGithubToken("");
    setCloudflareToken("");
    setFeedback("Tokens cleared");
    setFeedbackType("cleared");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-1">
        <h1 className="text-xl font-semibold">Personal Access Tokens</h1>
        <p className="text-sm text-default-500">
          Tokens persist inside browser IndexedDB. Provide credentials with the
          required scopes to interact with GitLab, GitHub, and Cloudflare APIs.
        </p>
      </div>

      <Divider />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium">GitLab Token</h2>
          <p className="text-xs text-default-500">
            Needs api scope to manage variables and pipelines.
          </p>
        </div>
        <Input
          isDisabled={!isReady}
          label="GitLab Personal Access Token"
          labelPlacement="outside"
          placeholder="glpat-..."
          type="password"
          autoComplete="new-password"
          value={gitlabToken}
          onValueChange={setGitlabToken}
        />
        <Input
          isDisabled={!isReady}
          label="GitLab API Base URL"
          labelPlacement="outside"
          placeholder="https://gitlab.com/api/v4"
          type="url"
          value={gitlabBaseUrl}
          onValueChange={setGitlabBaseUrl}
        />
      </section>

      <Divider />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium">GitHub Token</h2>
          <p className="text-xs text-default-500">
            Needs repo scope to manage secrets.
          </p>
        </div>
        <Input
          isDisabled={!isReady}
          label="GitHub Personal Access Token"
          labelPlacement="outside"
          placeholder="ghp_..."
          type="password"
          autoComplete="new-password"
          value={githubToken}
          onValueChange={setGithubToken}
        />
        <Input
          isDisabled={!isReady}
          label="GitHub API Base URL"
          labelPlacement="outside"
          placeholder="https://api.github.com"
          type="url"
          value={githubBaseUrl}
          onValueChange={setGithubBaseUrl}
        />
      </section>

      <Divider />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium">Cloudflare Token</h2>
          <p className="text-xs text-default-500">
            Requires permissions to manage R2 buckets and dev domains.
          </p>
        </div>
        <Input
          isDisabled={!isReady}
          label="Cloudflare API Token"
          labelPlacement="outside"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          type="password"
          autoComplete="new-password"
          value={cloudflareToken}
          onValueChange={setCloudflareToken}
        />
        <Input
          isDisabled={!isReady}
          label="Cloudflare Account ID"
          labelPlacement="outside"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={cloudflareAccountId}
          onValueChange={setCloudflareAccountId}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {feedback ? (
            <Chip
              color={feedbackType === "cleared" ? "warning" : "success"}
              size="sm"
              variant="flat"
            >
              {feedback}
            </Chip>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            isDisabled={
              !isReady ||
              (!tokens.gitlab && !tokens.github && !tokens.cloudflare)
            }
            variant="light"
            onPress={handleClear}
          >
            Clear
          </Button>
          <Button
            color="primary"
            isDisabled={!isReady || !hasChanges}
            onPress={handleSave}
          >
            Save tokens
          </Button>
        </div>
      </div>
    </div>
  );
}
