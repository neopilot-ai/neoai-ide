"use server";

import { getServerSession } from "next-auth";
import { NEOAI_BASE_URL } from "../../common/constants";
import { Issue } from "../../common/entities/issue";

export type FetchIssuesParams = {
  projectId?: string;
  labels: string[];
  created_after: string;
  created_before: string;
  state: string;
};

/**
 * Fetches all issues for a given query across paginated results.
 *
 * @param query - The customer insights query containing groupLabels, categoryLabels, and dateRange.
 * @returns An array of issues.
 */
export async function fetchIssues({
  projectId,
  labels,
  created_after,
  created_before,
  state,
}: Partial<FetchIssuesParams>): Promise<Issue[]> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Invalid session");
  }

  const { accessToken } = session;
  let issues: Issue[] = [];
  let page = 1;
  const per_page = 100;

  // Build the base query parameters
  const queryParams = new URLSearchParams();
  queryParams.set("state", state ?? "all");
  queryParams.set("per_page", per_page.toString());

  if (created_after) {
    queryParams.set("created_after", created_after);
  }

  if (created_before) {
    queryParams.set("created_before", created_before);
  }

  if (labels && labels.length > 0) {
    queryParams.set("labels", labels.join(","));
  }

  // Continue fetching pages until we have all issues.
  while (true) {
    queryParams.set("page", page.toString());

    const baseUrl = projectId
      ? `${NEOAI_BASE_URL}/projects/${projectId}/issues`
      : `${NEOAI_BASE_URL}/issues`;

    const url = `${baseUrl}?${queryParams.toString()}`;

    console.log(url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }

    const pageIssues: Issue[] = await response.json();
    if (!Array.isArray(pageIssues)) {
      break;
    }

    issues = issues.concat(pageIssues);

    // If fewer than per_page items are returned, we've reached the final page.
    if (pageIssues.length < per_page) {
      break;
    }
    page++;
  }
  return issues;
}
