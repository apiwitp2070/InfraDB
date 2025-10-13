export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "InfraDB",
  description: "Helper tools for GitLab, GitHub, and Cloudflare REST APIs.",
  navItems: [
    {
      label: "GitLab Projects",
      href: "/gitlab/project",
    },
    {
      label: "GitLab Variables",
      href: "/gitlab/variables",
    },
    {
      label: "GitLab Pipelines",
      href: "/gitlab/pipelines",
    },
    {
      label: "GitHub Secrets",
      href: "/github/secrets",
    },
    {
      label: "Cloudflare R2",
      href: "/cloudflare/r2",
    },
  ],
  navMenuItems: [
    {
      label: "GitLab Projects",
      href: "/gitlab/project",
    },
    {
      label: "GitLab Variables",
      href: "/gitlab/variables",
    },
    {
      label: "GitLab Pipelines",
      href: "/gitlab/pipelines",
    },
    {
      label: "GitHub Secrets",
      href: "/github/secrets",
    },
    {
      label: "Cloudflare R2",
      href: "/cloudflare/r2",
    },
    {
      label: "Settings",
      href: "/settings",
    },
  ],
  sidebarSections: [
    {
      label: "GitLab",
      items: [
        {
          label: "Projects",
          href: "/gitlab/project",
          color: "bg-warning-300",
        },
        {
          label: "Variables",
          href: "/gitlab/variables",
          color: "bg-warning-300",
        },
        {
          label: "Pipelines",
          href: "/gitlab/pipelines",
          color: "bg-warning-300",
        },
      ],
    },
    {
      label: "GitHub",
      items: [
        {
          label: "Secrets",
          href: "/github/secrets",
          color: "bg-primary-100",
        },
      ],
    },
    {
      label: "Cloudflare",
      items: [
        {
          label: "R2 Buckets",
          href: "/cloudflare/r2",
          color: "bg-secondary-200",
        },
      ],
    },
  ],
};
