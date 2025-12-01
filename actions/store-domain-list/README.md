# Store Domain List Action

Stores domain registration information and merges domain expiry dates into calendar files with automatic git commits.

## Description

This action receives domain registration data via repository dispatch events and creates two types of outputs:

1. A sorted markdown table listing all domains with their status flags
2. Calendar files (organized by year) that track domain expiry dates

It's designed to help manage domain portfolios by providing a clear overview of domain status and upcoming renewal dates.

## Usage

```yaml
- uses: commonhaus/vote-record-actions/actions/store-domain-list
  with:
    domain_list: ${{ github.event.client_payload.domains }}
    date: '2024-01-15'
    list_dir: 'checklists'
    calendar_dir: 'calendars'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `domain_list` | JSON object containing domain list (array of domain records) | Yes | - |
| `date` | Date in YYYY-MM-DD format | Yes | - |
| `list_dir` | Directory to store domain list markdown file | No | `checklists` |
| `calendar_dir` | Directory to store calendar files (if unset, calendars won't be generated) | No | - |
| `vote_actions_release` | Published version of shared actions | No | `latest` |
| `bot-email` | Email for git config | No | `41898282+github-actions[bot]@users.noreply.github.com` |
| `bot-name` | Name for git config | No | `GitHub Action` |
| `commit-message` | Commit message | No | `📋 Auto-update domain list` |
| `branch` | Branch to push to | No | `main` |

## Outputs

| Output | Description |
|--------|-------------|
| `updated` | True if changes were made |

## Domain Record Format

Each domain record should have the following structure:

```json
{
  "name": "example.com",
  "expires": "2027-03-15T00:00:00Z",
  "isExpired": false,
  "isLocked": true,
  "autoRenew": true,
  "isOurDNS": true
}
```

## Features

### Domain List Generation

- **Sorted Table**: Domains are alphabetically sorted by name
- **Status Flags**: Visual checkmarks (✓) for active flags
- **Markdown Format**: Easy to read and render in GitHub
- **Expiry Display**: Shows expiration dates or "N/A" for domains without expiry

### Calendar Integration

- **Year-based Files**: Separate calendar file for each expiry year (e.g., `2027.md`, `2028.md`)
- **Template Support**: Uses `_template.md` if present when creating new year files
- **Custom Sections**: Preserves non-standard month sections (e.g., "Monthly")
- **Entry Preservation**: Keeps existing calendar entries, only adds new domain expiries
- **Duplicate Prevention**: Won't add the same domain expiry twice
- **UTC Dates**: All dates handled in UTC to avoid timezone issues
- **Sorted Entries**: Calendar entries sorted by day within each month
- **Auto-generation**: Creates basic calendar structure if no template exists

### Git Integration

- **Retry Logic**: Automatically retries push operations (5 attempts with exponential backoff)
- **Conflict Resolution**: Uses `git pull --rebase` to handle concurrent updates
- **Atomic Commits**: Only commits if changes are detected

## How It Works

1. **Setup**: Configures git, sets up Node.js, downloads compiled actions
2. **Domain List**: Generates `domains.md` with sorted table in `list_dir`
3. **Calendar Update** (if `calendar_dir` is set):
   - Parses existing calendar files or template
   - Merges domain expiry dates into appropriate year files
   - Preserves existing entries and custom sections
   - Formats output with sorted entries
4. **Git Operations**: Stages, commits, and pushes changes with retry logic

## File Organization

### Domain List

```txt
{list_dir}/
└ domains.md
```

Example `domains.md`:

```markdown
# Domain List

*Last updated: 2024-01-15*

| Domain | Expires | Expired | Locked | Auto-Renew | NC DNS |
|--------|---------|---------|--------|------------|--------|
| example.com | 2027-03-15 | | ✓ | ✓ | ✓ |
| test.org | 2028-06-20 | | | ✓ | |
```

### Calendar Files

```txt
{calendar_dir}/
├ _template.md      (optional, used for new years)
├ 2027.md
└ 2028.md
```

Example calendar file:

```markdown
# 2027

## Monthly

- 15: Monthly team sync

## January

- 24: Namecheap - relation.to (Hibernate)

## March

- 15: Domain expires: example.com
- 16: Namecheap - nhibernate.org (Hibernate)
```

## Requirements

- Node.js 20
- GitHub token with repository access
- Write permissions to target repository
- Valid JSON domain list data

## Example Workflow

### Storage Repository (This Action)

```yaml
name: Store Domain List
on:
  repository_dispatch:
    types: [store-domain-list]

jobs:
  store-domains:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: commonhaus/vote-record-actions/actions/store-domain-list
        with:
          domain_list: ${{ github.event.client_payload.domains }}
          date: ${{ github.event.client_payload.date }}
          list_dir: 'data/domains'
          calendar_dir: 'data/calendars'
```

### Source Repository (Dispatching the Event)

```yaml
- name: Dispatch domain list
  uses: peter-evans/repository-dispatch@v3
  with:
    token: ${{ secrets.DISPATCH_TOKEN }}
    repository: org/data-repo
    event-type: store-domain-list
    client-payload: |
      {
        "date": "${{ env.TODAY }}",
        "domains": ${{ toJson(steps.fetch-domains.outputs.domains) }}
      }
```

## Environment Variables

The action uses these environment variables internally:

- `DOMAIN_LIST`: JSON string containing domain data
- `LIST`: Directory for domain list file
- `CALENDAR`: Directory for calendar files (optional)

## Calendar Template

If you create a `_template.md` file in the calendar directory, it will be used as a template for new year files. The template should contain any recurring entries you want in each year's calendar:

```markdown
# {year}

## Monthly

- 15: Monthly domain review
- 01: Check upcoming expirations

## January

- .

## February

- .

...
```

The action will:

1. Copy the template structure
2. Replace `{year}` with the actual year
3. Add domain expiries to appropriate months
4. Preserve the "Monthly" and other custom sections

## Error Handling

The action will exit with an error if:

- Required environment variables are missing
- JSON parsing of domain list fails
- File system operations fail
- Git push fails after 5 retry attempts

## Notes

- Symlinks are supported (useful for linking `_template.md` across multiple calendar directories)
- Placeholder entries (`- .`) in templates are preserved during parsing
- Calendar files use UTC dates exclusively to avoid timezone issues
- The action handles concurrent pushes through retry logic with exponential backoff
