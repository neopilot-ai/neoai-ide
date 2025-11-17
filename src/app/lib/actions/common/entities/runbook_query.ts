export interface RunbookQuery {
    query: string;
    contexts: Context[];
}

export interface Context {
    content: string;
    sourceLink: string;
}
