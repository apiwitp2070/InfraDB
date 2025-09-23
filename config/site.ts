export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Git Utils",
  description: "Helper tools for GitLab and GitHub REST APIs.",
  navItems: [
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
          label: "Variables",
          href: "/gitlab/variables",
          color: "bg-orange-200",
        },
        {
          label: "Pipelines",
          href: "/gitlab/pipelines",
          color: "bg-orange-200",
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
