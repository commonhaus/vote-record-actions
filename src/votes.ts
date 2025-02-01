import type { VoteConfig } from "./@types";
import { recordVote } from "./lib/voteRecords";
import { queryVotes } from "./lib/voteResults";

const usage =
    "Usage: npm run votes [all|recent] jsonDir [--repos=org/repo1,org/repo2] [--md=mdDir] [--removeTag=tag1]";

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error(usage);
    process.exit(1);
}

const config: VoteConfig = {
    options: {},
};
for (const arg of args) {
    console.log(arg);
    if (arg.startsWith("--repos=")) {
        config.options.repositories = arg.slice(8).split(",");
    } else if (arg === "all" || arg === "recent") {
        // filter out recent, not a dir
        config.options.all = arg === "all";
    } else if (arg.startsWith("--md=")) {
        config.markdownDir = arg.slice(5);
    } else if (arg.startsWith("--removeTag=")) {
        config.options.removeTags = arg.slice(12).split(",");
    } else {
        // only required parameter
        config.jsonDir = arg;
    }
}

if (!config.jsonDir || !config.options.repositories) {
    console.error("Missing required jsonDir parameter");
    console.error(usage);
    process.exit(1);
}

const votes = queryVotes(config);
console.log(
    "Found",
    votes.length,
    "votes in GitHub. (all:",
    config.options?.all,
    ")",
);
for (const vote of votes) {
    recordVote(config, vote);
}

console.log("Done.");
