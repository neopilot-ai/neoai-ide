import { DiscussionAnalysis } from "../../mr_analysis/analyse_discussions";
import { Discussion } from "./discussions";
import { Milestone } from "./issue";
import { Job } from "./pipelines";

export interface MergeRequest {
    iid: number;
    id: number;
    title: string;
    description: string;
    author: { name: string };
    created_at: string;
    merged_at: string;
    state: string;
    project_id: string;
    pipeline?: { status: string };
    approvalStatus: string;
    commits: Commit[];
    relatedIssues: Issue[];
    discussions: Discussion[];
    codeChanges: Change[];
    relatedMRs: RelatedMR[];
    summary: MRSummary;
    web_url: string;
    sha: string;
    analysis?: Analysis;
    securityReview: string;
    discussionsAnalysis: DiscussionAnalysis;
    failingJobs: Job[];
    projectDetails?: Project;
    milestone: Milestone;
    user_notes_count: number;
    changes_count?: number;
    changed_lines?: number;
  }
  
  export interface Chat {
    prompt: string;
    answer: string;
  }
  
  export interface Project {
    id: number;
    name: string;
    visibility: string;
    path_with_namespace: string;
    web_url: string;
  }
  
  export interface MRSummary {
    summary: string;
    keyChanges: string;
  }
  
  export interface Commit {
    message: string;
    web_url: string;
    summary: string;
  }
  
  export interface Issue {
    iid: number;
    id: number;
    title: string;
    description: string;
    summary: string;
    project_id: number;
  }
  
  export interface Change {
    new_path: string;
    old_path: string;
    diff: string;
    summary: string;
    impact: string;
    review: string;
    web_url: string;
  }
  
  export interface RelatedMR {
    id: number;
    title: string;
    summary: string;
  }
  
  export interface Analysis {
    reviewApproach: string;
    breakdown?: string;
    testingStrategy: string;
    suggestedQuestions: string;
    architecturalComponents?: string;
    testingDocumentation?: string;
  }