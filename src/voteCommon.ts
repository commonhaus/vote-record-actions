import { Eta } from "eta";
import path from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { Result, VoteCategory, VoteData } from "./@types";
import { spawnSync } from 'node:child_process';

const scriptDir = process.cwd();
const commentQuery = path.join(scriptDir, 'graphql/query.comment.graphql');

export function processVote(voteRoot: string, voteData: VoteData): void {
    console.log(`Check vote data in comment ${voteData.commentId}`);
    const repo = voteData.repoName;

    const sortedCategories: [string, VoteCategory][] = voteData.categories 
            ? Object.entries(voteData.categories).sort() 
            : [];

    const resultBody = voteData.manualCloseComments 
            ? voteData.manualCloseComments.body.split('\n').map(l => `> ${l}`).join('\n') 
            : '';

    const eta = new Eta({
        views: path.join(scriptDir, "templates"),
        autoTrim: false
    });
    const data = eta.render("./result", {
        repo,
        voteData,
        resultBody,
        sortedCategories,
        tags: voteData.tags
                .filter(x => x !== "vote" && x !== "closed")
                .map(x => `"${x}"`).join(", "),
    });
    
    const resultsVotePath = `${voteRoot}/results/${repo}/`;
    const rawDataPath = `${voteRoot}/raw/${repo}/`
    
    if (!existsSync(resultsVotePath)) {
        mkdirSync(resultsVotePath, { recursive: true });
    }
    if (!existsSync(rawDataPath)) {
        mkdirSync(rawDataPath, { recursive: true });
    }
    
    console.log(`Writing data to ${rawDataPath}${voteData.number}.json`);
    writeFileSync(`${rawDataPath}${voteData.number}.json`, JSON.stringify(voteData, null, 2));
    
    console.log(`Writing record to ${resultsVotePath}${voteData.number}.md`);
    writeFileSync(`${resultsVotePath}${voteData.number}.md`, data);    
}

// Function to fetch the vote data from the GitHub API
// and transform/normalize it for further processing
export function fetchVoteData(commentId: string): VoteData {
    const jsonData = runGraphQL(commentId, commentQuery);
    const result: Result = JSON.parse(jsonData);
    
    // If we have errors, we're done.
    if (result.errors || !result.data) {
        console.error(result);
        process.exit(1);
    }
    
    // If we can't find the parent item, we're done
    const comment = result.data.node;
    const item = comment.discussion || comment.issue;
    if (!item) {
        console.error(comment);
        process.exit(1);
    }

    const match = comment.body.match(/<!-- vote::data ([\s\S]*?)-->/);
    const voteData: VoteData = match ? JSON.parse(match[1].trim()) : {};
    
    voteData.commentId = comment.id;
    voteData.github = item.url;
    voteData.itemId = item.id;
    voteData.title = item.title;
    voteData.number = item.number;
    voteData.repoName = item.repository.nameWithOwner;
    voteData.date = comment.createdAt;
    voteData.updated = comment.updatedAt ? comment.updatedAt : comment.createdAt;
    
    voteData.tags = item.labels.nodes.map(label => label.name)
        .filter(x => x !== 'notice');

    voteData.closed = item.closed;
    if (item.closed) {
        voteData.closedAt = item.closedAt;
        voteData.tags.push('closed');
    }
    if (voteData.missingGroupActors) {
        for(const actor of voteData.missingGroupActors) {
            actor.url = actor.url.replace('api.github.com/users', 'github.com');
        }
    }
    if (voteData.categories) {
        for (const category of Object.values(voteData.categories)) {
            // +1, -1, laugh, confused, heart, hooray, rocket, eyes
            // thumbs_up, plus_one, thumbs_down, minus_one
            category.reactions = category.reactions.map((r: string) =>
                r.toLowerCase().replace('+1', '👍')
                    .replace('thumbs_up', '👍')
                    .replace('plus_one', '👍')
                    .replace('-1', '👎')
                    .replace('thumbs_down', '👎')
                    .replace('minus_one', '👎')
                    .replace('laugh', '😄')
                    .replace('confused', '😕')
                    .replace('heart', '❤️')
                    .replace('hooray', '🎉')
                    .replace('rocket', '🚀')
                    .replace('eyes', '👀')
            );
        }
    
        const ignored: VoteCategory | undefined = voteData.categories['ignored'];
        if (ignored) {
            voteData.ignored = ignored;
            delete voteData.categories['ignored'];
        }
    }

    voteData.progress = voteProgress(voteData);
    return voteData;
}

// Use GH CLI to retrieve the GH Comment
function runGraphQL(commentId: string, filePath: string): string {
    const { status, stdout, stderr } = spawnSync('gh',
        [
            'api', 'graphql',
            '-F', `commentId=${commentId}`,
            '-F', `query=@${filePath}`,
        ]
    );

    const output = new TextDecoder().decode(stdout).trim();
    console.log(status, filePath, new TextDecoder().decode(stderr));
    console.assert(status === 0);
    return output;
}

// Function to round down to the nearest multiple of 10
function roundDownToNearest10(num: number): number {
    return Math.floor(num / 10) * 10;
}

function threshold(voteData: VoteData): number {
    switch(voteData.votingThreshold) {
        case 'fourfifths':
            return Math.ceil(voteData.groupSize * 4 / 5);
        case 'twothirds':
            return Math.ceil(voteData.groupSize * 2 / 3);
        case 'majority':
            return Math.ceil(voteData.groupSize / 2)
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
        console.log("progress", progress, roundedProgress);

        url = `https://www.commonhaus.org/votes/progress-${roundedProgress}.svg`;
    }
    return url;
}
