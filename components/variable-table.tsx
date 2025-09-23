import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import clsx from "clsx";

import StatusChip from "./variable-status-chip";

import { VariableStatus } from "@/types/variable";

interface VariableTableProps {
  data: {
    key: string;
    value: string;
  }[];
  statuses: Record<string, VariableStatus>;
}

export default function VariableTable({ data, statuses }: VariableTableProps) {
  return (
    <div>
      <>
        <h2 className="text-lg font-semibold">Preview</h2>
        <p className="text-sm text-default-500">
          Review parsed variables before syncing.
        </p>
      </>
      <Table
        removeWrapper
        aria-label="GitLab variables preview"
        className="py-3"
      >
        <TableHeader>
          <TableColumn width="40%">Key</TableColumn>
          <TableColumn width="40%">Value</TableColumn>
          <TableColumn className="w-32">Status</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No variables parsed.">
          {data.map(({ key, value }) => (
            <TableRow key={key}>
              <TableCell className="font-medium">{key}</TableCell>
              <TableCell>
                <div
                  className={clsx(
                    "max-w-xl",
                    value.length
                      ? "truncate font-mono text-xs"
                      : "italic text-default-400"
                  )}
                  title={value}
                >
                  {value.length ? value : "(empty)"}
                </div>
              </TableCell>
              <TableCell>
                <StatusChip status={statuses[key] ?? "pending"} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
