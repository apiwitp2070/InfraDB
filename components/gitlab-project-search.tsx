"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import {
  gitLabApiBaseUrl,
  searchGitLabProjects,
  type GitLabProject,
} from "@/lib/gitlab";

type AlertPayload = {
  type: "success" | "error";
  text: string;
};

export type GitlabProjectSearchProps = {
  gitlabToken: string;
  baseUrl?: string;
  existingProjectIds?: string[];
  onProjectAdd: (project: GitLabProject) => Promise<void> | void;
  setAlertMessage: (message: AlertPayload) => void;
  clearAlertMessage: () => void;
};

export default function GitlabProjectSearch({
  gitlabToken,
  baseUrl,
  existingProjectIds = [],
  onProjectAdd,
  setAlertMessage,
  clearAlertMessage,
}: GitlabProjectSearchProps) {
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

  const handleAddProject = async (project: GitLabProject) => {
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

      setSearchResults((prev) => prev.filter((item) => item.id !== project.id));
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setAlertMessage({ type: "error", text });
    } finally {
      setLoadingProjectId(null);
    }
  };

  const existingProjectIdsSet = new Set(existingProjectIds);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <Input
          className="md:flex-1"
          label="Search GitLab projects"
          labelPlacement="outside"
          placeholder="Project name"
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <Button
          className="md:w-auto"
          color="primary"
          isDisabled={!gitlabToken}
          isLoading={isSearching}
          onPress={handleSearch}
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
              const alreadyAdded = existingProjectIdsSet.has(projectId);

              return (
                <TableRow key={projectId}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-sm text-default-500">
                    {project.name_with_namespace}
                  </TableCell>
                  <TableCell>
                    <Button
                      color="secondary"
                      isDisabled={alreadyAdded || loadingProjectId === projectId}
                      isLoading={loadingProjectId === projectId}
                      size="sm"
                      variant="flat"
                      onPress={() => handleAddProject(project)}
                    >
                      {alreadyAdded ? "Added" : "Add"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
