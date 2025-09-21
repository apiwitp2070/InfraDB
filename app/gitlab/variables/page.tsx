"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Chip } from "@heroui/chip";
import { Alert } from "@heroui/alert";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Spinner } from "@heroui/spinner";
import clsx from "clsx";

import { useTokenStorage } from "@/hooks/useTokenStorage";
import {
  gitLabApiBaseUrl,
  upsertGitLabVariable,
} from "@/lib/gitlab";

const parseEnvInput = (input: string) => {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      const value = rest.length ? rest.join("=") : "";

      return {
        key: key.trim(),
        value,
      };
    })
    .filter((entry) => entry.key.length);
};

type VariableStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "error"
  | "skipped";

type StatusMessage = {
  type: "success" | "error";
  text: string;
};

const StatusChip = ({ status }: { status: VariableStatus }) => {
  switch (status) {
    case "pending":
      return (
        <Chip radius="sm" size="sm" variant="flat">
          Pending
        </Chip>
      );
    case "in-progress":
      return (
        <Chip
          radius="sm"
          size="sm"
          variant="flat"
          color="primary"
          startContent={<Spinner color="primary" size="sm" />}
        >
          Updating
        </Chip>
      );
    case "success":
      return (
        <Chip radius="sm" size="sm" variant="flat" color="success">
          Completed
        </Chip>
      );
    case "skipped":
      return (
        <Chip radius="sm" size="sm" variant="flat" color="warning">
          Skipped
        </Chip>
      );
    case "error":
    default:
      return (
        <Chip radius="sm" size="sm" variant="flat" color="danger">
          Error
        </Chip>
      );
  }
};

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
    Boolean(projectId.trim()) && envEntries.length > 0 && Boolean(tokens.gitlab);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h1 className="text-xl font-semibold">GitLab Variables</h1>
          <p className="text-sm text-default-500">
            Paste variables in KEY=VALUE format. Comments (#) and blank lines are
            ignored.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          {message ? (
            <Alert
              color={message.type === "error" ? "danger" : "success"}
              title={message.type === "error" ? "Something went wrong" : "All good"}
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
            <Switch
              isSelected={skipEmpty}
              onValueChange={setSkipEmpty}
            >
              Skip entries with empty values
            </Switch>
          </div>

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

      {envEntries.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-col items-start gap-1">
            <h2 className="text-lg font-semibold">Preview</h2>
            <p className="text-sm text-default-500">
              Review parsed variables before syncing.
            </p>
          </CardHeader>
          <CardBody>
            <Table aria-label="GitLab variables preview">
              <TableHeader>
                <TableColumn>Key</TableColumn>
                <TableColumn>Value</TableColumn>
                <TableColumn className="w-32">Status</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No variables parsed.">
                {envEntries.map(({ key, value }) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{key}</TableCell>
                    <TableCell>
                      <div
                        className={clsx(
                          "max-w-xl",
                          value.length ? "truncate font-mono text-xs" : "italic text-default-400"
                        )}
                        title={value}
                      >
                        {value.length ? value : "(empty)"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={statuses[key] ?? "pending"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
