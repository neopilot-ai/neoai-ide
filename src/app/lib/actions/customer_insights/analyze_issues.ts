import { Issue } from "../common/entities/issue";
import { generateBugReport } from "./bug_report";
import { generateStrategicRecommendationReport } from "./strategic_recommendations";
import { CustomerInsightsReport } from "./types";

export async function analyzeIssuesForInsights(
  issues: Issue[]
): Promise<CustomerInsightsReport> {
  return {
    strategicRecommendations: await generateStrategicRecommendationReport(
      issues
    ),
    bugReport: await generateBugReport(issues),
  };
}
