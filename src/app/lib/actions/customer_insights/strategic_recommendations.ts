/* eslint-disable @typescript-eslint/no-explicit-any */
import { Issue } from "../common/entities/issue";
import { StrategicRecommendationReport } from "./types";
import { generateReport } from "./utils";

const getPrompt = (issues: Issue[]) => `
You are analyzing a dataset of issues. Respond with valid JSON only. Do not include any additional text outside the JSON block.
Your goal is to group the issues into trends, describe the trends, and provide structured JSON output based on the analysis. Use the following criteria for generating trends and structuring your response:
  
Criteria for Analysis:
1. Group issues based on recurring themes from their labels or descriptions.
2. Summarize each trend with a short description.
3. For each trend, include a list of related issues.
4. Calculate the frequency of each trend as a percentage of total issues.
5. Assess the customer impact for each trend (Low, Medium, High).
6. Based on the trends, offer actionable recommendations to improve customer experience. Recommendations should consider quick wins, fundamental redesigns, or addressing technical debt.

Input Dataset:
The dataset contains ${issues.length} issues. Each issue includes:
- ID
- Title
- Description
- Labels
- Severity
- Date Created

Format your response as valid JSON with the following schema:
{
"trends": [
    {
    "name": "Trend Name",
    "description": "Short summary of the trend.",
    "related_issues": [
        {
        "id": "Issue ID",
        "title": "Issue Title",
        "description": "Issue Description",
        "severity": "Low/Medium/High",
        "labels": ["Label1", "Label2"]
        }
    ],
    "metrics": {
        "frequency": "Percentage of all issues",
        "customer_impact": "Low/Medium/High"
    }
    }
],
"recommendation": "Overall strategic recommendation based on the analysis, highlighting priorities and next steps."
}

Here is the dataset for analysis:
${JSON.stringify(
  issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    labels: issue.labels,
    severity: (issue as any).severity,
    date_created: (issue as any).date_created,
  }))
)}

Generate the JSON report based on this dataset.
`;

export async function generateStrategicRecommendationReport(
  issues: Issue[]
): Promise<StrategicRecommendationReport> {
  return generateReport<StrategicRecommendationReport>(getPrompt(issues));
}
