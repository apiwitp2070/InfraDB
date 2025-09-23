import { Alert } from "@heroui/alert";
import clsx from "clsx";

import { StatusMessage } from "@/types/variable";

const COLOR_MAP: Record<StatusMessage["type"], "success" | "danger"> = {
  success: "success",
  error: "danger",
};

const TITLE_MAP: Record<StatusMessage["type"], string> = {
  success: "All good",
  error: "Something went wrong",
};

type AlertMessageProps = {
  message: StatusMessage | null;
  className?: string;
};

export default function AlertMessage({
  message,
  className,
}: AlertMessageProps) {
  if (!message) {
    return null;
  }

  const color = COLOR_MAP[message.type];
  const title = TITLE_MAP[message.type];

  return (
    <Alert
      className={clsx(className)}
      color={color}
      title={title}
      variant="flat"
    >
      {message.text}
    </Alert>
  );
}
