import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";
import type { CombinedResult, TextResult } from "./@types";
import { runGraphQL } from "./lib/voteResults";

const usage = "Usage: node ./dist/newProjects.js mdDir";

const scriptRoot = dirname(import.meta.dirname);
const issueQuery = path.join(
    scriptRoot, // parent of dist dir
    "graphql/query.newProject.graphql",
);
const templateQuery = path.join(
    scriptRoot, // parent of dist dir
    "graphql/query.newProjectTemplate.graphql",
);

const templateData = runGraphQL(templateQuery, []);
const templateContent: TextResult = JSON.parse(templateData);
const templateText =
    templateContent.data?.repository?.content?.text.split("\n") || [];
console.log(`Template text has ${templateText.length} lines.`);

const checkboxRegex = /^\s*-\s*\[(.)\]\s*([^(]+).*$/;
const query =
    'repo:commonhaus/handbook type:issue "Project onboarding:" is:open';

const jsonData = runGraphQL(issueQuery, ["-F", `searchQuery=${query}`]);
const result: CombinedResult = JSON.parse(jsonData);
const issues = result.data.issuesAndPRs.nodes || [];

function stripMarkdownLinks(text: string): string {
    // Replace [label](url) and [label][ref] with just label
    // Remove footnote references like [^p]
    // Remove trailing comments after --
    return text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [label](url)
        .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1") // [label][ref]
        .replace(/\[\^[^\]]+\]/g, "") // [^footnote]
        .replace(/\s*--.*$/g, ""); // trailing comments after --
}

const projectList = [];
const projectIssueMap: Record<string, string> = {};
const checkboxMap: Record<string, Record<string, string>> = {};

for (const item of issues) {
    const body = item.body?.split("\n") || [];
    console.log(
        `\n\n### Processing issue: ${item.title} (${item.id}): ${body.length}`,
    );
    const project = item.title.replace("Project onboarding: ", "").trim();
    projectList.push(project);
    projectIssueMap[project] = `[${project}, #${item.number}](${item.url})`;
    for (const line of body) {
        const match = checkboxRegex.exec(line);
        if (match) {
            const [_, checked, lineItem] = match;
            const cleanLineItem = stripMarkdownLinks(lineItem.trim());
            checkboxMap[cleanLineItem] = checkboxMap[cleanLineItem] || {};
            console.log(" - ", checked, `|${cleanLineItem}|`, project);
            switch (checked) {
                case "x":
                    checkboxMap[cleanLineItem][project] = "✅";
                    break;
                case " ":
                    checkboxMap[cleanLineItem][project] = "_";
                    break;
                case "-":
                    checkboxMap[cleanLineItem][project] = "N/A";
                    break;
                default:
                    checkboxMap[cleanLineItem][project] = checked;
                    break;
            }
        }
    }
}

projectList.sort();
const projectMap: Record<string, string> = {};
for (const [idx, project] of projectList.entries()) {
    projectMap[project] = `${project.charAt(0)}[^${idx + 1}]`;
}

const report = [];
report.push("# Project Onboarding Checklist Report");
report.push("");
report.push(
    "Details and instructions are in project-specific issues (see footnotes)",
);
report.push("");
report.push(`| Item | ${Object.values(projectMap).sort().join(" | ")} |`);
report.push(
    `|-----| ${Object.keys(projectMap)
        .map(() => "-----")
        .join("|")} |`,
);

const sortedLineItems = [];
for (const line of templateText) {
    const match = checkboxRegex.exec(line);
    if (match) {
        const row = [];
        const [_, _checked, lineItem] = match;
        const cleanLineItem = stripMarkdownLinks(lineItem.trim());
        sortedLineItems.push(cleanLineItem);
        const status = checkboxMap[cleanLineItem];
        delete checkboxMap[cleanLineItem];

        if (status) {
            row.push(cleanLineItem);
            for (const key of projectList) {
                row.push(status[key] || "_");
            }
            const rowString = row.join(" | ");
            if (rowString.includes("_")) {
                report.push(`|${row.join(" | ")}|`);
            }
        }
    }
}

report.push("");
for (const [idx, project] of projectList.entries()) {
    report.push(`[^${idx + 1}]: ${projectIssueMap[project] || project}`);
}

const markdownDir = process.argv[2];
if (markdownDir && !existsSync(markdownDir)) {
    mkdirSync(markdownDir, { recursive: true });
}

writeFileSync(`${markdownDir}/new-projects.md`, `${report.join("\n")}\n`);

writeFileSync(
    `${markdownDir}/new-projects-leftovers.md`,
    `# Misaligned checklist items\n\nValid items:\n\n- ${sortedLineItems.join("\n- ")}\n\n\`\`\`json\n${JSON.stringify(checkboxMap, null, 2)}\n\`\`\``,
);
