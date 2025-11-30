"use client";

import { useState } from "react";

import {
  gitLabApiBaseUrl,
  searchGitLabProjects,
  type GitLabProject,
} from "@/lib/gitlab";

type AlertPayload = {
  type: "success" | "error";
  text: string;
};

type UseGitlabSearchProps = {
  gitlabToken: string;
  baseUrl?: string;
  onProjectAdd: (project: GitLabProject) => Promise<void> | void;
  setAlertMessage: (message: AlertPayload) => void;
  clearAlertMessage: () => void;
};

export const useGitlabSearch = ({
  gitlabToken,
  baseUrl,
  onProjectAdd,
  setAlertMessage,
  clearAlertMessage,
}: UseGitlabSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<GitLabProject[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  const resolvedBaseUrl = baseUrl?.trim() || gitLabApiBaseUrl;

  const handleSearch = async () => {
    const query = searchTerm.trim();

    if (!query) {
      setAlertMessage({
        type: "error",
        text: "Enter a project name to search.",
      });
      return;
    }

    if (!gitlabToken) {
      setAlertMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Settings page first.",
      });
      return;
    }

    setIsSearching(true);
    clearAlertMessage();

    try {
      const results = await searchGitLabProjects({
        query,
        token: gitlabToken,
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

  const handleAddProject = async (
    project: GitLabProject,
    alreadyAdded: boolean,
  ) => {
    if (!gitlabToken) {
      setAlertMessage({
        type: "error",
        text: "GitLab token missing. Save it on the Settings page first.",
      });
      return;
    }

    setLoadingProjectId(String(project.id));
    clearAlertMessage();

    try {
      await onProjectAdd(project);

      if (!alreadyAdded) {
        setSearchResults((prev) =>
          prev.filter((item) => item.id !== project.id),
        );
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setAlertMessage({ type: "error", text });
    } finally {
      setLoadingProjectId(null);
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    loadingProjectId,
    handleSearch,
    handleAddProject,
  };
};
