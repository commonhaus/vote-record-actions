# Vote Record Actions

Common TS Actions that parse/munge vote data stored in issue comments
care of the [haus-rules-bot](https://github.com/commonhaus/automation).

```bash
$ gh repo clone commonhaus/vote-record-actions -- --depth=1
$ cd vote-record-actions
$ npm ci

# Fetch the results from the bot comment on an issue
$ npm run votes ../votes IC_kwDOKRPTI86LlGLV

# Update an index that summarizes outstanding actions
$ npm run index ../votes
```

## Reusable workflows

Common workflows for dealing with pushed updates related to votes.

## Reusable actions

Composite actions.
