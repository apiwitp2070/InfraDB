# InfraDB

InfraDB (read as Infra dashboard) let you shorten some of your repetitive workflow with some help from various services REST Api.

> ⚠️ This project is intend to be used with private environment. Sensitive data are stored in the browser's storage locally. Treat this project as a private/personal tool and avoid using it on shared or untrusted machines.

## Features

### Gitlab

- Search GitLab projects and store them locally for easy access and uses with other features.
- Create and update multiple GitLab project variables with a few click. Come with status tracking, skipping empty values.
- Trigger GitLab pipelines per branch, view most recent pipeline executions.

### Github

- Create and update GitHub repository secrets. With status tracking, skipping empty values option.

### Cloudflare

- Create Cloudflare R2 buckets from a single dashboard and automatically enable the dev domain.

## Running Development Server

### Prerequisites

- Node.js 20 or later.
- A personal access token for service you want to use with required permission scope.

### Steps

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

## Usage Notice

1. Token is required to be set before using the service. Visit the Settings page from top-right key icon to setup your tokens. You don't need to set token for all of available service. Just configure for the one you need.

2. After setting your token, you should be able to use the service normally.
