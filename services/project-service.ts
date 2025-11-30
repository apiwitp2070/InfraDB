import { db } from "@/lib/db";
import type {
  PipelineProjectState,
  PipelineSummary,
  StoredProject,
} from "@/types/pipeline";

const reviveProjects = (stored: StoredProject[]): PipelineProjectState[] =>
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
  }));

export const getProjects = async (): Promise<PipelineProjectState[]> => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedProjects = await db.projects.toArray();
    return reviveProjects(storedProjects);
  } catch (error) {
    console.error("Failed to load GitLab projects from storage", error);
    return [];
  }
};

export const saveProjects = async (projects: PipelineProjectState[]) => {
  if (typeof window === "undefined") {
    return;
  }

  const serializedCorrected = projects.map<StoredProject>((project) => ({
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
      if (!serializedCorrected.length) {
        await db.projects.clear();
        return;
      }

      const existingIds = await db.projects.toCollection().primaryKeys();
      const nextIds = new Set(serializedCorrected.map((project) => project.id));
      const deletions = existingIds
        .map((id) => String(id))
        .filter((id) => !nextIds.has(id));

      if (deletions.length) {
        await db.projects.bulkDelete(deletions);
      }

      await db.projects.bulkPut(serializedCorrected);
    });
  } catch (error) {
    console.error("Failed to persist GitLab projects", error);
  }
};
