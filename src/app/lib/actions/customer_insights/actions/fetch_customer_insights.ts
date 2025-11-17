"use server";

import { CustomerInsightsQuery, CustomerInsightsReport } from "../types";
import { Issue } from "../../common/entities/issue";
import { analyzeIssuesForInsights } from "../analyze_issues";
import { fetchIssues } from "../utils/fetch_issues";

async function fetchIssuesForProject({
  sources,
  groupLabels,
  categoryLabels,
  dateRange,
}: CustomerInsightsQuery): Promise<Issue[]> {
  const params = {
    created_after: dateRange.start,
    created_before: dateRange.end,
    labels: [...groupLabels, ...categoryLabels],
    state: "all",
  };

  const promises: Promise<Issue[]>[] = [];
  if (sources.includes("neoai")) {
    promises.push(fetchIssues(params));
  }
  if (sources.includes("rfh")) {
    promises.push(fetchIssues({ ...params, projectId: "64541115" }));
  }
  if (sources.includes("incidents")) {
    promises.push(fetchIssues({ ...params, projectId: "7444821" }));
  }

  return (await Promise.all(promises)).flatMap((x) => x);
}

export async function fetchAvailableSources(): Promise<string[]> {
  return ["Request For Help", "Incidents", "NeoAi.com"];
}

export async function fetchCustomerInsights(
  query: CustomerInsightsQuery
): Promise<CustomerInsightsReport> {
  const issues = await fetchIssuesForProject(query);
  return analyzeIssuesForInsights(issues);
}
