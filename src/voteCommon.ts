import { Eta } from "eta";
import path from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { VoteCategory, VoteData } from "./@types";

const scriptDir = process.cwd();

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
    
    const relativeVotePath = `${voteRoot}/results/${repo}/`;
    const relativeAssetPath = `${voteRoot}/raw/${repo}/`
    
    if (!existsSync(relativeVotePath)) {
        mkdirSync(relativeVotePath, { recursive: true });
    }
    if (!existsSync(relativeAssetPath)) {
        mkdirSync(relativeAssetPath, { recursive: true });
    }
    
    console.log(`Writing data to ${relativeAssetPath}${voteData.number}.json`);
    writeFileSync(`${relativeAssetPath}${voteData.number}.json`, JSON.stringify(voteData, null, 2));
    
    console.log(`Writing record to ${relativeVotePath}${voteData.number}.md`);
    writeFileSync(`${relativeVotePath}${voteData.number}.md`, data);    
}