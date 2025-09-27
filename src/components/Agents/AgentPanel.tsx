'use client';

import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CogIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  BugAntIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useAgentStore } from '@/store/agentStore';
import { AgentTask, AgentStep, AgentType, AgentStatus, StepStatus } from '@/types/agent';
import clsx from 'clsx';

interface AgentPanelProps {
  className?: string;
  projectId: string;
}

interface CreateTaskFormData {
  agentType: AgentType;
  title: string;
  description: string;
  context: Record<string, any>;
  config: Record<string, any>;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ className, projectId }) => {
  const {
    tasks,
    activeTaskId,
    isLoading,
    error,
    createTask,
    getTask,
    getTasks,
    cancelTask,
    connectWebSocket,
    disconnectWebSocket,
  } = useAgentStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTaskFormData>({
    agentType: AgentType.FEATURE_IMPLEMENTER,
    title: '',
    description: '',
    context: {},
    config: {},
  });

  useEffect(() => {
    if (projectId) {
      getTasks(projectId);
      connectWebSocket(projectId);
    }

    return () => {
      disconnectWebSocket();
    };
  }, [projectId, getTasks, connectWebSocket, disconnectWebSocket]);

  const handleCreateTask = async () => {
    if (!createForm.title.trim() || !createForm.description.trim()) return;

    try {
      await createTask({
        projectId,
        agentType: createForm.agentType,
        title: createForm.title,
        description: createForm.description,
        context: createForm.context,
        config: createForm.config,
      });

      setCreateForm({
        agentType: AgentType.FEATURE_IMPLEMENTER,
        title: '',
        description: '',
        context: {},
        config: {},
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create agent task:', error);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelTask(taskId);
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const getAgentIcon = (agentType: AgentType) => {
    const iconMap = {
      [AgentType.FEATURE_IMPLEMENTER]: CodeBracketIcon,
      [AgentType.CODE_GENERATOR]: SparklesIcon,
      [AgentType.BUG_FIXER]: BugAntIcon,
      [AgentType.REFACTORER]: WrenchScrewdriverIcon,
      [AgentType.TEST_GENERATOR]: CheckCircleIcon,
      [AgentType.DOCUMENTATION_WRITER]: DocumentTextIcon,
      [AgentType.DEPLOYMENT_MANAGER]: CogIcon,
      [AgentType.CODE_REVIEWER]: CheckCircleIcon,
    };
    return iconMap[agentType] || SparklesIcon;
  };

  const getStatusColor = (status: AgentStatus | StepStatus) => {
    switch (status) {
      case AgentStatus.PENDING:
      case StepStatus.PENDING:
        return 'text-gray-400';
      case AgentStatus.RUNNING:
      case StepStatus.RUNNING:
        return 'text-blue-400';
      case AgentStatus.COMPLETED:
      case StepStatus.COMPLETED:
        return 'text-green-400';
      case AgentStatus.FAILED:
      case StepStatus.FAILED:
        return 'text-red-400';
      case AgentStatus.CANCELLED:
        return 'text-yellow-400';
      case AgentStatus.PAUSED:
        return 'text-orange-400';
      case StepStatus.SKIPPED:
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: AgentStatus | StepStatus) => {
    switch (status) {
      case AgentStatus.PENDING:
      case StepStatus.PENDING:
        return ClockIcon;
      case AgentStatus.RUNNING:
      case StepStatus.RUNNING:
        return PlayIcon;
      case AgentStatus.COMPLETED:
      case StepStatus.COMPLETED:
        return CheckCircleIcon;
      case AgentStatus.FAILED:
      case StepStatus.FAILED:
        return XCircleIcon;
      case AgentStatus.CANCELLED:
        return StopIcon;
      case AgentStatus.PAUSED:
        return PauseIcon;
      default:
        return ClockIcon;
    }
  };

  const agentTypeOptions = [
    { value: AgentType.FEATURE_IMPLEMENTER, label: 'Feature Implementer', description: 'Implement complete features with tests and documentation' },
    { value: AgentType.CODE_GENERATOR, label: 'Code Generator', description: 'Generate code snippets and functions' },
    { value: AgentType.BUG_FIXER, label: 'Bug Fixer', description: 'Analyze and fix bugs in existing code' },
    { value: AgentType.REFACTORER, label: 'Refactorer', description: 'Refactor and optimize existing code' },
    { value: AgentType.TEST_GENERATOR, label: 'Test Generator', description: 'Generate comprehensive unit tests' },
    { value: AgentType.DOCUMENTATION_WRITER, label: 'Documentation Writer', description: 'Create and update documentation' },
  ];

  return (
    <div className={clsx('flex flex-col bg-gray-800 border-r border-gray-700', className)}>
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">AI Agents</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150"
            title="Create new agent task"
          >
            <SparklesIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-gray-400">
          Autonomous development agents
        </div>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="p-3 border-b border-gray-700 bg-gray-750">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Create Agent Task</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Agent Type
              </label>
              <select
                value={createForm.agentType}
                onChange={(e) => setCreateForm(prev => ({ ...prev, agentType: e.target.value as AgentType }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
              >
                {agentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {agentTypeOptions.find(opt => opt.value === createForm.agentType)?.description}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Task Title
              </label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Implement user authentication"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Description
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what you want the agent to do..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleCreateTask}
                disabled={!createForm.title.trim() || !createForm.description.trim() || isLoading}
                className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors duration-150"
              >
                {isLoading ? 'Creating...' : 'Create Task'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <SparklesIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No agent tasks</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-2 text-xs text-primary-400 hover:text-primary-300"
            >
              Create your first agent task
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onCancel={() => handleCancelTask(task.id)}
                getAgentIcon={getAgentIcon}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900 border-t border-red-700">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
};

interface TaskItemProps {
  task: AgentTask;
  onCancel: () => void;
  getAgentIcon: (agentType: AgentType) => React.ComponentType<any>;
  getStatusColor: (status: AgentStatus | StepStatus) => string;
  getStatusIcon: (status: AgentStatus | StepStatus) => React.ComponentType<any>;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onCancel,
  getAgentIcon,
  getStatusColor,
  getStatusIcon,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const AgentIcon = getAgentIcon(task.agentType);
  const StatusIcon = getStatusIcon(task.status);

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressColor = (progress: number) => {
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-yellow-500';
    if (progress < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gray-700 rounded-lg p-3">
      <div
        className="flex items-start space-x-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0 mt-1">
          <AgentIcon className="w-5 h-5 text-primary-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-300 truncate">
              {task.title}
            </h4>
            <div className="flex items-center space-x-2">
              <StatusIcon className={clsx('w-4 h-4', getStatusColor(task.status))} />
              {task.status === AgentStatus.RUNNING && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors duration-150"
                  title="Cancel task"
                >
                  <StopIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
            {task.description}
          </p>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>{Math.round(task.progress)}%</span>
              {task.duration && (
                <span>{formatDuration(task.duration)}</span>
              )}
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5">
              <div
                className={clsx('h-1.5 rounded-full transition-all duration-300', getProgressColor(task.progress))}
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="capitalize">{task.agentType.replace('_', ' ')}</span>
            <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          {/* Steps */}
          {task.steps.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-400 mb-2">
                Steps ({task.steps.filter(s => s.status === StepStatus.COMPLETED).length}/{task.steps.length})
              </h5>
              {task.steps.map((step, index) => (
                <StepItem
                  key={step.id}
                  step={step}
                  index={index}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}

          {/* Result */}
          {task.result && Object.keys(task.result).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <h5 className="text-xs font-medium text-gray-400 mb-2">Result</h5>
              <div className="text-xs text-gray-300">
                {task.result.summary && (
                  <p className="mb-2">{task.result.summary}</p>
                )}
                {task.result.files_created > 0 && (
                  <p>• {task.result.files_created} files created</p>
                )}
                {task.result.files_modified > 0 && (
                  <p>• {task.result.files_modified} files modified</p>
                )}
                {task.result.test_files_created > 0 && (
                  <p>• {task.result.test_files_created} test files created</p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {task.errorMessage && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <h5 className="text-xs font-medium text-red-400 mb-2">Error</h5>
              <p className="text-xs text-red-300">{task.errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface StepItemProps {
  step: AgentStep;
  index: number;
  getStatusColor: (status: StepStatus) => string;
  getStatusIcon: (status: StepStatus) => React.ComponentType<any>;
}

const StepItem: React.FC<StepItemProps> = ({
  step,
  index,
  getStatusColor,
  getStatusIcon,
}) => {
  const StatusIcon = getStatusIcon(step.status);

  return (
    <div className="flex items-center space-x-2 text-xs">
      <span className="text-gray-500 w-4">{index + 1}.</span>
      <StatusIcon className={clsx('w-3 h-3', getStatusColor(step.status))} />
      <span className="text-gray-300 flex-1">{step.name}</span>
      {step.duration && (
        <span className="text-gray-500">
          {Math.round(step.duration)}s
        </span>
      )}
    </div>
  );
};

export default AgentPanel;
