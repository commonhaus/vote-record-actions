import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { argv } from "node:process";
import { Eta } from "eta";
import type { VoteData } from "./@types";
import { findFiles } from "./voteCommon";

// [-0---] [-1----] [-2---------]
// npm run genIndex "${VOTE_ROOT}"

const scriptDir = process.cwd();

const voteRoot = argv[2];
const sourcePath = `${voteRoot}/raw`;
const resultPath = `${voteRoot}/results`;
const targetFile = `${voteRoot}/README.md`;

interface ContentMap {
    voteData: VoteData;
    filePath: string;
}

const contents: ContentMap[] = [];

const jsonFiles = [];
findFiles(voteRoot, jsonFiles);

// Process each JSON file
for (const filePath of jsonFiles) {
    try {
        const fileContent = readFileSync(filePath, "utf-8");
        const voteData: VoteData = JSON.parse(fileContent);
        if (voteData?.commentId && !voteData.closed) {
            contents.push({
                voteData,
                filePath,
            });
        }
    } catch (err) {
        console.error(err);
    }
}

try {
    const openVotes = contents
        .sort((a, b) =>
            a.filePath.toLowerCase().localeCompare(b.filePath.toLowerCase()),
        )
        .map((x) => {
            x.voteData.missingGroupActors = x.voteData.missingGroupActors || [];
            x.filePath = x.filePath
                .replace("json", "md")
                .replace(sourcePath, resultPath)
                .replace(voteRoot, ".");
            return x;
        });

    const eta = new Eta({
        views: path.join(scriptDir, "templates"),
        autoTrim: false,
    });

    const data = eta.render("./index", openVotes);
    console.log(`<--  ${targetFile}`);
    writeFileSync(targetFile, data);
} catch (err) {
    console.error(err);
}
