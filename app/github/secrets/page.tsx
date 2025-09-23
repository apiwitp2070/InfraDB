"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";

import AlertMessage from "@/components/alert-message";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import {
  githubApiBaseUrl,
  parseRepositoryInput,
  upsertGitHubSecret,
} from "@/lib/github";
import { useAlertMessage } from "@/hooks/useAlertMessage";
import { parseEnvInput } from "@/utils/variable";
import VariableTable from "@/components/variable-table";
import { VariableStatus } from "@/types/variable";

export default function GitHubSecretsPage() {
  const { tokens, isReady } = useTokenStorage();
  const alert = useAlertMessage();

  const [repositoryInput, setRepositoryInput] = useState("");
  const [envText, setEnvText] = useState("");
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [baseUrl, setBaseUrl] = useState(githubApiBaseUrl);
  const [statuses, setStatuses] = useState<Record<string, VariableStatus>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const envEntries = useMemo(() => parseEnvInput(envText), [envText]);

  useEffect(() => {
    const nextStatuses: Record<string, VariableStatus> = {};

    envEntries.forEach(({ key, value }) => {
      const shouldSkip = skipEmpty && !value.length;
      nextStatuses[key] = shouldSkip ? "skipped" : "pending";
    });

    setStatuses(nextStatuses);
  }, [envEntries, skipEmpty]);

  const handleSync = async () => {
    const repoRef = parseRepositoryInput(repositoryInput.trim());

    if (!repoRef) {
      alert.setMessage({
        type: "error",
        text: "Repository must be in the format owner/repo.",
      });
      return;
    }

    if (!tokens.github) {
      alert.setMessage({
        type: "error",
        text: "GitHub token missing. Save it on the Tokens page first.",
      });
      return;
    }

    if (envEntries.length === 0) {
      alert.setMessage({
        type: "error",
        text: "Provide at least one secret in KEY=VALUE format.",
      });
      return;
    }

    setIsSyncing(true);
    alert.clearMessage();

    const resolvedBaseUrl = baseUrl.trim() || githubApiBaseUrl;

    let hasErrors = false;

    for (const { key, value } of envEntries) {
      if (skipEmpty && !value.length) {
        setStatuses((prev) => ({ ...prev, [key]: "skipped" }));
        continue;
      }

      setStatuses((prev) => ({ ...prev, [key]: "in-progress" }));

      try {
        await upsertGitHubSecret({
          owner: repoRef.owner,
          repo: repoRef.repo,
          name: key,
          value,
          token: tokens.github,
          baseUrl: resolvedBaseUrl,
        });

        setStatuses((prev) => ({ ...prev, [key]: "success" }));
      } catch (error) {
        hasErrors = true;
        const message = error instanceof Error ? error.message : String(error);
        setStatuses((prev) => ({ ...prev, [key]: "error" }));
        alert.setMessage({
          type: "error",
          text: `Failed for ${key}: ${message}`,
        });
      }
    }

    if (!hasErrors) {
      alert.setMessage({
        type: "success",
        text: "Secrets synced successfully.",
      });
    }

    setIsSyncing(false);
  };

  const canSync =
    Boolean(repositoryInput.trim()) &&
    envEntries.length > 0 &&
    Boolean(tokens.github);

  return (
    <div className="flex flex-col gap-6">
      <Card shadow="none">
        <CardHeader className="flex flex-col items-start gap-1">
          <h1 className="text-xl font-semibold">GitHub Secrets</h1>
          <p className="text-sm text-default-500">
            Paste variables in KEY=VALUE format. Comments (#) and blank lines
            are ignored.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <AlertMessage message={alert.message} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              isRequired
              label="Repository"
              labelPlacement="outside"
              placeholder="owner/repo"
              value={repositoryInput}
              onValueChange={setRepositoryInput}
            />
            <Input
              label="GitHub API Base URL"
              labelPlacement="outside"
              value={baseUrl}
              onValueChange={setBaseUrl}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Repository Secrets</span>
              <textarea
                className="min-h-[200px] rounded-medium border border-default-200 bg-content1 px-3 py-2 font-mono text-sm outline-none focus-visible:border-primary"
                placeholder={`API_URL=https://example.com\nAPI_KEY=123456`}
                value={envText}
                onChange={(event) => setEnvText(event.target.value)}
              />
            </label>
            <Switch isSelected={skipEmpty} onValueChange={setSkipEmpty}>
              Skip entries with empty values
            </Switch>
          </div>

          {envEntries.length > 0 ? (
            <VariableTable data={envEntries} statuses={statuses} />
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Button
              color="primary"
              isDisabled={!isReady || !canSync || isSyncing}
              isLoading={isSyncing}
              onPress={handleSync}
            >
              Sync variables
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
