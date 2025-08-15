# Count Votes Action

Retrieves the most recent votes from GitHub repositories and updates vote records with automatic markdown generation and git commits.

## Description

This action scans specified GitHub repositories for voting activity (issues, PRs, discussions) and processes vote data to:
- Store vote results as JSON files
- Generate markdown summaries (optional)
- Create/update index files (optional) 
- Automatically commit changes to the repository

## Usage

```yaml
  steps:
    - name: Count votes
      id: count_votes
      uses: commonhaus/vote-record-actions/actions/count-votes@1.0.5
      with:
          repositories: "commonhaus/foundation"
          target_dir: "site/_generated/votes"
          branch: "main"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `repositories` | Comma-separated list of repositories (owner/name) to inspect | Yes | - |
| `target_dir` | Directory containing raw vote data (JSON) | No | `votes` |
| `markdown_dir` | Directory for generated markdown content (pages will not be generated if unset) | No | - |
| `index_file` | Name of index file to generate/update | No | - |
| `removeTags` | Comma-separated list of tags to remove from discovered votes | No | - |
| `vote_comment_bot` | Login of vote counting bot | No | - |
| `bot-email` | Email for git config | No | `41898282+github-actions[bot]@users.noreply.github.com` |
| `bot-name` | Name for git config | No | `GitHub Action` |
| `commit-message` | Commit message | No | `=� Auto-update GH Votes` |
| `branch` | Branch to push to | No | `main` |

## Outputs

| Output | Description |
|--------|-------------|
| `votes_updated` | True if changes to recorded votes were made |

## Features

- **Automatic Vote Collection**: Scans repositories for recent voting activity
- **JSON Storage**: Stores raw vote data in structured JSON format
- **Markdown Generation**: Creates human-readable markdown summaries
- **Index Generation**: Builds index files referencing markdown results
- **Git Integration**: Automatically commits and pushes changes
- **Tag Filtering**: Ability to remove specific tags from vote records

## Requirements

- Node.js 20
- GitHub token with repository access
- Write permissions to target repository
