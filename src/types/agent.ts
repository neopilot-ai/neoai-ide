// Agent-related types
export enum AgentType {
  CODE_GENERATOR = 'code_generator',
  FEATURE_IMPLEMENTER = 'feature_implementer',
  BUG_FIXER = 'bug_fixer',
  REFACTORER = 'refactorer',
  TEST_GENERATOR = 'test_generator',
  DOCUMENTATION_WRITER = 'documentation_writer',
  DEPLOYMENT_MANAGER = 'deployment_manager',
  CODE_REVIEWER = 'code_reviewer',
}

export enum AgentStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface AgentStep {
  id: string;
  name: string;
  description: string;
  type: string;
  status: StepStatus;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
}

export interface AgentTask {
  id: string;
  projectId: string;
  userId: string;
  agentType: AgentType;
  title: string;
  description: string;
  status: AgentStatus;
  progress: number;
  steps: AgentStep[];
  context: Record<string, unknown>;
  config: Record<string, unknown>;
  result: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

export interface CreateAgentTaskRequest {
  projectId: string;
  agentType: AgentType;
  title: string;
  description: string;
  context?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface AgentResponse {
  task: AgentTask;
  message: string;
}

// Agent capabilities and configurations
export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  supportedLanguages: string[];
  requiredContext: string[];
  outputTypes: string[];
}

export interface AgentConfig {
  maxSteps: number;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
  aiModel: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
}

// Agent workflow types
export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  agentTypes: AgentType[];
  steps: AgentWorkflowStep[];
  triggers: AgentWorkflowTrigger[];
  conditions: AgentWorkflowCondition[];
}

export interface AgentWorkflowStep {
  id: string;
  name: string;
  agentType: AgentType;
  config: AgentConfig;
  dependencies: string[];
  conditions: AgentWorkflowCondition[];
  onSuccess: AgentWorkflowAction[];
  onFailure: AgentWorkflowAction[];
}

export interface AgentWorkflowTrigger {
  type: 'manual' | 'schedule' | 'file_change' | 'git_push' | 'api_call';
  config: Record<string, unknown>;
  conditions: AgentWorkflowCondition[];
}

export interface AgentWorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than';
  value: unknown;
}

export interface AgentWorkflowAction {
  type: 'notify' | 'create_task' | 'update_status' | 'send_webhook';
  config: Record<string, unknown>;
}

// Agent metrics and monitoring
export interface AgentMetrics {
  taskId: string;
  agentType: AgentType;
  status: AgentStatus;
  progress: number;
  duration: number;
  stepsCompleted: number;
  stepsTotal: number;
  errorCount: number;
  retryCount: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    tokens: number;
    apiCalls: number;
  };
  timestamp: Date;
}

// Agent templates and presets
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  category: string;
  tags: string[];
  config: AgentConfig;
  context: Record<string, unknown>;
  steps: Partial<AgentStep>[];
  examples: AgentExample[];
}

export interface AgentExample {
  title: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  estimatedDuration: number;
}

// Agent collaboration types
export interface AgentCollaboration {
  id: string;
  name: string;
  description: string;
  participants: AgentParticipant[];
  workflow: AgentWorkflow;
  sharedContext: Record<string, unknown>;
  communicationProtocol: AgentCommunicationProtocol;
}

export interface AgentParticipant {
  agentType: AgentType;
  role: string;
  responsibilities: string[];
  capabilities: AgentCapability[];
  config: AgentConfig;
}

export interface AgentCommunicationProtocol {
  messageFormat: string;
  channels: string[];
  synchronization: 'sequential' | 'parallel' | 'conditional';
  conflictResolution: 'priority' | 'voting' | 'human_intervention';
}

// Agent learning and improvement
export interface AgentLearning {
  taskId: string;
  agentType: AgentType;
  feedback: AgentFeedback;
  improvements: AgentImprovement[];
  modelUpdates: AgentModelUpdate[];
}

export interface AgentFeedback {
  userId: string;
  rating: number;
  comments: string;
  suggestions: string[];
  issues: AgentIssue[];
}

export interface AgentIssue {
  type: 'performance' | 'accuracy' | 'usability' | 'reliability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reproductionSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
}

export interface AgentImprovement {
  type: 'prompt_optimization' | 'workflow_enhancement' | 'error_handling' | 'performance_tuning';
  description: string;
  implementation: string;
  expectedImpact: string;
  metrics: Record<string, number>;
}

export interface AgentModelUpdate {
  modelVersion: string;
  updateType: 'fine_tuning' | 'prompt_engineering' | 'parameter_adjustment';
  changes: Record<string, unknown>;
  performanceImpact: Record<string, number>;
  rollbackPlan: string;
}
