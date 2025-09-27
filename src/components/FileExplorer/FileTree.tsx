'use client';

import React, { useState } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  DocumentIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { useEditorStore } from '@/store';
import { FileNode } from '@/types';
import clsx from 'clsx';

interface FileTreeProps {
  className?: string;
}

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  onFileClick: (file: FileNode) => void;
  onFileContextMenu: (file: FileNode, e: React.MouseEvent) => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  level,
  onFileClick,
  onFileContextMenu,
}) => {
  const [isExpanded, setIsExpanded] = useState(node.isOpen || false);
  const { selectedFileId } = useEditorStore();

  const handleToggle = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    if (node.type === 'file') {
      onFileClick(node);
    } else {
      handleToggle();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onFileContextMenu(node, e);
  };

  const getFileIcon = (fileName: string, isDirectory: boolean) => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpenIcon className="w-4 h-4 text-blue-400" />
      ) : (
        <FolderIcon className="w-4 h-4 text-blue-400" />
      );
    }

    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      js: '🟨',
      jsx: '⚛️',
      ts: '🔷',
      tsx: '⚛️',
      py: '🐍',
      java: '☕',
      cpp: '⚡',
      c: '⚡',
      rs: '🦀',
      go: '🐹',
      php: '🐘',
      rb: '💎',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      json: '📋',
      xml: '📄',
      yml: '📄',
      yaml: '📄',
      md: '📝',
      sql: '🗄️',
      sh: '💻',
      dockerfile: '🐳',
      gitignore: '📝',
      env: '🔧',
      lock: '🔒',
    };

    if (extension && iconMap[extension]) {
      return <span className="text-sm">{iconMap[extension]}</span>;
    }

    return <DocumentIcon className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div>
      <div
        className={clsx(
          'flex items-center py-1 px-2 cursor-pointer hover:bg-gray-700 group',
          {
            'bg-gray-700': selectedFileId === node.id,
          }
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.type === 'directory' && (
          <button
            className="p-1 -ml-1 mr-1 hover:bg-gray-600 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-3 h-3 text-gray-400" />
            )}
          </button>
        )}

        <div className="flex items-center flex-1 min-w-0">
          <span className="mr-2 flex-shrink-0">
            {getFileIcon(node.name, node.type === 'directory')}
          </span>
          
          <span
            className={clsx(
              'text-sm truncate flex-1',
              {
                'text-white': selectedFileId === node.id,
                'text-gray-300': selectedFileId !== node.id,
                'font-medium': node.type === 'directory',
              }
            )}
            title={node.name}
          >
            {node.name}
          </span>

          {node.isModified && (
            <span
              className="w-2 h-2 rounded-full bg-primary-400 ml-2 flex-shrink-0"
              title="Modified"
            />
          )}
        </div>

        <button
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-600 rounded transition-opacity duration-150"
          onClick={(e) => {
            e.stopPropagation();
            onFileContextMenu(node, e);
          }}
          title="More options"
        >
          <EllipsisHorizontalIcon className="w-3 h-3 text-gray-400" />
        </button>
      </div>

      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              onFileContextMenu={onFileContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ className }) => {
  const { fileTree, openFile, isFileTreeOpen } = useEditorStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileNode;
  } | null>(null);

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      openFile(file);
    }
  };

  const handleFileContextMenu = (file: FileNode, e: React.MouseEvent) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
    });
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;

    switch (action) {
      case 'rename':
        // TODO: Implement rename functionality
        console.log('Rename:', contextMenu.file.name);
        break;
      case 'delete':
        // TODO: Implement delete functionality
        console.log('Delete:', contextMenu.file.name);
        break;
      case 'duplicate':
        // TODO: Implement duplicate functionality
        console.log('Duplicate:', contextMenu.file.name);
        break;
      case 'newFile':
        // TODO: Implement new file functionality
        console.log('New file in:', contextMenu.file.name);
        break;
      case 'newFolder':
        // TODO: Implement new folder functionality
        console.log('New folder in:', contextMenu.file.name);
        break;
    }

    setContextMenu(null);
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!isFileTreeOpen) {
    return null;
  }

  return (
    <div className={clsx('bg-gray-800 border-r border-gray-700 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">Explorer</h3>
        <div className="flex items-center space-x-1">
          <button
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150"
            onClick={() => {
              // TODO: Implement new file functionality
              console.log('New file');
            }}
            title="New file"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          <button
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150"
            title="Collapse"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="overflow-y-auto flex-1">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <DocumentIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files in this project</p>
            <button
              className="mt-2 text-xs text-primary-400 hover:text-primary-300"
              onClick={() => {
                // TODO: Implement create first file functionality
                console.log('Create first file');
              }}
            >
              Create your first file
            </button>
          </div>
        ) : (
          <div className="py-2">
            {fileTree.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                level={0}
                onFileClick={handleFileClick}
                onFileContextMenu={handleFileContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {contextMenu.file.type === 'directory' && (
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                onClick={() => handleContextMenuAction('newFile')}
              >
                New File
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                onClick={() => handleContextMenuAction('newFolder')}
              >
                New Folder
              </button>
              <div className="border-t border-gray-600 my-1" />
            </>
          )}
          <button
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => handleContextMenuAction('rename')}
          >
            Rename
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => handleContextMenuAction('duplicate')}
          >
            Duplicate
          </button>
          <div className="border-t border-gray-600 my-1" />
          <button
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
            onClick={() => handleContextMenuAction('delete')}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default FileTree;
