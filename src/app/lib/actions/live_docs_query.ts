'use server'

import { getTextEmbeddings } from "../vertexai"
import { getRunbooksLinks } from "../sqlite"
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { getServerSession } from 'next-auth'
import { trackRun } from '../telemetry'
import { RunbookQuery, Context } from "./common/entities/runbook_query"

async function downloadFileContent(rawUrl: string): Promise<string | null> {
  try {
    const response = await fetch(rawUrl)
    if (!response.ok) {
      console.error(`Failed to fetch file content: ${response.status}`)
      return null
    }
    return await response.text()
  } catch (error) {
    console.error(`Error downloading file content:`, error)
    return null
  }
}

export async function getLiveDocsQuery(query: string): Promise<RunbookQuery> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new Error("No session found. Please log in.")
    }
    
    const { user } = session
    trackRun(user?.name, user?.email, "", 'live_docs_chat')
      .catch(e => console.error('Could not track run:', e))

    // Get text embeddings for the query
    const embeddings = await getTextEmbeddings(query)
    
    // Get relevant runbook links from database using vector search
    const links = await getRunbooksLinks(embeddings)
    
    // Download live content from the matched file paths
    const contexts: Context[] = []
    
    for (const link of links) {
      const content = await downloadFileContent(link)
      if (content) {
        contexts.push({
          content,
          sourceLink: link
        })
      }
    }
    
    return {
      query: query,
      contexts: contexts
    }
  } catch (error) {
    console.error('Error in getLiveDocsQuery:', error)
    throw error
  }
}