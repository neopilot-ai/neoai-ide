import { Issue } from "../common/entities/issue";

export interface Source {
  id: string;
  title: string;
}

export interface NeoAiScopedLabel {
  label: string;
  value: string;
}

export interface NeoAiGroupLabel {
  label: string;
  group: string;
}

export interface CustomerInsightsQuery {
  sources: string[];
  projectId: string;
  groupLabels: string[];
  categoryLabels: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

export type Trend = {
  name: string;
  description: string;
  related_issues: Issue[];
  metrics: {
    frequency: number;
    customer_impact: string;
  };
};

export interface StrategicRecommendationReport {
  trends: Trend[];
  recommendation: string;
}

export interface BugReport {
  recommendation: string;
}

export interface CustomerInsightsReport {
  strategicRecommendations: StrategicRecommendationReport;
  bugReport: BugReport;
}

export interface BugReport {
  common_bug_types: {
    type: string;
    count: number;
    percentage: number;
  }[];
  frequency_over_time: {
    period: string;
    bug_count: number;
  }[];
  average_resolution_time: number;
  potential_root_causes: {
    cause: string;
    related_bugs: {
      id: string;
      title: string;
      url: string;
    }[];
  }[];
  recommendations: {
    recommendation: string;
    impact: string;
  }[];
}
