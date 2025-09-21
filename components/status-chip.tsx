import { VariableStatus } from "@/utils/variable";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";

export default function StatusChip({ status }: { status: VariableStatus }) {
  switch (status) {
    case "pending":
      return (
        <Chip radius="sm" size="sm" variant="flat">
          Pending
        </Chip>
      );
    case "in-progress":
      return (
        <Chip
          radius="sm"
          size="sm"
          variant="flat"
          color="primary"
          startContent={<Spinner color="primary" size="sm" />}
        >
          Updating
        </Chip>
      );
    case "success":
      return (
        <Chip radius="sm" size="sm" variant="flat" color="success">
          Completed
        </Chip>
      );
    case "skipped":
      return (
        <Chip radius="sm" size="sm" variant="flat" color="warning">
          Skipped
        </Chip>
      );
    case "error":
    default:
      return (
        <Chip radius="sm" size="sm" variant="flat" color="danger">
          Error
        </Chip>
      );
  }
}
