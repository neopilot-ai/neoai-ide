'use client';

import React, { useState } from 'react';
import { useEditorStore, useAppStore } from '@/store';
import { FileTree } from '@/components/FileExplorer/FileTree';
import { EditorTabs } from '@/components/Editor/EditorTabs';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@/components/Editor/MonacoEditor').then(mod => mod.MonacoEditor), { ssr: false });
import { ChatInterface } from '@/components/AI/ChatInterface';
import { GitPanel } from '@/components/Git/GitPanel';
import { AgentPanel } from '@/components/Agents/AgentPanel';
import { PreviewPanel } from '@/components/Preview/PreviewPanel';
import {
  Bars3Icon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  PlayIcon,
  ShareIcon,
  SparklesIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { tabs, activeTabId, isFileTreeOpen } = useEditorStore();
  const [activePanel, setActivePanel] = useState<'files' | 'ai' | 'git' | 'agents' | 'preview' | 'settings'>('files');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [currentProjectId] = useState('sample-project'); // TODO: Get from actual project context

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const sidebarItems = [
    { id: 'files', icon: FolderIcon, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
    { id: 'ai', icon: ChatBubbleLeftRightIcon, label: 'AI Assistant', shortcut: 'Ctrl+Shift+A' },
    { id: 'git', icon: ShareIcon, label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
    { id: 'agents', icon: SparklesIcon, label: 'AI Agents', shortcut: 'Ctrl+Shift+T' },
    { id: 'preview', icon: EyeIcon, label: 'Live Preview', shortcut: 'Ctrl+Shift+P' },
    { id: 'settings', icon: Cog6ToothIcon, label: 'Settings', shortcut: 'Ctrl+,' },
  ];

  const handlePanelToggle = (panelId: string) => {
    if (activePanel === panelId) {
      setRightPanelOpen(!rightPanelOpen);
    } else {
      setActivePanel(panelId as any);
      setRightPanelOpen(true);
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Title Bar */}
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">NeoAI IDE</span>
          <span className="text-xs text-gray-400">v0.1.0</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center space-x-4 text-xs text-gray-400">
          <span>Ready</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="flex flex-col space-y-1 p-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handlePanelToggle(item.id)}
                className={clsx(
                  'w-10 h-10 flex items-center justify-center rounded-lg transition-colors duration-150',
                  {
                    'bg-primary-600 text-white': activePanel === item.id && rightPanelOpen,
                    'text-gray-400 hover:text-white hover:bg-gray-700': 
                      activePanel !== item.id || !rightPanelOpen,
                  }
                )}
                title={`${item.label} (${item.shortcut})`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Bottom actions */}
          <div className="flex flex-col space-y-1 p-1">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-150"
              title="Run Project (F5)"
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Side Panel */}
        {rightPanelOpen && (
          <div className="w-80 flex flex-col bg-gray-800 border-r border-gray-700">
            {activePanel === 'files' && <FileTree className="flex-1" />}
            {activePanel === 'ai' && <ChatInterface className="flex-1" />}
            {activePanel === 'git' && <GitPanel className="flex-1" projectId={currentProjectId} />}
            {activePanel === 'agents' && <AgentPanel className="flex-1" projectId={currentProjectId} />}
            {activePanel === 'preview' && <PreviewPanel className="flex-1" projectId={currentProjectId} />}
            {activePanel === 'settings' && (
              <div className="flex-1 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Theme
                    </label>
                    <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300">
                      <option>Dark</option>
                      <option>Light</option>
                      <option>Auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Font Size
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="24"
                      defaultValue="14"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      AI Model Preference
                    </label>
                    <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300">
                      <option>GPT-4 Turbo</option>
                      <option>GPT-3.5 Turbo</option>
                      <option>Claude 3 Sonnet</option>
                      <option>Claude 3 Haiku</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Auto-save
                    </label>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-300">Enable auto-save</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Git Auto-commit
                    </label>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-300">Auto-commit on save</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Tabs */}
          <EditorTabs />

          {/* Editor Content */}
          <div className="flex-1 flex overflow-hidden">
            {activeTab ? (
              <MonacoEditor
                tab={activeTab}
                onContentChange={(content) => {
                  // Content change is handled in the Monaco component
                }}
                onCursorPositionChange={(line, column) => {
                  // TODO: Update status bar with cursor position
                  console.log('Cursor position:', line, column);
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <FolderIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h2 className="text-xl font-medium text-gray-400 mb-2">
                    Welcome to NeoAI IDE
                  </h2>
                  <p className="text-gray-500 mb-6">
                    Open a file to start coding with AI assistance
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        // TODO: Implement open file dialog
                        console.log('Open file');
                      }}
                      className="block w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-150"
                    >
                      Open File
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement create new file
                        console.log('Create new file');
                      }}
                      className="block w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors duration-150"
                    >
                      Create New File
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="h-6 bg-primary-600 border-t border-gray-700 flex items-center px-4 text-xs">
            <div className="flex items-center space-x-4">
              <span className="text-white">Ready</span>
              {activeTab && (
                <>
                  <span className="text-primary-100">
                    {activeTab.language.toUpperCase()}
                  </span>
                  <span className="text-primary-100">
                    Line 1, Column 1
                  </span>
                  <span className="text-primary-100">
                    UTF-8
                  </span>
                </>
              )}
            </div>
            <div className="flex-1" />
            <div className="flex items-center space-x-4 text-primary-100">
              <span>AI: Ready</span>
              <span>Tokens: 0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
