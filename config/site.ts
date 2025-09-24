export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Git Utils",
  description: "Helper tools for GitLab and GitHub REST APIs.",
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
  ],
};
