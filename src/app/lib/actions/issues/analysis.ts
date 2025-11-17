'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth/[...nextauth]/options";
import { AnalysisComments, Issue, MergeRequest, Understanding } from "../common/entities/issue";
import { callAnthropic } from "../../anthropic";
import { Note } from "../common/entities/discussions";

const ISSUE_ANALYSIS_MODEL = "claude-sonnet-4-0"
const ISSUE_ANALYSIS_MAX_TOKENS = 8192
const DISCUSSIONS_ANALYSIS_MODEL = "claude-sonnet-4-0"
const DISCUSSIONS_ANALYSIS_MAX_TOKENS = 8192

export async function getIssueUnderstanding(issue: Issue): Promise<Understanding> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw('No session found. Please log in.')
  }

  const prompt = `
    Analyze the following issue and provide a comprehensive breakdown:

    Title: ${issue.title}
    Description: ${issue.description}

    Please provide the following analysis:
    - Main problem and desired outcome
    - Key requirements and details
    - Use case analysis (real-world scenario, failure implications, success criteria)
    - Unfamiliar terms or concepts
    - Key terms and concepts

    Respond in the following format

    <mainProblem>What is the main problem described in the issue, and what outcome is expected?</mainProblem>
    <requirements>Are there any specific requirements or details mentioned in the issue description that I need to consider while working on this?</requirements>
    <useCase>What is a real world use case scenario for this issue?  What does failure of this issue look like or imply for the user? What does success imply for the user?</useCase>
    <unfamiliarTerms>Are there any unfamiliar terms or keywords in the issue? What do they mean according to NeoAi’s documentation or handbook?</unfamiliarTerms>
    <keyTerms>What are the key terms or concepts in this issue that I need to fully understand to work effectively?</keyTerms>
    `;
  
  const response = await callAnthropic(prompt, ISSUE_ANALYSIS_MODEL, ISSUE_ANALYSIS_MAX_TOKENS);

  const mainProblemMatch = response.match(/<mainProblem>([\s\S]*?)<\/mainProblem>/);
  const requirementsMatch = response.match(/<requirements>([\s\S]*?)<\/requirements>/);
  const useCaseMatch = response.match(/<useCase>([\s\S]*?)<\/useCase>/);
  const unfamiliarTermsMatch = response.match(/<unfamiliarTerms>([\s\S]*?)<\/unfamiliarTerms>/);
  const keyTermsMatch = response.match(/<keyTerms>([\s\S]*?)<\/keyTerms>/);

  return {
    mainProblem: mainProblemMatch ? mainProblemMatch[1].trim() : "Not found.",
    requirements: requirementsMatch ? requirementsMatch[1].trim() : "Not found.",
    useCase: useCaseMatch ? useCaseMatch[1].trim() : "Not found.",
    unfamiliarTerms: unfamiliarTermsMatch ? unfamiliarTermsMatch[1].trim() : "Not found.",
    keyTerms: keyTermsMatch ? keyTermsMatch[1].trim() : "Not found.",
  };
}

export async function getDiscussionSummary(issue: Issue): Promise<AnalysisComments> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw('No session found. Please log in.')
  }

  const prompt = `
    Analyze the discussions on the following issue and provide a detailed summary of the discussions.
    
    Issue Details:

    Title: ${issue.title}
    Description: ${issue.description}

    Discussions:
    ----------------
    ${issue.discussions.map(d => `
      Author: ${d.author.name}
      Body: ${d.body}
    `).join("\n\n")}
    ----------------

    Respond in the following format

    <insights>Are there any comments from team members or stakeholders that provide useful insights or clarify expectations for this issue?</insights>
    <concerns>Have there been any suggestions or concerns raised in the comments that I need to address or keep in mind?</concerns>
    `;
  
  const response = await callAnthropic(prompt, DISCUSSIONS_ANALYSIS_MODEL, DISCUSSIONS_ANALYSIS_MAX_TOKENS);

  const insightsMatch = response.match(/<insights>([\s\S]*?)<\/insights>/);
  const concernsMatch = response.match(/<concerns>([\s\S]*?)<\/concerns>/);

  return {
    insights: insightsMatch ? insightsMatch[1].trim() : "Not found.",
    concerns: concernsMatch ? concernsMatch[1].trim() : "Not found.",
  };
}

export async function getIssueSummaries(issues: Issue[], neoaiAuthHeaders: Record<string, string> ): Promise<Issue[]> {
  const issueSummaries = await Promise.all(
    issues.map(async (issue) => {
      // Fetch the discusssions for the issue
      const discussionResponse = await fetch(`https://neoai.com/api/v4/projects/${issue.project_id}/issues/${issue.iid}/notes`, {
        headers: neoaiAuthHeaders,
      });

      let discussions: Note[] = [];
      
      if (discussionResponse.ok) {
        discussions = await discussionResponse.json() as Note[];
      }

      const prompt = `Summarize the following NeoAi issue:\n\n
        Title: ${issue.title}
        Description: ${issue.description}

        Discussions:
        ------------
        ${discussions?.map((discussion: Note) => `
          Author: ${discussion.author.name}
          Message: ${discussion.body}
        `).join('\n')}
        -----------
        `;
      try {
        const summary = await callAnthropic(prompt, 'claude-3-5-haiku-latest', 8000);
        return { ...issue, summary };
      } catch (error) {
        console.error('Error generating issue summary:', error);
        return { ...issue, summary: 'Error generating summary' };
      }
    })
  );
  
  return issueSummaries;
}

export async function getMRSummaries(mrs: MergeRequest[], neoaiAuthHeaders: Record<string, string>): Promise<MergeRequest[]> {
  const issueSummaries = await Promise.all(
    mrs.map(async (mr) => {
      // Fetch the discusssions for the issue
      const discussionResponse = await fetch(`https://neoai.com/api/v4/projects/${mr.project_id}/merge_requests/${mr.iid}/notes`, {
        headers: neoaiAuthHeaders,
      });

      const diffResponse = await fetch(`https://neoai.com/api/v4/projects/${mr.project_id}/merge_requests/${mr.iid}/diffs`, {
        headers: neoaiAuthHeaders,
      });

      const discussions = await discussionResponse.json() as Note[];
      const diff = await diffResponse.json() as {
        diff: string;
        new_path: string;
      }[];

      const prompt = `Summarize the following NeoAi Merge Request:\n\n
        Title: ${mr.title}
        Description: ${mr.description}

        Changes:
        --------
        ${diff?.map((change) => `
          File: ${change.new_path}
          Additions: ${change.diff.match(/^\+/gm)?.length || 0}
          Deletions: ${change.diff.match(/^\-/gm)?.length || 0}
        `).join('\n')}
        --------

        Discussions:
        ------------
        ${discussions?.map((discussion: Note) => `
          Author: ${discussion.author.name}
          Message: ${discussion.body}
        `).join('\n')}
        -----------
        `;
      try {
        const summary = await callAnthropic(prompt, 'claude-3-5-haiku-latest', 8000);
        return { ...mr, summary };
      } catch (error) {
        console.error('Error generating issue summary:', error);
        return { ...mr, summary: 'Error generating summary' };
      }
    })
  );
  
  return issueSummaries;
}