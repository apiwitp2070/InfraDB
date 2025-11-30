"use client";

import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import ProjectSearchResults from "@/components/project-search-results";
import { useGitlabSearch } from "@/hooks/useGitlabSearch";
import { type GitLabProject } from "@/lib/gitlab";

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
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    loadingProjectId,
    handleSearch,
    handleAddProject,
  } = useGitlabSearch({
    gitlabToken,
    baseUrl,
    onProjectAdd,
    setAlertMessage,
    clearAlertMessage,
  });

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
          className="md:w-auto md:min-w-30"
          color="primary"
          isDisabled={!gitlabToken}
          isLoading={isSearching}
          onPress={handleSearch}
        >
          Search
        </Button>
      </div>

      <ProjectSearchResults
        existingProjectIds={existingProjectIds}
        gitlabToken={gitlabToken}
        loadingProjectId={loadingProjectId}
        results={searchResults}
        onAddProject={handleAddProject}
      />
    </div>
  );
}
