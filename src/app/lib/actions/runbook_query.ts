'use server'

import { getRunbooksLinks } from "../sqlite"
import { getTextEmbeddings } from "../vertexai"
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getServerSession } from 'next-auth';
import { trackRun } from '../telemetry';
import { downloadFiles } from "../utils"

import { RunbookQuery } from "./common/entities/runbook_query"
import { Context } from "./common/entities/runbook_query"


export async function getRunbookQuery(query: string) : Promise<RunbookQuery> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("No session found. Please log in.");
        }
        const { user } = session;
        trackRun(user?.name, user?.email, "", 'runbooks_chat')
            .catch(e => console.error('Could not track run:', e))

        // Get text embeddings for the query
        const embeddings = await getTextEmbeddings(query).catch(error => {
            console.error("Error getting text embeddings:", error);
            throw error;
        });

        // Get relevant runbook links based on embeddings
        const links = await getRunbooksLinks(embeddings).catch(error => {
            console.error("Error in getting Runbooks Links:", error);
            throw error;
        });

        // Download and process the content of the runbook files
        const fileContents = await downloadFiles(links).catch(error => {
            console.error("Error  downloading files:", error);
            throw error;
        });

        // Create the context list
        const contexts: Context[] = Array.from(fileContents.entries()).map(([sourceLink, content]) => ({
            content,
            sourceLink
        }));

        
        // Construct and return the RunbookQuery object
        return {
            query: query,
            contexts: contexts
        }
    } catch (error) {
        throw error;
    }
}
