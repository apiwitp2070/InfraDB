export type VariableStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "error"
  | "skipped";

export type StatusMessage = {
  type: "success" | "error";
  text: string;
};
