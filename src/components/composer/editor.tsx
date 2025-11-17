'use client';

import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface EditorProps {
  content: string;
  onUpdateContent: (content: string) => void;
  darkMode?: boolean;
  onSelectionChange: (selectedText: string | undefined) => void;
  onComment?: (comment: string, selectedText: string) => void;
}

export default function MonacoEditor({
  content,
  onUpdateContent,
  darkMode,
  onSelectionChange,
  onComment,
}: EditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;

    editorInstance.addAction({
      id: 'add-comment-action',
      label: 'Add Comment',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (ed) => {
        const selection = ed.getSelection();
        if (!selection) return;

        const selectedText = ed.getModel()?.getValueInRange(selection);
        if (!selectedText) return;

        if (onComment) {
          const position = ed.getPosition();
          if (position) {
            const coordinates = ed.getScrolledVisiblePosition(position);
            const editorDomNode = ed.getDomNode();
            
            if (coordinates && editorDomNode) {
              const popupContainer = document.createElement('div');
              popupContainer.style.position = 'absolute';
              popupContainer.style.left = `${coordinates.left + editorDomNode.offsetLeft}px`;
              popupContainer.style.top = `${coordinates.top + editorDomNode.offsetTop + 20}px`;
              popupContainer.style.background = darkMode ? '#1e1e1e' : '#fff';
              popupContainer.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
              popupContainer.style.border = '1px solid #dedede';
              popupContainer.style.padding = '12px';
              popupContainer.style.borderRadius = '6px';
              popupContainer.style.width = '280px';
              popupContainer.style.zIndex = '1000000';
              popupContainer.style.fontFamily = 'sans-serif';
              popupContainer.style.fontSize = '14px';
              popupContainer.style.color = darkMode ? '#fff' : '#000';

              popupContainer.innerHTML = `
                <div style="margin-bottom: 10px; font-weight: 600;">Your comment:</div>
                <textarea
                  id="userComment"
                  rows="3"
                  style="width: 100%; resize: none; padding: 8px; box-sizing: border-box; margin-bottom: 16px; background: ${darkMode ? '#2d2d2d' : '#fff'}; color: ${darkMode ? '#fff' : '#000'}; border: 1px solid ${darkMode ? '#404040' : '#dedede'};"
                  placeholder="Add a comment..."
                ></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button id="cancelButton"
                    style="background: ${darkMode ? '#404040' : '#e2e2e2'}; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; color: ${darkMode ? '#fff' : '#000'};"
                  >
                    Cancel
                  </button>
                  <button id="submitButton"
                    style="background: #007acc; border: none; padding: 8px 12px; border-radius: 4px; color: #fff; cursor: pointer;"
                  >
                    Submit
                  </button>
                </div>
              `;

              // Remove any existing popup
              const existingPopup = document.querySelector('.monaco-comment-popup');
              if (existingPopup) {
                existingPopup.remove();
              }

              // Add class for easy identification
              popupContainer.classList.add('monaco-comment-popup');

              // Append to editor's parent container
              editorDomNode.parentElement?.appendChild(popupContainer);

              // Focus the textarea
              const textarea = popupContainer.querySelector('#userComment') as HTMLTextAreaElement;
              textarea?.focus();

              function removePopup() {
                popupContainer.remove();
                document.removeEventListener('mousedown', handleOutsideClick);
              }

              function handleOutsideClick(e: MouseEvent) {
                if (!popupContainer.contains(e.target as Node)) {
                  removePopup();
                }
              }

              // Delay adding the outside click handler
              setTimeout(() => {
                document.addEventListener('mousedown', handleOutsideClick);
              }, 100);

              const cancelButton = popupContainer.querySelector('#cancelButton');
              const submitButton = popupContainer.querySelector('#submitButton');

              cancelButton?.addEventListener('click', removePopup);

              submitButton?.addEventListener('click', () => {
                const userComment = textarea.value;
                if (onComment) {
                  onComment(userComment, selectedText);
                }
                removePopup();
              });
            }
          }
        }
      },
    });

    editorInstance.onDidChangeCursorSelection((event) => {
      const { selection } = event;
      const model = editorInstance.getModel();
      const selectedText = model?.getValueInRange(selection);
      onSelectionChange(selectedText);
    });
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="markdown"
      theme={darkMode ? "vs-dark" : "vs-light"}
      value={content}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        contextmenu: true,
      }}
      onChange={(value) => {
        if (value !== undefined) {
          onUpdateContent(value);
        }
      }}
      onMount={handleEditorMount}
    />
  );
}
