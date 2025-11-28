import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DomainRecord } from "../src/@types/index.js";
import {
    formatCalendarFile,
    mergeDomainsIntoCalendar,
    parseCalendarFile,
    updateCalendarFiles,
} from "../src/domainsUpdateCalendars.js";

describe("parseCalendarFile", () => {
    it("should parse a calendar file with multiple months", () => {
        const content = `# 2027

## January

- 24: Namecheap - relation.to (Hibernate)

## February

- 21: Namecheap - hibernate.asia (Hibernate) -- do not renew

## March

- 16: Namecheap - nhibernate.org (Hibernate) -- do not renew
- 22: Namecheap - qbicc.org (Quarkus)
`;

        const result = parseCalendarFile(content);

        expect(result.size).toBe(3);
        expect(result.get("January")?.entries).toHaveLength(1);
        expect(result.get("January")?.entries[0]).toEqual({
            day: 24,
            description: "Namecheap - relation.to (Hibernate)",
        });

        expect(result.get("February")?.entries).toHaveLength(1);
        expect(result.get("February")?.entries[0]).toEqual({
            day: 21,
            description:
                "Namecheap - hibernate.asia (Hibernate) -- do not renew",
        });

        expect(result.get("March")?.entries).toHaveLength(2);
        expect(result.get("March")?.entries[0]).toEqual({
            day: 16,
            description:
                "Namecheap - nhibernate.org (Hibernate) -- do not renew",
        });
        expect(result.get("March")?.entries[1]).toEqual({
            day: 22,
            description: "Namecheap - qbicc.org (Quarkus)",
        });
    });

    it("should handle months with placeholder entries", () => {
        const content = `# 2027

## May

- .

## June

- .
`;

        const result = parseCalendarFile(content);

        expect(result.size).toBe(2);
        expect(result.get("May")?.entries).toHaveLength(0); // '.' is not a valid day entry
        expect(result.get("June")?.entries).toHaveLength(0);
    });

    it("should handle a custom Monthly section", () => {
        const content = `# Calendar ....

## Monthly

- 22: do things

## January

- 24: Some event
`;

        const result = parseCalendarFile(content);

        expect(result.size).toBe(2);
        expect(result.get("Monthly")?.entries).toHaveLength(1);
        expect(result.get("Monthly")?.entries[0]).toEqual({
            day: 22,
            description: "do things",
        });
        expect(result.get("January")?.entries).toHaveLength(1);
    });

    it("should handle empty calendar file", () => {
        const content = `# 2027
`;

        const result = parseCalendarFile(content);

        expect(result.size).toBe(0);
    });
});

