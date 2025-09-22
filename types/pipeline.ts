export type BranchStatus = "idle" | "triggering" | "success" | "error";

export interface BranchState {
  name: string;
  default: boolean;
  status: BranchStatus;
  lastTriggeredAt?: string;
  error?: string;
}

export interface PipelineProjectState {
  id: string;
  name: string;
  namespace: string;
  branches: BranchState[];
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
};
