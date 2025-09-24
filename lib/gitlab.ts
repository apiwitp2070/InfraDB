import type {
  BranchState,
  PipelineProjectState,
  PipelineSummary,
} from "@/types/pipeline";

export type GitLabVariablePayload = {
  key: string;
  value: string;
};

export type GitLabBranch = {
  name: string;
  default: boolean;
};

export type GitLabProject = {
  id: number;
  name: string;
  name_with_namespace: string;
  web_url: string;
};

export type GitLabPipeline = {
  id: number;
  status: string;
  ref: string;
  sha: string;
  web_url: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_GITLAB_API = "https://gitlab.com/api/v4";

type UpsertVariableInput = {
  projectId: string;
  token: string;
  variable: GitLabVariablePayload;
  baseUrl?: string;
};

type GitLabRequestInit = RequestInit & { baseUrl?: string };

const request = async <T>(
  path: string,
  token: string,
  { baseUrl = DEFAULT_GITLAB_API, ...init }: GitLabRequestInit = {}
): Promise<T> => {
  const url = `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "PRIVATE-TOKEN": token,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `GitLab request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const upsertGitLabVariable = async ({
  projectId,
  token,
  variable,
  baseUrl,
}: UpsertVariableInput) => {
  const encodedProjectId = encodeURIComponent(projectId);
  const encodedKey = encodeURIComponent(variable.key);

  try {
    await request(
      `/projects/${encodedProjectId}/variables/${encodedKey}`,
      token,
      {
        baseUrl,
        method: "PUT",
        body: JSON.stringify({
          value: variable.value,
          variable_type: "env_var",
        }),
      }
    );
  } catch (error) {
    if (error instanceof Error && /404/.test(error.message)) {
      await request(`/projects/${encodedProjectId}/variables`, token, {
        baseUrl,
        method: "POST",
        body: JSON.stringify({
          key: variable.key,
          value: variable.value,
          variable_type: "env_var",
        }),
      });
      return;
    }

    throw error;
  }
};

type FetchBranchesInput = {
  projectId: string;
  token: string;
  baseUrl?: string;
};

export const fetchGitLabBranches = async ({
  projectId,
  token,
  baseUrl,
}: FetchBranchesInput) => {
  const encodedProjectId = encodeURIComponent(projectId);
  return request<GitLabBranch[]>(
    `/projects/${encodedProjectId}/repository/branches`,
    token,
    {
      baseUrl,
    }
  );
};

type FetchProjectInput = {
  projectId: string;
  token: string;
  baseUrl?: string;
};

export const fetchGitLabProject = async ({
  projectId,
  token,
  baseUrl,
}: FetchProjectInput) => {
  const encodedProjectId = encodeURIComponent(projectId);
  return request<GitLabProject>(`/projects/${encodedProjectId}`, token, {
    baseUrl,
  });
};

type TriggerPipelineInput = {
  projectId: string;
  ref: string;
  token: string;
  baseUrl?: string;
};

export const triggerGitLabPipeline = async ({
  projectId,
  ref,
  token,
  baseUrl,
}: TriggerPipelineInput) => {
  const encodedProjectId = encodeURIComponent(projectId);

  await request(`/projects/${encodedProjectId}/pipeline`, token, {
    baseUrl,
    method: "POST",
    body: JSON.stringify({ ref }),
  });
};

type SearchProjectsInput = {
  query: string;
  token: string;
  baseUrl?: string;
  membership?: boolean;
  perPage?: number;
};

export const searchGitLabProjects = async ({
  query,
  token,
  baseUrl,
  membership = true,
  perPage = 20,
}: SearchProjectsInput) => {
  const params = new URLSearchParams({
    search: query,
    simple: "true",
    per_page: String(perPage),
  });

  if (membership) {
    params.set("membership", "true");
  }

  return request<GitLabProject[]>(`/projects?${params.toString()}`, token, {
    baseUrl,
  });
};

type LoadProjectWithBranchesInput = {
  projectId: string;
  token: string;
  baseUrl?: string;
  existingProject?: GitLabProject;
};

export const loadGitLabProjectWithBranches = async ({
  projectId,
  token,
  baseUrl,
  existingProject,
}: LoadProjectWithBranchesInput): Promise<PipelineProjectState> => {
  const resolvedBaseUrl = baseUrl?.trim() || DEFAULT_GITLAB_API;

  const project =
    existingProject ??
    (await fetchGitLabProject({
      projectId,
      token,
      baseUrl: resolvedBaseUrl,
    }));

  const branches = await fetchGitLabBranches({
    projectId,
    token,
    baseUrl: resolvedBaseUrl,
  });

  const branchStates: BranchState[] = branches.map((branch) => ({
    name: branch.name,
    default: branch.default,
    status: "idle",
  }));

  const pipelines = await fetchGitLabPipelines({
    projectId,
    token,
    baseUrl: resolvedBaseUrl,
    perPage: 5,
  });

  const pipelineSummaries: PipelineSummary[] = pipelines.map((pipeline) => ({
    id: pipeline.id,
    status: pipeline.status,
    ref: pipeline.ref,
    sha: pipeline.sha,
    webUrl: pipeline.web_url,
    createdAt: pipeline.created_at,
    updatedAt: pipeline.updated_at,
  }));

  return {
    id: String(project.id),
    name: project.name,
    namespace: project.name_with_namespace,
    webUrl: project.web_url,
    branches: branchStates,
    pipelines: pipelineSummaries,
  };
};

export const isGitLabNotFoundError = (error: unknown) => {
  if (error instanceof Error) {
    return /404/.test(error.message);
  }

  return false;
};

export const gitLabApiBaseUrl = DEFAULT_GITLAB_API;

type FetchPipelinesInput = {
  projectId: string;
  token: string;
  baseUrl?: string;
  perPage?: number;
};

export const fetchGitLabPipelines = async ({
  projectId,
  token,
  baseUrl,
  perPage = 5,
}: FetchPipelinesInput) => {
  const encodedProjectId = encodeURIComponent(projectId);
  const params = new URLSearchParams({
    per_page: String(perPage),
    order_by: "id",
    sort: "desc",
  });

  return request<GitLabPipeline[]>(
    `/projects/${encodedProjectId}/pipelines?${params.toString()}`,
    token,
    {
      baseUrl,
    },
  );
};
