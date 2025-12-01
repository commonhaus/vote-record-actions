# Store Health Reports Action

Stores project health reports from repository dispatch events in an organized directory structure with automatic git commits.

## Description

This action receives health report data via repository dispatch events and stores them as JSON files organized by date. It's designed to archive project health metrics and analytics data from various repositories in a structured format.

## Usage

```yaml
- uses: commonhaus/vote-record-actions/actions/store-health-report
  with:
    reports: ${{ github.event.client_payload.reports }}
    start_date: '2024-01-15'
    report_directory: 'health-reports'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `reports` | JSON object containing health reports (key: repo full name, value: report data) | Yes | - |
| `start_date` | Start date in YYYY-MM-DD format | Yes | - |
| `report_directory` | Directory to store reports | No | `reports` |
| `vote_actions_release` | Published version of shared actions | No | `latest` |
| `bot-email` | Email for git config | No | `41898282+github-actions[bot]@users.noreply.github.com` |
| `bot-name` | Name for git config | No | `GitHub Action` |
| `commit-message` | Commit message | No | `🩺  Auto-update health report` |
| `branch` | Branch to push to | No | `main` |

## Outputs

| Output | Description |
|--------|-------------|
| `report_updated` | True if changes to report were made |

## Features

- **Repository Dispatch Integration**: Designed to work with GitHub's repository dispatch events
- **Date-based Organization**: Stores reports in directories organized by date
- **JSON Storage**: Preserves report data in structured JSON format
- **Automatic File Naming**: Converts repository names to safe filenames (replaces `/` with `_`)
- **Git Integration**: Automatically commits and pushes changes when reports are updated
- **Flexible Storage**: Configurable report directory location

## How It Works

1. **Data Reception**: Receives health report data through environment variables
2. **Directory Creation**: Creates date-based directory structure (`report_directory/start_date/`)
3. **File Storage**: Saves each repository's report as `{repo_owner}_{repo_name}.json`
4. **Git Operations**: Stages, commits, and pushes changes if reports are updated

## File Organization

Reports are stored in the following structure:

```text
{report_directory}/
└ {start_date}/
  ├ owner1_repo1.json
  ├ owner1_repo2.json
  └ owner2_repo1.json
```

## Requirements

- Node.js 20
- GitHub token with repository access
- Write permissions to target repository
- Valid JSON health report data

### Storage Repository (This Action)

```yaml
name: Store Health Reports
on:
  repository_dispatch:
    types: [store-health-reports]

jobs:
  store-reports:
    runs-on: ubuntu-latest
    permissions:
      content: write
    steps:

    - uses: actions/checkout@v4
    
    - uses: commonhaus/vote-record-actions/actions/store-health-report
      with:
        reports: ${{ github.event.client_payload.reports }}
        start_date: ${{ github.event.client_payload.start_date }}
        report_directory: 'data/health'
```

## Environment Variables

The action expects these environment variables to be set:

- `REPORTS`: JSON string containing health report data
- `START_DATE`: Report collection start date (YYYY-MM-DD format)  
- `REPORT_DIR`: Base directory for storing reports

## Error Handling

The action will exit with an error if:

- Required environment variables are missing
- JSON parsing of reports data fails
- File system operations fail