describe("mergeDomainsIntoCalendar", () => {
    it("should add domain expiries to correct months", () => {
        const existingMonths = new Map();
        const domains: DomainRecord[] = [
            {
                name: "project1.com",
                expires: "2027-03-15T00:00:00Z",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
            {
                name: "test.org",
                expires: "2027-06-20T00:00:00Z",
                isExpired: false,
                isLocked: false,
                autoRenew: false,
                isOurDNS: true,
            },
        ];

        const result = mergeDomainsIntoCalendar(existingMonths, domains, 2027);

        const marchEntries = result.get("March")?.entries;
        expect(marchEntries).toBeDefined();
        const marchDomain = marchEntries?.find((e) => e.description.includes("project1.com"));
        expect(marchDomain).toBeDefined();

        const juneEntries = result.get("June")?.entries;
        expect(juneEntries).toBeDefined();
        const juneDomain = juneEntries?.find((e) => e.description.includes("test.org"));
        expect(juneDomain).toBeDefined();
    });

    it("should preserve existing entries when merging", () => {
        const existingMonths = new Map();
        existingMonths.set("March", {
            monthName: "March",
            entries: [
                { day: 10, description: "Team meeting" },
                { day: 16, description: "Project deadline" },
            ],
        });

        const domains: DomainRecord[] = [
            {
                name: "project1.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const result = mergeDomainsIntoCalendar(existingMonths, domains, 2027);

        const marchEntries = result.get("March")?.entries;
        expect(marchEntries).toHaveLength(3);
        expect(
            marchEntries?.some((e) => e.description === "Team meeting"),
        ).toBe(true);
        expect(
            marchEntries?.some((e) => e.description === "Project deadline"),
        ).toBe(true);
        expect(
            marchEntries?.some((e) => e.description.includes("project1.com")),
        ).toBe(true);
    });

    it("should not add duplicate domain entries", () => {
        const domain = {
            name: "project1.com",
            expires: "2027-03-15T00:00:00Z",
            isExpired: false,
            isLocked: true,
            autoRenew: true,
            isOurDNS: true,
        };

        // Get the actual day that will be used (accounting for timezone)
        const actualDay = new Date(domain.expires).getUTCDate();

        const existingMonths = new Map();
        existingMonths.set("March", {
            monthName: "March",
            entries: [{ day: actualDay, description: "Domain expires: project1.com" }],
        });

        const domains: DomainRecord[] = [domain];

        const result = mergeDomainsIntoCalendar(existingMonths, domains, 2027);

        const marchEntries = result.get("March")?.entries;
        // Should not add duplicate - check only one entry with project1.com
        const exampleEntries = marchEntries?.filter((e) => e.description.includes("project1.com"));
        expect(exampleEntries).toHaveLength(1);
    });

    it("should skip domains without expiry dates", () => {
        const existingMonths = new Map();
        const domains: DomainRecord[] = [
            {
                name: "project1.com",
                expires: null,
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const result = mergeDomainsIntoCalendar(existingMonths, domains, 2027);

        // All months should be empty (except they're created)
        for (const month of result.values()) {
            expect(month.entries).toHaveLength(0);
        }
    });

    it("should only include domains for the specified year", () => {
        const existingMonths = new Map();
        const domains: DomainRecord[] = [
            {
                name: "example-2027.com",
                expires: "2027-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
            {
                name: "example-2028.com",
                expires: "2028-03-15",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const result = mergeDomainsIntoCalendar(existingMonths, domains, 2027);

        const marchEntries = result.get("March")?.entries;
        expect(
            marchEntries?.some((e) =>
                e.description.includes("example-2027.com"),
            ),
        ).toBe(true);
        expect(
            marchEntries?.some((e) =>
                e.description.includes("example-2028.com"),
            ),
        ).toBe(false);
    });

    it("should create all 12 months even if empty", () => {
        const existingMonths = new Map();
        const domains: DomainRecord[] = [];

        const result = mergeDomainsIntoCalendar(existingMonths, domains, 2027);

        expect(result.size).toBe(12);
        expect(result.has("January")).toBe(true);
        expect(result.has("December")).toBe(true);
    });
});

describe("formatCalendarFile", () => {
    it("should format a calendar with entries sorted by day", () => {
        const months = new Map();
        months.set("March", {
            monthName: "March",
            entries: [
                { day: 22, description: "Namecheap - qbicc.org (Quarkus)" },
                {
                    day: 16,
                    description: "Namecheap - nhibernate.org (Hibernate)",
                },
                { day: 15, description: "Domain expires: project1.com" },
            ],
        });

        const result = formatCalendarFile(months, 2027);

        expect(result).toContain("# 2027");
        expect(result).toContain("## March");
        expect(result).toContain("- 15: Domain expires: project1.com");
        expect(result).toContain(
            "- 16: Namecheap - nhibernate.org (Hibernate)",
        );
        expect(result).toContain("- 22: Namecheap - qbicc.org (Quarkus)");

        // Check that entries are in order
        const lines = result.split("\n");
        const marchIndex = lines.indexOf("## March");
        const day15Index = lines.findIndex((l) => l.includes("- 15:"));
        const day16Index = lines.findIndex((l) => l.includes("- 16:"));
        const day22Index = lines.findIndex((l) => l.includes("- 22:"));

        expect(day15Index).toBeGreaterThan(marchIndex);
        expect(day16Index).toBeGreaterThan(day15Index);
        expect(day22Index).toBeGreaterThan(day16Index);
    });

    it("should skip empty months", () => {
        const months = new Map();
        months.set("January", {
            monthName: "January",
            entries: [{ day: 24, description: "Some event" }],
        });
        months.set("February", {
            monthName: "February",
            entries: [],
        });
        months.set("March", {
            monthName: "March",
            entries: [{ day: 15, description: "Another event" }],
        });

        const result = formatCalendarFile(months, 2027);

        expect(result).toContain("## January");
        expect(result).not.toContain("## February");
        expect(result).toContain("## March");
    });

    it("should format days with leading zeros", () => {
        const months = new Map();
        months.set("January", {
            monthName: "January",
            entries: [
                { day: 5, description: "Single digit day" },
                { day: 15, description: "Double digit day" },
            ],
        });

        const result = formatCalendarFile(months, 2027);

        expect(result).toContain("- 05: Single digit day");
        expect(result).toContain("- 15: Double digit day");
    });

    it("should format calendar in month order", () => {
        const months = new Map();
        months.set("December", {
            monthName: "December",
            entries: [{ day: 25, description: "Event in December" }],
        });
        months.set("January", {
            monthName: "January",
            entries: [{ day: 1, description: "Event in January" }],
        });

        const result = formatCalendarFile(months, 2027);

        const lines = result.split("\n");
        const janIndex = lines.indexOf("## January");
        const decIndex = lines.indexOf("## December");

        expect(janIndex).toBeGreaterThan(0);
        expect(decIndex).toBeGreaterThan(janIndex);
    });
});

describe("integration: parse, merge, format", () => {
    it("should handle a complete workflow", () => {
        // Start with existing calendar
        const existingContent = `# 2027

## Monthly

- 22: do things

## January

- 24: Namecheap - relation.to (Hibernate)

## March

- 16: Namecheap - nhibernate.org (Hibernate) -- do not renew
- 22: Namecheap - qbicc.org (Quarkus)
`;

        // Parse existing calendar
        const existingMonths = parseCalendarFile(existingContent);

        // New domains to add
        const domains: DomainRecord[] = [
            {
                name: "newdomain.com",
                expires: "2027-03-15T00:00:00Z",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
            {
                name: "anotherdomain.org",
                expires: "2027-11-13T00:00:00Z",
                isExpired: false,
                isLocked: false,
                autoRenew: false,
                isOurDNS: true,
            },
        ];

        // Get actual days (accounting for timezone)
        const newdomainDay = new Date(domains[0].expires).getUTCDate();
        const anotherdomainDay = new Date(domains[1].expires).getUTCDate();

        // Merge domains
        const mergedMonths = mergeDomainsIntoCalendar(
            existingMonths,
            domains,
            2027,
        );

        // Format result
        const result = formatCalendarFile(mergedMonths, 2027);

        // Verify custom sections are preserved
        expect(result).toContain("## Monthly");
        expect(result).toContain("- 22: do things");

        // Verify standard month sections
        expect(result).toContain("## January");
        expect(result).toContain("- 24: Namecheap - relation.to (Hibernate)");
        expect(result).toContain("## March");
        expect(result).toContain(`- ${newdomainDay.toString().padStart(2, "0")}: Domain expires: newdomain.com`);
        expect(result).toContain(
            "- 16: Namecheap - nhibernate.org (Hibernate) -- do not renew",
        );
        expect(result).toContain("- 22: Namecheap - qbicc.org (Quarkus)");
        expect(result).toContain("## November");
        expect(result).toContain(`- ${anotherdomainDay.toString().padStart(2, "0")}: Domain expires: anotherdomain.org`);

        // Verify March entries are sorted by checking the data structure
        const marchMonth = mergedMonths.get("March");
        expect(marchMonth).toBeDefined();
        expect(marchMonth?.entries.length).toBe(3);

        // Sort entries to verify they can be sorted correctly
        const sortedMarchEntries = [...(marchMonth?.entries || [])].sort((a, b) => a.day - b.day);
        expect(sortedMarchEntries[0].day).toBe(15);
        expect(sortedMarchEntries[1].day).toBe(16);
        expect(sortedMarchEntries[2].day).toBe(22);
    });
});

describe("updateCalendarFiles with template", () => {
    const testDir = path.join(process.cwd(), "test-calendar-output");

    beforeEach(() => {
        if (!existsSync(testDir)) {
            mkdirSync(testDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    it("should use _template.md when creating a new year file", () => {
        // Create a template file with recurring entries
        const templatePath = path.join(testDir, "_template.md");
        const templateContent = `# Template

## January

- 01: New Year's Day
- 15: Monthly team sync

## March

- 17: St. Patrick's Day
`;
        writeFileSync(templatePath, templateContent, "utf8");

        // Domain that expires in a year without existing file
        const domains: DomainRecord[] = [
            {
                name: "newdomain.com",
                expires: "2028-06-15T00:00:00Z",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        const updatedFiles = updateCalendarFiles(domains, testDir);

        expect(updatedFiles).toHaveLength(1);
        expect(updatedFiles[0]).toContain("2028.md");

        // Read the created file
        const createdFilePath = path.join(testDir, "2028.md");
        expect(existsSync(createdFilePath)).toBe(true);

        const content = require("fs").readFileSync(createdFilePath, "utf8");

        // Should have template entries from standard months
        expect(content).toContain("## January");
        expect(content).toContain("- 01: New Year's Day");
        expect(content).toContain("- 15: Monthly team sync");
        expect(content).toContain("## March");
        expect(content).toContain("- 17: St. Patrick's Day");

        // Should also have the domain entry
        expect(content).toContain("## June");
        expect(content).toContain("Domain expires: newdomain.com");
    });

    it("should not use template if year file already exists", () => {
        // Create both template and existing year file
        const templatePath = path.join(testDir, "_template.md");
        writeFileSync(templatePath, "# Template\n\n## Monthly\n\n- 01: From template", "utf8");

        const existingFilePath = path.join(testDir, "2029.md");
        writeFileSync(existingFilePath, "# 2029\n\n## Monthly\n\n- 01: Existing entry", "utf8");

        const domains: DomainRecord[] = [
            {
                name: "test.com",
                expires: "2029-03-15T00:00:00Z",
                isExpired: false,
                isLocked: true,
                autoRenew: true,
                isOurDNS: true,
            },
        ];

        updateCalendarFiles(domains, testDir);

        const content = require("fs").readFileSync(existingFilePath, "utf8");

        // Should keep existing entry, not template entry
        expect(content).toContain("Existing entry");
        expect(content).not.toContain("From template");
    });

    it("should create empty calendar if no template exists", () => {
        const domains: DomainRecord[] = [
            {
                name: "lonely.com",
                expires: "2030-12-25T00:00:00Z",
                isExpired: false,
                isLocked: false,
                autoRenew: false,
                isOurDNS: true,
            },
        ];

        updateCalendarFiles(domains, testDir);

        const filePath = path.join(testDir, "2030.md");
        expect(existsSync(filePath)).toBe(true);

        const content = require("fs").readFileSync(filePath, "utf8");

        // Should only have the year and domain entry
        expect(content).toContain("# 2030");
        expect(content).toContain("## December");
        expect(content).toContain("Domain expires: lonely.com");
        // Should not have any template content
        expect(content).not.toContain("Monthly");
    });
});
