'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEditorStore } from '@/store';
import { EditorTab } from '@/types';
import clsx from 'clsx';

interface EditorTabsProps {
  className?: string;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({ className }) => {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const getFileIcon = (language: string) => {
    const iconMap: Record<string, string> = {
      javascript: '📄',
      typescript: '📘',
      python: '🐍',
      java: '☕',
      cpp: '⚡',
      c: '⚡',
      rust: '🦀',
      go: '🐹',
      php: '🐘',
      ruby: '💎',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      json: '📋',
      xml: '📄',
      yaml: '📄',
      markdown: '📝',
      sql: '🗄️',
      shell: '💻',
      dockerfile: '🐳',
    };

    return iconMap[language] || '📄';
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={clsx('flex bg-gray-800 border-b border-gray-700', className)}>
      <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={clsx(
              'flex items-center px-4 py-2 border-r border-gray-700 cursor-pointer group min-w-0 max-w-xs',
              'hover:bg-gray-700 transition-colors duration-150',
              {
                'bg-gray-900 text-white': tab.isActive,
                'bg-gray-800 text-gray-300': !tab.isActive,
              }
            )}
            onClick={() => handleTabClick(tab.id)}
            title={tab.path}
          >
            <span className="mr-2 text-sm flex-shrink-0">
              {getFileIcon(tab.language)}
            </span>
            
            <span
              className={clsx(
                'text-sm truncate flex-1 min-w-0',
                {
                  'text-white': tab.isActive,
                  'text-gray-300': !tab.isActive,
                }
              )}
            >
              {tab.name}
            </span>

            {tab.isModified && (
              <span
                className={clsx(
                  'w-2 h-2 rounded-full ml-2 flex-shrink-0',
                  {
                    'bg-primary-400': tab.isActive,
                    'bg-primary-500': !tab.isActive,
                  }
                )}
                title="Modified"
              />
            )}

            <button
              className={clsx(
                'ml-2 p-1 rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0',
                {
                  'opacity-100': tab.isActive,
                }
              )}
              onClick={(e) => handleTabClose(e, tab.id)}
              title="Close tab"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Tab actions */}
      <div className="flex items-center ml-auto px-2">
        <button
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150"
          onClick={() => {
            // TODO: Implement "close all tabs" functionality
            tabs.forEach((tab) => closeTab(tab.id));
          }}
          title="Close all tabs"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default EditorTabs;
