import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DomainRecord } from "../src/@types/index.js";
import { writeDomainListMarkdown } from "../src/domainsWriteList.js";

describe("writeDomainListMarkdown", () => {
    const testDir = path.join(process.cwd(), "test-output");

    beforeEach(() => {
        // Create test directory
        if (!existsSync(testDir)) {
            mkdirSync(testDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test directory
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    it("should create a markdown file with domain table", () => {
        const domains: DomainRecord[] = [
            {
                name: "example.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
            {
                name: "test.org",
                expires: "2027-06-20",
                isExpired: false,
                isLocked: false,
                autoRenew: false,
                isOurDNS: true,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, testDir);

        expect(existsSync(filePath)).toBe(true);

        const content = readFileSync(filePath, "utf8");
        expect(content).toContain("# Domain List");
        expect(content).toContain("Last updated:");
        expect(content).toContain(
            "| Domain | Expires | Expired | Locked | Auto-Renew | NC DNS |",
        );
        expect(content).toContain("example.com");
        expect(content).toContain("test.org");
    });

    it("should sort domains alphabetically by name", () => {
        const domains: DomainRecord[] = [
            {
                name: "zebra.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
            {
                name: "apple.com",
                expires: "2027-06-20",
                isExpired: false,
                isLocked: false,
                autoRenew: false,
                isOurDNS: true,
            },
            {
                name: "microsoft.com",
                expires: "2027-09-10",
                isExpired: false,
                isLocked: true,
                autoRenew: false,
                isOurDNS: false,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, testDir);
        const content = readFileSync(filePath, "utf8");

        const lines = content.split("\n");
        const appleIndex = lines.findIndex((l) => l.includes("apple.com"));
        const microsoftIndex = lines.findIndex((l) =>
            l.includes("microsoft.com"),
        );
        const zebraIndex = lines.findIndex((l) => l.includes("zebra.com"));

        expect(appleIndex).toBeGreaterThan(0);
        expect(microsoftIndex).toBeGreaterThan(appleIndex);
        expect(zebraIndex).toBeGreaterThan(microsoftIndex);
    });

    it("should display checkmarks for true flags", () => {
        const domains: DomainRecord[] = [
            {
                name: "example.com",
                expires: "2027-03-15",
                isExpired: true,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, testDir);
        const content = readFileSync(filePath, "utf8");

        // Find the line with example.com
        const lines = content.split("\n");
        const domainLine = lines.find((l) => l.includes("example.com"));

        expect(domainLine).toBeDefined();
        // Count checkmarks - should be 4 (expired, locked, autoRenew, ncDNS)
        const checkmarkCount = (domainLine?.match(/✅/g) || []).length;
        expect(checkmarkCount).toBe(4);
    });

    it("should display empty cells for false flags", () => {
        const domains: DomainRecord[] = [
            {
                name: "example.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: false,
                autoRenew: false,
                isOurDNS: false,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, testDir);
        const content = readFileSync(filePath, "utf8");

        // Find the line with example.com
        const lines = content.split("\n");
        const domainLine = lines.find((l) => l.includes("example.com"));

        expect(domainLine).toBeDefined();
        // Should have no checkmarks
        const checkmarkCount = (domainLine?.match(/✅/g) || []).length;
        expect(checkmarkCount).toBe(0);

        // Should have empty cells (spaces between pipes)
        expect(domainLine).toMatch(/\|\s+\|/);
    });

    it('should display "N/A" for null expiry date', () => {
        const domains: DomainRecord[] = [
            {
                name: "example.com",
                expires: null,
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, testDir);
        const content = readFileSync(filePath, "utf8");

        expect(content).toContain("example.com");
        expect(content).toContain("N/A");
    });

    it("should handle mixed expiry dates", () => {
        const domains: DomainRecord[] = [
            {
                name: "valid-date.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
            {
                name: "no-date.com",
                expires: null,
                isExpired: false,
                isLocked: false,
                autoRenew: false,
                isOurDNS: true,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, testDir);
        const content = readFileSync(filePath, "utf8");

        const lines = content.split("\n");
        const noDateLine = lines.find((l) => l.includes("no-date.com"));
        const validDateLine = lines.find((l) => l.includes("valid-date.com"));

        expect(noDateLine).toContain("N/A");
        expect(validDateLine).toContain("2027-03-15");
    });

    it("should create directory if it doesn't exist", () => {
        const nestedDir = path.join(testDir, "nested", "deep", "path");

        const domains: DomainRecord[] = [
            {
                name: "example.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, nestedDir);

        expect(existsSync(filePath)).toBe(true);
        expect(existsSync(nestedDir)).toBe(true);
    });

    it("should overwrite existing file", () => {
        const domains1: DomainRecord[] = [
            {
                name: "first.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const domains2: DomainRecord[] = [
            {
                name: "second.com",
                expires: "2027-06-20",
                isExpired: false,
                isLocked: false,
                autoRenew: false,
                isOurDNS: false,
            },
        ];

        // Write first time
        const filePath1 = writeDomainListMarkdown(domains1, testDir);
        const content1 = readFileSync(filePath1, "utf8");
        expect(content1).toContain("first.com");

        // Write second time
        const filePath2 = writeDomainListMarkdown(domains2, testDir);
        const content2 = readFileSync(filePath2, "utf8");

        expect(filePath1).toBe(filePath2);
        expect(content2).toContain("second.com");
        expect(content2).not.toContain("first.com");
    });

    it("should include current date in output", () => {
        const domains: DomainRecord[] = [
            {
                name: "example.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, testDir);
        const content = readFileSync(filePath, "utf8");

        const today = new Date().toISOString().split("T")[0];
        expect(content).toContain(`Last updated: ${today}`);
    });

    it("should handle empty domain list", () => {
        const domains: DomainRecord[] = [];

        const filePath = writeDomainListMarkdown(domains, testDir);
        const content = readFileSync(filePath, "utf8");

        expect(content).toContain("# Domain List");
        expect(content).toContain(
            "| Domain | Expires | Expired | Locked | Auto-Renew | NC DNS |",
        );
        // Should have header and separator rows but no data rows
        const tableRows = content.split("\n").filter((l) => l.startsWith("|"));
        expect(tableRows.length).toBe(2); // header + separator
    });

    it("should produce valid markdown table format", () => {
        const domains: DomainRecord[] = [
            {
                name: "example.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const filePath = writeDomainListMarkdown(domains, testDir);
        const content = readFileSync(filePath, "utf8");

        const lines = content.split("\n");
        const tableLines = lines.filter((l) => l.startsWith("|"));

        // Should have at least header, separator, and one data row
        expect(tableLines.length).toBeGreaterThanOrEqual(3);

        // All table lines should start and end with |
        for (const line of tableLines) {
            expect(line.startsWith("|")).toBe(true);
            expect(line.trim().endsWith("|")).toBe(true);
        }

        // Separator should contain dashes
        const separator = tableLines[1];
        expect(separator).toContain("---");
    });
});
