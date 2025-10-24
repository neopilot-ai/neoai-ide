/* eslint-disable @typescript-eslint/no-explicit-any */
import { Issue } from "../common/entities/issue";
import { BugReport } from "./types";
import { generateReport } from "./utils";

const getPrompt = (issues: Issue[]) => `
You are analyzing a dataset of issues. Respond with valid JSON only. Do not include any additional text outside the JSON block.
Your goal is to identify trends and provide actionable insights to improve customer experience. Use the following criteria for your analysis:

Criteria for Analysis:
1. Identify the most common types of bugs based on issue descriptions or labels.
2. Calculate the frequency of bugs over time (grouped by week or month).
3. Determine the average resolution time for bugs.
4. Analyze the potential root causes of recurring bugs.
5. Provide recommendations for preventing similar bugs in the future.

Input Dataset:
The dataset contains ${issues.length} issues. Each issue includes:
- ID
- Title
- Description
- Labels
- Severity
- Created At
- Closed At (if resolved)

Format your response as valid JSON with the following schema:
{
    "common_bug_types": [
        {
        "type": "Bug Type",
        "count": "Number of occurrences",
        "percentage": "Percentage of total bugs"
        }
    ],
    "frequency_over_time": [
        {
        "period": "Time period (e.g., week/month)",
        "bug_count": "Number of bugs during this period"
        }
    ],
    "average_resolution_time": "Average time to resolve bugs (in days)",
    "potential_root_causes": [
        {
        "cause": "Description of root cause",
        "related_bugs": [
          {
            "id": "Issue ID",
            "title": "Issue Title"
            "url ": "Issue web_url"
          }
        ]
        }
    ],
    "recommendations": [
        {
        "recommendation": "Actionable recommendation",
        "impact": "Expected impact on bug reduction"
        }
    ]
}

Here is the dataset for analysis:
${JSON.stringify(
  issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    labels: issue.labels,
    severity: (issue as any).severity,
    created_at: (issue as any).created_at,
    closed_at: (issue as any).closed_at,
  }))
)}

Generate the JSON report based on this dataset.
`;

export async function generateBugReport(issues: Issue[]): Promise<BugReport> {
  const bugIssues = issues.filter((issue) => {
    return issue.labels && issue.labels.includes("type::bug");
  });

  return generateReport<BugReport>(getPrompt(bugIssues));
}
