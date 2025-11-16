'use client';

import React, { useState, useEffect } from 'react';
import {
  ShareIcon,
  CloudArrowUpIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import { useGitStore } from '@/store/gitStore';
import { GitCommit } from '@/types/git';
import clsx from 'clsx';

interface GitPanelProps {
  className?: string;
  projectId: string;
}

interface CommitFormData {
  message: string;
  files: string[];
  author: {
    name: string;
    email: string;
  };
}

export const GitPanel: React.FC<GitPanelProps> = ({ className, projectId }) => {
  const {
    repository,
    branches,
    commits,
    status,
    isLoading,
    error,
    initializeRepository,
    cloneRepository,
    getStatus,
    commitChanges,
    pushChanges,
    createBranch,
    switchBranch,
  } = useGitStore();

  const [showCommitForm, setShowCommitForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [commitForm, setCommitForm] = useState<CommitFormData>({
    message: '',
    files: [],
    author: {
      name: '',
      email: '',
    },
  });
  const [newBranchName, setNewBranchName] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');

  useEffect(() => {
    if (projectId) {
      initializeRepository(projectId);
    }
  }, [projectId, initializeRepository]);

  const handleCloneRepository = async () => {
    if (!cloneUrl.trim()) return;
    
    try {
      await cloneRepository(cloneUrl, projectId);
      setCloneUrl('');
    } catch (error) {
      console.error('Failed to clone repository:', error);
    }
  };

  const handleCommit = async () => {
    if (!commitForm.message.trim()) return;

    try {
      await commitChanges(projectId, commitForm);
      setCommitForm({
        message: '',
        files: [],
        author: { name: '', email: '' },
      });
      setShowCommitForm(false);
    } catch (error) {
      console.error('Failed to commit changes:', error);
    }
  };

  const handlePush = async () => {
    try {
      await pushChanges(projectId);
    } catch (error) {
      console.error('Failed to push changes:', error);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      await createBranch(projectId, newBranchName);
      setNewBranchName('');
      setShowBranchForm(false);
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    try {
      await switchBranch(projectId, branchName);
    } catch (error) {
      console.error('Failed to switch branch:', error);
    }
  };

  const toggleFileStaging = (filePath: string) => {
    setCommitForm(prev => ({
      ...prev,
      files: prev.files.includes(filePath)
        ? prev.files.filter(f => f !== filePath)
        : [...prev.files, filePath],
    }));
  };

  if (!repository) {
    return (
      <div className={clsx('flex flex-col bg-gray-800 border-r border-gray-700', className)}>
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Source Control</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Clone Repository
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleCloneRepository}
                  disabled={!cloneUrl.trim() || isLoading}
                  className="px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors duration-150"
                >
                  Clone
                </button>
              </div>
            </div>

            <div className="text-center text-gray-500">
              <ShareIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No repository initialized</p>
              <button
                onClick={() => initializeRepository(projectId)}
                className="mt-2 text-xs text-primary-400 hover:text-primary-300"
              >
                Initialize Repository
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col bg-gray-800 border-r border-gray-700', className)}>
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Source Control</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => getStatus(projectId)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150"
              title="Refresh"
            >
              <ClockIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Repository info */}
        <div className="text-xs text-gray-400">
          <div className="flex items-center space-x-2 mb-1">
            <ShareIcon className="w-3 h-3" />
            <span>{repository.branch}</span>
          </div>
          <div className="truncate">{repository.name}</div>
        </div>
      </div>

      {/* Changes */}
      <div className="flex-1 overflow-y-auto">
        {status && (
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-300">Changes</h4>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setShowCommitForm(!showCommitForm)}
                  disabled={status.clean}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150 disabled:opacity-50"
                  title="Commit"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePush}
                  disabled={status.clean}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150 disabled:opacity-50"
                  title="Push"
                >
                  <CloudArrowUpIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {status.clean ? (
              <div className="text-center text-gray-500 py-4">
                <CheckIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No changes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Staged files */}
                {status.stagedFiles.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-green-400 mb-1">
                      Staged Changes ({status.stagedFiles.length})
                    </h5>
                    {status.stagedFiles.map((file) => (
                      <FileItem
                        key={file}
                        file={file}
                        status="staged"
                        onToggle={() => toggleFileStaging(file)}
                        isSelected={commitForm.files.includes(file)}
                      />
                    ))}
                  </div>
                )}

                {/* Modified files */}
                {status.modifiedFiles.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-yellow-400 mb-1">
                      Modified ({status.modifiedFiles.length})
                    </h5>
                    {status.modifiedFiles.map((file) => (
                      <FileItem
                        key={file}
                        file={file}
                        status="modified"
                        onToggle={() => toggleFileStaging(file)}
                        isSelected={commitForm.files.includes(file)}
                      />
                    ))}
                  </div>
                )}

                {/* Untracked files */}
                {status.untrackedFiles.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-1">
                      Untracked ({status.untrackedFiles.length})
                    </h5>
                    {status.untrackedFiles.map((file) => (
                      <FileItem
                        key={file}
                        file={file}
                        status="untracked"
                        onToggle={() => toggleFileStaging(file)}
                        isSelected={commitForm.files.includes(file)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Commit form */}
            {showCommitForm && (
              <div className="mt-4 p-3 bg-gray-700 rounded">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Commit Message
                    </label>
                    <textarea
                      value={commitForm.message}
                      onChange={(e) => setCommitForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter commit message..."
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={commitForm.author.name}
                        onChange={(e) => setCommitForm(prev => ({
                          ...prev,
                          author: { ...prev.author, name: e.target.value }
                        }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Author Email
                      </label>
                      <input
                        type="email"
                        value={commitForm.author.email}
                        onChange={(e) => setCommitForm(prev => ({
                          ...prev,
                          author: { ...prev.author, email: e.target.value }
                        }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleCommit}
                      disabled={!commitForm.message.trim() || !commitForm.author.name || !commitForm.author.email}
                      className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors duration-150"
                    >
                      Commit
                    </button>
                    <button
                      onClick={() => setShowCommitForm(false)}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors duration-150"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Branches */}
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Branches</h4>
            <button
              onClick={() => setShowBranchForm(!showBranchForm)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150"
              title="Create branch"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          {showBranchForm && (
            <div className="mb-3 p-3 bg-gray-700 rounded">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Branch name"
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
                />
                <button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim()}
                  className="px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white rounded text-sm"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {branches.map((branch) => (
              <div
                key={branch.name}
                className={clsx(
                  'flex items-center justify-between p-2 rounded cursor-pointer transition-colors duration-150',
                  {
                    'bg-primary-600 text-white': branch.isActive,
                    'hover:bg-gray-700 text-gray-300': !branch.isActive,
                  }
                )}
                onClick={() => !branch.isActive && handleSwitchBranch(branch.name)}
              >
                <div className="flex items-center space-x-2">
                  <ShareIcon className="w-4 h-4" />
                  <span className="text-sm">{branch.name}</span>
                  {branch.isActive && (
                    <CheckIcon className="w-3 h-3 text-green-400" />
                  )}
                </div>
                {(branch.ahead > 0 || branch.behind > 0) && (
                  <div className="flex items-center space-x-1 text-xs">
                    {branch.ahead > 0 && (
                      <span className="text-green-400">↑{branch.ahead}</span>
                    )}
                    {branch.behind > 0 && (
                      <span className="text-red-400">↓{branch.behind}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent commits */}
        <div className="p-3">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Commits</h4>
          <div className="space-y-2">
            {commits.slice(0, 10).map((commit) => (
              <CommitItem key={commit.hash} commit={commit} />
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900 border-t border-red-700">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
};

interface FileItemProps {
  file: string;
  status: 'staged' | 'modified' | 'untracked';
  onToggle: () => void;
  isSelected: boolean;
}

const FileItem: React.FC<FileItemProps> = ({ file, status, onToggle, isSelected }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'staged': return 'text-green-400';
      case 'modified': return 'text-yellow-400';
      case 'untracked': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const getStatusSymbol = () => {
    switch (status) {
      case 'staged': return 'A';
      case 'modified': return 'M';
      case 'untracked': return '?';
      default: return '';
    }
  };

  return (
    <div
      className={clsx(
        'flex items-center justify-between p-2 rounded cursor-pointer transition-colors duration-150',
        {
          'bg-gray-700': isSelected,
          'hover:bg-gray-700': !isSelected,
        }
      )}
      onClick={onToggle}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <DocumentIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-300 truncate">{file}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className={clsx('text-xs font-mono', getStatusColor())}>
          {getStatusSymbol()}
        </span>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
        />
      </div>
    </div>
  );
};

interface CommitItemProps {
  commit: GitCommit;
}

const CommitItem: React.FC<CommitItemProps> = ({ commit }) => {
  return (
    <div className="p-2 bg-gray-700 rounded">
      <div className="flex items-start space-x-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300 truncate">{commit.message}</p>
          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
            <span>{commit.author.name}</span>
            <span>•</span>
            <span>{new Date(commit.date).toLocaleDateString()}</span>
          </div>
        </div>
        <span className="text-xs font-mono text-gray-400 flex-shrink-0">
          {commit.hash.substring(0, 7)}
        </span>
      </div>
    </div>
  );
};

export default GitPanel;
