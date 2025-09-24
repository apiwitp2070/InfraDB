"use client";

import type {
  PipelineProjectState,
  PipelineSummary,
  StoredProject,
} from "@/types/pipeline";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gitlab_pipeline_projects";

const reviveProjects = (stored: StoredProject[]): PipelineProjectState[] => (
  stored.map((project) => ({
    id: String(project.id),
    name: project.name,
    namespace: project.namespace,
    branches: project.branches.map((branch) => ({
      name: branch.name,
      default: branch.default,
      status: "idle",
    })),
    pipelines: (project.pipelines ?? []) as PipelineSummary[],
  }))
);

const persistProjects = (projects: PipelineProjectState[]) => {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = projects.map<StoredProject>((project) => ({
    id: project.id,
    name: project.name,
    namespace: project.namespace,
    branches: project.branches.map((branch) => ({
      name: branch.name,
      default: branch.default,
    })),
    pipelines: project.pipelines ?? [],
  }));

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
};

export const useGitlabProjects = () => {
  const [projects, setProjects] = useState<PipelineProjectState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedRaw = window.localStorage.getItem(STORAGE_KEY);

      if (!storedRaw) {
        setIsReady(true);
        return;
      }

      const parsed = JSON.parse(storedRaw) as StoredProject[];
      setProjects(reviveProjects(parsed));
    } catch (error) {
      console.error("Failed to load GitLab projects from storage", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    persistProjects(projects);
  }, [isReady, projects]);

  const upsertProject = useCallback((project: PipelineProjectState) => {
    setProjects((prev) => {
      const filtered = prev.filter((item) => item.id !== project.id);
      return [...filtered, project];
    });
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
  }, []);

  const clearProjects = useCallback(() => {
    setProjects([]);
  }, []);

  return {
    projects,
    setProjects,
    upsertProject,
    removeProject,
    clearProjects,
    isReady,
  };
};

export type UseGitlabProjectsReturn = ReturnType<typeof useGitlabProjects>;
