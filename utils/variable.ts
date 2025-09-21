export const parseEnvInput = (input: string) => {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      const value = rest.length ? rest.join("=") : "";

      return {
        key: key.trim(),
        value,
      };
    })
    .filter((entry) => entry.key.length);
};

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
