"use client";

import { Card, CardHeader } from "@heroui/card";
import { Alert } from "@heroui/alert";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { useTokenStorage } from "@/hooks/useTokenStorage";

export default function Home() {
  const { tokens, isReady } = useTokenStorage();
  const hasGitlabToken = Boolean(tokens.gitlab);
  const hasGithubToken = Boolean(tokens.github);
  const hasCloudflareToken = Boolean(tokens.cloudflare);
  const showMissingGitlabTokens = isReady && !hasGitlabToken;
  const showMissingGithubTokens = isReady && !hasGithubToken;
  const showMissingCloudflareToken = isReady && !hasCloudflareToken;

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <p className="font-bold text-3xl text-title">Git Utils</p>

      {showMissingGitlabTokens && <TokenAlertBox module="GitLab" />}

      {showMissingGithubTokens && <TokenAlertBox module="GitHub" />}

      {showMissingCloudflareToken && <TokenAlertBox module="Cloudflare" />}

      <p className="text-default-500">Quick Access</p>

      <div className="w-full grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {siteConfig.navMenuItems.map((menu) => (
          <Link href={menu.href} key={menu.href}>
            <Card
              shadow="none"
              className="border border-default-200 hover:border-primary"
            >
              <CardHeader>
                <p className="font-semibold">{menu.label}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// utils

function TokenAlertBox({ module }: { module: string }) {
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
