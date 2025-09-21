"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Alert } from "@heroui/alert";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import clsx from "clsx";

import StatusChip from "@/components/status-chip";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import { gitLabApiBaseUrl, upsertGitLabVariable } from "@/lib/gitlab";
import { VariableStatus, StatusMessage, parseEnvInput } from "@/utils/variable";
import VariableTable from "@/components/variable-table";

export default function GitLabVariablesPage() {
  const { tokens, isReady } = useTokenStorage();
  const [projectId, setProjectId] = useState("");
  const [envText, setEnvText] = useState("");
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [baseUrl, setBaseUrl] = useState(gitLabApiBaseUrl);
  const [statuses, setStatuses] = useState<Record<string, VariableStatus>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

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
    if (!projectId.trim()) {
      setMessage({ type: "error", text: "Project ID is required." });
      return;
    }

    if (!tokens.gitlab) {
      setMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Tokens page first.",
      });
      return;
    }

    if (envEntries.length === 0) {
      setMessage({
        type: "error",
        text: "Provide at least one environment variable.",
      });
      return;
    }

    setIsSyncing(true);
    setMessage(null);

    const resolvedBaseUrl = baseUrl.trim() || gitLabApiBaseUrl;

    let hasErrors = false;

    for (const { key, value } of envEntries) {
      if (skipEmpty && !value.length) {
        setStatuses((prev) => ({ ...prev, [key]: "skipped" }));
        continue;
      }

      setStatuses((prev) => ({ ...prev, [key]: "in-progress" }));

      try {
        await upsertGitLabVariable({
          projectId: projectId.trim(),
          token: tokens.gitlab,
          variable: { key, value },
          baseUrl: resolvedBaseUrl,
        });
        setStatuses((prev) => ({ ...prev, [key]: "success" }));
      } catch (error) {
        hasErrors = true;
        const message = error instanceof Error ? error.message : String(error);
        setStatuses((prev) => ({ ...prev, [key]: "error" }));
        setMessage({
          type: "error",
          text: `Failed for ${key}: ${message}`,
        });
      }
    }

    if (!hasErrors) {
      setMessage({ type: "success", text: "Variables synced successfully." });
    }

    setIsSyncing(false);
  };

  const canSync =
    Boolean(projectId.trim()) &&
    envEntries.length > 0 &&
    Boolean(tokens.gitlab);

  return (
    <div className="flex flex-col gap-6">
      <Card shadow="none">
        <CardHeader className="flex flex-col items-start gap-1">
          <h1 className="text-xl font-semibold">GitLab Variables</h1>
          <p className="text-sm text-default-500">
            Paste variables in KEY=VALUE format. Comments (#) and blank lines
            are ignored.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          {message ? (
            <Alert
              color={message.type === "error" ? "danger" : "success"}
              title={
                message.type === "error" ? "Something went wrong" : "All good"
              }
              variant="flat"
            >
              {message.text}
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              isRequired
              label="Project ID"
              labelPlacement="outside"
              placeholder="123456"
              value={projectId}
              onValueChange={setProjectId}
            />
            <Input
              label="GitLab API Base URL"
              labelPlacement="outside"
              value={baseUrl}
              onValueChange={setBaseUrl}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Environment Variables</span>
              <textarea
                className="min-h-[200px] rounded-medium border border-default-200 bg-content1 px-3 py-2 font-mono text-sm outline-none focus-visible:border-primary"
                onChange={(event) => setEnvText(event.target.value)}
                placeholder={`API_URL=https://example.com\nAPI_KEY=123456`}
                value={envText}
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
