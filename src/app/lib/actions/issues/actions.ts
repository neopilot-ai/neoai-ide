'use server';

import { getServerSession } from "next-auth";
import { trackRun } from '@/app/lib/telemetry';
import { parseNeoaiIssueUrl } from "../../utils";
import { getDiscussionSummary, getIssueSummaries, getIssueUnderstanding, getMRSummaries } from "./analysis";
import { redirect } from 'next/navigation';
import { getIssueSecurityRecommendations } from "./securityAnalysis";
import { breakdownIssue } from "./breakdown";
import { Issue } from "../common/entities/issue";

// Fetch issue from NeoAi API using the URL
export async function fetchIssue(url: string): Promise<Issue | null> {
  const session = await getServerSession();
  if (!session) {
    return null
  }

  const { accessToken, user } = session;

  trackRun(user?.name, user?.email, url, 'issue')
    .catch(e => console.error('Could not track run:', e))
  
  const baseURL = 'https://neoai.com/api/v4';
  const { projectId, issueIid } = parseNeoaiIssueUrl(url);

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  try {
    const issueDetailsURL = `${baseURL}/projects/${projectId}/issues/${issueIid}`;
    const issueLinkedIssuesURL = `${baseURL}/projects/${projectId}/issues/${issueIid}/links`;
    const issueDiscussionsURL = `${baseURL}/projects/${projectId}/issues/${issueIid}/notes`;
    const issueMRsURL = `${baseURL}/projects/${projectId}/issues/${issueIid}/related_merge_requests`;
    
    const [
      issueDetailsResponse,
      issueLinkedIssuesResponse,
      issueDiscussionsResponse,
      issueMRsResponse,
    ] = await Promise.all([
      fetch(issueDetailsURL, { headers }),
      fetch(issueLinkedIssuesURL, { headers }),
      fetch(issueDiscussionsURL, { headers }),
      fetch(issueMRsURL, { headers }),
    ]);

    if (!issueDetailsResponse.ok || !issueLinkedIssuesResponse.ok || !issueDiscussionsResponse.ok || !issueMRsResponse.ok) {
      throw new Error('NeoAi API error in one or more requests');
    }

    const [
      issueDetails,
      issueLinkedIssues,
      issueDiscussions,
      issueMRs,
    ] = await Promise.all([
      issueDetailsResponse.json(),
      issueLinkedIssuesResponse.json(),
      issueDiscussionsResponse.json(),
      issueMRsResponse.json(),
    ]);

    const issue = {
      ...issueDetails, 
      project_id: projectId,
      linkedIssues: issueLinkedIssues,
      discussions: issueDiscussions,
      mergeRequests: issueMRs,
    }

    const [understanding, comments, issueSummaries, mrSummaries, securityRecommentations, breakdown]  = await Promise.all([
      getIssueUnderstanding(issue), 
      getDiscussionSummary(issue), 
      getIssueSummaries(issue.linkedIssues, headers),
      getMRSummaries(issue.mergeRequests, headers),
      getIssueSecurityRecommendations(issue),
      breakdownIssue(issue.description),
    ]);

    return {
      ...issue,
      analysis: { understanding, comments },
      linkedIssues: issueSummaries,
      mergeRequests: mrSummaries,
      securityRecommentations: securityRecommentations,
      breakdown: breakdown,
    };
  } catch (error) {
    console.error('Error fetching issue:', error);
    if ((error as Error).message?.includes('NeoAi API error')) {
      redirect('/api/auth/signout');
    }
  }

  return null;
}