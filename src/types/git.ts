// Git-related types
export interface GitRepository {
  id: string;
  name: string;
  url: string;
  branch: string;
  lastCommit?: GitCommit;
  status?: GitStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: GitAuthor;
  date: Date;
  files: string[];
}

export interface GitAuthor {
  name: string;
  email: string;
}

export interface GitStatus {
  clean: boolean;
  stagedFiles: string[];
  modifiedFiles: string[];
  untrackedFiles: string[];
  ahead: number;
  behind: number;
}

export interface GitBranch {
  name: string;
  isActive: boolean;
  lastCommit?: GitCommit;
  ahead: number;
  behind: number;
}

export interface GitCloneRequest {
  url: string;
  projectId: string;
  branch?: string;
}

export interface GitCommitRequest {
  message: string;
  files?: string[];
  author: GitAuthor;
}

export interface GitPushRequest {
  remote?: string;
  branch?: string;
}

export interface GitCreateBranchRequest {
  name: string;
  from?: string;
}

export interface GitMergeRequest {
  sourceBranch: string;
  targetBranch: string;
  message?: string;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  changes: GitDiffChange[];
}

export interface GitDiffChange {
  type: 'add' | 'remove' | 'modify';
  lineNumber: number;
  content: string;
}

export interface GitRemote {
  name: string;
  url: string;
  fetch: string;
  push: string;
}

export interface GitTag {
  name: string;
  commit: string;
  message?: string;
  date: Date;
  author: GitAuthor;
}

export interface GitStash {
  id: string;
  message: string;
  branch: string;
  date: Date;
  files: string[];
}

// Git operation response types
export interface GitOperationResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface GitCloneResponse extends GitOperationResponse<GitRepository> {}
export interface GitCommitResponse extends GitOperationResponse<GitCommit> {}
export interface GitPushResponse extends GitOperationResponse {}
export interface GitStatusResponse extends GitOperationResponse<GitStatus> {}
export interface GitBranchesResponse extends GitOperationResponse<GitBranch[]> {}
export interface GitCommitsResponse extends GitOperationResponse<GitCommit[]> {}

// Git configuration
export interface GitConfig {
  user: {
    name: string;
    email: string;
  };
  core: {
    editor: string;
    autocrlf: boolean;
  };
  remote: {
    origin: {
      url: string;
      fetch: string;
    };
  };
}

// Git workflow types
export interface GitWorkflow {
  id: string;
  name: string;
  description: string;
  steps: GitWorkflowStep[];
  triggers: GitWorkflowTrigger[];
}

export interface GitWorkflowStep {
  id: string;
  name: string;
  action: 'commit' | 'push' | 'merge' | 'tag' | 'deploy';
  conditions: GitWorkflowCondition[];
  parameters: Record<string, unknown>;
}

export interface GitWorkflowTrigger {
  type: 'push' | 'pull_request' | 'schedule' | 'manual';
  conditions: GitWorkflowCondition[];
}

export interface GitWorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'not_equals';
  value: string;
}

// Git integration settings
export interface GitIntegrationSettings {
  autoCommit: boolean;
  commitMessageTemplate: string;
  autoPush: boolean;
  defaultBranch: string;
  mergeStrategy: 'merge' | 'rebase' | 'squash';
  signCommits: boolean;
  hooks: {
    preCommit: boolean;
    postCommit: boolean;
    prePush: boolean;
    postPush: boolean;
  };
}
