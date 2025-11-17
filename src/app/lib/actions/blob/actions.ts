"use server";

import { getServerSession } from "next-auth";
import { InsightsBlob } from "../common/entities/blob";
import { trackRun } from "../../telemetry";
import { NEOAI_BASE_URL } from "../common/constants";
import { fetchFunctionsAndClasses, fetchHighLevelInsights, fetchOtherInsights } from "./insights";

export async function fetchBlob(url: string) : Promise<InsightsBlob | null> {
  const {project, path, ref} = parseBlobURL(url);

  const session = await getServerSession();
  if (!session) {
    return null
  }

  const { accessToken, user } = session;

  trackRun(user?.name, user?.email, url, 'blob')
    .catch(e => console.error('Could not track run:', e))

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const response  = await fetch(`${NEOAI_BASE_URL}/projects/${encodeURIComponent(project)}/repository/files/${encodeURIComponent(path)}/raw?ref=${ref}`, {
    headers
  });
  
  const rawNeoAiBlob = await response.text();

  const blob: InsightsBlob = {
    contents: rawNeoAiBlob,
    project: project || '',
    path: path || '',
    ref: ref || '',
  }

  const [{ explanation, code_flow }, { functions, classes }, { dependencies, security, performance_improvements, data_dictionary }] = await Promise.all([
    fetchHighLevelInsights(blob),
    fetchFunctionsAndClasses(blob),
    fetchOtherInsights(blob),
  ])
   
  // const analysis = await fetchBlobInsights(blob);
  // console.log("blob with analysis", analysis)

  return {
    ...blob,
    analysis: {
      explanation,
      code_flow,
      functions,
      classes,
      dependencies,
      security,
      performance_improvements,
      data_dictionary,
    }
  };
}

export interface ParsedURL {
  project: string;
  path: string;
  ref: string;
}

function parseBlobURL(url: string): ParsedURL {
  try {
    // Create a URL object to help parse the URL
    const parsedUrl = new URL(url);
    
    // Validate it's a NeoAi URL
    if (!parsedUrl.hostname.includes('neoai.com')) {
      throw new Error('Not a NeoAi URL');
    }
    
    // Split the pathname, removing leading and trailing slashes
    const pathParts = parsedUrl.pathname.split('/').filter(part => part);
    
    // Find the index of '-/blob' or '-/tree'
    const refTypeIndex = pathParts.findIndex(part => part === 'blob' || part === 'tree');
    
    if (refTypeIndex === -1) {
      throw new Error('Invalid NeoAi URL format: cannot find blob or tree');
    }
    
    // Extract project (everything before '-/blob' or '-/tree')
    const project = pathParts.slice(0, refTypeIndex - 1).join('/');
    
    // Extract ref (the part after '-/blob' or '-/tree')
    const ref = pathParts[refTypeIndex + 1];
    
    // Extract path (everything after the ref)
    const path = pathParts.slice(refTypeIndex + 2).join('/');
    
    return {
      project,
      path,
      ref
    };
  } catch (error) {
    throw new Error(`Failed to parse NeoAi URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}