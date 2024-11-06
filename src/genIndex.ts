import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import { Eta } from "eta"
import { VoteData } from './@types';

// [-0---] [-1----] [-2-------]
// npm run genIndex "${VOTE_ROOT}"

const scriptDir = process.cwd();

const voteRoot = argv[2];
const sourcePath = `${voteRoot}/raw`;
const resultPath = `${voteRoot}/results`;
const targetFile = `${voteRoot}/README.md`;

interface ContentMap {
    content: VoteData;
    filePath: string;
}

const contents: ContentMap[] = [];

function readFiles(from: string) {
    try {
        const files = readdirSync(from);
        files.forEach(file => {
            const filePath = path.join(from, file);
            if (file.endsWith(".json")) {
                console.log(`reading ${filePath}`);
                var data = readFileSync(filePath, 'utf8');
                const content = data.toString();
                contents.push({
                    content: JSON.parse(content),
                    filePath
                });
            } else if ( !file.endsWith(".svg") ){
                const stat = statSync(filePath);
                if (stat.isDirectory()) {
                    readFiles(filePath);
                }
            }
        });
    } catch (err) {
        console.error(err);
    }
}

try {
    readFiles(sourcePath);

    const openVotes = contents
        .filter(x => !x.content.closed)
        .sort((a, b) => a.filePath.toLowerCase().localeCompare(b.filePath.toLowerCase()))
        .map(x => {
            x.content.missingGroupActors = x.content.missingGroupActors || [];
            x.filePath = x.filePath.replace('json', 'md')
                    .replace(sourcePath, resultPath)
                    .replace(voteRoot, '.');
            console.log(x);
            return x;
        });

    const eta = new Eta({
        views: path.join(scriptDir, "templates"),
        autoTrim: false
    });

    const data = eta.render("./index", openVotes);
    writeFileSync(targetFile, data);
} catch (err) {
    console.error(err);
}


