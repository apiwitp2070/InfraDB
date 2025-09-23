"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";
import { Switch } from "@heroui/switch";

import AlertMessage from "@/components/alert-message";
import GitlabProjectSearch from "@/components/gitlab-project-search";
import VariableTable from "@/components/variable-table";
import { useAlertMessage } from "@/hooks/useAlertMessage";
import { useApiSettings } from "@/hooks/useApiSettings";
import { useGitlabProjects } from "@/hooks/useGitlabProjects";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import {
  gitLabApiBaseUrl,
  loadGitLabProjectWithBranches,
  upsertGitLabVariable,
  type GitLabProject,
} from "@/lib/gitlab";
import { parseEnvInput } from "@/utils/variable";
import { VariableStatus } from "@/types/variable";

export default function GitLabVariablesPage() {
  const { tokens, isReady } = useTokenStorage();
  const { settings: apiSettings } = useApiSettings();
  const { projects, upsertProject } = useGitlabProjects();
  const alert = useAlertMessage();

  const [projectId, setProjectId] = useState("");
  const [envText, setEnvText] = useState("");
  const [skipEmpty, setSkipEmpty] = useState(true);
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

  const resolvedBaseUrl =
    apiSettings.gitlabBaseUrl.trim() || gitLabApiBaseUrl;

  const handleSync = async () => {
    if (!projectId.trim()) {
      alert.setMessage({ type: "error", text: "Project ID is required." });
      return;
    }

    if (!tokens.gitlab) {
      alert.setMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Settings page first.",
      });
      return;
    }

    if (envEntries.length === 0) {
      alert.setMessage({
        type: "error",
        text: "Provide at least one environment variable.",
      });
      return;
    }

    setIsSyncing(true);
    alert.clearMessage();

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
        alert.setMessage({
          type: "error",
          text: `Failed for ${key}: ${message}`,
        });
      }
    }

    if (!hasErrors) {
      alert.setMessage({ type: "success", text: "Variables synced successfully." });
    }

    setIsSyncing(false);
  };

  const handleProjectSelect = (selectedId: string) => {
    setProjectId(selectedId);
  };

  const handleProjectAdd = async (project: GitLabProject) => {
    if (!tokens.gitlab) {
      throw new Error(
        "GitLab token missing. Save it on the Settings page first.",
      );
    }

    const projectData = await loadGitLabProjectWithBranches({
      projectId: String(project.id),
      token: tokens.gitlab,
      baseUrl: resolvedBaseUrl,
      existingProject: project,
    });

    upsertProject(projectData);
    alert.setMessage({
      type: "success",
      text: `Loaded ${projectData.branches.length} branches for ${projectData.name}.`,
    });
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
            Manage environment variables via the GitLab REST API.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <AlertMessage message={alert.message} />

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-medium">Saved GitLab projects</h2>
            {projects.length ? (
              <Table removeWrapper aria-label="Saved GitLab projects">
                <TableHeader>
                  <TableColumn>Name</TableColumn>
                  <TableColumn>Project ID</TableColumn>
                  <TableColumn className="w-32">Action</TableColumn>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {project.id}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => handleProjectSelect(project.id)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-default-500">
                No projects saved yet. Add one below to speed up future updates.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <header>
              <h2 className="text-base font-medium">GitLab Token & Project</h2>
              <p className="text-xs text-default-500">
                Provide a project ID manually or pick one from the list above.
              </p>
            </header>
            <Input
              isRequired
              label="Project ID"
              labelPlacement="outside"
              placeholder="123456"
              value={projectId}
              onValueChange={setProjectId}
            />
          </section>

          <GitlabProjectSearch
            baseUrl={apiSettings.gitlabBaseUrl}
            clearAlertMessage={alert.clearMessage}
            existingProjectIds={projects.map((project) => project.id)}
            gitlabToken={tokens.gitlab}
            setAlertMessage={alert.setMessage}
            onProjectAdd={handleProjectAdd}
          />

          <section className="flex flex-col gap-4">
            <header>
              <h2 className="text-base font-medium">Environment Variables</h2>
              <p className="text-xs text-default-500">
                Paste variables in KEY=VALUE format. Comments (#) and blank lines
                are ignored.
              </p>
            </header>
            <textarea
              className="min-h-[200px] rounded-medium border border-default-200 bg-content1 px-3 py-2 font-mono text-sm outline-none focus-visible:border-primary"
              placeholder={`API_URL=https://example.com\nAPI_KEY=123456`}
              value={envText}
              onChange={(event) => setEnvText(event.target.value)}
            />
            <Switch isSelected={skipEmpty} onValueChange={setSkipEmpty}>
              Skip entries with empty values
            </Switch>
          </section>

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
