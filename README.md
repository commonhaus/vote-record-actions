# Vote Record Actions

Library/Utility to parse/munge vote data stored in issue comments care of the [haus-rules-bot](https://github.com/commonhaus/automation).

For version in the examples below, use `main` or a published release

## Count votes action

Fine grained action that looks for comments from the specified bot, and creates vote records based on the data in those comments.
It can also (optionally) create a file that lists outstanding/open votes.

```yaml
      - name: Count votes
        id: count_votes
        uses: commonhaus/vote-record-actions/.github/actions/count-votes@<version>
        with:
          repositories: "commonhaus/foundation"
          target_dir: "site/_generated/votes"
          branch: "main"
```

## Receive votes workflow

Common workflow for dealing with pushed updates related to votes.
This workflow uses the count-votes action

```yaml
  test_votes:
    uses: commonhaus/vote-record-actions/.github/workflows/receive-votes.yml@<version>
    with:
      repositories: "commonhaus-test/automation-test"
      vote_comment_bot: "commonhaus-test-bot[bot]"
      removeTags: "notice"
      target_dir: "votes/raw"
      markdown_dir: "votes/results"
      index_file: "votes/README.md"
    secrets: inherit
```

For version, use `main` or a published release

## Directly with node/TS

"Usage: node vote-record-actions/dist/votes.js [all|recent] jsonDir [--repos=org/repo1,org/repo2] [--md=mdDir] [--removeTag=tag1] --bot=bot-comment-login"

```bash
$ gh repo clone commonhaus/vote-record-actions -- --depth=1
$ cd vote-record-actions
$ npm ci
$ npm build

# Fetch the results from the bot comment on an issue
$ node ./dist/votes.js "~/votes/raw" --repos="commonhaus/foundation" --md="~/votes/results"

# Update an index that summarizes outstanding actions (references markdown results)
$ node ./dist/genIndex.js "~/votes/raw" "~/votes/results" "~/votes/README.md"
```
