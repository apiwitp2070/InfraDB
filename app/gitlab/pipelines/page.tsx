"use client";

import { useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
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

import AlertMessage from "@/components/alert-message";
import BranchStatusChip from "@/components/branch-status-chip";
import GitlabProjectSearch from "@/components/gitlab-project-search";
import { useAlertMessage } from "@/hooks/useAlertMessage";
import { useApiSettings } from "@/hooks/useApiSettings";
import { useGitlabProjects } from "@/hooks/useGitlabProjects";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import {
  gitLabApiBaseUrl,
  loadGitLabProjectWithBranches,
  triggerGitLabPipeline,
  type GitLabProject,
} from "@/lib/gitlab";
import StepTitle from "@/components/step-title";

export default function GitLabPipelinesPage() {
  const { tokens, isReady } = useTokenStorage();
  const {
    message: alertMessage,
    setMessage: setAlertMessage,
    clearMessage: clearAlertMessage,
  } = useAlertMessage();
  const { settings: apiSettings } = useApiSettings();
  const { projects, setProjects, upsertProject, removeProject } =
    useGitlabProjects();

  const [projectIdInput, setProjectIdInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const resolvedBaseUrl = apiSettings.gitlabBaseUrl.trim() || gitLabApiBaseUrl;

  const loadProject = async (
    projectId: string,
    existingProject?: GitLabProject
  ) => {
    if (!tokens.gitlab) {
      throw new Error(
        "GitLab token missing. Save it on the Settings page first."
      );
    }

    const project = await loadGitLabProjectWithBranches({
      projectId,
      token: tokens.gitlab,
      baseUrl: resolvedBaseUrl,
      existingProject,
    });

    upsertProject(project);

    setAlertMessage({
      type: "success",
      text: `Loaded ${project.branches.length} branches for ${project.name}.`,
    });
  };

  const handleAddProject = async () => {
    const projectId = projectIdInput.trim();

    if (!projectId) {
      setAlertMessage({ type: "error", text: "Project ID is required." });
      return;
    }

    setIsAdding(true);
    clearAlertMessage();

    try {
      await loadProject(projectId);
      setProjectIdInput("");
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setAlertMessage({ type: "error", text });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveProject = (projectId: string, projectName: string) => {
    removeProject(projectId);
    setAlertMessage({
      type: "success",
      text: `Removed ${projectName || projectId} from the list.`,
    });
  };

  const handleTrigger = async (projectId: string, branchName: string) => {
    if (!tokens.gitlab) {
      setAlertMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Settings page first.",
      });
      return;
    }

    const pipelineBaseUrl = resolvedBaseUrl;

    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        return {
          ...project,
          branches: project.branches.map((branch) =>
            branch.name === branchName
              ? { ...branch, status: "triggering", error: undefined }
              : branch
          ),
        };
      })
    );

    try {
      await triggerGitLabPipeline({
        projectId,
        ref: branchName,
        token: tokens.gitlab,
        baseUrl: pipelineBaseUrl,
      });

      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) {
            return project;
          }

          return {
            ...project,
            branches: project.branches.map((branch) =>
              branch.name === branchName
                ? {
                    ...branch,
                    status: "success",
                    lastTriggeredAt: new Date().toLocaleString(),
                  }
                : branch
            ),
          };
        })
      );

      setAlertMessage({
        type: "success",
        text: `Triggered pipeline for ${branchName}.`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);

      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) {
            return project;
          }

          return {
            ...project,
            branches: project.branches.map((branch) =>
              branch.name === branchName
                ? { ...branch, status: "error", error: text }
                : branch
            ),
          };
        })
      );

      setAlertMessage({ type: "error", text });
    }
  };

  const handleCopyProjectId = async (projectId: string) => {
    try {
      await navigator.clipboard.writeText(projectId);
      setAlertMessage({
        type: "success",
        text: `Copied project ID ${projectId}.`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setAlertMessage({ type: "error", text });
    }
  };

  const getPipelineStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "success";
      case "failed":
      case "canceled":
      case "skipped":
        return "danger";
      case "running":
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-1">
        <h1 className="text-xl font-semibold">GitLab Pipelines</h1>
        <p className="text-sm text-default-500">
          Load projects, browse branches, and trigger pipelines instantly.
        </p>
      </div>

      <AlertMessage message={alertMessage} />

      <Divider />

      <section className="flex flex-col gap-6">
        <StepTitle
          title="Add Project"
          description="Add your project to the list with methods below."
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Input
            label="Project ID"
            labelPlacement="outside"
            placeholder="123456"
            value={projectIdInput}
            className="md:w-1/2"
            onValueChange={setProjectIdInput}
          />
          <Button
            className="md:w-auto"
            color="primary"
            isDisabled={
              !isReady || !projectIdInput.trim().length || !tokens.gitlab
            }
            isLoading={isAdding}
            onPress={handleAddProject}
          >
            Add project
          </Button>
        </div>

        <GitlabProjectSearch
          baseUrl={apiSettings.gitlabBaseUrl}
          clearAlertMessage={clearAlertMessage}
          existingProjectIds={projects.map((project) => project.id)}
          gitlabToken={tokens.gitlab}
          setAlertMessage={setAlertMessage}
          onProjectAdd={async (project) => {
            await loadProject(String(project.id), project);
          }}
        />
      </section>

      <StepTitle
        title="Projects"
        description="Trigger pipelines directly from the branch list below."
      />

      <section className="flex flex-col">
        {projects.length === 0 ? (
          <p className="text-sm text-default-500">
            Add a project to list available branches and trigger pipelines.
          </p>
        ) : (
          <Accordion selectionMode="multiple" variant="bordered">
            {projects.map((project) => (
              <AccordionItem
                key={project.id}
                subtitle={project.namespace}
                title={
                  <a
                    className="text-primary underline-offset-2 hover:underline"
                    href={project.webUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {project.name}
                  </a>
                }
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-default-500">
                      <span>Project ID: {project.id}</span>
                      <span>{project.branches.length} branches</span>
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => handleCopyProjectId(project.id)}
                      >
                        Copy project ID
                      </Button>
                    </div>
                    <Button
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => {
                        handleRemoveProject(project.id, project.name);
                      }}
                    >
                      Remove project
                    </Button>
                  </div>
                  <Table
                    removeWrapper
                    aria-label={`Branches for ${project.name}`}
                  >
                    <TableHeader>
                      <TableColumn>Branch</TableColumn>
                      <TableColumn className="w-24">Default</TableColumn>
                      <TableColumn className="w-32">Status</TableColumn>
                      <TableColumn className="w-40">Action</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No branches available.">
                      {project.branches.map((branch) => (
                        <TableRow key={`${project.id}-${branch.name}`}>
                          <TableCell className="font-mono text-xs">
                            {branch.name}
                          </TableCell>
                          <TableCell>
                            {branch.default ? (
                              <Chip
                                color="primary"
                                radius="sm"
                                size="sm"
                                variant="flat"
                              >
                                Default
                              </Chip>
                            ) : (
                              <span className="text-xs text-default-400">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <BranchStatusChip branch={branch} />
                          </TableCell>
                          <TableCell>
                            <Button
                              color="secondary"
                              isDisabled={branch.status === "triggering"}
                              size="sm"
                              variant="flat"
                              onPress={() =>
                                handleTrigger(project.id, branch.name)
                              }
                            >
                              Trigger pipeline
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {project.pipelines && project.pipelines.length ? (
                    <div className="flex flex-col gap-3">
                      <Divider className="my-2" />
                      <p className="text-sm font-medium">Recent pipelines</p>
                      <Table
                        removeWrapper
                        aria-label={`Recent pipelines for ${project.name}`}
                      >
                        <TableHeader>
                          <TableColumn className="w-28">Pipeline</TableColumn>
                          <TableColumn className="w-28">Status</TableColumn>
                          <TableColumn className="w-32">Ref</TableColumn>
                          <TableColumn className="w-40">Triggered</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent="No recent pipelines.">
                          {project.pipelines.map((pipeline) => (
                            <TableRow key={pipeline.id}>
                              <TableCell>
                                <a
                                  className="text-primary underline-offset-2 hover:underline"
                                  href={pipeline.webUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  #{pipeline.id}
                                </a>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  className="capitalize"
                                  color={getPipelineStatusColor(
                                    pipeline.status
                                  )}
                                  size="sm"
                                  variant="flat"
                                >
                                  {pipeline.status}
                                </Chip>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {pipeline.ref}
                              </TableCell>
                              <TableCell className="text-xs text-default-500">
                                {new Date(pipeline.createdAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>
    </div>
  );
}
