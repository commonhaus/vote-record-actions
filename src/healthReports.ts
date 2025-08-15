import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";

const scriptRoot = dirname(import.meta.dirname);
const usage = `Usage: node ./dist/healthReports.js
Requires the following environment variables:

REPORT_DIR: root directory to store reports
REPORTS: JSON payload; Object containing health reports.
  The key should be the full name of the repository
  The value should be the health report data
START_DATE: String representing the report start date`;

export function storeHealthReports(
    reports: Record<string, string>,
    startDate: string,
    baseDirectory: string,
) {
    const reportDir = path.join(baseDirectory, startDate);
    try {
        mkdirSync(reportDir, { recursive: true });
        console.log(`✅ Directory created: ${reportDir}`);
    } catch (error) {
        console.error(`❌ Failed to create directory: ${reportDir}`, error);
        throw error;
    }

    const createdFiles: string[] = [];

    for (const [repoFullName, reportJson] of Object.entries(reports)) {
        console.log("Write report for", repoFullName, reportJson);

        const reportData = JSON.parse(reportJson as string);
        console.log("Report data keys:", Object.keys(reportData));

        const fileName = `${repoFullName.replace("/", "_")}.json`;
        const filePath = path.join(reportDir, fileName);
        console.log("Writing to", filePath);

        try {
            writeFileSync(filePath, reportJson, "utf8");
            createdFiles.push(filePath);
            console.log(`✅ Successfully wrote: ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to write: ${filePath}`, error);
            throw error;
        }
    }

    console.log(`✅ Created ${createdFiles.length} report files`);
    return createdFiles;
}

// Debug what's actually being received
console.log("=== Health Reports Debug ===");
console.log("START_DATE:", process.env.START_DATE);
console.log("REPORT_DIR:", process.env.REPORT_DIR);
console.log("REPORTS type:", typeof process.env.REPORTS);
console.log("REPORTS length:", process.env.REPORTS?.length);

try {
    const reportsObject = JSON.parse(process.env.REPORTS || "{}");
    console.log("Parsed reports keys:", Object.keys(reportsObject));

    const collectionDate = process.env.START_DATE;
    const baseDirectory = process.env.REPORT_DIR;

    if (!reportsObject || !collectionDate || !baseDirectory) {
        console.error(usage);
        process.exit(1);
    }

    const createdFiles = storeHealthReports(
        reportsObject,
        collectionDate,
        baseDirectory,
    );
    console.log(
        `🎉 SUCCESS: Created ${createdFiles.length} health report files`,
    );
} catch (error) {
    console.error(error);
    process.exit(1);
}
