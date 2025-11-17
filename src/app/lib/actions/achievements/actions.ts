"use server";

import { getServerSession } from 'next-auth';
import { MergeRequest } from '../common/entities/merge_request';
import { callAnthropic } from '@/app/lib/anthropic';
import { trackRun } from '../../telemetry';

function calculateBatches(
  mergeRequests: MergeRequest[],
): string[] {
  const batches: string[] = [];
  let currentText = '';

  for (const mr of mergeRequests) {
    const projectName = mr.projectDetails?.name;
    const createdAt = new Date(mr.created_at);
    const mergedAt = new Date(mr.merged_at);
    const mergedInDays = Math.ceil((mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const text = `
      Title: ${mr.title}
      Project: ${projectName}
      Description: ${mr.description}
      Link (use these in the citations): ${mr.web_url}
      Merged in Days: ${mergedInDays}
      No of discussions: ${mr.user_notes_count}
      Changed Lines: ${mr.changed_lines}
      ----
    `;

    if (currentText.length + text.length > 300000) {
      batches.push(currentText);
      currentText = text;
    } else {
      currentText += `\n${text}`;
    }
  }

  if (currentText) {
    batches.push(currentText);
  }

  return batches;
}

const MR_SUMMARY_MODEL = "claude-sonnet-4-0"
const MR_BATCH_SUMMARY_MAX_TOKENS = 1024
const MR_SUMMARY_MAX_TOKENS = 8192

async function processBatch(batch: string, temperature: number): Promise<string> {
  const prompt = `
    You are given a list of merge requests and their descriptions. The descriptions are verbose and need to be summarized to
    highlight the essence of the merge request. Please provide a larger description for when the merged in days are higher.

    Here is the list of MRs:

    ${batch}

    Please summarize the merge requests in the following format:

    Title: <title>
    Project: <project>
    Summary: <summary>
    Link: <link>
    Merged in Days: <Merged in days>
    No of discussions: <No of discussions>
    Changed Lines: <No of lines changed in MR>
    ---
  `;

  return await callAnthropic(prompt, MR_SUMMARY_MODEL, MR_BATCH_SUMMARY_MAX_TOKENS, temperature);
}

export async function summarizeAchievements(
  mergeRequests: MergeRequest[],
  temperature: number
): Promise<string> {

  const session = await getServerSession();
  if (!session) {
    throw new Error("No session found. Please log in.");
  }

  const { user } = session;

  trackRun(user?.name, user?.email, "", 'achievements')
    .catch(e => console.error('Could not track run:', e))
  
  const batches = calculateBatches(mergeRequests);
  const batchResults: string[] = [];

  const promises = batches.map(batch => processBatch(batch, temperature));

  for (const promise of promises) {
    const result = await promise;
    batchResults.push(result);
  }

  const combinedResults = batchResults.join('\n');
  const totalWordCount = Math.min(3000, mergeRequests.length * 50);

  const achievementsPrompt = `
    Your task is to generate a summary of achievements of an engineer based on the work they have done this year. You are given 
    summaries of the merge requests that they've worked on. Can you generate an achievements report based on this data and respond in a well-formatted markdown?
    **Very important**: Please use information from the MRs provided below only to generate the summary. Do not use any other facts to generate the summary.

    Please note:
    - The markdown should have the following sections: Introduction, Key Achievements, and Conclusion. 
    - Divide the Key Achievement section into subsections.
    - The summary should be around ${totalWordCount} words. Citations do not count towards the word limits.
    - Provide more focus on MRs with higher 'merged in days' as it indicates more time spent.
    - Highlight MRs with many discussions as they involve significant collaboration and effort.
    - Give more importance to MRs with more lines changed, as these indicate deeper technical work.

    The current date is ${new Date().toISOString()}.

    Merge Request Summary:
    ----------------------
    \`\`\`
    ${combinedResults}
    \`\`\`
  `;

  const finalResult = await callAnthropic(achievementsPrompt, MR_SUMMARY_MODEL, MR_SUMMARY_MAX_TOKENS);
  // progressCallback(100);
  return finalResult;
}
