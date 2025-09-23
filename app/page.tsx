import { Card, CardHeader } from "@heroui/card";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="font-bold text-3xl text-title">Git Utils</p>

      <p>Quick Access</p>

      <div className="w-full grid lg:grid-cols-4 gap-4 mt-6">
        {siteConfig.navMenuItems.map((menu) => {
          return (
            <Link href={menu.href} key={menu.href}>
              <Card shadow="none" className="border border-gray-300">
                <CardHeader>
                  <p className="font-semibold">{menu.label}</p>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
