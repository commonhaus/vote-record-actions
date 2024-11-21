import { VoteData } from './@types';
import path from 'node:path';
import { argv, exit } from 'node:process';
import { fetchVoteData, findFiles, processVote } from './voteCommon';
import { readdirSync, readFileSync, statSync } from 'node:fs';

// [-0---] [-1-] [-2----------] [all]
// npm run votes "${VOTE_ROOT}"

if (argv.length < 3) {
    console.error('Missing vote root argument');
    process.exit(1);
}

const voteRoot = argv[2];
const votesDir = `${voteRoot}/raw/`;

const all = argv.length > 3 && argv[3] === 'all';

const jsonFiles = [];
findFiles(votesDir, jsonFiles);

console.log(`Found ${jsonFiles.length} votes in ${votesDir} (all: ${all})`);

// Process each JSON file
jsonFiles.forEach(filePath => {
    const fileContent = readFileSync(filePath, 'utf-8');
    let voteData: VoteData = JSON.parse(fileContent);
    if (voteData && voteData.commentId) {
        if (all || !voteData.closed) {
            voteData = fetchVoteData(voteData.commentId);
            processVote(voteRoot, voteData);
        } else {
            console.log(` x  closed ${voteData.repoName}#${voteData.number} (${voteData.commentId})`);
        }
    } else {
        console.warn(`No commentId found in file ${filePath}`);
    }
});