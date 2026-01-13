import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DomainRecord } from "./@types/index.js";

const usage = `Usage: node ./dist/domainsUpdateCalendars.js
Requires the following environment variables:

CALENDAR_DIR: root directory to store calendar files
DOMAIN_LIST: JSON payload; Array containing domain records.
  Each record should have: name, expires, isExpired, isLocked, autoRenew, isOurDNS`;

interface CalendarEntry {
    day: number;
    description: string;
    isPlaceholder?: boolean;
}

interface CalendarMonth {
    monthName: string;
    entries: CalendarEntry[];
}

function formatMonthEntries(
    lines: string[],
    monthName: string,
    entries: CalendarEntry[],
): void {
    const realEntries = entries.filter((e) => !e.isPlaceholder);
    const hasPlaceholder = entries.some((e) => e.isPlaceholder);

    lines.push(`## ${monthName}`);
    lines.push("");

    if (realEntries.length === 0) {
        // Preserve placeholder for empty sections
        if (hasPlaceholder) {
            lines.push("- .");
        }
    } else {
        // Sort entries by day
        const sortedEntries = [...realEntries].sort((a, b) => a.day - b.day);

        for (const entry of sortedEntries) {
            const dayStr = entry.day.toString().padStart(2, "0");
            lines.push(`- ${dayStr}: ${entry.description}`);
        }
    }

    lines.push("");
}

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export function parseCalendarFile(content: string): Map<string, CalendarMonth> {
    const months = new Map<string, CalendarMonth>();
    const lines = content.split("\n");
    let currentMonth: CalendarMonth | null = null;

    for (const line of lines) {
        // Check for month heading (## January, ## February, etc.)
        const monthMatch = line.match(/^##\s+(.+)$/);
        if (monthMatch) {
            const monthName = monthMatch[1].trim();
            currentMonth = { monthName, entries: [] };
            months.set(monthName, currentMonth);
            continue;
        }

        // Check for day entry (- 03: do something)
        if (currentMonth) {
            const entryMatch = line.match(/^-\s+(\d+):\s+(.+)$/);
            if (entryMatch) {
                const day = Number.parseInt(entryMatch[1], 10);
                const description = entryMatch[2].trim();
                currentMonth.entries.push({ day, description });
            } else if (line.match(/^-\s+\.$/)) {
                // Preserve placeholder entries (- .)
                currentMonth.entries.push({
                    day: 0,
                    description: ".",
                    isPlaceholder: true,
                });
            }
        }
    }

    return months;
}

export function mergeDomainsIntoCalendar(
    existingMonths: Map<string, CalendarMonth>,
    domains: DomainRecord[],
    year: number,
): Map<string, CalendarMonth> {
    // Create a map of all months if they don't exist
    const result = new Map(existingMonths);

    for (const monthName of MONTH_NAMES) {
        if (!result.has(monthName)) {
            result.set(monthName, { monthName, entries: [] });
        }
    }

    // Add domain expiries
    for (const domain of domains) {
        if (!domain || !domain.name || !domain.expires) continue;

        const expiryDate = new Date(domain.expires);
        if (expiryDate.getUTCFullYear() !== year) continue;

        const monthName = MONTH_NAMES[expiryDate.getUTCMonth()];
        const day = expiryDate.getUTCDate();
        const domainEntry = `Domain expires: ${domain.name}`;

        const month = result.get(monthName);
        if (!month) continue;

        // Check if this domain is already in the calendar for this day
        const existingEntry = month.entries.find(
            (e) => e.day === day && e.description.includes(domain.name),
        );

        if (!existingEntry) {
            month.entries.push({ day, description: domainEntry });
        }
    }

    return result;
}

export function formatCalendarFile(
    months: Map<string, CalendarMonth>,
    year: number,
): string {
    const lines: string[] = [];
    lines.push(`# ${year}`);
    lines.push("");

    // First output custom sections (not in MONTH_NAMES)
    for (const [monthName, month] of months) {
        if (MONTH_NAMES.includes(monthName)) continue;

        const realEntries = month.entries.filter((e) => !e.isPlaceholder);
        const hasPlaceholder = month.entries.some((e) => e.isPlaceholder);

        // Skip custom sections with no entries at all
        if (realEntries.length === 0 && !hasPlaceholder) continue;

        formatMonthEntries(lines, monthName, month.entries);
    }

    // Then output standard months in order
    for (const monthName of MONTH_NAMES) {
        const month = months.get(monthName);
        if (!month) continue;

        const realEntries = month.entries.filter((e) => !e.isPlaceholder);
        const hasPlaceholder = month.entries.some((e) => e.isPlaceholder);

        // Skip months with no entries and no placeholder
        if (realEntries.length === 0 && !hasPlaceholder) continue;

        formatMonthEntries(lines, monthName, month.entries);
    }

    return lines.join("\n");
}

export function updateCalendarFiles(
    domains: DomainRecord[],
    baseDirectory: string,
): string[] {
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

    // Find all unique years from domain expiry dates
    const years = new Set<number>();
    for (const domain of domains) {
        if (domain?.expires) {
            const year = new Date(domain.expires).getUTCFullYear();
            years.add(year);
        }
    }

    const updatedFiles: string[] = [];

    for (const year of years) {
        const filePath = path.join(baseDirectory, `${year}.md`);
        const templatePath = path.join(baseDirectory, "_template.md");

        // Read existing calendar file if it exists
        let existingMonths = new Map<string, CalendarMonth>();
        let content = "";
        if (existsSync(filePath)) {
            console.log(`📖 Read existing calendar: ${filePath}`);
            content = readFileSync(filePath, "utf8");
        } else if (existsSync(templatePath)) {
            console.log(
                `📋 Using template from ${templatePath} for new file: ${filePath}`,
            );
            content = readFileSync(templatePath, "utf8");
        } else {
            console.log(`📝 Creating new calendar: ${filePath}`);
            content = `# ${year}\n\n`;
            for (const monthName of MONTH_NAMES) {
                content += `## ${monthName}\n\n- .\n\n`;
            }
        }
        existingMonths = parseCalendarFile(content);

        // Merge domains into calendar
        const mergedMonths = mergeDomainsIntoCalendar(
            existingMonths,
            domains,
            year,
        );

        // Format and write the file
        const markdown = formatCalendarFile(mergedMonths, year);

        try {
            writeFileSync(filePath, markdown, "utf8");
            console.log(`✅ Successfully updated: ${filePath}`);
            updatedFiles.push(filePath);
        } catch (error) {
            console.error(`❌ Failed to write: ${filePath}`, error);
            throw error;
        }
    }

    return updatedFiles;
}

// Only run if executed directly (not imported by tests)
if (import.meta.url === `file://${process.argv[1]}`) {
    // Debug what's actually being received
    console.log("=== UPDATE CALENDARS ===");
    console.log("DOMAIN_LIST type:", typeof process.env.DOMAIN_LIST);
    console.log("DOMAIN_LIST length:", process.env.DOMAIN_LIST?.length);
    console.log("CALENDAR_DIR:", process.env.CALENDAR_DIR);

    try {
        let domainList = JSON.parse(process.env.DOMAIN_LIST || "[]") as
            | DomainRecord[]
            | string;

        // Handle double-encoded JSON (when GitHub Actions passes JSON as a string)
        if (typeof domainList === "string") {
            console.log("⚠️  Detected double-encoded JSON, parsing again...");
            domainList = JSON.parse(domainList) as DomainRecord[];
        }

        console.log("Parsed domain count:", domainList.length);

        const baseDirectory = process.env.CALENDAR_DIR;

        if (!domainList || domainList.length === 0 || !baseDirectory) {
            console.error(usage);
            process.exit(1);
        }

        const updatedFiles = updateCalendarFiles(domainList, baseDirectory);
        console.log(
            `🎉 SUCCESS: Updated ${updatedFiles.length} calendar files`,
        );
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
