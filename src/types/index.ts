// Core application types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isPublic: boolean;
  framework?: string;
  language: string;
  gitUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  content?: string;
  language?: string;
  children?: FileNode[];
  isOpen?: boolean;
  isModified?: boolean;
  lastModified?: Date;
}

export interface EditorTab {
  id: string;
  fileId: string;
  path: string;
  name: string;
  content: string;
  language: string;
  isModified: boolean;
  isActive: boolean;
  cursorPosition?: {
    line: number;
    column: number;
  };
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  tokens?: {
    input: number;
    output: number;
  };
  cost?: number;
}

export interface AIChat {
  id: string;
  projectId: string;
  messages: AIMessage[];
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  isEnabled: boolean;
  apiKey?: string;
  baseUrl?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  inputCost: number; // per 1K tokens
  outputCost: number; // per 1K tokens
  capabilities: string[];
  isDefault?: boolean;
}

export interface AgentTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  steps: AgentStep[];
  result?: {
    filesModified: string[];
    filesCreated: string[];
    testsGenerated: string[];
    commitMessage?: string;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  duration?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface GitRepository {
  id: string;
  projectId: string;
  url: string;
  branch: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
  isPrivate: boolean;
  lastSync?: Date;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  date: Date;
  files: string[];
}

export interface GitBranch {
  name: string;
  isActive: boolean;
  lastCommit: GitCommit;
  ahead: number;
  behind: number;
}

export interface PreviewEnvironment {
  id: string;
  projectId: string;
  url: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  port: number;
  framework: string;
  buildCommand?: string;
  startCommand?: string;
  envVars?: Record<string, string>;
  logs: string[];
  createdAt: Date;
}

export interface BuildResult {
  id: string;
  projectId: string;
  status: 'building' | 'success' | 'failed';
  duration?: number;
  logs: string[];
  artifacts?: string[];
  error?: string;
  createdAt: Date;
}

// UI State types
export interface AppState {
  user: User | null;
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;
}

export interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;
  fileTree: FileNode[];
  isFileTreeOpen: boolean;
  selectedFileId: string | null;
}

export interface AIState {
  chats: AIChat[];
  activeChatId: string | null;
  providers: AIProvider[];
  selectedModel: string;
  isGenerating: boolean;
  usage: {
    tokensUsed: number;
    costThisMonth: number;
    requestsThisMonth: number;
  };
}

export interface AgentState {
  tasks: AgentTask[];
  activeTaskId: string | null;
  isRunning: boolean;
  availableWorkflows: string[];
}

export interface GitState {
  repository: GitRepository | null;
  branches: GitBranch[];
  currentBranch: string;
  commits: GitCommit[];
  stagedFiles: string[];
  unstagedFiles: string[];
  isLoading: boolean;
}

export interface PreviewState {
  environments: PreviewEnvironment[];
  activeEnvironmentId: string | null;
  builds: BuildResult[];
  isBuilding: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Event types
export interface FileChangeEvent {
  type: 'create' | 'update' | 'delete' | 'rename';
  path: string;
  oldPath?: string;
  content?: string;
}

export interface EditorChangeEvent {
  tabId: string;
  content: string;
  cursorPosition: {
    line: number;
    column: number;
  };
}

export interface AIRequestEvent {
  chatId: string;
  message: string;
  model: string;
  context?: {
    files: string[];
    selection?: string;
  };
}

// Configuration types
export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
  };
  ai: {
    defaultModel: string;
    autoComplete: boolean;
    contextLines: number;
    maxTokens: number;
  };
  git: {
    autoCommit: boolean;
    commitMessageTemplate: string;
    autoPush: boolean;
  };
  preview: {
    autoReload: boolean;
    openInNewTab: boolean;
    defaultPort: number;
  };
}

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}
