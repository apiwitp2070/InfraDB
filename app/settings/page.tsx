"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";

import InputPassword from "@/components/input-password";
import { useApiSettings } from "@/hooks/useApiSettings";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import { gitLabApiBaseUrl } from "@/lib/gitlab";
import { githubApiBaseUrl } from "@/lib/github";
import { parseEnvInput } from "@/utils/variable";

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
  const [feedbackType, setFeedbackType] = useState<
    "saved" | "cleared" | "imported" | "error" | null
  >(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<
    "import" | "export" | null
  >(null);
  const [importText, setImportText] = useState("");

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

  const handleOpenImportExport = (mode: "import" | "export") => {
    setImportExportMode(mode);
    setIsImportExportOpen(true);
  };

  const handleCloseImportExport = () => {
    setIsImportExportOpen(false);
    setImportExportMode(null);
    setImportText("");
  };

  const handleImportExportOpenChange = (open: boolean) => {
    setIsImportExportOpen(open);
    if (!open) {
      setImportExportMode(null);
      setImportText("");
    }
  };

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

  const exportText = useMemo(() => {
    const entries = [
      ["gitlab", gitlabToken.trim()],
      ["github", githubToken.trim()],
      ["cloudflare", cloudflareToken.trim()],
      ["gitlab_base_url", gitlabBaseUrl.trim() || gitLabApiBaseUrl],
      ["github_base_url", githubBaseUrl.trim() || githubApiBaseUrl],
      ["cloudflare_account_id", cloudflareAccountId.trim()],
    ];

    return entries.map(([key, value]) => `${key}=${value ?? ""}`).join("\n");
  }, [
    cloudflareAccountId,
    cloudflareToken,
    gitlabBaseUrl,
    gitlabToken,
    githubBaseUrl,
    githubToken,
  ]);

  const handleImport = () => {
    if (!isReady) {
      setFeedback("Settings not loaded yet. Please wait and try again.");
      setFeedbackType("error");
      return;
    }

    const parsed = parseEnvInput(importText);

    if (!parsed.length) {
      setFeedback("No settings found in the provided input.");
      setFeedbackType("error");
      return;
    }

    let updatedTokens = 0;
    let updatedSettings = 0;
    const nextSettings: Partial<typeof apiSettings> = {};

    parsed.forEach(({ key, value }) => {
      const normalizedKey = key.trim().toLowerCase();
      const trimmedValue = value.trim();

      switch (normalizedKey) {
        case "gitlab":
          setGitlabToken(trimmedValue);
          setToken("gitlab", trimmedValue);
          updatedTokens += 1;
          break;
        case "github":
          setGithubToken(trimmedValue);
          setToken("github", trimmedValue);
          updatedTokens += 1;
          break;
        case "cloudflare":
          setCloudflareToken(trimmedValue);
          setToken("cloudflare", trimmedValue);
          updatedTokens += 1;
          break;
        case "gitlab_base_url": {
          const nextValue = trimmedValue || gitLabApiBaseUrl;
          nextSettings.gitlabBaseUrl = nextValue;
          setGitlabBaseUrl(nextValue);
          updatedSettings += 1;
          break;
        }
        case "github_base_url": {
          const nextValue = trimmedValue || githubApiBaseUrl;
          nextSettings.githubBaseUrl = nextValue;
          setGithubBaseUrl(nextValue);
          updatedSettings += 1;
          break;
        }
        case "cloudflare_account_id":
          nextSettings.cloudflareAccountId = trimmedValue;
          setCloudflareAccountId(trimmedValue);
          updatedSettings += 1;
          break;
        default:
          break;
      }
    });

    if (Object.keys(nextSettings).length) {
      updateSettings(nextSettings);
    }

    if (updatedTokens === 0 && updatedSettings === 0) {
      setFeedback("No recognized keys found. Nothing was imported.");
      setFeedbackType("error");
      return;
    }

    setFeedback("Settings imported successfully.");
    setFeedbackType("imported");
    handleCloseImportExport();
  };

  const feedbackColor =
    feedbackType === "cleared"
      ? "warning"
      : feedbackType === "error"
        ? "danger"
        : "success";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-xl font-semibold">Personal Access Tokens</h1>
          <p className="text-sm text-default-500">
            Tokens persist inside browser IndexedDB. Provide credentials with
            the required scopes to interact with GitLab, GitHub, and Cloudflare
            APIs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            isDisabled={!isReady}
            variant="flat"
            onPress={() => handleOpenImportExport("import")}
          >
            Import data
          </Button>
          <Button
            isDisabled={!isReady}
            variant="flat"
            onPress={() => handleOpenImportExport("export")}
          >
            Export data
          </Button>
        </div>
      </div>

      <Divider />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium">GitLab Token</h2>
          <p className="text-xs text-default-500">
            Needs api scope to manage variables and pipelines.
          </p>
        </div>
        <InputPassword
          isDisabled={!isReady}
          label="GitLab Personal Access Token"
          labelPlacement="outside"
          placeholder="glpat-..."
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
        <InputPassword
          isDisabled={!isReady}
          label="GitHub Personal Access Token"
          labelPlacement="outside"
          placeholder="ghp_..."
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
        <InputPassword
          isDisabled={!isReady}
          label="Cloudflare API Token"
          labelPlacement="outside"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
            <Chip color={feedbackColor} size="sm" variant="flat">
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

      <Modal
        classNames={{
          backdrop: "z-[150]",
          wrapper: "z-[150]",
        }}
        isOpen={isImportExportOpen}
        onOpenChange={handleImportExportOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {importExportMode === "import"
                  ? "Import settings"
                  : "Export settings"}
              </ModalHeader>
              <ModalBody>
                {importExportMode === "import" ? (
                  <>
                    <p className="text-sm text-default-500">
                      Paste keys using KEY=VALUE format. Recognized keys:
                      gitlab, github, cloudflare, gitlab_base_url,
                      github_base_url, cloudflare_account_id.
                    </p>
                    <textarea
                      className="min-h-[200px] rounded-medium border border-default-200 bg-content1 px-3 py-2 font-mono text-sm outline-none focus-visible:border-primary"
                      placeholder={`gitlab=glpat-...\ngithub=ghp_...\ncloudflare=token\ngitlab_base_url=https://gitlab.com/api/v4\ngithub_base_url=https://api.github.com\ncloudflare_account_id=...`}
                      value={importText}
                      onChange={(event) => setImportText(event.target.value)}
                    />
                  </>
                ) : (
                  <textarea
                    readOnly
                    className="min-h-[200px] rounded-medium border border-default-200 bg-content1 px-3 py-2 font-mono text-sm outline-none focus-visible:border-primary"
                    value={exportText}
                  />
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={() => handleCloseImportExport()}
                >
                  Close
                </Button>
                {importExportMode === "import" ? (
                  <Button color="primary" onPress={handleImport}>
                    Import
                  </Button>
                ) : (
                  <Button color="primary" onPress={() => onClose()}>
                    Done
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
