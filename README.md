# Git Utils

Git Utils is a Next.js + HeroUI web app that helps you manage common GitLab and GitHub REST API workflows from a single dashboard.

> ⚠️ This project stores data in the browser's IndexedDB. Treat this project as a private/personal tool and avoid using it on shared or untrusted machines.

## Features

### Gitlab

- Search GitLab projects and store them locally for easy access and uses with other features.
- Create and update multiple GitLab project variables with a few click. Come with status tracking, skipping empty values.
- Trigger GitLab pipelines per branch, view most recent pipeline executions.

### Github

- Create and update GitHub repository secrets. With status tracking, skipping empty values option.

## Getting Started

### Prerequisites

- Node.js 20 or later (Older version is not tested but might work).
- A GitLab personal access token and a GitHub PAT with access to the repositories.

### Running Development Server

1. Clone the repository.
2. Install dependencies:

```bash
bun install
```

3. Start the development server:

```bash
bun dev
```

4. Website is running at `http://localhost:3000` by default.

## Usage

- Visit the Settings page (top-right navbar icon) to enter your GitLab and GitHub tokens.
- Use the GitLab Projects page to search and persist projects, refresh their metadata, and copy project IDs.
- Manage environment variables for a project on the GitLab Variables page; select a saved project or paste an ID manually.
- Trigger branches' pipelines and see recent pipelines execution on the GitLab Pipelines page.
- Manage GitHub repository secrets via the GitHub Secrets page.
