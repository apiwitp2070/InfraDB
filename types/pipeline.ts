export type BranchStatus = "idle" | "triggering" | "success" | "error";

export interface BranchState {
  name: string;
  default: boolean;
  status: BranchStatus;
  lastTriggeredAt?: string;
  error?: string;
}

export type PipelineSummary = {
  id: number;
  status: string;
  ref: string;
  sha: string;
  webUrl: string;
  createdAt: string;
  updatedAt: string;
};

export interface PipelineProjectState {
  id: string;
  name: string;
  namespace: string;
  branches: BranchState[];
  pipelines: PipelineSummary[];
}

export type StoredBranch = {
  name: string;
  default: boolean;
};

export type StoredProject = {
  id: string;
  name: string;
  namespace: string;
  branches: StoredBranch[];
  pipelines?: PipelineSummary[];
};
