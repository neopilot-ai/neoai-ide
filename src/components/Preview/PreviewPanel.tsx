'use client';

import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { usePreviewStore } from '@/store/previewStore';
import { PreviewEnvironment, PreviewConfig } from '@/types/preview';
import clsx from 'clsx';

interface PreviewPanelProps {
  className?: string;
  projectId: string;
}

interface CreatePreviewFormData {
  framework: string;
  buildCommand: string;
  startCommand: string;
  installCommand: string;
  port: number;
  envVars: Record<string, string>;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ className, projectId }) => {
  const {
    environments,
    isLoading,
    error,
    createEnvironment,
    startEnvironment,
    stopEnvironment,
    restartEnvironment,
    getEnvironments,
    connectWebSocket,
    disconnectWebSocket,
  } = usePreviewStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePreviewFormData>({
    framework: 'react',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    installCommand: 'npm install',
    port: 3000,
    envVars: {},
  });

  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '' });

  useEffect(() => {
    if (projectId) {
      getEnvironments(projectId);
      connectWebSocket(projectId);
    }

    return () => {
      disconnectWebSocket();
    };
  }, [projectId, getEnvironments, connectWebSocket, disconnectWebSocket]);

  const handleCreateEnvironment = async () => {
    if (!createForm.framework) return;

    try {
      const config: PreviewConfig = {
        framework: createForm.framework,
        buildCommand: createForm.buildCommand,
        startCommand: createForm.startCommand,
        installCommand: createForm.installCommand,
        port: createForm.port,
        envVars: createForm.envVars,
      };

      await createEnvironment(projectId, config);
      setShowCreateForm(false);
      setCreateForm({
        framework: 'react',
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        installCommand: 'npm install',
        port: 3000,
        envVars: {},
      });
    } catch (error) {
      console.error('Failed to create preview environment:', error);
    }
  };

  const handleAddEnvVar = () => {
    if (newEnvVar.key && newEnvVar.value) {
      setCreateForm(prev => ({
        ...prev,
        envVars: {
          ...prev.envVars,
          [newEnvVar.key]: newEnvVar.value,
        },
      }));
      setNewEnvVar({ key: '', value: '' });
    }
  };

  const handleRemoveEnvVar = (key: string) => {
    setCreateForm(prev => ({
      ...prev,
      envVars: Object.fromEntries(
        Object.entries(prev.envVars).filter(([k]) => k !== key)
      ),
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-400';
      case 'starting':
      case 'building':
        return 'text-blue-400';
      case 'stopped':
        return 'text-gray-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return CheckCircleIcon;
      case 'starting':
      case 'building':
        return ClockIcon;
      case 'stopped':
        return StopIcon;
      case 'error':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const frameworkOptions = [
    { value: 'react', label: 'React', defaultStart: 'npm start', defaultBuild: 'npm run build' },
    { value: 'vue', label: 'Vue.js', defaultStart: 'npm run dev', defaultBuild: 'npm run build' },
    { value: 'angular', label: 'Angular', defaultStart: 'ng serve', defaultBuild: 'ng build' },
    { value: 'nextjs', label: 'Next.js', defaultStart: 'npm run dev', defaultBuild: 'npm run build' },
    { value: 'nuxtjs', label: 'Nuxt.js', defaultStart: 'npm run dev', defaultBuild: 'npm run build' },
    { value: 'express', label: 'Express.js', defaultStart: 'npm start', defaultBuild: 'npm run build' },
    { value: 'python', label: 'Python', defaultStart: 'python app.py', defaultBuild: 'pip install -r requirements.txt' },
    { value: 'static', label: 'Static HTML', defaultStart: 'npx serve .', defaultBuild: 'echo "No build needed"' },
  ];

  const currentEnvironment = environments.find(env => env.projectId === projectId);

  return (
    <div className={clsx('flex flex-col bg-gray-800 border-r border-gray-700', className)}>
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Live Preview</h3>
          {!currentEnvironment && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150"
              title="Create preview environment"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400">
          Development server management
        </div>
      </div>

      {/* Create Environment Form */}
      {showCreateForm && !currentEnvironment && (
        <div className="p-3 border-b border-gray-700 bg-gray-750">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Create Preview Environment</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Framework
              </label>
              <select
                value={createForm.framework}
                onChange={(e) => {
                  const framework = frameworkOptions.find(f => f.value === e.target.value);
                  setCreateForm(prev => ({
                    ...prev,
                    framework: e.target.value,
                    startCommand: framework?.defaultStart || prev.startCommand,
                    buildCommand: framework?.defaultBuild || prev.buildCommand,
                  }));
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
              >
                {frameworkOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Install Command
              </label>
              <input
                type="text"
                value={createForm.installCommand}
                onChange={(e) => setCreateForm(prev => ({ ...prev, installCommand: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Start Command
              </label>
              <input
                type="text"
                value={createForm.startCommand}
                onChange={(e) => setCreateForm(prev => ({ ...prev, startCommand: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Build Command
              </label>
              <input
                type="text"
                value={createForm.buildCommand}
                onChange={(e) => setCreateForm(prev => ({ ...prev, buildCommand: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Port
              </label>
              <input
                type="number"
                min="1000"
                max="65535"
                value={createForm.port}
                onChange={(e) => setCreateForm(prev => ({ ...prev, port: parseInt(e.target.value) || 3000 }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
              />
            </div>

            {/* Environment Variables */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Environment Variables
              </label>
              
              {Object.entries(createForm.envVars).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2 mb-2">
                  <span className="text-xs text-gray-300 flex-1">{key}={value}</span>
                  <button
                    onClick={() => handleRemoveEnvVar(key)}
                    className="p-1 text-red-400 hover:text-red-300 rounded"
                  >
                    <XCircleIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Key"
                  value={newEnvVar.key}
                  onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={newEnvVar.value}
                  onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300"
                />
                <button
                  onClick={handleAddEnvVar}
                  disabled={!newEnvVar.key || !newEnvVar.value}
                  className="px-2 py-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white rounded text-xs"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleCreateEnvironment}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors duration-150"
              >
                {isLoading ? 'Creating...' : 'Create Environment'}
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

      {/* Environment Status */}
      {currentEnvironment ? (
        <EnvironmentStatus
          environment={currentEnvironment}
          onStart={() => startEnvironment(currentEnvironment.id)}
          onStop={() => stopEnvironment(currentEnvironment.id)}
          onRestart={() => restartEnvironment(currentEnvironment.id)}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      ) : (
        <div className="flex-1 p-4 text-center text-gray-500">
          <EyeIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No preview environment</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-2 text-xs text-primary-400 hover:text-primary-300"
          >
            Create preview environment
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900 border-t border-red-700">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
};

interface EnvironmentStatusProps {
  environment: PreviewEnvironment;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ComponentType<any>;
}

const EnvironmentStatus: React.FC<EnvironmentStatusProps> = ({
  environment,
  onStart,
  onStop,
  onRestart,
  getStatusColor,
  getStatusIcon,
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const StatusIcon = getStatusIcon(environment.status);

  const formatUptime = (createdAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <StatusIcon className={clsx('w-4 h-4', getStatusColor(environment.status))} />
            <span className="text-sm font-medium text-gray-300 capitalize">
              {environment.status}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            {environment.status === 'stopped' && (
              <button
                onClick={onStart}
                className="p-1 text-gray-400 hover:text-green-400 rounded transition-colors duration-150"
                title="Start environment"
              >
                <PlayIcon className="w-4 h-4" />
              </button>
            )}
            
            {environment.status === 'running' && (
              <>
                <button
                  onClick={onRestart}
                  className="p-1 text-gray-400 hover:text-blue-400 rounded transition-colors duration-150"
                  title="Restart environment"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={onStop}
                  className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors duration-150"
                  title="Stop environment"
                >
                  <StopIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Framework:</span>
            <span className="text-gray-300 capitalize">{environment.framework}</span>
          </div>
          
          {environment.url && (
            <div className="flex justify-between">
              <span>URL:</span>
              <a
                href={environment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300"
              >
                {environment.url}
              </a>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Port:</span>
            <span className="text-gray-300">{environment.port}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Uptime:</span>
            <span className="text-gray-300">{formatUptime(environment.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Commands */}
      <div className="p-3 border-b border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Commands</h4>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-400">Install:</span>
            <code className="ml-2 text-gray-300 bg-gray-700 px-2 py-1 rounded">
              {environment.installCommand || 'npm install'}
            </code>
          </div>
          <div>
            <span className="text-gray-400">Start:</span>
            <code className="ml-2 text-gray-300 bg-gray-700 px-2 py-1 rounded">
              {environment.startCommand || 'npm start'}
            </code>
          </div>
          <div>
            <span className="text-gray-400">Build:</span>
            <code className="ml-2 text-gray-300 bg-gray-700 px-2 py-1 rounded">
              {environment.buildCommand || 'npm run build'}
            </code>
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      {Object.keys(environment.envVars).length > 0 && (
        <div className="p-3 border-b border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Environment Variables</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(environment.envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{key}:</span>
                <span className="text-gray-300 truncate ml-2">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-300">Logs</h4>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs text-gray-400 hover:text-gray-300"
          >
            {showLogs ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showLogs && (
          <div className="bg-gray-900 rounded p-2 max-h-48 overflow-y-auto">
            {environment.logs.length > 0 ? (
              <div className="space-y-1">
                {environment.logs.slice(-20).map((log, index) => (
                  <div key={index} className="text-xs text-gray-300 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No logs available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
