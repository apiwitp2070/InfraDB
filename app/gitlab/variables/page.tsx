"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Switch } from "@heroui/switch";

import GitlabProjectSearch from "@/components/gitlab-project-search";
import VariableTable from "@/components/variable-table";
import { useApiSettings } from "@/hooks/useApiSettings";
import { useGitlabProjects } from "@/hooks/useGitlabProjects";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import { useToastMessage } from "@/hooks/useToastMessage";
import {
  gitLabApiBaseUrl,
  loadGitLabProjectWithBranches,
  upsertGitLabVariable,
  type GitLabProject,
} from "@/lib/gitlab";
import { parseEnvInput } from "@/utils/variable";
import { VariableStatus } from "@/types/variable";
import StepTitle from "@/components/step-title";

export default function GitLabVariablesPage() {
  const { tokens, isReady } = useTokenStorage();
  const { settings: apiSettings } = useApiSettings();
  const { projects, upsertProject } = useGitlabProjects();
  const toast = useToastMessage();

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

  const resolvedBaseUrl = apiSettings.gitlabBaseUrl.trim() || gitLabApiBaseUrl;

  const handleSync = async () => {
    if (!projectId.trim()) {
      toast.setMessage({ type: "error", text: "Project ID is required." });
      return;
    }

    if (!tokens.gitlab) {
      toast.setMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Settings page first.",
      });
      return;
    }

    if (envEntries.length === 0) {
      toast.setMessage({
        type: "error",
        text: "Provide at least one environment variable.",
      });
      return;
    }

    setIsSyncing(true);
    toast.clearMessage();

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
        toast.setMessage({
          type: "error",
          text: `Failed for ${key}: ${message}`,
        });
      }
    }

    if (!hasErrors) {
      toast.setMessage({
        type: "success",
        text: "Variables synced successfully.",
      });
    }

    setIsSyncing(false);
  };

  const handleProjectSelect = (selectedId: string) => {
    setProjectId(selectedId);
  };

  const handleProjectAdd = async (project: GitLabProject) => {
    if (!tokens.gitlab) {
      throw new Error(
        "GitLab token missing. Save it on the Settings page first."
      );
    }

    const projectData = await loadGitLabProjectWithBranches({
      projectId: String(project.id),
      token: tokens.gitlab,
      baseUrl: resolvedBaseUrl,
      existingProject: project,
    });

    upsertProject(projectData);
    toast.setMessage({
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
      <div className="flex flex-col items-start gap-1">
        <h1 className="text-xl font-semibold">GitLab Variables</h1>
        <p className="text-sm text-default-500">
          Update repository environment variables via API.
        </p>
      </div>

      <Divider />

      <section className="flex flex-col gap-6">
        <StepTitle
          title="Select Project"
          description="Select your project from the list or provide an ID manually."
          step={1}
        />

        <section className="flex flex-col gap-4">
          <GitlabProjectSearch
            baseUrl={apiSettings.gitlabBaseUrl}
            clearAlertMessage={toast.clearMessage}
            existingProjectIds={projects.map((project) => project.id)}
            gitlabToken={tokens.gitlab}
            setAlertMessage={toast.setMessage}
            onProjectAdd={handleProjectAdd}
          />

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
                    <TableCell>
                      <a
                        className="text-primary underline-offset-2 hover:underline"
                        href={project.webUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {project.name}
                      </a>
                    </TableCell>
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

          <Input
            isRequired
            label="Project ID"
            labelPlacement="outside"
            placeholder="123456"
            value={projectId}
            className="md:w-1/2"
            onValueChange={setProjectId}
          />
        </section>

        <section className="flex flex-col gap-4">
          <StepTitle
            title="Environment Variables"
            description="Paste variables in KEY=VALUE format. Comments (#) and blank lines
              are ignored."
            step={2}
          />

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
      </section>
    </div>
  );
}
