"use client";

import type { PipelineProjectState } from "@/types/pipeline";

import { useCallback, useEffect, useState } from "react";

import { getProjects, saveProjects } from "@/services/project-service";

export const useGitlabProjects = () => {
  const [projects, setProjects] = useState<PipelineProjectState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        const storedProjects = await getProjects();

        if (!isMounted) {
          return;
        }

        setProjects(storedProjects);
      } catch (error) {
        console.error("Failed to load GitLab projects", error);
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

    void saveProjects(projects);
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
