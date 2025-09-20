"use client";

import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { ScrollShadow } from "@heroui/scroll-shadow";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";
import { Logo } from "@/components/icons";

const navItems = siteConfig.navItems;

const isPathActive = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function Sider() {
  const pathname = usePathname();

  if (!pathname) {
    return null;
  }

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-default-200 bg-content1/60 px-4 py-6 backdrop-blur-md">
      <NextLink className="flex items-center gap-2 px-2" href="/">
        <Logo className="text-primary" size={28} />
        <span className="text-base font-semibold tracking-tight">ACME</span>
      </NextLink>

      <Divider className="my-6" />

      <ScrollShadow className="flex-1 -mx-2 px-2" hideScrollBar>
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isPathActive(pathname, item.href);

            return (
              <Button
                key={item.href}
                as={NextLink}
                className="justify-start text-foreground"
                color={active ? "primary" : "default"}
                data-active={active}
                href={item.href}
                radius="sm"
                variant={active ? "flat" : "light"}
                fullWidth
              >
                {item.label}
              </Button>
            );
          })}
        </nav>
      </ScrollShadow>
    </aside>
  );
}
