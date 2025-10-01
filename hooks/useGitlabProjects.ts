"use client";

import type {
  PipelineProjectState,
  PipelineSummary,
  StoredProject,
} from "@/types/pipeline";

import { useCallback, useEffect, useState } from "react";

import { db } from "@/lib/db";

const reviveProjects = (stored: StoredProject[]): PipelineProjectState[] => (
  stored.map((project) => ({
    id: String(project.id),
    name: project.name,
    namespace: project.namespace,
    webUrl: project.webUrl ?? "",
    branches: project.branches.map((branch) => ({
      name: branch.name,
      default: branch.default,
      status: "idle",
    })),
    pipelines: (project.pipelines ?? []) as PipelineSummary[],
  }))
);

const persistProjects = async (projects: PipelineProjectState[]) => {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = projects.map<StoredProject>((project) => ({
    id: project.id,
    name: project.name,
    namespace: project.namespace,
    webUrl: project.webUrl,
    branches: project.branches.map((branch) => ({
      name: branch.name,
      default: branch.default,
    })),
    pipelines: project.pipelines ?? [],
  }));

  try {
    await db.transaction("rw", db.projects, async () => {
      if (!serialized.length) {
        await db.projects.clear();
        return;
      }

      const existingIds = await db.projects.toCollection().primaryKeys();
      const nextIds = new Set(serialized.map((project) => project.id));
      const deletions = existingIds
        .map((id) => String(id))
        .filter((id) => !nextIds.has(id));

      if (deletions.length) {
        await db.projects.bulkDelete(deletions);
      }

      await db.projects.bulkPut(serialized);
    });
  } catch (error) {
    console.error("Failed to persist GitLab projects", error);
  }
};

export const useGitlabProjects = () => {
  const [projects, setProjects] = useState<PipelineProjectState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        if (typeof window === "undefined") {
          setIsReady(true);
          return;
        }

        const storedProjects = await db.projects.toArray();

        if (!isMounted) {
          return;
        }

        setProjects(reviveProjects(storedProjects));
      } catch (error) {
        console.error("Failed to load GitLab projects from storage", error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void persistProjects(projects);
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
