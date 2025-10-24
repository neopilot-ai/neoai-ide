import { callAnthropic } from "../../anthropic";
import { Note } from "./entities/discussions";
import { Issue } from "./entities/issue";

export async function getIssueSummaries(issues: Issue[], neoaiAuthHeaders: Record<string, string> ): Promise<Issue[]> {
  const issueSummaries = await Promise.all(
    issues.map(async (issue) => {
      // Fetch the discusssions for the issue
      const discussionResponse = await fetch(`https://neoai.com/api/v4/projects/${issue.project_id}/issues/${issue.iid}/notes`, {
        headers: neoaiAuthHeaders,
      });

      const discussions = await discussionResponse.json() as Note[];

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