import {
    existsSync,
    mkdirSync,
    readdirSync,
    statSync,
    writeFileSync,
} from "node:fs";
import path from "node:path";
import { Eta } from "eta";
import type { VoteCategory, VoteConfig, VoteData } from "../@types";

const scriptDir = process.cwd();
export function findFiles(from: string, fileList: string[]) {
    try {
        console.log("--> ", from);
        for (const file of readdirSync(from)) {
            const filePath = path.join(from, file);
            if (file.endsWith(".json")) {
                fileList.push(filePath);
            } else if (!file.endsWith(".svg")) {
                const stat = statSync(filePath);
                if (stat.isDirectory()) {
                    // RECURSE / TRAVERSE
                    findFiles(filePath, fileList);
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

export function makePathRelativeTo(
    basePath: string,
    targetPath: string,
): string {
    const relPath = path.relative(path.dirname(basePath), targetPath);
    return relPath.startsWith(".") ? relPath : `./${relPath}`;
}

export function recordVote(voteConfig: VoteConfig, voteData: VoteData): void {
    console.log(voteData);
    if (!voteData.commentId) {
        console.log("    # No commentId found");
        return;
    }
    console.log(
        `=== ${voteData.repoName}#${voteData.number} - comment ${voteData.commentId}`,
    );
    const repo = voteData.repoName;
    if (
        voteConfig.options.repositories &&
        !voteConfig.options.repositories.includes(repo)
    ) {
        console.log("    # Skipping repo");
        return;
    }

    const sortedCategories: [string, VoteCategory][] = voteData.categories
        ? Object.entries(voteData.categories)
              .filter(([k, v]) => v !== undefined && v !== null)
              .sort()
        : [];

    const resultBody = voteData.manualCloseComments
        ? voteData.manualCloseComments.body
              .split("\n")
              .map((l) => `> ${l}`)
              .join("\n")
        : "";

    const rawDataPath = `${voteConfig.jsonDir}/${repo}/`;

    if (!existsSync(rawDataPath)) {
        console.log(`<-- ${rawDataPath}${voteData.number}.json`);
        mkdirSync(rawDataPath, { recursive: true });
    }
    writeFileSync(
        `${rawDataPath}${voteData.number}.json`,
        JSON.stringify(voteData, null, 2),
    );

    if (voteConfig.markdownDir) {
        const resultsVotePath = `${voteConfig.markdownDir}/${repo}/`;
        if (!existsSync(resultsVotePath)) {
            mkdirSync(resultsVotePath, { recursive: true });
        }
        const eta = new Eta({
            views: path.join(scriptDir, "templates"),
            autoTrim: false,
        });
        const data = eta.render("./result", {
            repo,
            voteData,
            resultBody,
            sortedCategories,
            tags: voteData.tags
                .filter((x) => x !== "vote" && x !== "closed")
                .map((x) => `"${x}"`)
                .join(", "),
        });

        console.log(`<-- ${resultsVotePath}${voteData.number}.md`);
        writeFileSync(`${resultsVotePath}${voteData.number}.md`, data);
    }
}
