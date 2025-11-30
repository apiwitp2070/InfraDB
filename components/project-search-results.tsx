"use client";

import { Button } from "@heroui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import { type GitLabProject } from "@/lib/gitlab";

type ProjectSearchResultsProps = {
  results: GitLabProject[];
  existingProjectIds: string[];
  loadingProjectId: string | null;
  gitlabToken: string;
  onAddProject: (project: GitLabProject, alreadyAdded: boolean) => void;
};

export default function ProjectSearchResults({
  results,
  existingProjectIds,
  loadingProjectId,
  gitlabToken,
  onAddProject,
}: ProjectSearchResultsProps) {
  if (results.length === 0) {
    return null;
  }

  const existingProjectIdsSet = new Set(existingProjectIds);

  return (
    <Table removeWrapper aria-label="GitLab project search results">
      <TableHeader>
        <TableColumn>Project</TableColumn>
        <TableColumn>Namespace</TableColumn>
        <TableColumn className="w-32">Action</TableColumn>
      </TableHeader>
      <TableBody>
        {results.map((project) => {
          const projectId = String(project.id);
          const alreadyAdded = existingProjectIdsSet.has(projectId);

          return (
            <TableRow key={projectId}>
              <TableCell className="font-medium">
                <a
                  className="text-primary underline-offset-2 hover:underline"
                  href={project.web_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {project.name}
                </a>
              </TableCell>
              <TableCell className="text-sm text-default-500">
                {project.name_with_namespace}
              </TableCell>
              <TableCell>
                <Button
                  color={alreadyAdded ? "warning" : "secondary"}
                  isDisabled={loadingProjectId === projectId || !gitlabToken}
                  isLoading={loadingProjectId === projectId}
                  size="sm"
                  variant="flat"
                  onPress={() => onAddProject(project, alreadyAdded)}
                >
                  {alreadyAdded ? "Update" : "Add"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
