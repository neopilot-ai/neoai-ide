"use server";

import { getServerSession } from "next-auth";
import { Issue } from "../common/entities/issue";
import { parseNeoaiIssueUrl } from "../../utils";
import { redirect } from "next/navigation";
import { NEOAI_BASE_URL } from "../common/constants";

export async function fetchIssue(url: string): Promise<Issue | null> {
  const session = await getServerSession();
  if (!session) {
    redirect('/api/auth/signout');
    return null
  }

  const { accessToken } = session;
  
  const { projectId, issueIid } = parseNeoaiIssueUrl(url);

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  try {
    const issueDetailsURL = `${NEOAI_BASE_URL}/projects/${projectId}/issues/${issueIid}`;
    const issueDiscussionsURL = `${NEOAI_BASE_URL}/projects/${projectId}/issues/${issueIid}/notes`;
    
    const [
      issueDetailsResponse,
      issueDiscussionsResponse,
    ] = await Promise.all([
      fetch(issueDetailsURL, { headers }),
      fetch(issueDiscussionsURL, { headers }),
    ]);

    if (!issueDetailsResponse.ok || !issueDiscussionsResponse.ok) {
      throw new Error('NeoAi API error in one or more requests');
    }

    const [
      issueDetails,
      issueDiscussions,
    ] = await Promise.all([
      issueDetailsResponse.json(),
      issueDiscussionsResponse.json(),
    ]);

    return {
      ...issueDetails,
      discussions: issueDiscussions,
    };
  } catch (error) {
    console.error('Error fetching issue:', error);
    if ((error as Error).message?.includes('NeoAi API error')) {
      redirect('/api/auth/signout');
    }
  }

  return null;
}

export async function saveIssue(url: string, description: string) {
  try {
    const { projectId, issueIid } = parseNeoaiIssueUrl(url);
    const session = await getServerSession();
    if (!session) {
      throw new Error('No session found. Please log in.');
    }
  
    const { accessToken } = session;
  
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  
    const response = await fetch(`${NEOAI_BASE_URL}/projects/${projectId}/issues/${issueIid}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        description,
      }),
    });
  
    const responseData = await response.json();
    console.log(responseData);

    if (response.ok) {
      console.log('Issue saved successfully');
    } else {
      throw new Error('Error saving issue');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
