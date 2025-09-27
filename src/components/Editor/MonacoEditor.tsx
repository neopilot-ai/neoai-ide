'use client';

import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '@/store';
import { useConfigStore } from '@/store';
import { EditorTab } from '@/types';

interface MonacoEditorProps {
  tab: EditorTab;
  onContentChange?: (content: string) => void;
  onCursorPositionChange?: (line: number, column: number) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  tab,
  onContentChange,
  onCursorPositionChange,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { updateTabContent, markTabModified } = useEditorStore();
  const { config } = useConfigStore();
  const [isReady, setIsReady] = useState(false);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    setIsReady(true);

    // Configure editor options
    editor.updateOptions({
      fontSize: config.editor.fontSize,
      fontFamily: config.editor.fontFamily,
      tabSize: config.editor.tabSize,
      wordWrap: config.editor.wordWrap ? 'on' : 'off',
      minimap: { enabled: config.editor.minimap },
      lineNumbers: config.editor.lineNumbers ? 'on' : 'off',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showFunctions: true,
        showConstructors: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
      },
    });

    // Set up cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
      const position = e.position;
      onCursorPositionChange?.(position.lineNumber, position.column);
    });

    // Set up AI completion provider
    setupAICompletionProvider(editor);

    // Focus the editor
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && value !== tab.content) {
      updateTabContent(tab.id, value);
      markTabModified(tab.id, true);
      onContentChange?.(value);
    }
  };

  const setupAICompletionProvider = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Register AI completion provider
    monaco.languages.registerCompletionItemProvider(tab.language, {
      provideCompletionItems: async (model, position) => {
        // Get context around cursor
        const textUntilPosition = model.getValueInRange({
          startLineNumber: Math.max(1, position.lineNumber - 10),
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        // TODO: Call AI service for completions
        // For now, return empty suggestions
        return {
          suggestions: [],
        };
      },
      triggerCharacters: ['.', ' ', '(', '[', '{'],
    });

    // Register AI code actions
    monaco.languages.registerCodeActionProvider(tab.language, {
      provideCodeActions: async (model, range, context) => {
        const actions: monaco.languages.CodeAction[] = [];

        // Add AI-powered code actions
        actions.push({
          title: '✨ Explain this code',
          kind: 'quickfix',
          command: {
            id: 'ai.explainCode',
            title: 'Explain Code',
            arguments: [model.getValueInRange(range)],
          },
        });

        actions.push({
          title: '🔧 Refactor this code',
          kind: 'refactor',
          command: {
            id: 'ai.refactorCode',
            title: 'Refactor Code',
            arguments: [model.getValueInRange(range)],
          },
        });

        actions.push({
          title: '🧪 Generate tests',
          kind: 'source',
          command: {
            id: 'ai.generateTests',
            title: 'Generate Tests',
            arguments: [model.getValueInRange(range)],
          },
        });

        return {
          actions,
          dispose: () => {},
        };
      },
    });

    // Register command handlers
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      // Open AI chat with current selection
      const selection = editor.getSelection();
      if (selection) {
        const selectedText = editor.getModel()?.getValueInRange(selection);
        // TODO: Open AI chat with selected text
        console.log('Open AI chat with:', selectedText);
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA, () => {
      // Trigger AI completion
      editor.trigger('ai', 'editor.action.triggerSuggest', {});
    });
  };

  // Update editor when config changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: config.editor.fontSize,
        fontFamily: config.editor.fontFamily,
        tabSize: config.editor.tabSize,
        wordWrap: config.editor.wordWrap ? 'on' : 'off',
        minimap: { enabled: config.editor.minimap },
        lineNumbers: config.editor.lineNumbers ? 'on' : 'off',
      });
    }
  }, [config.editor]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={tab.language}
        value={tab.content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        }
      />
    </div>
  );
};

export default MonacoEditor;
