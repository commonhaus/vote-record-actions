import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { Eta } from "eta";
import type { VoteConfig, VoteData } from "./@types";
import { findFiles, makePathRelativeTo } from "./lib/voteRecords";

const scriptRoot = dirname(import.meta.dirname);

const usage = "Usage: node ./dist/genIndex.js jsonDir mdDir indexFile";

const args = process.argv.slice(2);
if (args.length < 3) {
    console.error(usage);
    process.exit(1);
}

const config: VoteConfig = {
    bot: "haus-rules-bot[bot]",
    jsonDir: args[0],
    markdownDir: args[1],
    indexFile: args[2],
};

const relativeResults = makePathRelativeTo(
    config.indexFile,
    config.markdownDir,
);

interface ContentMap {
    voteData: VoteData;
    filePath: string;
}

const contents: ContentMap[] = [];

const jsonFiles = [];

if (!existsSync(config.jsonDir)) {
    mkdirSync(config.jsonDir, { recursive: true });
}
if (!existsSync(config.markdownDir)) {
    mkdirSync(config.markdownDir, { recursive: true });
}

const indexDir = dirname(config.indexFile);
if (!existsSync(indexDir)) {
    mkdirSync(indexDir, { recursive: true });
}

findFiles(config.jsonDir, jsonFiles);

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
                .replace(config.jsonDir, relativeResults);
            return x;
        });

    const eta = new Eta({
        views: path.join(scriptRoot, "templates"),
        autoTrim: false,
    });

    const data = eta.render("./index", openVotes);
    console.log(`<--  ${config.indexFile}`);
    writeFileSync(config.indexFile, data);
} catch (err) {
    console.error(err);
}
