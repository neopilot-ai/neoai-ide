'use server';

import { BaseIssue, CreatedIssue, Issue } from "../common/entities/issue";
import { getServerSession } from "next-auth";
import { trackAction } from "../../telemetry";

export async function createIssues(issues: BaseIssue[], originalIssue: Issue, convertToEpic: boolean): Promise<CreatedIssue[]> {
  const session = await getServerSession();
  if (!session) {
    throw('No session found. Please log in.')
  }

  trackAction(session?.user?.name, "create_issue")
    .catch(e => console.error('Could not track action:', e))

  const { accessToken } = session;

  if (!accessToken) {
    throw('No access token found. Please log in.')
  }

  let epicId = originalIssue.epic_id;

  if (convertToEpic) {
    const groupInfo = await fetchGroupInfo(originalIssue.project_id, accessToken);
    const createdEpic = await createEpic(originalIssue, groupInfo.id, accessToken);
    epicId = createdEpic.id;
  }

  return Promise.all(issues.map(issue => createIssue(issue, originalIssue, epicId, accessToken)))
}

async function createEpic(originalIssue: Issue, groupId: number, accessToken: string): Promise<{ id: number, web_url: string }> {
  const neoaiApiUrl = `https://neoai.com/api/v4/groups/${groupId}/epics`;

  try {
    const response = await fetch(neoaiApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Epic: ${originalIssue.title}`,
        description: originalIssue.description,
      })
    });

    if (!response.ok) {
      throw new Error(`Error creating epic: ${response.statusText}`);
    }

    const createdEpic = await response.json();

    return {
      id: createdEpic.id,
      web_url: createdEpic.web_url
    };
  } catch (error) {
    console.error('Error creating NeoAi epic:', error);
    throw new Error('Failed to create NeoAi epic');
  }
}

async function createIssue(issue: BaseIssue, originalIssue: Issue, epicId: number, accessToken: string): Promise<CreatedIssue> {
  const neoaiApiUrl = `https://neoai.com/api/v4/projects/${originalIssue.project_id}/issues`;

  try {
    const response = await fetch(neoaiApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: issue.title,
        description: issue.description,
        labels: originalIssue.labels.join(','),
        project_id: originalIssue.project_id,
        epic_id: epicId,
      })
    });

    if (!response.ok) {
      throw new Error(`Error creating issue: ${response.statusText}`);
    }

    const createdIssue = await response.json();

    return {
      id: createdIssue.id,
      title: createdIssue.title,
      web_url: createdIssue.web_url
    };
  } catch (error) {
    console.error('Error creating NeoAi issue:', error);
    throw new Error('Failed to create NeoAi issue');
  }
}

async function fetchGroupInfo(projectId: string, accessToken: string): Promise<{ id: number, web_url: string }> {
  const neoaiApiUrl = `https://neoai.com/api/v4/projects/${projectId}`;

  try {
    const response = await fetch(neoaiApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching project info: ${response.statusText}`);
    }

    const projectInfo = await response.json();
    return {
      id: projectInfo.namespace.id,
      web_url: projectInfo.namespace.web_url
    };
  } catch (error) {
    console.error('Error fetching NeoAi project info:', error);
    throw new Error('Failed to fetch NeoAi project info');
  }
}