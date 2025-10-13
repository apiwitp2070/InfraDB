# InfraDB

InfraDB (read as Infra dashboard) let you shorten some of your repetitive workflow with some help from various services REST Api.

> ⚠️ This project stores data in the browser's IndexedDB. Treat this project as a private/personal tool and avoid using it on shared or untrusted machines.

## Features

### Gitlab

- Search GitLab projects and store them locally for easy access and uses with other features.
- Create and update multiple GitLab project variables with a few click. Come with status tracking, skipping empty values.
- Trigger GitLab pipelines per branch, view most recent pipeline executions.

### Github

- Create and update GitHub repository secrets. With status tracking, skipping empty values option.

### Cloudflare

- Create Cloudflare R2 buckets from a single dashboard and automatically enable the dev domain.

## Getting Started

### Prerequisites

- Node.js 20 or later (Older version is not tested but might work).
- A personal access token for service you want to use with required permission scope.

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

- Visit the Settings page (top-right navbar icon) to setup your tokens.
- Use the GitLab Projects page to search and persist projects, refresh their metadata, and copy project IDs.
- Manage environment variables for a project on the GitLab Variables page; select a saved project or paste an ID manually.
- Trigger branches' pipelines and see recent pipelines execution on the GitLab Pipelines page.
- Manage GitHub repository secrets via the GitHub Secrets page.
- Use the Cloudflare R2 page to create new bucket and grab the dev domain in a single click.
