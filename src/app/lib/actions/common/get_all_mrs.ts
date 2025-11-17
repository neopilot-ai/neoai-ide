"use server";

import { getServerSession } from "next-auth";
import { getCurrentUser } from "./fetch_user";
import { Change, MergeRequest } from "./entities/merge_request";
import { Project } from "./entities/project";

export async function getAllMRsAndProjects(
  dateRange: { from: Date; to: Date } | undefined,
  fetchDiffs: boolean
): Promise<{ mergeRequests: MergeRequest[]; projects: Project[] }> {
  try {
    const session = await getServerSession();
    if (!session) {
      throw new Error("No session found. Please log in.");
    }

    const { accessToken } = session;
    if (!accessToken) {
      throw new Error("No access token found. Please log in.");
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const user = await getCurrentUser();

    // Fetch all MRs with pagination
    let page = 1;
    const perPage = 100;
    let allMergeRequests: MergeRequest[] = [];

    while (true) {
      const response = await fetch(
        `https://neoai.com/api/v4/merge_requests?scope=all&author_id=${user.id}&created_after=${dateRange?.from.toISOString()}&created_before=${dateRange?.to.toISOString()}&state=merged&per_page=${perPage}&page=${page}`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch MRs: ${response.statusText}`);
      }

      const mergeRequests = (await response.json()) as MergeRequest[];
      allMergeRequests = allMergeRequests.concat(mergeRequests);

      // Check if there are more pages
      const totalPages = parseInt(response.headers.get("X-Total-Pages") || "1");
      if (page >= totalPages) break;
      page++;
    }

    // Fetch unique project details
    const uniqueProjects = [...new Set(allMergeRequests.map((mr) => mr.project_id))];
    const projectDetailsPromises = uniqueProjects.map(async (projectId) => {
      const projectResponse = await fetch(`https://neoai.com/api/v4/projects/${projectId}`, {
        headers,
      });

      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project details: ${projectResponse.statusText}`);
      }

      return projectResponse.json();
    });

    const projectDetails = await Promise.all(projectDetailsPromises);

    // Filter out private projects
    const publicProjects = projectDetails.filter(project => project.visibility !== 'private');
    const publicProjectIds = publicProjects.map(project => project.id);

    // Filter merge requests to only include those from public projects
    const publicMergeRequests = allMergeRequests.filter(mr => 
      publicProjectIds.includes(mr.project_id)
    );

    // Optionally fetch MR diff stats
    if (fetchDiffs) {
      const diffPromises = publicMergeRequests.map(async (mr) => {
        const diffResponse = await fetch(
          `https://neoai.com/api/v4/projects/${mr.project_id}/merge_requests/${mr.iid}/changes`,
          {
            headers,
          }
        );

        if (!diffResponse.ok) {
          console.warn(
            `Failed to fetch diff stats for MR ${mr.iid}: ${diffResponse.statusText}`
          );
          return { id: mr.id, changes_count: null, linesAdded: 0, linesRemoved: 0 }; // Graceful fallback
        }

        const diffData = (await diffResponse.json()) as {
          changes: Change[];
        };

        let linesAdded = 0;
        let linesRemoved = 0;

        // Parse each change's diff
        for (const change of diffData.changes) {
          const diffLines = change.diff.split("\n");

          for (const line of diffLines) {
            if (line.startsWith("+") && !line.startsWith("+++")) {
              linesAdded++;
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              linesRemoved++;
            }
          }
        }

        return { id: mr.id, changes_count: diffData.changes.length, linesAdded, linesRemoved };
      });

      const diffs = await Promise.all(diffPromises);

      // Attach diff stats to MRs
      publicMergeRequests.forEach((mr) => {
        const diff = diffs.find((d) => d.id === mr.id);
        mr.changes_count = diff?.changes_count || 0;
        mr.changed_lines = (diff?.linesAdded || 0) + (diff?.linesRemoved || 0);
      });
    }

    // Attach project details to each merge request
    publicMergeRequests.forEach((mr) => {
      mr.projectDetails = publicProjects.find((project) => project.id === mr.project_id);
    });

    return { mergeRequests: publicMergeRequests, projects: publicProjects };
  } catch (error) {
    console.error("Error fetching all MRs:", error);
    throw error;
  }
}