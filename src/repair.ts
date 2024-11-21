import { ItemsResult, VoteData } from './@types';
import { argv } from 'node:process';
import { discussQuery, fetchVoteData, findFiles, issueQuery, prQuery, processVote, runGraphQL } from './voteCommon';
import { readFileSync } from 'node:fs';

// [-0---] [-1-] [-2----------] [all]
// npm run votes "${VOTE_ROOT}"

if (argv.length < 3) {
    console.error('Missing vote root argument');
    process.exit(1);
}

const voteRoot = argv[2];
const votesDir = `${voteRoot}/raw/`;

const all = argv.length > 3 && argv[3] === 'all';
const repositories = all && argv.length > 4 ? argv.slice(4) : ['commonhaus/foundation'];
const seen: string[] = []; 

function labelsToString(labels: { name: string }[]) {
    return labels.map(l => l.name).join(', ');
}

function refreshItems(itemQuery: string, repository: string) {
    const parts = repository.split('/');
    const args = ['-F', `owner=${parts[0]}`, '-F', `name=${parts[1]}`];
    let jsonData = runGraphQL(itemQuery, args);
    let result: ItemsResult = JSON.parse(jsonData);
    if (result.errors || !result.data) {
        console.error(result);
    } else {
        const data = result.data.repository.discussions ||
                result.data.repository.issues ||
                result.data.repository.pullRequests;
        for (const item of data.nodes) {
            const labels = labelsToString(item.labels.nodes);
            if (labels.includes('vote/open')) {
                const match = item.body.match(/🗳️ Vote progress\].*?"([^"]+)"/);
                if (match && match[1]) {
                    const voteData = fetchVoteData(match[1]);
                    processVote(voteRoot, voteData);
                    seen.push(match[1]);
                }
            }
        }
    }
}

if (all) {
    repositories.forEach(repo => {
        console.log("Refreshing items for", repo);
        refreshItems(discussQuery, repo);
        refreshItems(issueQuery, repo);
        refreshItems(prQuery, repo);
    });
    console.log("Done. Refreshed", seen.length, "items\n\n");
}

const jsonFiles = [];
findFiles(votesDir, jsonFiles);
console.log(`\n\nFound ${jsonFiles.length} votes in ${votesDir} (all: ${all})`);

// Process each JSON file
jsonFiles.forEach(filePath => {
    const fileContent = readFileSync(filePath, 'utf-8');
    let voteData: VoteData = JSON.parse(fileContent);
    if (voteData && voteData.commentId && !seen.includes(voteData.commentId)) {
        if (all || !voteData.isDone) {
            voteData = fetchVoteData(voteData.commentId);
            processVote(voteRoot, voteData);
        } else {
            console.log(` x  closed ${voteData.repoName}#${voteData.number} (${voteData.commentId})`);
        }
    } else if ( !voteData.commentId ) {
        console.warn(`No commentId found in file ${filePath}`);
    }
});