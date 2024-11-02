import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import { VoteData } from './@types';
import { processVote } from './voteCommon';

// [-0---] [-1-] [-2----------]
// npm run votes "${VOTE_ROOT}"

if (argv.length < 3) {
    console.error('Missing vote root argument');
    process.exit(1);
}

const voteRoot = argv[2];
const votesDir = `${voteRoot}/raw/`

const jsonFiles = [];
findFiles(votesDir, jsonFiles);

console.log(`Found ${jsonFiles.length} votes in ${votesDir}`);

// Process each JSON file
jsonFiles.forEach(filePath => {
    const fileContent = readFileSync(filePath, 'utf-8');
    const voteData: VoteData = JSON.parse(fileContent);
    if (voteData && voteData.commentId) {
        delete voteData.type;
        processVote(voteRoot, voteData);
    } else {
        console.warn(`No commentId found in file ${filePath}`);
    }
});

function findFiles(from: string, fileList: string[]) {
    try {
        console.log('reading path ', from);
        readdirSync(from).forEach(file => {
            const filePath = path.join(from, file);
            if (file.endsWith(".json")) {
                fileList.push(filePath);
            } else if ( !file.endsWith(".svg") ){
                const stat = statSync(filePath);
                if (stat.isDirectory()) {
                    // RECURSE / TRAVERSE
                    findFiles(filePath, fileList);
                }
            }
        });
    } catch (err) {
        console.error(err);
    }
}