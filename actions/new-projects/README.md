# New Projects Action

Aggregates new project checklists by scanning GitHub issues for project onboarding status and generating comprehensive reports.

## Description

This action searches for project onboarding issues in the `commonhaus/foundation-internal` repository and aggregates checklist progress into markdown reports. It tracks the status of new project applications and their onboarding progress.

## Usage

```yaml
- uses: commonhaus/vote-record-actions/actions/new-projects
  with:
    markdown_dir: 'reports/new-projects'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `markdown_dir` | Directory for generated markdown content | No | - |
| `bot-email` | Email for git config | No | `41898282+github-actions[bot]@users.noreply.github.com` |
| `bot-name` | Name for git config | No | `GitHub Action` |
| `commit-message` | Commit message | No | `=� Auto-update new project report` |
| `branch` | Branch to push to | No | `main` |

## Outputs

| Output | Description |
|--------|-------------|
| `report_updated` | True if changes to report were made |

## Features

- **Issue Scanning**: Searches for "Project onboarding:" issues in foundation-internal repository
- **Checklist Aggregation**: Parses checklist items from issue bodies
- **Progress Tracking**: Monitors completion status of onboarding tasks
- **Template Processing**: Uses project onboarding template for reference
- **Markdown Generation**: Creates structured reports with project status
- **Git Integration**: Automatically commits and pushes changes

## How It Works

1. **Template Retrieval**: Fetches the project onboarding template from the repository
2. **Issue Discovery**: Searches for open issues with "Project onboarding:" in the title
3. **Checklist Parsing**: Extracts checkbox items from issue bodies
4. **Progress Analysis**: Compares completed vs total checklist items
5. **Report Generation**: Creates markdown summaries of project status
6. **Automated Commit**: Commits changes if reports are updated

## Requirements

- Node.js 20
- GitHub token with access to `commonhaus/foundation-internal` repository
- Write permissions to target repository

## Example Workflow

```yaml
name: project-update

on:
  workflow_dispatch:

  issues:
    types: [opened, edited, closed, reopened]

env:
  GH_BOT_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com"
  GH_BOT_NAME: "GitHub Action"

jobs:
  update_report:
    if: startsWith("${{github.event.issue.title}}", "Project onboarding")
    runs-on: ubuntu-latest
    concurrency:
      group: project-update

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: main

      - uses: commonhaus/vote-record-actions/actions/new-projects@1.0.5
        id: new-projects
        with:
          markdown_dir: checklists
```

## Output Format

The action generates markdown reports containing:

- Project names and associated GitHub issue links
- Checklist completion progress
- Individual task status (completed/pending)
- Summary statistics across all projects

## Search Query

The action searches for issues using the query:

```text
repo:commonhaus/foundation-internal type:issue "Project onboarding:" is:open
```
