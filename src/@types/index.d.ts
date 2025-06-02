// TYPES

export interface VoteConfig {
    bot: string;
    jsonDir?: string;
    markdownDir?: string;
    indexFile?: string;
    options?: {
        all?: boolean;
        repositories?: string[];
        removeTags?: string[];
    };
}

export interface Problem {
    path: string[];
    explanation: string;
}
export interface Error {
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
export interface TextResult {
    errors?: Error[];
    data: {
        repository: {
            content: {
                text: string;
            };
        };
    };
}
export interface CombinedResult {
    errors?: Error[];
    data: {
        issuesAndPRs?: {
            nodes: ItemWithComments[];
        };
        discussions?: {
            nodes: ItemWithComments[];
        };
    };
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
export interface Label {
    name: string;
}
export interface Comment {
    id: string;
    body: string;
    createdAt: string;
    updatedAt?: string;
    author: {
        login: string;
    };
}
export interface ItemWithComments {
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
    comments: {
        nodes: Comment[];
    };
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
