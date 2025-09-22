import { BranchState } from "@/types/pipeline";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";

export default function BranchStatusChip({ branch }: { branch: BranchState }) {
  switch (branch.status) {
    case "triggering":
      return (
        <Chip
          color="primary"
          radius="sm"
          size="sm"
          variant="flat"
          startContent={<Spinner color="primary" size="sm" />}
        >
          Triggering
        </Chip>
      );
    case "success":
      return (
        <Chip
          color="success"
          radius="sm"
          size="sm"
          variant="flat"
          title={branch.lastTriggeredAt}
        >
          Triggered
        </Chip>
      );
    case "error":
      return (
        <Chip
          color="danger"
          radius="sm"
          size="sm"
          variant="flat"
          title={branch.error}
        >
          Error
        </Chip>
      );
    case "idle":
    default:
      return (
        <Chip radius="sm" size="sm" variant="flat">
          Idle
        </Chip>
      );
  }
}
