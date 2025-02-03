import { spawnSync } from "node:child_process";
import path, { dirname } from "node:path";
import type {
    CombinedResult,
    ItemWithComments,
    VoteCategory,
    VoteConfig,
    VoteData,
} from "../@types";

const scriptRoot = dirname(import.meta.dirname);
const botcommentquery = path.join(
    scriptRoot, // parent of dist dir
    "graphql/query.botcomment.graphql",
);
const openVotesString =
    'commenter:haus-rules-bot[bot] sort:updated-desc label:"vote/open"';
const allVotesString = "commenter:haus-rules-bot[bot] sort:updated-desc";

export function queryVotes(voteConfig: VoteConfig): VoteData[] {
    const votes: VoteData[] = [];

    const suffix = voteConfig.options.repositories
        ? voteConfig.options.repositories
              .map((repo) => ` repo:${repo}`)
              .join("")
        : "";
    const query =
        (voteConfig.options?.all ? allVotesString : openVotesString) + suffix;
    const jsonData = runGraphQL(botcommentquery, [
        "-F",
        `searchQuery=${query}`,
    ]);
    const result: CombinedResult = JSON.parse(jsonData);

    // If we have errors, we're done.
    if (result.errors || !result.data) {
        console.error(result);
        process.exit(1);
    }

    // Issues and PRs
    const issues = result.data.issuesAndPRs.nodes || [];
    for (const item of issues) {
        const voteData = fetchVoteData(voteConfig, item);
        if (voteData) {
            votes.push(voteData);
        }
    }

    // Discussions
    const discussions = result.data.discussions.nodes || [];
    for (const discussion of discussions) {
        const voteData = fetchVoteData(voteConfig, discussion);
        if (voteData) {
            votes.push(voteData);
        }
    }
    return votes;
}

// Function to fetch the vote data from the GitHub API
// and transform/normalize it for further processing
export function fetchVoteData(
    voteConfig: VoteConfig,
    item: ItemWithComments,
): VoteData | null {
    const comments = item.comments.nodes;
    if (!comments) {
        console.log(
            `xxx ${item.repository.nameWithOwner}#${item.number} - no comments found`,
        );
        return null;
    }
    comments.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const comment = comments[0];

    const match = comment.body.match(/<!-- vote::data ([\s\S]*?)-->/);
    if (!comment.author.login.includes("haus-rules-bot") || !match) {
        console.log(
            `xxx ${item.repository.nameWithOwner}#${item.number} - no vote data found`,
        );
        return null;
    }

    const voteData: VoteData = match ? JSON.parse(match[1].trim()) : {};
    voteData.commentId = comment.id;
    voteData.github = item.url;
    voteData.itemId = item.id;
    voteData.title = item.title;
    voteData.number = item.number;
    voteData.repoName = item.repository.nameWithOwner;
    voteData.date = comment.createdAt;
    voteData.updated = comment.updatedAt
        ? comment.updatedAt
        : comment.createdAt;

    voteData.tags = item.labels.nodes.map((label) => label.name);
    if (voteConfig.options?.removeTags) {
        voteData.tags = voteData.tags.filter(
            (tag) => !voteConfig.options.removeTags.includes(tag),
        );
    }

    voteData.closed = item.closed;
    if (item.closed) {
        voteData.closedAt = item.closedAt;
        voteData.tags.push("closed");
    }
    if (voteData.missingGroupActors) {
        for (const actor of voteData.missingGroupActors) {
            actor.url = actor.url.replace("api.github.com/users", "github.com");
        }
    }
    if (voteData.categories) {
        for (const category of Object.values(voteData.categories)) {
            // +1, -1, laugh, confused, heart, hooray, rocket, eyes
            // thumbs_up, plus_one, thumbs_down, minus_one
            category.reactions = category.reactions.map((reaction: string) =>
                reaction
                    .toLowerCase()
                    .replace("+1", "👍")
                    .replace("thumbs_up", "👍")
                    .replace("plus_one", "👍")
                    .replace("-1", "👎")
                    .replace("thumbs_down", "👎")
                    .replace("minus_one", "👎")
                    .replace("laugh", "😄")
                    .replace("confused", "😕")
                    .replace("heart", "❤️")
                    .replace("hooray", "🎉")
                    .replace("rocket", "🚀")
                    .replace("eyes", "👀"),
            );
        }

        const ignored: VoteCategory | undefined = voteData.categories.ignored;
        if (ignored) {
            voteData.ignored = ignored;
            voteData.categories.ignored = undefined;
        }
    }

    voteData.progress = voteProgress(voteData);
    return voteData;
}

// Use GH CLI to retrieve the GH Comment
export function runGraphQL(filePath: string, custom: string[] = []): string {
    const { status, stdout, stderr } = spawnSync("gh", [
        "api",
        "graphql",
        ...custom,
        "-F",
        `query=@${filePath}`,
    ]);

    const output = new TextDecoder().decode(stdout).trim();
    if (status !== 0) {
        console.log(status, filePath, new TextDecoder().decode(stderr));
    }
    console.assert(status === 0);
    return output;
}

// Function to round down to the nearest multiple of 10
function roundDownToNearest10(num: number): number {
    return Math.floor(num / 10) * 10;
}

function threshold(voteData: VoteData): number {
    switch (voteData.votingThreshold) {
        case "fourfifths":
            return Math.ceil((voteData.groupSize * 4) / 5);
        case "twothirds":
            return Math.ceil((voteData.groupSize * 2) / 3);
        case "majority":
            return Math.ceil(voteData.groupSize / 2);
        default: // all
            return voteData.groupSize;
    }
}

function voteProgress(voteData: VoteData) {
    const requiredVotes = threshold(voteData);

    let url = "https://www.commonhaus.org/votes/vote-unknown.svg";
    if (voteData.closed) {
        url = "https://www.commonhaus.org/votes/vote-closed.svg";
    } else if (voteData.hasQuorum) {
        url = "https://www.commonhaus.org/votes/vote-quorum.svg";
    } else {
        const progress = voteData.groupVotes / requiredVotes;
        const roundedProgress = roundDownToNearest10(progress * 100) / 10; // Convert to percentage and round up
        url = `https://www.commonhaus.org/votes/progress-${roundedProgress}.svg`;
    }
    return url;
}
