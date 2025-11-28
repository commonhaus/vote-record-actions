import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DomainRecord } from "./@types/index.js";

const usage = `Usage: node ./dist/domainsWriteList.js
Requires the following environment variables:

LIST_DIR: root directory to store domain list
DOMAIN_LIST: JSON payload; Array containing domain records.
  Each record should have: name, expires, isExpired, isLocked, autoRenew, isOurDNS`;

export function writeDomainListMarkdown(
    domains: DomainRecord[],
    baseDirectory: string,
): string {
    try {
        mkdirSync(baseDirectory, { recursive: true });
        console.log(`✅ Directory ready: ${baseDirectory}`);
    } catch (error) {
        console.error(
            `❌ Failed to prepare directory: ${baseDirectory}`,
            error,
        );
        throw error;
    }

    // Sort domains alphabetically by name
    const sortedDomains = [...domains].sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    // Build markdown table
    const lines: string[] = [];
    lines.push("# Domain List");
    lines.push("");
    lines.push(`Last updated: ${new Date().toISOString().split("T")[0]}`);
    lines.push("");
    lines.push("| Domain | Expires | Expired | Locked | Auto-Renew | NC DNS |");
    lines.push(
        "|--------|---------|---------|--------|------------|---------|",
    );

    for (const domain of sortedDomains) {
        const expires = domain.expires || "N/A";
        const expired = domain.isExpired ? "✅" : "";
        const locked = domain.isLocked ? "✅" : "";
        const autoRenew = domain.autoRenew ? "✅" : "";
        const ncDNS = domain.isOurDNS ? "✅" : "";

        lines.push(
            `| ${domain.name} | ${expires} | ${expired} | ${locked} | ${autoRenew} | ${ncDNS} |`,
        );
    }

    const markdown = `${lines.join("\n")}\n`;
    const filePath = path.join(baseDirectory, "domains.md");

    try {
        writeFileSync(filePath, markdown, "utf8");
        console.log(`✅ Successfully updated: ${filePath}`);
    } catch (error) {
        console.error(`❌ Failed to write: ${filePath}`, error);
        throw error;
    }

    return filePath;
}

// Only run if executed directly (not imported by tests)
if (import.meta.url === `file://${process.argv[1]}`) {
    // Debug what's actually being received
    console.log("=== WRITE DOMAIN LIST ===");
    console.log("DOMAIN_LIST type:", typeof process.env.DOMAIN_LIST);
    console.log("DOMAIN_LIST length:", process.env.DOMAIN_LIST?.length);
    console.log("LIST_DIR:", process.env.LIST_DIR);

    try {
        const domainList = JSON.parse(
            process.env.DOMAIN_LIST || "[]",
        ) as DomainRecord[];
        console.log("Parsed domain count:", domainList.length);

        const baseDirectory = process.env.LIST_DIR;

        if (!domainList || domainList.length === 0 || !baseDirectory) {
            console.error(usage);
            process.exit(1);
        }

        const createdFile = writeDomainListMarkdown(domainList, baseDirectory);
        console.log(`🎉 SUCCESS: Created domain list file: ${createdFile}`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
