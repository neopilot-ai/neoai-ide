// Preview and development server types
export interface PreviewEnvironment {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  framework: string;
  status: 'starting' | 'running' | 'stopped' | 'error' | 'building';
  url?: string;
  port: number;
  containerId?: string;
  buildCommand?: string;
  startCommand?: string;
  installCommand?: string;
  envVars: Record<string, string>;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
}

export interface PreviewConfig {
  framework: string;
  buildCommand?: string;
  startCommand?: string;
  installCommand?: string;
  port?: number;
  envVars?: Record<string, string>;
  dockerfile?: string;
}

export interface CreatePreviewRequest {
  projectId: string;
  framework: string;
  buildCommand?: string;
  startCommand?: string;
  installCommand?: string;
  port?: number;
  envVars?: Record<string, string>;
}

export interface PreviewMetrics {
  cpu: number;
  memory: number;
  network: {
    rx: number;
    tx: number;
  };
  uptime: number;
  status: string;
}

// Build and deployment types
export interface BuildJob {
  id: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  framework: string;
  buildCommand: string;
  outputPath: string;
  artifacts: BuildArtifact[];
  logs: string[];
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
}

export interface BuildArtifact {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  url?: string;
  createdAt: Date;
}

export interface DeploymentTarget {
  id: string;
  name: string;
  type: 'netlify' | 'vercel' | 'aws' | 'gcp' | 'azure' | 'docker' | 'kubernetes';
  config: Record<string, any>;
  isActive: boolean;
}

export interface Deployment {
  id: string;
  projectId: string;
  userId: string;
  targetId: string;
  buildJobId?: string;
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'cancelled';
  url?: string;
  domain?: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  logs: string[];
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
}

// Development server types
export interface DevServer {
  id: string;
  projectId: string;
  framework: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  port: number;
  url?: string;
  pid?: number;
  command: string;
  workingDirectory: string;
  envVars: Record<string, string>;
  logs: string[];
  startedAt?: Date;
  lastActivity?: Date;
}

export interface DevServerConfig {
  framework: string;
  command: string;
  port?: number;
  envVars?: Record<string, string>;
  autoRestart?: boolean;
  watchFiles?: string[];
  ignoreFiles?: string[];
}

// Hot reload and file watching
export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
  size?: number;
}

export interface HotReloadConfig {
  enabled: boolean;
  watchPaths: string[];
  ignorePaths: string[];
  debounceMs: number;
  reloadDelay: number;
}

// Preview templates and presets
export interface PreviewTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  tags: string[];
  config: PreviewConfig;
  files: TemplateFile[];
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export interface TemplateFile {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

// Preview sharing and collaboration
export interface PreviewShare {
  id: string;
  environmentId: string;
  userId: string;
  shareUrl: string;
  accessLevel: 'view' | 'interact' | 'edit';
  password?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface PreviewCollaboration {
  id: string;
  environmentId: string;
  participants: PreviewParticipant[];
  permissions: PreviewPermissions;
  settings: CollaborationSettings;
}

export interface PreviewParticipant {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActivity?: Date;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  file: string;
  line: number;
  column: number;
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface PreviewPermissions {
  canEdit: boolean;
  canRestart: boolean;
  canViewLogs: boolean;
  canChangeConfig: boolean;
  canInviteUsers: boolean;
}

export interface CollaborationSettings {
  allowAnonymous: boolean;
  requireApproval: boolean;
  maxParticipants: number;
  sessionTimeout: number;
}

// Preview analytics and monitoring
export interface PreviewAnalytics {
  environmentId: string;
  metrics: {
    pageViews: number;
    uniqueVisitors: number;
    averageSessionDuration: number;
    bounceRate: number;
    errorRate: number;
  };
  performance: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
  };
  errors: PreviewError[];
  period: {
    start: Date;
    end: Date;
  };
}

export interface PreviewError {
  id: string;
  type: 'javascript' | 'network' | 'build' | 'runtime';
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  timestamp: Date;
  count: number;
}

// Preview optimization and caching
export interface PreviewCache {
  id: string;
  environmentId: string;
  type: 'build' | 'assets' | 'dependencies';
  key: string;
  size: number;
  hitCount: number;
  createdAt: Date;
  lastAccessed: Date;
  expiresAt?: Date;
}

export interface PreviewOptimization {
  id: string;
  environmentId: string;
  type: 'minification' | 'compression' | 'bundling' | 'tree_shaking';
  enabled: boolean;
  config: Record<string, any>;
  impact: {
    sizeBefore: number;
    sizeAfter: number;
    loadTimeBefore: number;
    loadTimeAfter: number;
  };
}
