"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Accordion, AccordionItem } from "@heroui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import AlertMessage from "@/components/alert-message";
import { useAlertMessage } from "@/hooks/useAlertMessage";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import {
  fetchGitLabBranches,
  fetchGitLabProject,
  gitLabApiBaseUrl,
  triggerGitLabPipeline,
} from "@/lib/gitlab";
import branchStatusChip from "@/components/branch-status-chip";
import {
  PipelineProjectState,
  StoredProject,
  BranchState,
} from "@/types/pipeline";
import BranchStatusChip from "@/components/branch-status-chip";

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

    const resolvedBaseUrl = baseUrl.trim() || gitLabApiBaseUrl;

    try {
      const [project, branches] = await Promise.all([
        fetchGitLabProject({
          projectId,
          token: tokens.gitlab,
          baseUrl: resolvedBaseUrl,
        }),
        fetchGitLabBranches({
          projectId,
          token: tokens.gitlab,
          baseUrl: resolvedBaseUrl,
        }),
      ]);

      const branchStates: BranchState[] = branches.map((branch) => ({
        name: branch.name,
        default: branch.default,
        status: "idle",
      }));

      setProjects((prev) => {
        const next = prev.filter((item) => item.id !== String(project.id));
        return [
          ...next,
          {
            id: String(project.id),
            name: project.name,
            namespace: project.name_with_namespace,
            branches: branchStates,
          },
        ];
      });

      setAlertMessage({
        type: "success",
        text: `Loaded ${branches.length} branches for ${project.name}.`,
      });

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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              isRequired
              label="Project ID"
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
                      aria-label={`Branches for ${project.name}`}
                      removeWrapper
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
                                onPress={() =>
                                  handleTrigger(project.id, branch.name)
                                }
                                size="sm"
                                variant="flat"
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
