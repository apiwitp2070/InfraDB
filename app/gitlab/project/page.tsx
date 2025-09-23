"use client";

import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

import AlertMessage from "@/components/alert-message";
import GitlabProjectSearch from "@/components/gitlab-project-search";
import { useAlertMessage } from "@/hooks/useAlertMessage";
import { useApiSettings } from "@/hooks/useApiSettings";
import { useGitlabProjects } from "@/hooks/useGitlabProjects";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import {
  gitLabApiBaseUrl,
  loadGitLabProjectWithBranches,
  type GitLabProject,
} from "@/lib/gitlab";

export default function GitLabProjectsPage() {
  const { tokens } = useTokenStorage();
  const { settings: apiSettings } = useApiSettings();
  const { projects, upsertProject, removeProject } = useGitlabProjects();
  const alert = useAlertMessage();

  const resolvedBaseUrl = apiSettings.gitlabBaseUrl.trim() || gitLabApiBaseUrl;

  const handleProjectAdd = async (project: GitLabProject) => {
    if (!tokens.gitlab) {
      throw new Error(
        "GitLab token missing. Save it on the Settings page first."
      );
    }

    const projectData = await loadGitLabProjectWithBranches({
      projectId: String(project.id),
      token: tokens.gitlab,
      baseUrl: resolvedBaseUrl,
      existingProject: project,
    });

    upsertProject(projectData);
    alert.setMessage({
      type: "success",
      text: `Loaded ${projectData.branches.length} branches for ${projectData.name}.`,
    });
  };

  const handleRemoveProject = (projectId: string, projectName: string) => {
    removeProject(projectId);
    alert.setMessage({
      type: "success",
      text: `Removed ${projectName || projectId} from the list.`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-1">
        <h1 className="text-xl font-semibold">GitLab Projects</h1>
        <p className="text-sm text-default-500">
          Search your GitLab projects, add them to the workspace, and manage the
          stored list.
        </p>
      </div>

      <AlertMessage message={alert.message} />

      <Divider />

      <section className="flex flex-col gap-6">
        <GitlabProjectSearch
          baseUrl={apiSettings.gitlabBaseUrl}
          clearAlertMessage={alert.clearMessage}
          existingProjectIds={projects.map((project) => project.id)}
          gitlabToken={tokens.gitlab}
          setAlertMessage={alert.setMessage}
          onProjectAdd={handleProjectAdd}
        />
      </section>

      <div className="flex flex-col items-start gap-1">
        <h2 className="text-lg font-semibold">Stored projects</h2>
        <p className="text-sm text-default-500">
          Projects saved locally are available to other GitLab workflow pages.
        </p>
      </div>

      <section>
        {projects.length ? (
          <Table removeWrapper aria-label="Stored GitLab projects">
            <TableHeader>
              <TableColumn>Name</TableColumn>
              <TableColumn>Project ID</TableColumn>
              <TableColumn className="w-32">Action</TableColumn>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {project.id}
                  </TableCell>
                  <TableCell>
                    <Button
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() =>
                        handleRemoveProject(project.id, project.name)
                      }
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-default-500">
            No projects stored yet. Use the search above to add your first
            project.
          </p>
        )}
      </section>
    </div>
  );
}
