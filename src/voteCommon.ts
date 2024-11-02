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