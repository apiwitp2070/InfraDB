"use client";

import { useEffect, useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
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
import { useAlertMessage } from "@/hooks/useAlertMessage";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import {
  fetchGitLabBranches,
  fetchGitLabProject,
  gitLabApiBaseUrl,
  searchGitLabProjects,
  triggerGitLabPipeline,
  type GitLabProject,
} from "@/lib/gitlab";
import {
  BranchState,
  PipelineProjectState,
  StoredProject,
} from "@/types/pipeline";

const STORAGE_KEY = "gitlab_pipeline_projects";

export default function GitLabPipelinesPage() {
  const { tokens, isReady } = useTokenStorage();
  const {
    message: alertMessage,
    setMessage: setAlertMessage,
    clearMessage: clearAlertMessage,
  } = useAlertMessage();
  const [baseUrl, setBaseUrl] = useState(gitLabApiBaseUrl);
  const [projectIdInput, setProjectIdInput] = useState("");
  const [projects, setProjects] = useState<PipelineProjectState[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<GitLabProject[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        setIsHydrated(true);
        return;
      }

      const parsed = JSON.parse(stored) as StoredProject[];

      const revived = parsed.map<PipelineProjectState>((project) => ({
        id: project.id,
        name: project.name,
        namespace: project.namespace,
        branches: project.branches.map<BranchState>((branch) => ({
          name: branch.name,
          default: branch.default,
          status: "idle",
        })),
      }));

      setProjects(revived);
    } catch (error) {
      console.error("Failed to load GitLab pipeline projects", error);
      setAlertMessage({
        type: "error",
        text: "Could not load saved GitLab projects from storage.",
      });
    } finally {
      setIsHydrated(true);
    }
  }, [setAlertMessage]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    const storedProjects: StoredProject[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      namespace: project.namespace,
      branches: project.branches.map((branch) => ({
        name: branch.name,
        default: branch.default,
      })),
    }));

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProjects));
  }, [projects, isHydrated]);

  const processProjectLoad = async (
    projectId: string,
    existingProject?: GitLabProject
  ) => {
    if (!tokens.gitlab) {
      throw new Error(
        "GitLab token missing. Save it on the Settings page first."
      );
    }

    const resolvedBaseUrl = baseUrl.trim() || gitLabApiBaseUrl;
    const projectData =
      existingProject ??
      (await fetchGitLabProject({
        projectId,
        token: tokens.gitlab,
        baseUrl: resolvedBaseUrl,
      }));

    const branches = await fetchGitLabBranches({
      projectId,
      token: tokens.gitlab,
      baseUrl: resolvedBaseUrl,
    });

    const branchStates: BranchState[] = branches.map((branch) => ({
      name: branch.name,
      default: branch.default,
      status: "idle",
    }));

    setProjects((prev) => {
      const next = prev.filter((item) => item.id !== String(projectData.id));
      return [
        ...next,
        {
          id: String(projectData.id),
          name: projectData.name,
          namespace: projectData.name_with_namespace,
          branches: branchStates,
        },
      ];
    });

    setAlertMessage({
      type: "success",
      text: `Loaded ${branchStates.length} branches for ${projectData.name}.`,
    });
  };

  const handleAddProject = async () => {
    const projectId = projectIdInput.trim();

    if (!projectId) {
      setAlertMessage({ type: "error", text: "Project ID is required." });
      return;
    }

    if (!tokens.gitlab) {
      setAlertMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Tokens page first.",
      });
      return;
    }

    setIsAdding(true);
    clearAlertMessage();

    try {
      await processProjectLoad(projectId);
      setProjectIdInput("");
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setAlertMessage({ type: "error", text });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveProject = (projectId: string, projectName: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setAlertMessage({
      type: "success",
      text: `Removed ${projectName || projectId} from the list.`,
    });
  };

  const handleTrigger = async (projectId: string, branchName: string) => {
    if (!tokens.gitlab) {
      setAlertMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Tokens page first.",
      });
      return;
    }

    const resolvedBaseUrl = baseUrl.trim() || gitLabApiBaseUrl;

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
        baseUrl: resolvedBaseUrl,
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
                ? {
                    ...branch,
                    status: "error",
                    error: text,
                  }
                : branch
            ),
          };
        })
      );

      setAlertMessage({ type: "error", text });
    }
  };

  const handleSearchProjects = async () => {
    const query = searchTerm.trim();

    if (!query) {
      setAlertMessage({
        type: "error",
        text: "Enter a project name to search.",
      });
      return;
    }

    if (!tokens.gitlab) {
      setAlertMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Tokens page first.",
      });
      return;
    }

    setIsSearching(true);
    clearAlertMessage();

    const resolvedBaseUrl = baseUrl.trim() || gitLabApiBaseUrl;

    try {
      const results = await searchGitLabProjects({
        query,
        token: tokens.gitlab,
        baseUrl: resolvedBaseUrl,
      });

      setSearchResults(results);

      if (results.length === 0) {
        setAlertMessage({
          type: "error",
          text: `No projects matched “${query}”.`,
        });
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setAlertMessage({ type: "error", text });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectProject = async (project: GitLabProject) => {
    if (!tokens.gitlab) {
      setAlertMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Tokens page first.",
      });
      return;
    }

    const projectId = String(project.id);
    setLoadingProjectId(projectId);
    clearAlertMessage();

    try {
      await processProjectLoad(projectId, project);
      setSearchResults((prev) => prev.filter((item) => item.id !== project.id));
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setAlertMessage({ type: "error", text });
    } finally {
      setLoadingProjectId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card shadow="none">
        <CardHeader className="flex flex-col items-start gap-1">
          <h1 className="text-xl font-semibold">GitLab Pipelines</h1>
          <p className="text-sm text-default-500">
            Load projects, browse branches, and trigger pipelines instantly.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <AlertMessage message={alertMessage} />

          <p>Add your project to the list with methods below</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              isRequired
              label="Enter Project ID"
              labelPlacement="outside"
              placeholder="123456"
              value={projectIdInput}
              onValueChange={setProjectIdInput}
            />
            <Input
              className="md:col-span-2"
              label="GitLab API Base URL"
              labelPlacement="outside"
              value={baseUrl}
              onValueChange={setBaseUrl}
            />
          </div>

          <div className="flex items-center justify-end">
            <Button
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

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <Input
                className="md:flex-1"
                label="Or search GitLab projects"
                labelPlacement="outside"
                placeholder="Project name"
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <Button
                className="md:w-auto"
                color="primary"
                isDisabled={!isReady || !tokens.gitlab}
                isLoading={isSearching}
                onPress={handleSearchProjects}
              >
                Search
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <Table removeWrapper aria-label="GitLab project search results">
                <TableHeader>
                  <TableColumn>Project</TableColumn>
                  <TableColumn>Namespace</TableColumn>
                  <TableColumn className="w-32">Action</TableColumn>
                </TableHeader>
                <TableBody>
                  {searchResults.map((project) => {
                    const projectId = String(project.id);
                    const alreadyAdded = projects.some(
                      (item) => item.id === projectId
                    );

                    return (
                      <TableRow key={projectId}>
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell className="text-sm text-default-500">
                          {project.name_with_namespace}
                        </TableCell>
                        <TableCell>
                          <Button
                            color="primary"
                            isLoading={loadingProjectId === projectId}
                            size="sm"
                            variant="flat"
                            onPress={() => handleSelectProject(project)}
                          >
                            {alreadyAdded ? "Update" : "Add"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card shadow="none">
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-lg font-semibold">Projects</h2>
          <p className="text-sm text-default-500">
            Trigger pipelines directly from the branch list below.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          {projects.length === 0 ? (
            <p className="text-sm text-default-500">
              Add a project to list available branches and trigger pipelines.
            </p>
          ) : (
            <Accordion selectionMode="multiple" variant="bordered">
              {projects.map((project) => (
                <AccordionItem
                  key={project.id}
                  title={project.name}
                  subtitle={project.namespace}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-default-500">
                        <span>Project ID: {project.id}</span>
                        <span>{project.branches.length} branches</span>
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
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
