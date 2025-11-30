"use client";

import { Card, CardHeader } from "@heroui/card";
import Link from "next/link";

import TokenAlertBox from "@/components/token-alert-box";
import { siteConfig } from "@/config/site";
import { useTokenStorage } from "@/hooks/useTokenStorage";

export default function Home() {
  const { tokens, isReady } = useTokenStorage();

  const missingTokens = [
    { name: "GitLab", present: Boolean(tokens.gitlab) },
    { name: "GitHub", present: Boolean(tokens.github) },
    { name: "Cloudflare", present: Boolean(tokens.cloudflare) },
  ].filter((t) => !t.present);

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <p className="font-bold text-3xl text-title">InfraDB</p>

      {isReady &&
        missingTokens.map((token) => (
          <TokenAlertBox key={token.name} module={token.name} />
        ))}

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
