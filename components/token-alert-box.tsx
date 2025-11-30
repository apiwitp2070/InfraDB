"use client";

import { Alert } from "@heroui/alert";
import Link from "next/link";

export default function TokenAlertBox({ module }: { module: string }) {
  return (
    <Alert
      variant="bordered"
      color="warning"
      className="w-full max-w-3xl bg-transparent"
      title={`Connect your ${module} providers`}
    >
      <p>
        Provide {module} user access token on the{" "}
        <Link href="/settings" className="underline">
          Settings
        </Link>{" "}
        page to start using related services.
      </p>
    </Alert>
  );
}
