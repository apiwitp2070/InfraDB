"use client";

import { Button } from "@heroui/button";
import { ScrollShadow } from "@heroui/scroll-shadow";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";

const sections = siteConfig.sidebarSections ?? [];

const isPathActive = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function Sidebar() {
  const pathname = usePathname();

  if (!pathname) {
    return null;
  }

  return (
    <aside className="hidden md:flex fixed inset-y-0 top-16 left-0 z-40 w-64 h-[calc[100vh-64px]] flex-col border-r border-default-200 bg-content1/60 px-4 py-6 backdrop-blur-md">
      <ScrollShadow hideScrollBar className="flex-1 -mx-2 px-2">
        <nav aria-label="Main navigation" className="flex flex-col gap-6">
          {sections.map((section) => (
            <div className="flex flex-col gap-2" key={section.label}>
              <p className="px-2 text-xs font-semibold uppercase text-default-400">
                {section.label}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = isPathActive(pathname, item.href);

                  return (
                    <Button
                      fullWidth
                      key={item.href}
                      as={NextLink}
                      className="justify-start text-foreground"
                      color={active ? "primary" : "default"}
                      data-active={active}
                      href={item.href}
                      radius="sm"
                      variant={active ? "flat" : "light"}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollShadow>
    </aside>
  );
}
