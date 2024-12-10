// TYPES

export interface Config {
    sourcePath: string;
    targetFile: string;
}

interface Problem {
    path: string[];
    explanation: string;
}

interface Error {
    message: string;
    extensions?: {
        value: string;
        problems: Problem[];
    };
    locations?: {
        line: number;
        column: number;
    }[];
}
interface Result {
    errors?: Error[];
    data?: {
        node: {
            author: {
                login: string;
            };
            discussion?: Item;
            issue?: Item;
            body: string;
            createdAt: string;
            id: string;
            updatedAt: string;
            url: string;
        };
    };
}
interface ItemsResult {
    errors?: Error[];
    data: {
        repository: {
            discussions?: {
                nodes: Item[];
            };
            issues?: {
                nodes: Item[];
            };
            pullRequests?: {
                nodes: Item[];
            };
        };
    };
}

export interface Label {
    name: string;
}
export interface Item {
    id: string;
    title: string;
    number: number;
    closed: boolean;
    closedAt: string;
    labels: {
        nodes: Label[];
    };
    repository: {
        nameWithOwner: string;
    };
    url: string;
    body?: string;
}
export interface ManualResult {
    author: {
        login: string;
        url: string;
    };
    url: string;
    createdAt: string;
    body: string;
}
export interface VoteRecord {
    login: string;
    url: string;
    createdAt: string;
    reaction: string;
}
export interface VoteCategory {
    reactions: string[];
    team: VoteRecord[];
    teamTotal: number;
    total: number;
}
export interface VoteData {
    voteType: string;
    hasQuorum: boolean;
    group: string;
    groupSize: number;
    groupVotes: number;
    countedVotes: number;
    droppedVotes: number;
    votingThreshold: "fourfifths" | "twothirds" | "majority" | "all";
    categories?: Record<string, VoteCategory>;
    duplicates: VoteRecord[];
    missingGroupActors: VoteRecord[];
    manualCloseComments?: ManualResult;
    title?: string;

    // Fields are added (or modified) by this script for rendering
    isDone?: boolean;
    closed?: boolean;
    closedAt?: string;
    commentId?: string;
    date?: string;
    github?: string;
    ignored?: VoteCategory;
    itemId?: string;
    number?: number;
    progress?: string;
    repoName?: string;
    sortedCategories?: [string, VoteCategory][];
    tags?: string[];
    type?: string;
    updated?: string;
    url?: string;
}
